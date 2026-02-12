import type { SaaSConfig, DomainEvent } from "@growthos/shared-types";
import { createCoreEngine } from "@growthos/core-engine";

export interface WorkerConfig {
  saasConfig: SaaSConfig;
  databaseUrl: string;
  redisUrl: string;
}

export async function startWorker(config: WorkerConfig): Promise<void> {
  const engine = createCoreEngine({
    saas: config.saasConfig,
    databaseUrl: config.databaseUrl,
    redisUrl: config.redisUrl,
  });

  // Subscribe to events and process asynchronously
  engine.eventBus.subscribe("lead_created", async (event: DomainEvent) => {
    console.log(`[Worker] Processing lead_created: ${event.payload.leadId}`);
    const workflowId = event.payload.workflowId as string;
    await engine.orchestrator.processWorkflow(workflowId, event.tenantId);
  });

  engine.eventBus.subscribe("lead_qualified", async (event: DomainEvent) => {
    console.log(`[Worker] Processing lead_qualified: ${event.payload.leadId}`);
    const workflowId = event.payload.workflowId as string;
    await engine.orchestrator.processWorkflow(workflowId, event.tenantId);
  });

  engine.eventBus.subscribe("meeting_scheduled", async (event: DomainEvent) => {
    console.log(`[Worker] Processing meeting_scheduled: ${event.payload.leadId}`);
    // Send confirmation email
    await engine.actions.execute({
      action: "send_email",
      tenantId: event.tenantId,
      payload: {
        to: (event.payload.agentOutput as any)?.leadEmail || "",
        subject: "Meeting Confirmed",
        body: "Your meeting has been scheduled. We look forward to speaking with you!",
      },
    });
  });

  engine.eventBus.subscribe("followup_required", async (event: DomainEvent) => {
    console.log(`[Worker] Processing followup_required: ${event.payload.leadId}`);
    const output = event.payload.agentOutput as any;
    if (output?.message) {
      await engine.actions.execute({
        action: "send_email",
        tenantId: event.tenantId,
        payload: {
          to: output.leadEmail || "",
          subject: "Following up",
          body: output.message,
        },
      });
    }
  });

  engine.eventBus.subscribe("no_response", async (event: DomainEvent) => {
    console.log(`[Worker] Processing no_response: ${event.payload.leadId}`);
    const workflowId = event.payload.workflowId as string;
    await engine.orchestrator.processWorkflow(workflowId, event.tenantId);
  });

  // Graceful shutdown
  const shutdown = async () => {
    console.log("[Worker] Shutting down...");
    await engine.shutdown();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  console.log(`[Worker] Started for "${config.saasConfig.name}". Listening for events...`);
}
