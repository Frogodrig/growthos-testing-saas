---
description: "Phased system architecture builder. Strict step-by-step scaffold from SYSTEM_ARCHITECTURE.md with confirmation gates between each phase."
argument-hint: "[phase-number]"
---

You are a senior staff engineer.

You will build this system step-by-step with strict discipline.

## CRITICAL RULES

1. Do NOT invent features not mentioned in SYSTEM_ARCHITECTURE.md
2. Do NOT skip steps.
3. Do NOT generate everything at once.
4. After each step, STOP and wait for my confirmation.
5. Never hallucinate dependencies.
6. If something is unclear, choose the simplest deterministic implementation.
7. No feature creep.

Your goal is to scaffold and implement the system in controlled phases.

If the user passes a phase number as an argument (e.g. `/architect 3`), resume from that phase. Otherwise start from Phase 0.

Requested phase: $ARGUMENTS

---

## PHASE 0 — READ & SUMMARIZE

First:
- Read SYSTEM_ARCHITECTURE.md completely.
- Summarize the architecture in your own words.
- List all modules that must exist.
- List all SaaS wrappers.
- Confirm tech stack.

Do NOT generate any code yet.

**STOP after summary and wait for user confirmation.**

---

## PHASE 1 — MONOREPO SCAFFOLD

After confirmation:

Generate ONLY:
- Folder structure
- Root package.json
- Workspace config
- Base tsconfig
- Docker compose skeleton (Postgres + Redis)

No business logic yet.
No Prisma schema yet.
No agents yet.

**STOP after scaffold.**

---

## PHASE 2 — DATABASE LAYER

After confirmation:

Generate:
- Prisma schema
- All required models:
    - Tenants
    - Users
    - Leads
    - Meetings
    - Messages
    - Workflows
    - AgentLogs
    - PatternInsights

Include:
- Relations
- Indexes
- Multi-tenant isolation via tenantId

Then generate:
- Prisma client setup

**STOP after DB layer.**

---

## PHASE 3 — CORE ENGINE FOUNDATION

Generate only:

`/packages/core-engine`
- orchestrator.ts (finite state machine only)
- workflow-types.ts
- state-machine.ts

No AI calls yet.

Implement:
- Deterministic state transitions
- Allowed agent enforcement

**STOP after core engine.**

---

## PHASE 4 — AGENT IMPLEMENTATION

Now create:

`/packages/agents`

Implement:
- qualifier.agent.ts
- scheduler.agent.ts
- followup.agent.ts

Requirements:
- Each agent returns strict typed JSON
- Include Zod validation
- Stub Claude API wrapper (no real key yet)
- Agents cannot call external services

**STOP after agents.**

---

## PHASE 5 — ACTION LAYER

Create:

`/packages/action-layer`

Implement:
- email.service.ts
- calendar.service.ts (stub)
- webhook.service.ts

These should:
- Log actions
- Not actually send real emails yet
- Be mock-safe

**STOP after action layer.**

---

## PHASE 6 — FIRST SAAS WRAPPER (BOOKER)

Create:

`/apps/saas-booker`

Implement:
- config.ts
- minimal Express API
- route: POST /lead
- route: GET /metrics

Wire:
Lead -> orchestrator -> qualifier -> scheduler -> action layer

Keep UI minimal (JSON response only).

**STOP after booker works locally.**

---

## PHASE 7 — OTHER TWO SAAS

Clone structure:
- saas-leadqualifier
- saas-followup

Modify only:
- config rules
- allowed agents
- workflow goals

Do NOT duplicate engine logic.

**STOP after all 3 SaaS run independently.**

---

## DEVELOPMENT DISCIPLINE

- Every file must be fully written.
- Use TypeScript strict mode.
- Add comments explaining decisions.
- Keep everything simple.
- No embeddings.
- No vector DB.
- No external SaaS integrations yet.
- Must run locally with docker-compose.
