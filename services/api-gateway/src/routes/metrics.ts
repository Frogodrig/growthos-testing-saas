import { FastifyInstance } from "fastify";
import { CoreEngine } from "@growthos/core-engine";
import { getAuth } from "../middleware/auth";

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
    const workflowWhere = product
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
      qualifiedLeads,
      disqualifiedLeads,
      avgScoreResult,
      totalWorkflows,
      activeWorkflows,
      escalatedWorkflows,
      followupsSent,
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
      engine.prisma.lead.count({ where: { ...tenantWhere, status: { in: ["qualified", "converted"] } } }),
      engine.prisma.lead.count({ where: { ...tenantWhere, score: { lt: 50, not: null } } }),
      engine.prisma.lead.aggregate({ where: { ...tenantWhere, score: { not: null } }, _avg: { score: true } }),
      engine.prisma.workflow.count({ where: workflowWhere }),
      engine.prisma.workflow.count({ where: { ...workflowWhere, currentState: { notIn: ["meeting_scheduled", "escalated", "failed"] } } }),
      engine.prisma.workflow.count({ where: { ...workflowWhere, currentState: "escalated" } }),
      engine.prisma.agentLog.count({ where: { ...agentLogWhere, agentType: "followup", success: true } }),
    ]);

    const totalEverSubscribed = activeSubs + canceledSubs;
    const churn = totalEverSubscribed > 0 ? canceledSubs / totalEverSubscribed : 0;
    const mrr = activeSubs;
    const isManualMode = process.env.PAYMENT_MODE === "manual";
    const avgScore = avgScoreResult._avg.score ?? 0;

    const metrics = {
      leads: totalLeads,
      replyRate: totalMessages > 0 ? repliedLeads / totalMessages : 0,
      meetingsBooked,
      conversionRate: totalLeads > 0 ? convertedLeads / totalLeads : 0,
      churn,
      mrr: isManualMode ? 0 : mrr,
      emailsSent,
      webhooksFired,
      activationMode: isManualMode ? "manual" : "stripe",
      qualifiedLeads,
      disqualifiedLeads,
      avgScore,
      totalWorkflows,
      activeWorkflows,
      escalatedLeads: escalatedWorkflows,
      followupsSent,
    };

    return reply.send(metrics);
  });
}
