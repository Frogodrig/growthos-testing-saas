import type { AgentType, AgentInput, AgentOutput } from "@growthos/shared-types";
import { BaseAgent } from "./base-agent";
import { QualifierAgent } from "./qualifier";
import { SchedulerAgent } from "./scheduler";
import { FollowUpAgent } from "./followup";

export class AgentRegistry {
  private agents: Map<AgentType, BaseAgent> = new Map();

  constructor() {
    this.agents.set("qualifier", new QualifierAgent());
    this.agents.set("scheduler", new SchedulerAgent());
    this.agents.set("followup", new FollowUpAgent());
  }

  getAgent(type: AgentType): BaseAgent {
    const agent = this.agents.get(type);
    if (!agent) {
      throw new Error(`Unknown agent type: ${type}`);
    }
    return agent;
  }

  async runAgent(type: AgentType, input: AgentInput): Promise<AgentOutput> {
    const agent = this.getAgent(type);
    const startTime = Date.now();

    try {
      const result = await agent.execute(input);
      const durationMs = Date.now() - startTime;
      console.log(`[AgentRegistry] Agent "${type}" completed in ${durationMs}ms`);
      return result;
    } catch (error) {
      const durationMs = Date.now() - startTime;
      console.error(`[AgentRegistry] Agent "${type}" failed after ${durationMs}ms`, error);
      throw error;
    }
  }
}

export function createAgentRegistry(): AgentRegistry {
  return new AgentRegistry();
}

export { BaseAgent, QualifierAgent, SchedulerAgent, FollowUpAgent };
