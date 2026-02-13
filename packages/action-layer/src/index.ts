import type { ActionRequest, ActionResult, ActionType } from "@growthos/shared-types";
import { EmailAction } from "./actions/email";
import { CalendarAction } from "./actions/calendar";
import { WebhookAction } from "./actions/webhook";
import { CrmAction } from "./actions/crm";

export interface ActionHandler {
  execute(request: ActionRequest): Promise<ActionResult>;
}

export interface ActionLogEntry {
  tenantId: string;
  actionType: string;
  payload: Record<string, unknown>;
  success: boolean;
  durationMs: number;
  error?: string;
}

export type ActionLogger = (entry: ActionLogEntry) => Promise<void>;

export class ActionLayer {
  private handlers: Map<ActionType, ActionHandler> = new Map();
  private logger: ActionLogger | null = null;

  constructor() {
    this.handlers.set("send_email", new EmailAction());
    this.handlers.set("schedule_calendar", new CalendarAction());
    this.handlers.set("fire_webhook", new WebhookAction());
    this.handlers.set("update_crm", new CrmAction());
  }

  setLogger(logger: ActionLogger): void {
    this.logger = logger;
  }

  async execute(request: ActionRequest): Promise<ActionResult> {
    const handler = this.handlers.get(request.action);
    if (!handler) {
      return {
        success: false,
        action: request.action,
        error: `No handler registered for action: ${request.action}`,
      };
    }

    console.log(`[ActionLayer] Executing: ${request.action} tenant=${request.tenantId}`);

    const startTime = Date.now();
    let result: ActionResult;

    try {
      result = await handler.execute(request);
      console.log(`[ActionLayer] Completed: ${request.action} success=${result.success}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      console.error(`[ActionLayer] Error: ${request.action}`, message);
      result = {
        success: false,
        action: request.action,
        error: message,
      };
    }

    const durationMs = Date.now() - startTime;

    if (this.logger) {
      try {
        await this.logger({
          tenantId: request.tenantId,
          actionType: request.action,
          payload: request.payload,
          success: result.success,
          durationMs,
          error: result.error,
        });
      } catch (logError) {
        console.error("[ActionLayer] Failed to log action:", logError);
      }
    }

    return result;
  }
}

export function createActionLayer(): ActionLayer {
  return new ActionLayer();
}

export { EmailAction, CalendarAction, WebhookAction, CrmAction };
export {
  createStripeCustomer,
  createCheckoutSession,
  constructWebhookEvent,
  parseSubscriptionEvent,
} from "./services/stripe";
export type { StripeWebhookEvent } from "./services/stripe";
