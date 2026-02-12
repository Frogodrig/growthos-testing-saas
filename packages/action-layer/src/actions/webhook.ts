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

    // TODO: Implement actual HTTP request with retry logic
    console.log(`[WebhookAction] Firing webhook url=${url} method=${method || "POST"} tenant=${request.tenantId}`);

    return {
      success: true,
      action: "fire_webhook",
      data: { url, method: method || "POST", firedAt: new Date().toISOString() },
    };
  }
}
