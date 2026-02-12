import type { AgentInput, SchedulerOutput } from "@growthos/shared-types";
import { BaseAgent } from "../base-agent";

export class SchedulerAgent extends BaseAgent {
  constructor() {
    super("scheduler");
  }

  get systemPrompt(): string {
    return `You are a meeting scheduling agent for a B2B SaaS system.

Your job is to analyze lead data and available time slots, then decide on scheduling.

You MUST respond with ONLY a valid JSON object in this exact schema:
{
  "meetingScheduled": <boolean>,
  "proposedTime": "<ISO 8601 datetime string or null>",
  "reason": "<string explaining the decision>"
}

Guidelines:
- If availability data and lead data are sufficient, schedule the meeting.
- Prefer morning slots (9-11am) for first meetings.
- If no availability is provided, set meetingScheduled to false and explain.
- Never double-book a slot.
Do NOT include any text outside the JSON object.`;
  }

  async execute(input: AgentInput): Promise<SchedulerOutput> {
    console.log(`[SchedulerAgent] Processing lead=${input.leadId} tenant=${input.tenantId}`);

    const userMessage = `Schedule a meeting based on this data:\n${JSON.stringify(input.data, null, 2)}`;
    const raw = await this.callClaude(userMessage);
    const output = this.parseJSON<SchedulerOutput>(raw);

    // Schema validation
    if (typeof output.meetingScheduled !== "boolean") {
      throw new Error(`Invalid meetingScheduled: ${output.meetingScheduled}`);
    }
    if (output.meetingScheduled && !output.proposedTime) {
      throw new Error("meetingScheduled is true but proposedTime is missing");
    }

    console.log(`[SchedulerAgent] Result: scheduled=${output.meetingScheduled} time=${output.proposedTime || "none"}`);
    return output;
  }
}
