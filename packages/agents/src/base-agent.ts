import { GoogleGenerativeAI } from "@google/generative-ai";
import type { AgentInput, AgentOutput, AgentType } from "@growthos/shared-types";

export abstract class BaseAgent {
  protected client: GoogleGenerativeAI;

  constructor(protected agentType: AgentType) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is required");
    }
    this.client = new GoogleGenerativeAI(apiKey);
  }

  abstract get systemPrompt(): string;

  protected async callLLM(userMessage: string): Promise<string> {
    const startTime = Date.now();

    const model = this.client.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: this.systemPrompt,
    });

    const result = await model.generateContent(userMessage);
    const text = result.response.text();

    const durationMs = Date.now() - startTime;
    console.log(`[Agent:${this.agentType}] Gemini call completed in ${durationMs}ms`);
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
