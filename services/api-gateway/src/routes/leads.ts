import { FastifyInstance } from "fastify";
import { Prisma } from "@prisma/client";
import { CoreEngine } from "@growthos/core-engine";
import { getAuth } from "../middleware/auth";
import { fetchLinkedInProfile } from "../lib/linkedin";

export function registerLeadRoutes(app: FastifyInstance, engine: CoreEngine): void {
  // Create a new lead and kick off workflow
  app.post("/api/leads", async (request, reply) => {
    const { tenantId } = getAuth(request);
    const { name, email, phone, source, metadata } = request.body as {
      name: string;
      email: string;
      phone?: string;
      source: string;
      metadata?: Record<string, unknown>;
    };

    if (!name || !email || !source) {
      return reply.status(400).send({ error: "name, email, and source are required" });
    }

    // Enrich metadata with LinkedIn profile data if URL provided
    const enrichedMetadata = { ...(metadata || {}) };
    if (enrichedMetadata.linkedinUrl && typeof enrichedMetadata.linkedinUrl === "string") {
      const linkedinData = await fetchLinkedInProfile(enrichedMetadata.linkedinUrl);
      if (linkedinData) {
        enrichedMetadata.linkedinData = linkedinData;
      }
    }

    const lead = await engine.prisma.lead.create({
      data: { tenantId, name, email, phone, source, metadata: enrichedMetadata as Prisma.InputJsonValue },
    });

    // Start workflow for this lead
    const workflowId = await engine.orchestrator.createWorkflow(tenantId, lead.id, {
      leadName: name,
      leadEmail: email,
      leadSource: source,
      ...enrichedMetadata,
    });

    console.log(`[API] Lead created: ${lead.id} workflow: ${workflowId}`);

    return reply.status(201).send({ lead, workflowId });
  });

  // List leads for tenant
  app.get("/api/leads", async (request, reply) => {
    const { tenantId } = getAuth(request);
    const { status, limit } = request.query as { status?: string; limit?: string };

    const leads = await engine.prisma.lead.findMany({
      where: {
        tenantId,
        ...(status ? { status } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: limit ? parseInt(limit, 10) : 50,
    });

    return reply.send({ leads });
  });

  // Get single lead with history
  app.get("/api/leads/:id", async (request, reply) => {
    const { tenantId } = getAuth(request);
    const { id } = request.params as { id: string };

    const lead = await engine.prisma.lead.findFirst({
      where: { id, tenantId },
      include: {
        meetings: true,
        messages: true,
        workflows: {
          include: { agentLogs: { orderBy: { createdAt: "asc" } } },
        },
      },
    });

    if (!lead) {
      return reply.status(404).send({ error: "Lead not found" });
    }

    return reply.send({ lead });
  });

  // Trigger workflow processing for a lead's active workflow
  app.post("/api/leads/:id/process", async (request, reply) => {
    const { tenantId } = getAuth(request);
    const { id } = request.params as { id: string };

    const workflow = await engine.prisma.workflow.findFirst({
      where: { leadId: id, tenantId },
      orderBy: { createdAt: "desc" },
    });

    if (!workflow) {
      return reply.status(404).send({ error: "No workflow found for this lead" });
    }

    await engine.orchestrator.processWorkflow(workflow.id, tenantId);

    const updated = await engine.prisma.workflow.findUnique({ where: { id: workflow.id } });

    return reply.send({ workflow: updated });
  });
}
