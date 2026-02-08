---
description: Generate initial expertise.yaml from codebase exploration. Use to bootstrap a new agent expert's mental model.
argument-hint: <domain-name> [focus-areas...]
allowed-tools: Read, Write, Glob, Grep, Bash, Task
---

# Seed Expertise

Generate initial expertise file by exploring the codebase and building a mental model.

## Arguments

- `$1`: Domain name (required, e.g., "database", "websocket")
- `$ARGUMENTS`: Focus areas (optional, e.g., "connection-pool queries migrations")

## Instructions

You are seeding an expertise file by exploring the codebase and extracting domain knowledge.

### Step 1: Parse Arguments

Extract:

- Domain name from `$1` (required)
- Focus areas from remaining arguments

If no domain provided, STOP and ask for domain name.

### Step 2: Validate Expert Exists

Check if expert directory exists using Glob:

```text
Glob: .claude/commands/experts/{$1}/*
```

If not found:

- STOP and report "Expert not found. Use /tac:create-expert to create it first."

Check if expertise already populated:

- Read `.claude/commands/experts/{domain}/expertise.yaml`
- If it has real content (not just placeholders), warn and ask to confirm overwrite

### Step 3: Spawn Expertise-Seeder Agent

Delegate to the expertise-seeder agent with:

- Domain name
- Focus areas
- Output path: `.claude/commands/experts/{domain}/expertise.yaml`

The agent will:

1. Explore codebase for domain-related files
2. Analyze patterns and operations
3. Build YAML mental model structure
4. Enforce line limits
5. Write expertise file

### Step 4: Validate and Report

After seeding completes:

```markdown
## Expertise Seeded: {domain}

### Coverage

| Section | Entries |
| --- | --- |
| Core Implementation | X modules |
| Key Operations | X operations |
| Best Practices | X items |
| Known Issues | X items |

### File Stats

- Location: `.claude/commands/experts/{domain}/expertise.yaml`
- Lines: X/1000
- Valid YAML: Yes/No

### Next Steps

1. Review the generated expertise for accuracy
2. Run self-improve to validate: `/tac:improve-expertise {domain} false`
3. Test with a question: `/experts/{domain}/question "How does X work?"`
```

## Quick Usage

```bash
# Seed with default exploration
/tac:seed-expertise database

# Seed with focus areas
/tac:seed-expertise database connection-pool queries migrations

# Seed websocket expert
/tac:seed-expertise websocket events hooks frontend-integration
```

## Seeding Strategy

The expertise-seeder follows this approach:

1. **Start Blank** - Don't assume structure
2. **Explore** - Find relevant files and patterns
3. **Build** - Create YAML structure from findings
4. **Validate** - Ensure accuracy and completeness
5. **Iterate** - Run self-improve until stable

## Notes

- Seeding creates the initial mental model
- Run self-improve after seeding to validate
- Mental model is NOT source of truth
- Stay under 1000 lines
- Focus areas help prioritize what to explore

---

**Last Updated:** 2025-12-15
