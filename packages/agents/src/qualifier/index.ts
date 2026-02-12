import type { AgentInput, QualifierOutput } from "@growthos/shared-types";
import { BaseAgent } from "../base-agent";

export class QualifierAgent extends BaseAgent {
  constructor() {
    super("qualifier");
  }

  get systemPrompt(): string {
    return `You are a lead qualification agent for a B2B SaaS system.

Your job is to analyze incoming lead data and produce a qualification assessment.

You MUST respond with ONLY a valid JSON object in this exact schema:
{
  "score": <number 0-100>,
  "qualificationReason": "<string explaining why>",
  "nextAction": "<one of: schedule_meeting | followup | disqualify>"
}

Scoring guidelines:
- 80-100: Hot lead, schedule meeting immediately
- 50-79: Warm lead, follow up with more info
- 0-49: Cold or unqualified, disqualify

Consider: company size, role seniority, stated intent, budget signals, timeline.
Do NOT include any text outside the JSON object.`;
  }

  async execute(input: AgentInput): Promise<QualifierOutput> {
    console.log(`[QualifierAgent] Processing lead=${input.leadId} tenant=${input.tenantId}`);

    const userMessage = `Qualify this lead:\n${JSON.stringify(input.data, null, 2)}`;
    const raw = await this.callClaude(userMessage);
    const output = this.parseJSON<QualifierOutput>(raw);

    // Schema validation
    if (typeof output.score !== "number" || output.score < 0 || output.score > 100) {
      throw new Error(`Invalid score: ${output.score}`);
    }
    if (!["schedule_meeting", "followup", "disqualify"].includes(output.nextAction)) {
      throw new Error(`Invalid nextAction: ${output.nextAction}`);
    }
    if (typeof output.qualificationReason !== "string" || !output.qualificationReason) {
      throw new Error("Missing qualificationReason");
    }

    console.log(`[QualifierAgent] Result: score=${output.score} action=${output.nextAction}`);
    return output;
  }
}
