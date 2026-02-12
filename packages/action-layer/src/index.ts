import type { ActionRequest, ActionResult, ActionType } from "@growthos/shared-types";
import { EmailAction } from "./actions/email";
import { CalendarAction } from "./actions/calendar";
import { WebhookAction } from "./actions/webhook";
import { CrmAction } from "./actions/crm";

export interface ActionHandler {
  execute(request: ActionRequest): Promise<ActionResult>;
}

export class ActionLayer {
  private handlers: Map<ActionType, ActionHandler> = new Map();

  constructor() {
    this.handlers.set("send_email", new EmailAction());
    this.handlers.set("schedule_calendar", new CalendarAction());
    this.handlers.set("fire_webhook", new WebhookAction());
    this.handlers.set("update_crm", new CrmAction());
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

    try {
      const result = await handler.execute(request);
      console.log(`[ActionLayer] Completed: ${request.action} success=${result.success}`);
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      console.error(`[ActionLayer] Error: ${request.action}`, message);
      return {
        success: false,
        action: request.action,
        error: message,
      };
    }
  }
}

export function createActionLayer(): ActionLayer {
  return new ActionLayer();
}

export { EmailAction, CalendarAction, WebhookAction, CrmAction };
