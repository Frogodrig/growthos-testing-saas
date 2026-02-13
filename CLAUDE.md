# GrowthOS — Project Development Process

## How This Project Is Built

This project follows a structured, governed development process managed through the `/architect` skill. Every feature, infrastructure change, or enhancement flows through this pipeline. No ad-hoc coding.

## Process Flow

```
┌─────────────┐     ┌──────────────────┐     ┌────────────────────┐     ┌────────────────┐
│  1. ADD      │     │  2. BREAK DOWN   │     │  3. PLAN           │     │  4. IMPLEMENT  │
│  PHASE       │────▶│  REQUIREMENTS    │────▶│  EXECUTION         │────▶│  CODE          │
│  /architect  │     │  /architect      │     │  /architect        │     │  /engineer     │
│  [AP]        │     │  [PO]            │     │  run PH-XXX        │     │  <ID>          │
└─────────────┘     └──────────────────┘     └────────────────────┘     └────────────────┘
   Architect            Architect                Architect          ──▶   Engineer (handoff)
                                                                               │
                                                                               ▼
                                                                        ┌────────────────┐
                                                                        │  5. UPDATE      │
                                                                        │  STATUS         │
                                                                        │  Engineer asks   │
                                                                        │  Architect via   │
                                                                        │  [MOD-REQUEST]  │
                                                                        └────────────────┘
```

### Step 1 — Add Phase (`/architect [AP] ...`)

The user (or product owner) defines a high-level business/tech milestone. This is strategic — it describes WHAT needs to exist, not HOW to build it.

Example: `/architect [AP] Create real-time notification system for lead status changes`

The architect:
- Assigns a PhaseID (PH-001, PH-002, ...)
- Classifies the type (infrastructure, backend, frontend, etc.)
- Detects dependencies on existing phases
- Suggests 3-8 high-level requirements this phase implies
- Writes to `/architect/phases.csv`
- Prompts the user: "Would you like me to break this down into tracked requirements now?"

### Step 2 — Break Down into Requirements (`/architect [PO] ...`)

The user (acting as Product Owner) triggers requirement breakdown — either immediately after a phase or later.

Example: `/architect [PO] Break down phase PH-003 into requirements`

The architect:
- Reads the phase description
- Splits into atomic, independently actionable requirements
- Assigns category-based IDs (AUTH-001, API-002, INFRA-003, ...)
- Links requirements back to the originating phase
- Writes to `/architect/requirements.csv`
- Default status: "Backlog"

Standalone requirements (not tied to a phase) are also supported:
`/architect [PO] Add rate limiting to all API endpoints`

### Step 3 — Plan Execution (`/architect run PH-XXX`)

When ready to work on a phase, the architect produces implementation plans.

The architect does NOT write code. It:
- Verifies all phase dependencies are satisfied
- Loads all linked requirements
- For each requirement, produces a detailed implementation plan (files to create/modify, steps, acceptance criteria)
- Updates phase status to "In Progress"
- Updates requirement statuses to "To Do"

These plans are then handed off to an engineer (human or skill) for implementation.

### Step 4 — Implement (`/engineer <ID>`)

The architect hands off to the senior software engineer skill. The engineer:
- Reads the requirement from requirements.csv
- Explores the codebase to understand existing patterns and conventions
- Announces what files will be created/modified
- Writes code following existing project patterns (TypeScript strict, Fastify, Prisma, etc.)
- Verifies the build passes (`npm run build`)
- Runs tests if they exist
- Reports what was created/modified
- Automatically requests a status update from the architect (`→ In Review`)

Usage:
- `/engineer AUTH-001` — implement a single requirement
- `/engineer PH-002` — implement all ready requirements in a phase
- `/engineer` — list what's ready to implement

### Step 5 — Update Status (`/architect-update` or `/architect [MOD-REQUEST] ...`)

After implementing a requirement, the engineer requests a status update:

`/architect-update AUTH-001 Status "In Review"`

The architect:
- Validates the transition is logical (no skipping stages)
- Approves or rejects with reasoning
- Logs every decision in `/architect/modification_log.csv`
- Updates the CSV if approved

When all requirements in a phase reach Done/Complete, the phase can be marked Completed.

## Status Lifecycles

**Requirements:**
```
Backlog → To Do → Pending Development → In Development → In Review → Done → Complete
```

**Phases:**
```
Planned → In Progress → Completed → Archived
```

Both support `→ Blocked` from any status (with justification).

## Storage Files

All governance data lives in `/architect/`:

| File | Purpose | Who can modify |
|------|---------|----------------|
| `phases.csv` | Strategic milestones (PhaseID, Title, Description, Type, Status, Dependencies, LinkedRequirements) | Architect only |
| `requirements.csv` | Tactical items (RequirementID, Category, Title, Description, Status, PhaseID) | Architect only |
| `modification_log.csv` | Append-only audit trail of every change request (approved or rejected) | Architect only |

## Commands Reference

| Command | What it does |
|---------|-------------|
| `/architect [AP] <description>` | Add a new phase |
| `/architect [PO] <requirements>` | Create requirements (inline or from phase) |
| `/architect [PO] refer to task at [@path/file.md]` | Create requirements from a file |
| `/architect [MOD-REQUEST] RequestedBy: X, RequirementID: Y, Field: Z, NewValue: W, Reason: R` | Request a modification |
| `/architect run PH-XXX` | Generate implementation plans for a phase |
| `/architect list` or `/architect` | Show all phases with status summary |
| `/architect-update <ID> <Field> <Value>` | Convenience command to request modifications |
| `/engineer <RequirementID>` | Implement a single requirement (writes code, builds, tests) |
| `/engineer <PhaseID>` | Implement all ready requirements in a phase sequentially |
| `/engineer` | List all requirements ready for implementation |

## Key Rules

1. **Phases are strategic, requirements are tactical.** A phase generates many requirements.
2. **Only the architect skill modifies CSV files.** All other skills must go through [MOD-REQUEST].
3. **IDs are permanent.** PhaseIDs and RequirementIDs are never reused or modified.
4. **Every modification is logged.** Even rejected requests get an audit entry.
5. **No skipping status stages** without explicit justification.
6. **Dependencies are phase-to-phase only.** A phase depends on entire other phases being complete.
7. **The architect plans, the engineer builds.** The `run` command produces plans, not code. The `/engineer` skill writes code.
8. **Engineer never modifies governance files.** Status updates flow back through the architect via [MOD-REQUEST].
9. **Engineer stays in scope.** Only implements what the requirement specifies. Bugs found outside scope are reported, not fixed.
