import { Resend } from "resend";
import type { ActionRequest, ActionResult } from "@growthos/shared-types";
import type { ActionHandler } from "../index";

export class EmailAction implements ActionHandler {
  private resend: Resend;

  constructor() {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error("RESEND_API_KEY environment variable is required");
    }
    this.resend = new Resend(apiKey);
  }

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

    const startTime = Date.now();

    try {
      const { data, error } = await this.resend.emails.send({
        from: "GrowthOS <onboarding@resend.dev>",
        to: [to],
        subject,
        html: body,
        tags: [{ name: "tenantId", value: request.tenantId }],
      });

      const durationMs = Date.now() - startTime;

      if (error) {
        console.error(
          `[EmailAction] Failed to=${to} (${durationMs}ms) tenant=${request.tenantId}: ${error.message}`
        );
        return {
          success: false,
          action: "send_email",
          error: error.message,
          data: { to, subject, durationMs, sentAt: new Date().toISOString() },
        };
      }

      console.log(
        `[EmailAction] Sent to=${to} messageId=${data?.id} (${durationMs}ms) tenant=${request.tenantId}`
      );

      return {
        success: true,
        action: "send_email",
        data: {
          to,
          subject,
          messageId: data?.id,
          durationMs,
          sentAt: new Date().toISOString(),
        },
      };
    } catch (err) {
      const durationMs = Date.now() - startTime;
      const errorMessage = err instanceof Error ? err.message : String(err);

      console.error(
        `[EmailAction] Exception to=${to} (${durationMs}ms) tenant=${request.tenantId}: ${errorMessage}`
      );

      return {
        success: false,
        action: "send_email",
        error: errorMessage,
        data: { to, subject, durationMs, sentAt: new Date().toISOString() },
      };
    }
  }
}
