import type { SaaSConfig } from "@growthos/shared-types";

export const saasConfig: SaaSConfig = {
  name: "AI FollowUp Automation",
  slug: "saas-followup",
  allowedAgents: ["followup"],
  primaryGoal: "automate_followups",
  monetizationEvent: "meeting_confirmed",
  workflowType: "followup_flow",
};
