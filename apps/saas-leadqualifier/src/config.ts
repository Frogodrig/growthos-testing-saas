import type { SaaSConfig } from "@growthos/shared-types";

export const saasConfig: SaaSConfig = {
  name: "AI Lead Qualifier",
  slug: "saas-leadqualifier",
  allowedAgents: ["qualifier", "followup"],
  primaryGoal: "qualify_lead",
  monetizationEvent: "lead_qualified",
  workflowType: "qualification_flow",
};
