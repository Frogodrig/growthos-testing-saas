import { config } from "./config";

/**
 * Product-specific copy and terminology.
 * Each SaaS feels like a standalone product — users never see the other two exist.
 */

interface ProductCopy {
  // Landing page
  headline: string;
  subheadline: string;
  ctaLabel: string;

  // Signup
  signupHeading: string;
  signupSubtext: string;

  // Login
  loginHeading: string;

  // Dashboard
  dashboardHeading: string;
  dashboardSubtext: string;

  // Lead form
  leadFormTitle: string;
  leadFormDescription: string;
  leadSubmitLabel: string;
  leadNameLabel: string;
  leadNamePlaceholder: string;
  leadListTitle: string;
  leadEmptyState: string;

  // Lead detail
  processButtonLabel: string;
}

const COPY: Record<string, ProductCopy> = {
  "saas-booker": {
    headline: "Book more meetings on autopilot",
    subheadline: "AI qualifies your leads, schedules meetings, and follows up — so you close more deals without the busywork.",
    ctaLabel: "Start booking meetings",
    signupHeading: "Get started with AI Booker",
    signupSubtext: "Create your account to start booking meetings automatically",
    loginHeading: "Welcome back",
    dashboardHeading: "Your Booking Dashboard",
    dashboardSubtext: "Here's how your AI pipeline is performing",
    leadFormTitle: "Add a new prospect",
    leadFormDescription: "Enter a lead and the AI will qualify, schedule, and follow up automatically.",
    leadSubmitLabel: "Add Prospect",
    leadNameLabel: "Prospect Name",
    leadNamePlaceholder: "Jane Smith",
    leadListTitle: "Your Prospects",
    leadEmptyState: "No prospects yet. Add your first one above.",
    processButtonLabel: "Run AI Pipeline",
  },
  "saas-leadqualifier": {
    headline: "Instantly know which leads are worth your time",
    subheadline: "AI scores and qualifies every inbound lead — so your sales team only talks to the ones that convert.",
    ctaLabel: "Start qualifying leads",
    signupHeading: "Get started with AI Lead Qualifier",
    signupSubtext: "Create your account to start qualifying leads automatically",
    loginHeading: "Welcome back",
    dashboardHeading: "Your Qualification Dashboard",
    dashboardSubtext: "Here's how your AI is filtering leads",
    leadFormTitle: "Submit a lead for qualification",
    leadFormDescription: "Enter a lead and the AI will score and qualify them instantly.",
    leadSubmitLabel: "Qualify Lead",
    leadNameLabel: "Lead Name",
    leadNamePlaceholder: "Jane Smith",
    leadListTitle: "Qualified Leads",
    leadEmptyState: "No leads yet. Submit your first one for qualification.",
    processButtonLabel: "Re-qualify",
  },
  "saas-followup": {
    headline: "Never let a lead go cold again",
    subheadline: "AI sends personalized follow-ups at the right time — so no opportunity slips through the cracks.",
    ctaLabel: "Start following up automatically",
    signupHeading: "Get started with AI FollowUp",
    signupSubtext: "Create your account to automate your follow-up sequences",
    loginHeading: "Welcome back",
    dashboardHeading: "Your Follow-Up Dashboard",
    dashboardSubtext: "Here's how your automated outreach is performing",
    leadFormTitle: "Add a contact to follow up with",
    leadFormDescription: "Enter a contact and the AI will start a personalized follow-up sequence.",
    leadSubmitLabel: "Start Follow-Up",
    leadNameLabel: "Contact Name",
    leadNamePlaceholder: "Jane Smith",
    leadListTitle: "Your Contacts",
    leadEmptyState: "No contacts yet. Add your first one above.",
    processButtonLabel: "Send Follow-Up",
  },
};

const DEFAULT_COPY: ProductCopy = COPY["saas-booker"];

export function getProductCopy(): ProductCopy {
  return COPY[config.slug] || DEFAULT_COPY;
}

export const productCopy = getProductCopy();
