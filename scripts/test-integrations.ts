import "dotenv/config";
import { createActionLayer } from "@growthos/action-layer";
import type { ActionRequest } from "@growthos/shared-types";

const TENANT_ID = "test-integration-run";

async function testWebhook(actions: ReturnType<typeof createActionLayer>) {
  console.log("\n═══ TEST 1: WEBHOOK ═══");
  const req: ActionRequest = {
    action: "fire_webhook",
    tenantId: TENANT_ID,
    payload: {
      url: "https://httpbin.org/post",
      method: "POST",
      body: { event: "test", source: "growthos" },
    },
  };
  const result = await actions.execute(req);
  console.log("Result:", JSON.stringify(result, null, 2));
  return result.success;
}

async function testEmail(actions: ReturnType<typeof createActionLayer>) {
  console.log("\n═══ TEST 2: EMAIL (Resend) ═══");
  const req: ActionRequest = {
    action: "send_email",
    tenantId: TENANT_ID,
    payload: {
      to: "delivered@resend.dev",
      subject: "GrowthOS Integration Test",
      body: "<h1>It works!</h1><p>This email was sent by the GrowthOS action layer via Resend.</p>",
    },
  };
  const result = await actions.execute(req);
  console.log("Result:", JSON.stringify(result, null, 2));
  return result.success;
}

async function testCalendar(actions: ReturnType<typeof createActionLayer>) {
  console.log("\n═══ TEST 3: CALENDAR (Google) ═══");
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(10, 0, 0, 0);

  const req: ActionRequest = {
    action: "schedule_calendar",
    tenantId: TENANT_ID,
    payload: {
      leadId: "test-lead-123",
      scheduledAt: tomorrow.toISOString(),
      duration: 30,
    },
  };
  const result = await actions.execute(req);
  console.log("Result:", JSON.stringify(result, null, 2));
  return result.success;
}

async function testStripe() {
  console.log("\n═══ TEST 4: STRIPE (Customer Creation) ═══");
  const { createStripeCustomer } = await import("@growthos/action-layer");
  try {
    const customerId = await createStripeCustomer(
      "test-tenant-stripe",
      "integration-test@growthos.dev",
      "Integration Test Corp"
    );
    console.log("Result: Stripe customer created:", customerId);
    return true;
  } catch (err) {
    console.error("Result: FAILED:", (err as Error).message);
    return false;
  }
}

async function main() {
  console.log("╔══════════════════════════════════════╗");
  console.log("║  GrowthOS Integration Test Suite     ║");
  console.log("╚══════════════════════════════════════╝");

  const actions = createActionLayer();
  const results: Record<string, boolean> = {};

  results["Webhook"] = await testWebhook(actions);
  results["Email"] = await testEmail(actions);
  results["Calendar"] = await testCalendar(actions);
  results["Stripe"] = await testStripe();

  console.log("\n╔══════════════════════════════════════╗");
  console.log("║  RESULTS                             ║");
  console.log("╠══════════════════════════════════════╣");
  for (const [name, ok] of Object.entries(results)) {
    console.log(`║  ${ok ? "✓" : "✗"} ${name.padEnd(33)}║`);
  }
  console.log("╚══════════════════════════════════════╝");
}

main().catch(console.error);
