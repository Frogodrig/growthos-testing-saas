import { FastifyInstance } from "fastify";
import type { SaaSConfig } from "@growthos/shared-types";
import { CoreEngine } from "@growthos/core-engine";
import {
  createStripeCustomer,
  createCheckoutSession,
  constructWebhookEvent,
  parseSubscriptionEvent,
} from "@growthos/action-layer";
import { generateToken, getAuth } from "../middleware/auth";

const PRICE_MAP: Record<string, string> = {
  "saas-booker": "STRIPE_PRICE_ID_BOOKER",
  "saas-leadqualifier": "STRIPE_PRICE_ID_LEADQUALIFIER",
  "saas-followup": "STRIPE_PRICE_ID_FOLLOWUP",
};

export function registerTenantRoutes(
  app: FastifyInstance,
  engine: CoreEngine,
  saasConfig: SaaSConfig
): void {
  // ────────────────────────────────────────────
  // ACTV-001: POST /api/tenant/create (no auth)
  // ────────────────────────────────────────────
  app.post("/api/tenant/create", async (request, reply) => {
    const { name, email } = request.body as {
      name: string;
      email: string;
    };

    if (!name || !email) {
      return reply.status(400).send({ error: "Missing required fields: name, email" });
    }

    const domain = name.toLowerCase().replace(/[^a-z0-9]+/g, "-") + ".growthos.app";

    // Check if domain already exists
    const existing = await engine.prisma.tenant.findUnique({ where: { domain } });
    if (existing) {
      return reply.status(409).send({ error: "Tenant with this name already exists" });
    }

    const isManualMode = process.env.PAYMENT_MODE === "manual";

    // Create tenant — in manual mode, start as 'pending' (awaiting admin activation)
    const tenant = await engine.prisma.tenant.create({
      data: {
        name,
        domain,
        plan: "free",
        subscriptionStatus: isManualMode ? "pending" : "none",
      },
    });

    // Create Stripe customer (skip in manual mode)
    let stripeCustomerId: string | null = null;
    if (!isManualMode) {
      try {
        stripeCustomerId = await createStripeCustomer(tenant.id, email, name);
        await engine.prisma.tenant.update({
          where: { id: tenant.id },
          data: { stripeCustomerId },
        });
      } catch (err) {
        console.error(`[Tenant] Stripe customer creation failed for tenant=${tenant.id}:`, err);
      }
    }

    // Create admin user
    const user = await engine.prisma.user.create({
      data: {
        tenantId: tenant.id,
        email,
        name: "Admin",
        role: "admin",
      },
    });

    // Generate JWT
    const token = generateToken({
      userId: user.id,
      tenantId: tenant.id,
      role: "admin",
    });

    const updatedTenant = await engine.prisma.tenant.findUnique({ where: { id: tenant.id } });

    console.log(`[Tenant] Created tenant="${name}" id=${tenant.id} stripe=${stripeCustomerId}`);

    return reply.status(201).send({
      tenant: updatedTenant,
      user,
      token,
    });
  });

  // ────────────────────────────────────────────
  // ACTV-002: POST /api/billing/checkout (auth required)
  // ────────────────────────────────────────────
  app.post("/api/billing/checkout", async (request, reply) => {
    const { tenantId } = getAuth(request);
    const { successUrl, cancelUrl } = request.body as {
      successUrl: string;
      cancelUrl: string;
    };

    if (!successUrl || !cancelUrl) {
      return reply.status(400).send({ error: "Missing required fields: successUrl, cancelUrl" });
    }

    const tenant = await engine.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant?.stripeCustomerId) {
      return reply.status(400).send({ error: "Tenant has no Stripe customer. Create tenant first." });
    }

    // Map SaaS slug to price ID
    const envKey = PRICE_MAP[saasConfig.slug];
    const priceId = envKey ? process.env[envKey] : undefined;
    if (!priceId) {
      return reply.status(500).send({ error: `No price configured for SaaS: ${saasConfig.slug}` });
    }

    const checkoutUrl = await createCheckoutSession(
      tenant.stripeCustomerId,
      priceId,
      successUrl,
      cancelUrl
    );

    console.log(`[Billing] Checkout session created for tenant=${tenantId} saas=${saasConfig.slug}`);

    return reply.send({ checkoutUrl });
  });

  // ────────────────────────────────────────────
  // ACTV-003: POST /api/stripe/webhook (no auth)
  // ────────────────────────────────────────────
  app.post("/api/stripe/webhook", async (request, reply) => {
    // MACT-004: In manual mode, webhook exists but doesn't process events
    if (process.env.PAYMENT_MODE === "manual") {
      return reply.send({ status: "ignored", reason: "manual activation mode" });
    }

    const signature = request.headers["stripe-signature"] as string;
    if (!signature) {
      return reply.status(400).send({ error: "Missing stripe-signature header" });
    }

    let event;
    try {
      const rawBody = (request as any).rawBody || request.body;
      event = constructWebhookEvent(rawBody, signature);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[Stripe Webhook] Signature verification failed: ${msg}`);
      return reply.status(400).send({ error: `Webhook signature verification failed: ${msg}` });
    }

    console.log(`[Stripe Webhook] Received event: ${event.type}`);

    const subEvent = parseSubscriptionEvent(event);
    if (subEvent) {
      // Find tenant by stripeCustomerId
      const tenant = await engine.prisma.tenant.findFirst({
        where: { stripeCustomerId: subEvent.customerId },
      });

      if (tenant) {
        const newStatus = subEvent.type === "customer.subscription.deleted"
          ? "canceled"
          : subEvent.subscriptionStatus;

        await engine.prisma.tenant.update({
          where: { id: tenant.id },
          data: { subscriptionStatus: newStatus },
        });

        console.log(
          `[Stripe Webhook] Updated tenant=${tenant.id} subscriptionStatus=${newStatus}`
        );
      } else {
        console.warn(`[Stripe Webhook] No tenant found for stripeCustomerId=${subEvent.customerId}`);
      }
    }

    return reply.send({ received: true });
  });

  // ────────────────────────────────────────────
  // MACT-003: POST /internal/activate-tenant (manual mode only, ADMIN_SECRET auth)
  // ────────────────────────────────────────────
  if (process.env.PAYMENT_MODE === "manual") {
    app.post("/internal/activate-tenant", async (request, reply) => {
      const adminSecret = request.headers["x-admin-secret"] as string;
      if (!adminSecret || adminSecret !== process.env.ADMIN_SECRET) {
        return reply.status(401).send({ error: "Unauthorized — invalid or missing X-Admin-Secret header" });
      }

      const { tenant_id } = request.body as { tenant_id: string };
      if (!tenant_id) {
        return reply.status(400).send({ error: "Missing required field: tenant_id" });
      }

      const tenant = await engine.prisma.tenant.findUnique({ where: { id: tenant_id } });
      if (!tenant) {
        return reply.status(404).send({ error: "Tenant not found" });
      }

      await engine.prisma.tenant.update({
        where: { id: tenant_id },
        data: { subscriptionStatus: "active" },
      });

      console.log(`[Admin] Tenant activated: tenant_id=${tenant_id} at ${new Date().toISOString()}`);

      return reply.send({ success: true, tenant_id, status: "active" });
    });

    console.log("[Gateway] Manual activation mode: POST /internal/activate-tenant registered");
  }
}
