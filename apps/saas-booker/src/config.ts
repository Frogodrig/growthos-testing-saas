import type { SaaSConfig } from "@growthos/shared-types";

export const saasConfig: SaaSConfig = {
  name: "AI Booker",
  slug: "saas-booker",
  allowedAgents: ["qualifier", "scheduler", "followup"],
  primaryGoal: "book_meeting",
  monetizationEvent: "meeting_confirmed",
  workflowType: "lead_flow",
};
