import type { SaaSConfig } from "@growthos/shared-types";
import { createCoreEngine } from "@growthos/core-engine";

export interface SchedulerConfig {
  saasConfig: SaaSConfig;
  databaseUrl: string;
  redisUrl: string;
  pollIntervalMs: number;
}

export async function startScheduler(config: SchedulerConfig): Promise<void> {
  const engine = createCoreEngine({
    saas: config.saasConfig,
    databaseUrl: config.databaseUrl,
    redisUrl: config.redisUrl,
  });

  const pollIntervalMs = config.pollIntervalMs || 60_000;

  // Poll for stale workflows that need processing
  async function checkStaleWorkflows(): Promise<void> {
    try {
      const staleThreshold = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24h

      // Find workflows stuck in "following_up" state with no recent activity
      const staleWorkflows = await engine.prisma.workflow.findMany({
        where: {
          currentState: { in: ["following_up", "lead_received", "qualified"] },
          updatedAt: { lt: staleThreshold },
        },
        take: 10,
      });

      for (const workflow of staleWorkflows) {
        console.log(`[Scheduler] Processing stale workflow=${workflow.id} state=${workflow.currentState}`);

        // Emit no_response event for stale follow-ups
        if (workflow.currentState === "following_up") {
          await engine.eventBus.publish({
            id: crypto.randomUUID(),
            type: "no_response",
            tenantId: workflow.tenantId,
            payload: { workflowId: workflow.id, leadId: workflow.leadId },
            timestamp: new Date(),
          });
        } else {
          await engine.orchestrator.processWorkflow(workflow.id, workflow.tenantId);
        }
      }

      if (staleWorkflows.length > 0) {
        console.log(`[Scheduler] Processed ${staleWorkflows.length} stale workflows`);
      }
    } catch (error) {
      console.error("[Scheduler] Error checking stale workflows:", error);
    }
  }

  // Poll for upcoming meetings that need reminders
  async function checkMeetingReminders(): Promise<void> {
    try {
      const reminderWindow = new Date(Date.now() + 60 * 60 * 1000); // 1h from now

      const upcomingMeetings = await engine.prisma.meeting.findMany({
        where: {
          status: "confirmed",
          scheduledAt: { lte: reminderWindow, gt: new Date() },
        },
        include: { lead: true },
        take: 20,
      });

      for (const meeting of upcomingMeetings) {
        console.log(`[Scheduler] Sending reminder for meeting=${meeting.id} lead=${meeting.leadId}`);

        await engine.actions.execute({
          action: "send_email",
          tenantId: meeting.tenantId,
          payload: {
            to: meeting.lead.email,
            subject: "Meeting Reminder",
            body: `Reminder: Your meeting is scheduled for ${meeting.scheduledAt.toISOString()}`,
          },
        });
      }
    } catch (error) {
      console.error("[Scheduler] Error checking meeting reminders:", error);
    }
  }

  // Start polling loops
  const staleInterval = setInterval(checkStaleWorkflows, pollIntervalMs);
  const reminderInterval = setInterval(checkMeetingReminders, pollIntervalMs);

  // Graceful shutdown
  const shutdown = async () => {
    console.log("[Scheduler] Shutting down...");
    clearInterval(staleInterval);
    clearInterval(reminderInterval);
    await engine.shutdown();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  console.log(`[Scheduler] Started for "${config.saasConfig.name}". Poll interval: ${pollIntervalMs}ms`);

  // Run initial check
  await checkStaleWorkflows();
  await checkMeetingReminders();
}
