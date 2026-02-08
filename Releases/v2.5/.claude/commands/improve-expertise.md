---
description: Run self-improve on an expert's mental model to sync with codebase. Use periodically to keep expertise files accurate.
argument-hint: <domain-name> [check-git-diff]
allowed-tools: Read, Write, Edit, Glob, Grep, Bash
---

# Improve Expertise

Run the self-improve workflow on an agent expert's expertise file to maintain accuracy.

## Arguments

- `$1`: Domain name (required, e.g., "database", "websocket")
- `$2`: Check git diff flag (optional, "true" or "false", default: "true")

## Instructions

You are running the self-improve workflow to sync an expert's mental model with the actual codebase.

### Step 1: Parse Arguments

Extract:

- Domain name from `$1` (required)
- Check git diff flag from `$2` (optional, default: true)

If no domain provided, STOP and ask for domain name.

### Step 2: Validate Expert Exists

Check if expert directory exists using Glob:

```text
Glob: .claude/commands/experts/{$1}/expertise.yaml
```

If not found:

- STOP and report "Expert not found. Use /tac:create-expert to create it first."
- List available experts using: `Glob: .claude/commands/experts/*`

### Step 3: Spawn Self-Improver Agent

Delegate to the self-improver agent with:

- Domain name
- Path to expertise file: `.claude/commands/experts/{domain}/expertise.yaml`
- Check git diff flag

The agent will:

1. Check git diff (if flag is true)
2. Read current expertise
3. Validate against codebase
4. Identify discrepancies
5. Update expertise file
6. Enforce line limits
7. Validate output

### Step 4: Report Results

Display the self-improve report:

```markdown
## Self-Improve Complete: {domain}

### Changes Made

- [List of changes]

### Expertise Health

| Metric | Value |
| --- | --- |
| Line count | X/1000 |
| Files validated | X/X exist |
| Functions verified | X/X accurate |

### Recommendations

- [Any recommendations for manual review]
```

## Quick Usage

```bash
# Sync after making changes (checks git diff)
/tac:improve-expertise database true

# Full rescan without git diff check
/tac:improve-expertise database false

# Default behavior (checks git diff)
/tac:improve-expertise websocket
```

## When to Run

| Trigger | Command |
| --- | --- |
| After any build/fix work | `/tac:improve-expertise {domain} true` |
| Periodic maintenance | `/tac:improve-expertise {domain} false` |
| Suspect drift | `/tac:improve-expertise {domain} false` |
| Before major planning | `/tac:improve-expertise {domain} false` |

## Notes

- This is the LEARN step of Act-Learn-Reuse
- Run after every ACT (build, fix, modify) step
- Mental model is NOT source of truth - this syncs it with code
- Expertise file must stay under 1000 lines

---

**Last Updated:** 2025-12-15
