---
description: "Request a requirement modification through the architect skill. Used by engineer, tester, or other roles to update requirement status or details."
argument-hint: "<RequirementID> <Field> <NewValue> [Reason]"
---

You are routing a modification request to the architect skill.

You CANNOT modify `/architect/requirements.csv` directly.
You MUST delegate to the architect skill using a [MOD-REQUEST] tag.

## INPUT

The user provides: $ARGUMENTS

## PARSE

Extract from the arguments:
- RequirementID (e.g., AUTH-002)
- Field to modify (e.g., Status, Title, Description)
- New value
- Reason (optional, but encouraged)

If the input is ambiguous, ask the user to clarify before proceeding.

## DELEGATE

Invoke the architect skill with the following formatted request:

```
/architect [MOD-REQUEST] RequestedBy: user, RequirementID: <ID>, Field: <field>, NewValue: <value>, Reason: <reason>
```

This routes the request through the architect's governance system (Section C), which will:
1. Validate the request
2. Check logical consistency (e.g., status transitions)
3. Approve or reject with reasoning
4. Log the decision in `/architect/modification_log.csv`

## IMPORTANT

- You do NOT have permission to edit `/architect/requirements.csv` or `/architect/modification_log.csv`.
- Only the `/architect` command can modify those files.
- If the architect rejects the request, inform the user of the reason and suggest a valid alternative.
