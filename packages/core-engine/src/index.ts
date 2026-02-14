import { PrismaClient } from "@prisma/client";
import type { SaaSConfig } from "@growthos/shared-types";
import type { Prisma } from "@prisma/client";
import { createOrchestrator, AgentOrchestrator } from "@growthos/agent-orchestrator";
import { createAgentRegistry, AgentRegistry } from "@growthos/agents";
import { createRulesEngine, RulesEngine } from "@growthos/rules-engine";
import { createMemorySystem, MemorySystem } from "@growthos/memory";
import { createActionLayer, ActionLayer } from "@growthos/action-layer";
import { createEventBus, EventBus } from "@growthos/event-bus";

export interface CoreEngineConfig {
  saas: SaaSConfig;
  databaseUrl: string;
  redisUrl: string;
}

export class CoreEngine {
  public prisma: PrismaClient;
  public orchestrator: AgentOrchestrator;
  public agents: AgentRegistry;
  public rules: RulesEngine;
  public memory: MemorySystem;
  public actions: ActionLayer;
  public eventBus: EventBus;

  private constructor(
    prisma: PrismaClient,
    orchestrator: AgentOrchestrator,
    agents: AgentRegistry,
    rules: RulesEngine,
    memory: MemorySystem,
    actions: ActionLayer,
    eventBus: EventBus
  ) {
    this.prisma = prisma;
    this.orchestrator = orchestrator;
    this.agents = agents;
    this.rules = rules;
    this.memory = memory;
    this.actions = actions;
    this.eventBus = eventBus;
  }

  static create(config: CoreEngineConfig): CoreEngine {
    console.log(`[CoreEngine] Initializing for "${config.saas.name}"...`);

    const prisma = new PrismaClient({
      datasourceUrl: config.databaseUrl,
      log: ["warn", "error"],
    });

    const agents = createAgentRegistry();
    const rules = createRulesEngine(config.saas);
    const memory = createMemorySystem(prisma);
    const actions = createActionLayer();
    const saasSlug = config.saas.slug;
    actions.setLogger(async (entry) => {
      try {
        await prisma.agentLog.create({
          data: {
            tenantId: entry.tenantId,
            workflowId: "action-layer",
            agentType: entry.actionType,
            input: entry.payload as Prisma.InputJsonValue,
            output: { success: entry.success, error: entry.error } as Prisma.InputJsonValue,
            durationMs: entry.durationMs,
            success: entry.success,
            error: entry.error,
            saasProduct: saasSlug,
          },
        });
      } catch (err) {
        console.error("[CoreEngine] Failed to log action to DB:", err);
      }
    });
    const eventBus = createEventBus({ redisUrl: config.redisUrl });
    const orchestrator = createOrchestrator(prisma, agents, rules, eventBus);

    console.log(`[CoreEngine] Ready. Agents: [${config.saas.allowedAgents.join(", ")}]`);

    return new CoreEngine(prisma, orchestrator, agents, rules, memory, actions, eventBus);
  }

  async shutdown(): Promise<void> {
    console.log("[CoreEngine] Shutting down...");
    await this.eventBus.shutdown();
    await this.prisma.$disconnect();
    console.log("[CoreEngine] Shutdown complete.");
  }
}

export function createCoreEngine(config: CoreEngineConfig): CoreEngine {
  return CoreEngine.create(config);
}

// Re-export all sub-modules
export { AgentOrchestrator } from "@growthos/agent-orchestrator";
export { AgentRegistry, QualifierAgent, SchedulerAgent, FollowUpAgent } from "@growthos/agents";
export { RulesEngine } from "@growthos/rules-engine";
export { MemorySystem } from "@growthos/memory";
export { ActionLayer } from "@growthos/action-layer";
export { EventBus } from "@growthos/event-bus";
