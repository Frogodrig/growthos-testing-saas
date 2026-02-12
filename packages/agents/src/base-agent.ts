import Anthropic from "@anthropic-ai/sdk";
import type { AgentInput, AgentOutput, AgentType } from "@growthos/shared-types";

export abstract class BaseAgent {
  protected client: Anthropic;

  constructor(protected agentType: AgentType) {
    this.client = new Anthropic();
  }

  abstract get systemPrompt(): string;

  protected async callClaude(userMessage: string): Promise<string> {
    const startTime = Date.now();

    const response = await this.client.messages.create({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 1024,
      system: this.systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    });

    const durationMs = Date.now() - startTime;
    const text = response.content[0].type === "text" ? response.content[0].text : "";

    console.log(`[Agent:${this.agentType}] Claude call completed in ${durationMs}ms`);
    return text;
  }

  protected parseJSON<T>(raw: string): T {
    // Extract JSON from potential markdown code blocks
    const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, raw];
    const cleaned = (jsonMatch[1] || raw).trim();

    try {
      return JSON.parse(cleaned) as T;
    } catch {
      throw new Error(`[Agent:${this.agentType}] Failed to parse JSON output: ${cleaned.slice(0, 200)}`);
    }
  }

  abstract execute(input: AgentInput): Promise<AgentOutput>;
}
