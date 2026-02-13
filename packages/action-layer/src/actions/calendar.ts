import { google } from "googleapis";
import type { ActionRequest, ActionResult } from "@growthos/shared-types";
import type { ActionHandler } from "../index";

export class CalendarAction implements ActionHandler {
  private getCalendarClient() {
    const credentialsJson = process.env.GOOGLE_CALENDAR_CREDENTIALS;
    if (!credentialsJson) {
      throw new Error("GOOGLE_CALENDAR_CREDENTIALS environment variable is required");
    }

    const credentials = JSON.parse(credentialsJson);
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/calendar"],
    });

    return google.calendar({ version: "v3", auth });
  }

  async execute(request: ActionRequest): Promise<ActionResult> {
    const { leadId, scheduledAt, duration, calendarId } = request.payload as {
      leadId: string;
      scheduledAt: string;
      duration?: number;
      calendarId?: string;
    };

    if (!leadId || !scheduledAt) {
      return {
        success: false,
        action: "schedule_calendar",
        error: "Missing required fields: leadId, scheduledAt",
      };
    }

    const meetingDuration = duration || 30;
    const startTime = Date.now();

    try {
      const calendar = this.getCalendarClient();

      const startDate = new Date(scheduledAt);
      const endDate = new Date(startDate.getTime() + meetingDuration * 60 * 1000);

      const event = await calendar.events.insert({
        calendarId: calendarId || "primary",
        requestBody: {
          summary: `GrowthOS Meeting — Lead ${leadId}`,
          description: `Auto-scheduled by GrowthOS for tenant ${request.tenantId}`,
          start: { dateTime: startDate.toISOString() },
          end: { dateTime: endDate.toISOString() },
        },
      });

      const durationMs = Date.now() - startTime;

      console.log(
        `[CalendarAction] Created event=${event.data.id} for lead=${leadId} (${durationMs}ms) tenant=${request.tenantId}`
      );

      return {
        success: true,
        action: "schedule_calendar",
        data: {
          leadId,
          scheduledAt,
          duration: meetingDuration,
          eventId: event.data.id,
          eventLink: event.data.htmlLink,
          durationMs,
        },
      };
    } catch (err) {
      const durationMs = Date.now() - startTime;
      const errorMessage = err instanceof Error ? err.message : String(err);

      console.error(
        `[CalendarAction] Failed for lead=${leadId} (${durationMs}ms) tenant=${request.tenantId}: ${errorMessage}`
      );

      return {
        success: false,
        action: "schedule_calendar",
        error: errorMessage,
        data: { leadId, scheduledAt, duration: meetingDuration, durationMs },
      };
    }
  }
}
