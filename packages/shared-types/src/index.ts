// ──────────────────────────────────────────────
// Tenant & Auth
// ──────────────────────────────────────────────

export interface Tenant {
  id: string;
  name: string;
  domain: string;
  plan: "free" | "starter" | "pro" | "enterprise";
  createdAt: Date;
  updatedAt: Date;
}

export interface User {
  id: string;
  tenantId: string;
  email: string;
  name: string;
  role: "admin" | "member";
  createdAt: Date;
}

export interface AuthPayload {
  userId: string;
  tenantId: string;
  role: string;
}

// ──────────────────────────────────────────────
// Leads
// ──────────────────────────────────────────────

export interface Lead {
  id: string;
  tenantId: string;
  name: string;
  email: string;
  phone?: string;
  source: string;
  status: LeadStatus;
  score?: number;
  qualificationReason?: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export type LeadStatus =
  | "new"
  | "qualified"
  | "unqualified"
  | "contacted"
  | "meeting_scheduled"
  | "converted"
  | "lost";

// ──────────────────────────────────────────────
// Meetings
// ──────────────────────────────────────────────

export interface Meeting {
  id: string;
  tenantId: string;
  leadId: string;
  scheduledAt: Date;
  duration: number;
  status: "pending" | "confirmed" | "cancelled" | "completed";
  notes?: string;
  createdAt: Date;
}

// ──────────────────────────────────────────────
// Messages
// ──────────────────────────────────────────────

export interface Message {
  id: string;
  tenantId: string;
  leadId: string;
  direction: "inbound" | "outbound";
  channel: "email" | "sms" | "webhook";
  content: string;
  sentAt: Date;
}

// ──────────────────────────────────────────────
// Workflow & Orchestration
// ──────────────────────────────────────────────

export type WorkflowType = "lead_flow" | "followup_flow" | "qualification_flow";

export type WorkflowState =
  | "lead_received"
  | "qualifying"
  | "qualified"
  | "scheduling"
  | "meeting_scheduled"
  | "following_up"
  | "escalated"
  | "completed"
  | "failed";

export interface WorkflowContext {
  id: string;
  tenantId: string;
  leadId: string;
  workflowType: WorkflowType;
  currentState: WorkflowState;
  goal: string;
  allowedAgents: AgentType[];
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

// ──────────────────────────────────────────────
// Agents
// ──────────────────────────────────────────────

export type AgentType = "qualifier" | "scheduler" | "followup";

export interface AgentInput {
  tenantId: string;
  leadId: string;
  workflowId: string;
  data: Record<string, unknown>;
}

export interface QualifierOutput {
  score: number;
  qualificationReason: string;
  nextAction: "schedule_meeting" | "followup" | "disqualify";
}

export interface SchedulerOutput {
  meetingScheduled: boolean;
  meetingId?: string;
  proposedTime?: string;
  reason?: string;
}

export interface FollowUpOutput {
  message: string;
  channel: "email" | "sms";
  escalate: boolean;
}

export type AgentOutput = QualifierOutput | SchedulerOutput | FollowUpOutput;

export interface AgentLog {
  id: string;
  tenantId: string;
  workflowId: string;
  agentType: AgentType;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  durationMs: number;
  success: boolean;
  error?: string;
  createdAt: Date;
}

// ──────────────────────────────────────────────
// Actions
// ──────────────────────────────────────────────

export type ActionType = "send_email" | "schedule_calendar" | "fire_webhook" | "update_crm";

export interface ActionRequest {
  action: ActionType;
  tenantId: string;
  payload: Record<string, unknown>;
}

export interface ActionResult {
  success: boolean;
  action: ActionType;
  data?: Record<string, unknown>;
  error?: string;
}

// ──────────────────────────────────────────────
// Events
// ──────────────────────────────────────────────

export type EventType =
  | "lead_created"
  | "lead_qualified"
  | "meeting_scheduled"
  | "meeting_confirmed"
  | "no_response"
  | "followup_required"
  | "workflow_completed"
  | "workflow_failed";

export interface DomainEvent {
  id: string;
  type: EventType;
  tenantId: string;
  payload: Record<string, unknown>;
  timestamp: Date;
}

// ──────────────────────────────────────────────
// SaaS Config
// ──────────────────────────────────────────────

export interface SaaSConfig {
  name: string;
  slug: string;
  allowedAgents: AgentType[];
  primaryGoal: string;
  monetizationEvent: EventType;
  workflowType: WorkflowType;
}

// ──────────────────────────────────────────────
// Metrics (GrowthOS integration)
// ──────────────────────────────────────────────

export interface SaaSMetrics {
  leads: number;
  replyRate: number;
  meetingsBooked: number;
  conversionRate: number;
  churn: number;
  mrr: number;
}

// ──────────────────────────────────────────────
// Pattern Insights
// ──────────────────────────────────────────────

export interface PatternInsight {
  id: string;
  tenantId: string;
  insightType: "objection_frequency" | "response_rate" | "conversion_stat";
  data: Record<string, unknown>;
  createdAt: Date;
}
