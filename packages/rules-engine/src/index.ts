import type { SaaSConfig, AgentType, WorkflowType, EventType } from "@growthos/shared-types";

export class RulesEngine {
  constructor(private config: SaaSConfig) {}

  get name(): string {
    return this.config.name;
  }

  get workflowType(): WorkflowType {
    return this.config.workflowType;
  }

  get primaryGoal(): string {
    return this.config.primaryGoal;
  }

  get monetizationEvent(): EventType {
    return this.config.monetizationEvent;
  }

  isAgentAllowed(agentType: AgentType): boolean {
    return this.config.allowedAgents.includes(agentType);
  }

  getAllowedAgents(): AgentType[] {
    return [...this.config.allowedAgents];
  }

  isMonetizationEvent(eventType: EventType): boolean {
    return eventType === this.config.monetizationEvent;
  }

  getConfig(): Readonly<SaaSConfig> {
    return Object.freeze({ ...this.config });
  }
}

export function createRulesEngine(config: SaaSConfig): RulesEngine {
  console.log(`[RulesEngine] Initialized for "${config.name}" with agents: [${config.allowedAgents.join(", ")}]`);
  return new RulesEngine(config);
}
