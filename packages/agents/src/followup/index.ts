import type { AgentInput, FollowUpOutput } from "@growthos/shared-types";
import { BaseAgent } from "../base-agent";

export class FollowUpAgent extends BaseAgent {
  constructor() {
    super("followup");
  }

  get systemPrompt(): string {
    return `You are a follow-up message agent for a B2B SaaS system.

Your job is to craft the next follow-up message for a lead based on their status and interaction history.

You MUST respond with ONLY a valid JSON object in this exact schema:
{
  "message": "<the follow-up message text>",
  "channel": "<one of: email | sms>",
  "escalate": <boolean>
}

Guidelines:
- Keep messages concise, professional, and personalized.
- If lead has not responded after 3+ attempts, set escalate to true.
- Use email by default, SMS only for urgent/time-sensitive situations.
- Never be pushy or aggressive. Be helpful.
- Reference previous interactions when available.
Do NOT include any text outside the JSON object.`;
  }

  async execute(input: AgentInput): Promise<FollowUpOutput> {
    console.log(`[FollowUpAgent] Processing lead=${input.leadId} tenant=${input.tenantId}`);

    const userMessage = `Generate a follow-up for this lead:\n${JSON.stringify(input.data, null, 2)}`;
    const raw = await this.callLLM(userMessage);
    const output = this.parseJSON<FollowUpOutput>(raw);

    // Schema validation
    if (typeof output.message !== "string" || !output.message) {
      throw new Error("Missing or empty message");
    }
    if (!["email", "sms"].includes(output.channel)) {
      throw new Error(`Invalid channel: ${output.channel}`);
    }
    if (typeof output.escalate !== "boolean") {
      throw new Error(`Invalid escalate: ${output.escalate}`);
    }

    console.log(`[FollowUpAgent] Result: channel=${output.channel} escalate=${output.escalate}`);
    return output;
  }
}
