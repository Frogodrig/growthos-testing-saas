import type { ActionRequest, ActionResult } from "@growthos/shared-types";
import type { ActionHandler } from "../index";

export class EmailAction implements ActionHandler {
  async execute(request: ActionRequest): Promise<ActionResult> {
    const { to, subject, body } = request.payload as {
      to: string;
      subject: string;
      body: string;
    };

    if (!to || !subject || !body) {
      return {
        success: false,
        action: "send_email",
        error: "Missing required fields: to, subject, body",
      };
    }

    // TODO: Integrate real email provider (SendGrid, SES, etc.)
    console.log(`[EmailAction] Sending email to=${to} subject="${subject}" tenant=${request.tenantId}`);

    return {
      success: true,
      action: "send_email",
      data: { to, subject, sentAt: new Date().toISOString() },
    };
  }
}
