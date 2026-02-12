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
    ] = await Promise.all([
      engine.prisma.lead.count({ where: { tenantId } }),
      engine.prisma.meeting.count({ where: { tenantId, status: { in: ["confirmed", "completed"] } } }),
      engine.prisma.lead.count({ where: { tenantId, status: "converted" } }),
      engine.prisma.message.count({ where: { tenantId, direction: "outbound" } }),
      engine.prisma.message.count({ where: { tenantId, direction: "inbound" } }),
    ]);

    const metrics: SaaSMetrics = {
      leads: totalLeads,
      replyRate: totalMessages > 0 ? repliedLeads / totalMessages : 0,
      meetingsBooked,
      conversionRate: totalLeads > 0 ? convertedLeads / totalLeads : 0,
      churn: 0, // TODO: Implement churn calculation
      mrr: 0,   // TODO: Implement MRR calculation from billing
    };

    return reply.send(metrics);
  });
}
