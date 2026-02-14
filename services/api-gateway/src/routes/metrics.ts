import { FastifyInstance } from "fastify";
import { CoreEngine } from "@growthos/core-engine";
import { getAuth } from "../middleware/auth";
import type { SaaSMetrics } from "@growthos/shared-types";

export function registerMetricsRoutes(app: FastifyInstance, engine: CoreEngine): void {
  // GrowthOS metrics endpoint
  app.get("/metrics", async (request, reply) => {
    const { tenantId } = getAuth(request);
    const { product } = request.query as { product?: string };

    // Build tenant filter: always tenant-scoped, optionally product-filtered
    const tenantWhere = product
      ? { tenantId, tenant: { saasProduct: product } }
      : { tenantId };
    const agentLogWhere = product
      ? { tenantId, saasProduct: product }
      : { tenantId };
    const tenantCountWhere = product
      ? { subscriptionStatus: "active" as const, saasProduct: product }
      : { subscriptionStatus: "active" as const };
    const canceledCountWhere = product
      ? { subscriptionStatus: "canceled" as const, saasProduct: product }
      : { subscriptionStatus: "canceled" as const };

    const [
      totalLeads,
      meetingsBooked,
      convertedLeads,
      totalMessages,
      repliedLeads,
      activeSubs,
      canceledSubs,
      emailsSent,
      webhooksFired,
    ] = await Promise.all([
      engine.prisma.lead.count({ where: tenantWhere }),
      engine.prisma.meeting.count({ where: { ...tenantWhere, status: { in: ["confirmed", "completed"] } } }),
      engine.prisma.lead.count({ where: { ...tenantWhere, status: "converted" } }),
      engine.prisma.message.count({ where: { ...tenantWhere, direction: "outbound" } }),
      engine.prisma.message.count({ where: { ...tenantWhere, direction: "inbound" } }),
      engine.prisma.tenant.count({ where: tenantCountWhere }),
      engine.prisma.tenant.count({ where: canceledCountWhere }),
      engine.prisma.agentLog.count({ where: { ...agentLogWhere, agentType: "send_email", success: true } }),
      engine.prisma.agentLog.count({ where: { ...agentLogWhere, agentType: "fire_webhook", success: true } }),
    ]);

    const totalEverSubscribed = activeSubs + canceledSubs;
    const churn = totalEverSubscribed > 0 ? canceledSubs / totalEverSubscribed : 0;

    // MRR approximation: count of active subscriptions (actual price lookup requires Stripe API)
    // For v1, we report the count — the real dollar amount will come from Stripe dashboard
    const mrr = activeSubs;

    const isManualMode = process.env.PAYMENT_MODE === "manual";

    const metrics: SaaSMetrics & {
      emailsSent: number;
      webhooksFired: number;
      activationMode: string;
    } = {
      leads: totalLeads,
      replyRate: totalMessages > 0 ? repliedLeads / totalMessages : 0,
      meetingsBooked,
      conversionRate: totalLeads > 0 ? convertedLeads / totalLeads : 0,
      churn,
      mrr: isManualMode ? 0 : mrr,
      emailsSent,
      webhooksFired,
      activationMode: isManualMode ? "manual" : "stripe",
    };

    return reply.send(metrics);
  });
}
