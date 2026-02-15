import { Prisma, PrismaClient } from "@prisma/client";
import type {
  AgentType,
  AgentOutput,
  WorkflowState,
  AgentInput,
  DomainEvent,
  EventType,
} from "@growthos/shared-types";
import { AgentRegistry } from "@growthos/agents";
import { RulesEngine } from "@growthos/rules-engine";
import { EventBus } from "@growthos/event-bus";

// ──────────────────────────────────────────────
// FSM Transition Table (No AI here)
// ──────────────────────────────────────────────

interface Transition {
  from: WorkflowState;
  agent: AgentType;
  successState: WorkflowState;
  failState: WorkflowState;
  emitOnSuccess: EventType;
}

const TRANSITIONS: Transition[] = [
  {
    from: "lead_received",
    agent: "qualifier",
    successState: "qualified",
    failState: "failed",
    emitOnSuccess: "lead_qualified",
  },
  {
    from: "qualified",
    agent: "scheduler",
    successState: "meeting_scheduled",
    failState: "following_up",
    emitOnSuccess: "meeting_scheduled",
  },
  {
    from: "following_up",
    agent: "followup",
    successState: "following_up",
    failState: "escalated",
    emitOnSuccess: "followup_required",
  },
  {
    from: "qualified",
    agent: "followup",
    successState: "following_up",
    failState: "escalated",
    emitOnSuccess: "followup_required",
  },
  {
    from: "lead_received",
    agent: "followup",
    successState: "following_up",
    failState: "escalated",
    emitOnSuccess: "followup_required",
  },
];

// ──────────────────────────────────────────────
// Orchestrator
// ──────────────────────────────────────────────

export class AgentOrchestrator {
  constructor(
    private prisma: PrismaClient,
    private agents: AgentRegistry,
    private rules: RulesEngine,
    private eventBus: EventBus
  ) {}

  async processWorkflow(workflowId: string, tenantId: string): Promise<void> {
    const workflow = await this.prisma.workflow.findFirst({
      where: { id: workflowId, tenantId },
    });

    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    const currentState = workflow.currentState as WorkflowState;
    console.log(`[Orchestrator] Processing workflow=${workflowId} state=${currentState}`);

    // Find valid transition from current state
    const transition = this.findTransition(currentState, workflow.allowedAgents as AgentType[]);
    if (!transition) {
      console.log(`[Orchestrator] No transition available from state="${currentState}"`);
      return;
    }

    // Verify agent is allowed by rules engine
    if (!this.rules.isAgentAllowed(transition.agent)) {
      console.log(`[Orchestrator] Agent "${transition.agent}" not allowed by rules engine`);
      return;
    }

    // Build agent input
    const agentInput: AgentInput = {
      tenantId,
      leadId: workflow.leadId,
      workflowId: workflow.id,
      data: workflow.metadata as Record<string, unknown>,
    };

    // Execute agent
    const startTime = Date.now();
    let success = false;
    let output: AgentOutput | Record<string, unknown> = {};
    let error: string | undefined;

    try {
      output = await this.agents.runAgent(transition.agent, agentInput);
      success = true;
    } catch (err) {
      error = err instanceof Error ? err.message : "Unknown error";
      console.error(`[Orchestrator] Agent "${transition.agent}" failed:`, error);
    }

    const durationMs = Date.now() - startTime;

    // Log agent execution
    await this.prisma.agentLog.create({
      data: {
        tenantId,
        workflowId,
        agentType: transition.agent,
        input: agentInput.data as unknown as Prisma.InputJsonValue,
        output: output as unknown as Prisma.InputJsonValue,
        durationMs,
        success,
        error,
        saasProduct: this.rules.getConfig().slug,
      },
    });

    // Update workflow state
    const nextState = success ? transition.successState : transition.failState;
    await this.prisma.workflow.update({
      where: { id: workflowId },
      data: {
        currentState: nextState,
        metadata: { ...(workflow.metadata as object), lastAgentOutput: output } as unknown as Prisma.InputJsonValue,
      },
    });

    console.log(`[Orchestrator] Workflow ${workflowId}: ${currentState} → ${nextState}`);

    // Emit event on success
    if (success) {
      const event: DomainEvent = {
        id: crypto.randomUUID(),
        type: transition.emitOnSuccess,
        tenantId,
        payload: { workflowId, leadId: workflow.leadId, agentOutput: output },
        timestamp: new Date(),
      };
      await this.eventBus.publish(event);
    }
  }

  async createWorkflow(
    tenantId: string,
    leadId: string,
    data: Record<string, unknown> = {}
  ): Promise<string> {
    const workflow = await this.prisma.workflow.create({
      data: {
        tenantId,
        leadId,
        workflowType: this.rules.workflowType,
        currentState: "lead_received",
        goal: this.rules.primaryGoal,
        allowedAgents: this.rules.getAllowedAgents(),
        metadata: data as unknown as Prisma.InputJsonValue,
        saasProduct: this.rules.getConfig().slug,
      },
    });

    console.log(`[Orchestrator] Created workflow=${workflow.id} type=${this.rules.workflowType} lead=${leadId}`);

    // Emit lead_created event
    await this.eventBus.publish({
      id: crypto.randomUUID(),
      type: "lead_created",
      tenantId,
      payload: { workflowId: workflow.id, leadId },
      timestamp: new Date(),
    });

    return workflow.id;
  }

  private findTransition(
    currentState: WorkflowState,
    allowedAgents: AgentType[]
  ): Transition | null {
    return (
      TRANSITIONS.find(
        (t) => t.from === currentState && allowedAgents.includes(t.agent)
      ) || null
    );
  }
}

export function createOrchestrator(
  prisma: PrismaClient,
  agents: AgentRegistry,
  rules: RulesEngine,
  eventBus: EventBus
): AgentOrchestrator {
  return new AgentOrchestrator(prisma, agents, rules, eventBus);
}
