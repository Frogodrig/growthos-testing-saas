import type { ActionRequest, ActionResult } from "@growthos/shared-types";
import type { ActionHandler } from "../index";

export class WebhookAction implements ActionHandler {
  async execute(request: ActionRequest): Promise<ActionResult> {
    const { url, method, body } = request.payload as {
      url: string;
      method?: string;
      body?: Record<string, unknown>;
    };

    if (!url) {
      return {
        success: false,
        action: "fire_webhook",
        error: "Missing required field: url",
      };
    }

    const httpMethod = method || "POST";
    const startTime = Date.now();

    try {
      const response = await fetch(url, {
        method: httpMethod,
        headers: {
          "Content-Type": "application/json",
          "X-GrowthOS-Tenant": request.tenantId,
          "X-GrowthOS-Timestamp": new Date().toISOString(),
        },
        body: httpMethod !== "GET" ? JSON.stringify(body || {}) : undefined,
      });

      const durationMs = Date.now() - startTime;

      console.log(
        `[WebhookAction] ${httpMethod} ${url} → ${response.status} (${durationMs}ms) tenant=${request.tenantId}`
      );

      return {
        success: response.ok,
        action: "fire_webhook",
        data: {
          url,
          method: httpMethod,
          statusCode: response.status,
          durationMs,
          firedAt: new Date().toISOString(),
        },
        ...(!response.ok && { error: `HTTP ${response.status} ${response.statusText}` }),
      };
    } catch (err) {
      const durationMs = Date.now() - startTime;
      const errorMessage = err instanceof Error ? err.message : String(err);

      console.error(
        `[WebhookAction] ${httpMethod} ${url} → FAILED (${durationMs}ms) tenant=${request.tenantId}: ${errorMessage}`
      );

      return {
        success: false,
        action: "fire_webhook",
        error: errorMessage,
        data: { url, method: httpMethod, durationMs, firedAt: new Date().toISOString() },
      };
    }
  }
}
