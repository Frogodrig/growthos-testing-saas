import { FastifyInstance } from "fastify";
import { CoreEngine } from "@growthos/core-engine";
import { getAuth } from "../middleware/auth";
import type { SaaSMetrics } from "@growthos/shared-types";

export function registerMetricsRoutes(app: FastifyInstance, engine: CoreEngine): void {
  // GrowthOS metrics endpoint
  app.get("/metrics", async (request, reply) => {
    const { tenantId } = getAuth(request);

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
      engine.prisma.lead.count({ where: { tenantId } }),
      engine.prisma.meeting.count({ where: { tenantId, status: { in: ["confirmed", "completed"] } } }),
      engine.prisma.lead.count({ where: { tenantId, status: "converted" } }),
      engine.prisma.message.count({ where: { tenantId, direction: "outbound" } }),
      engine.prisma.message.count({ where: { tenantId, direction: "inbound" } }),
      engine.prisma.tenant.count({ where: { subscriptionStatus: "active" } }),
      engine.prisma.tenant.count({ where: { subscriptionStatus: "canceled" } }),
      engine.prisma.agentLog.count({ where: { tenantId, agentType: "send_email", success: true } }),
      engine.prisma.agentLog.count({ where: { tenantId, agentType: "fire_webhook", success: true } }),
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
