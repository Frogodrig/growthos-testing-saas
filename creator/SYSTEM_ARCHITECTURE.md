# GROWTHOS TESTING SAAS SYSTEM
## Core AI Engine + 3 Spawned SaaS (Production Intent)

This repository will contain:

1. A reusable Core AI Business Execution Engine (BEE)
2. Three SaaS products built as wrappers on top of it
3. Shared infra, database, and agent orchestration

This is not a prototype.
This is a real business system designed to test GrowthOS and later integrate with Decidos.

------------------------------------------------------------
SECTION 1 — OVERALL ARCHITECTURE
------------------------------------------------------------

We are building a MONOREPO with the following structure:

/apps
    /saas-booker
    /saas-leadqualifier
    /saas-followup
/packages
    /core-engine
    /agent-orchestrator
    /agents
    /rules-engine
    /memory
    /action-layer
    /shared-types
/services
    /api-gateway
    /worker
    /scheduler
/infrastructure
    docker-compose.yml
    env.example
    prisma-schema
/docs

Tech Stack:
- Backend: Node.js + TypeScript
- API: Express or Fastify
- Database: PostgreSQL (Prisma ORM)
- Queue: Redis + BullMQ
- Auth: JWT-based multi-tenant
- AI: Claude API wrapper module
- Frontend: Next.js (minimal dashboards)

------------------------------------------------------------
SECTION 2 — CORE AI BUSINESS EXECUTION ENGINE (BEE)
------------------------------------------------------------

The Core Engine must be reusable and SaaS-agnostic.

It consists of 6 modules:

1. Agent Orchestrator
2. Specialized Agents
3. Rules Engine
4. Memory System
5. Action Layer
6. Event Bus

------------------------------------------------------------
2.1 AGENT ORCHESTRATOR
------------------------------------------------------------

Purpose:
Control state transitions and decide which agent runs.

Implementation:
Finite state machine, not AI.

Example state:

{
  tenantId: "uuid",
  workflowType: "lead_flow",
  currentState: "lead_received",
  goal: "book_meeting",
  allowedAgents: ["qualifier", "scheduler"]
}

The orchestrator:
- Reads workflow state
- Calls allowed agent
- Updates state
- Emits events

No AI decision here.

------------------------------------------------------------
2.2 SPECIALIZED AGENTS
------------------------------------------------------------

Agents use Claude API internally but operate under strict input/output schema.

Agents required:

A) Qualifier Agent
- Input: lead data
- Output: { score, qualificationReason, nextAction }

B) Scheduler Agent
- Input: availability + lead
- Output: { meetingScheduled: true/false }

C) FollowUp Agent
- Input: lead status
- Output: next message

All agents must:
- Return strict JSON
- Have schema validation
- Never call external services directly

------------------------------------------------------------
2.3 RULES ENGINE
------------------------------------------------------------

Each SaaS has a config file:

/apps/saas-booker/config.ts
/apps/saas-leadqualifier/config.ts
/apps/saas-followup/config.ts

Example:

export const saasConfig = {
    name: "AI Booker",
    allowedAgents: ["qualifier", "scheduler", "followup"],
    primaryGoal: "book_meeting",
    monetizationEvent: "meeting_confirmed",
    workflowType: "lead_flow"
}

Rules engine:
- Injects config into orchestrator
- Restricts agent access
- Defines monetization triggers

------------------------------------------------------------
2.4 MEMORY SYSTEM
------------------------------------------------------------

Three-layer memory architecture:

1. Session Memory (short-term)
2. Entity Memory (persistent structured DB)
3. Pattern Memory (aggregated insights)

Database tables:

Tenants
Users
Leads
Meetings
Messages
Workflows
AgentLogs
PatternInsights

PatternInsights stores:
- objection frequency
- response rates
- conversion stats

------------------------------------------------------------
2.5 ACTION LAYER
------------------------------------------------------------

Non-AI execution services:

- Email service
- Calendar service
- Webhook dispatcher
- CRM connector

Agents request actions like:

{
  action: "send_email",
  payload: { ... }
}

Action layer executes.

------------------------------------------------------------
2.6 EVENT BUS
------------------------------------------------------------

Use Redis + BullMQ.

Events:
- lead_created
- meeting_scheduled
- no_response
- followup_required

Workers process asynchronously.

------------------------------------------------------------
SECTION 3 — THE THREE SAAS PRODUCTS
------------------------------------------------------------

All share same engine.
Only UI + config differ.

------------------------------------------------------------
SAAS 1 — AI WHITE LABEL BOOKER
------------------------------------------------------------

Target:
Service businesses & agencies

Features:
- Booking widget
- Lead qualification
- Auto scheduling
- Followups
- Dashboard for meetings

Monetization:
Per tenant monthly subscription

Workflow:
Lead → Qualifier → Scheduler → Confirmation

------------------------------------------------------------
SAAS 2 — AI LEAD QUALIFIER
------------------------------------------------------------

Target:
B2B founders

Features:
- Inbound form qualification
- Lead scoring
- Email response automation
- CRM tagging

Workflow:
Lead → Qualifier → Score → Followup

No scheduling agent.

------------------------------------------------------------
SAAS 3 — AI FOLLOWUP AUTOMATION
------------------------------------------------------------

Target:
Sales-heavy teams

Features:
- Automated followups
- No-response nudges
- Meeting reminder logic
- Objection detection

Workflow:
Lead → Followup loop → Escalation

------------------------------------------------------------
SECTION 4 — MULTI TENANCY
------------------------------------------------------------

Every request must include tenantId.

Data isolation enforced at:
- Database query level
- JWT auth middleware
- Workflow state

------------------------------------------------------------
SECTION 5 — GROWTHOS INTEGRATION
------------------------------------------------------------

Each SaaS must expose metrics endpoint:

GET /metrics

Returns:
{
  leads,
  replyRate,
  meetingsBooked,
  conversionRate,
  churn,
  mrr
}

GrowthOS will use this to analyze experiments.

------------------------------------------------------------
SECTION 6 — DEVELOPMENT STEPS
------------------------------------------------------------

Step 1:
Create monorepo structure.

Step 2:
Build core-engine first before any SaaS UI.

Step 3:
Implement:
- Orchestrator
- Qualifier Agent
- Basic Email Action

Step 4:
Connect saas-booker wrapper.

Step 5:
Deploy locally with Docker.

------------------------------------------------------------
SECTION 7 — NON-NEGOTIABLE CONSTRAINTS
------------------------------------------------------------

- No feature creep.
- No additional agents in v1.
- No embeddings memory yet.
- No vector DB in v1.
- No AI in orchestration.
- Strict JSON schemas everywhere.
- Logging must be verbose.

------------------------------------------------------------
SECTION 8 — OBJECTIVE
------------------------------------------------------------

This system must allow:

1 core AI engine
3 SaaS wrappers
Clear experiment isolation
Scalable to 10 SaaS later

The goal is execution velocity, not perfection.