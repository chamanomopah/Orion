---
description: Scaffold a new agent expert structure with expertise.yaml, question, self-improve, and plan prompts
argument-hint: <domain-name> [focus-areas]
allowed-tools: Read, Write, Glob, Bash
---

# Create Expert

Scaffold a new agent expert following the Act-Learn-Reuse pattern.

## Arguments

- `$1`: Domain name (required, kebab-case, e.g., "database", "websocket", "billing")
- `$ARGUMENTS`: Focus areas (optional, space-separated, e.g., "connection-pool queries migrations")

## Instructions

You are creating a new agent expert scaffold using the Act-Learn-Reuse pattern from TAC Lesson 13.

### Step 1: Parse Arguments

Extract:

- Domain name from `$1` (required)
- Focus areas from remaining arguments (optional)

If no domain provided, STOP and ask for domain name.

### Step 2: Validate Domain

Check if expert already exists using Glob:

```text
Glob: .claude/commands/experts/{$1}/*
```

If exists, STOP and report "Expert already exists. Use /tac:improve-expertise to update."

### Step 3: Create Directory Structure

Create the expert directory, replacing `{domain}` with the actual domain name (e.g., "database", "websocket"):

```text
.claude/commands/experts/{domain}/
  expertise.yaml        # Mental model (blank initial)
  question.md           # Query expertise
  self-improve.md       # Sync mental model
  plan.md               # Create plan using expertise
  plan-build-improve.md # Full workflow
```

### Step 4: Generate Initial Expertise File

Create blank expertise.yaml for seeding. **Important:** Replace all `{domain}` placeholders with the actual domain name before writing:

```yaml
# {Domain} Expert - Mental Model
# This is NOT a source of truth - it's a working memory file
# Run self-improve to populate from codebase

overview:
  description: "To be populated by self-improve"
  tech_stack: ""
  patterns: ""

core_implementation:
  # Will be populated by expertise-seeder agent

key_operations:
  # Will be populated by expertise-seeder agent

best_practices:
  - "To be discovered"

known_issues:
  - "To be discovered"

# Line limit: 1000 max
# Last updated: [auto-populated by self-improve]
```

### Step 5: Generate Question Prompt

Create question.md. **Replace all `{domain}` placeholders with the actual domain name:**

```markdown
---
description: Ask the {domain} expert a question using its expertise
argument-hint: <your-question>
allowed-tools: Read, Glob, Grep
---

# {Domain} Expert - Question

You are a {domain} expert. Answer questions using your expertise file as your mental model.

## Your Expertise

Read and internalize: `.claude/commands/experts/{domain}/expertise.yaml`

## Instructions

1. Load your expertise file
2. Understand the question: $ARGUMENTS
3. Answer using ONLY information from your expertise + codebase validation
4. If expertise is outdated, note discrepancies

## Response Format

### Answer

[Direct answer based on expertise]

### Confidence

[High/Medium/Low] - based on expertise coverage

### If Low Confidence

Recommend running: `/experts/{domain}/self-improve true`
```

### Step 6: Generate Self-Improve Prompt

Create self-improve.md. **Replace all `{domain}` placeholders:**

```markdown
---
description: Sync {domain} expert mental model with codebase
argument-hint: "[check-git-diff: true/false]"
allowed-tools: Read, Edit, Bash, Glob, Grep
---

# {Domain} Expert - Self-Improve

Maintain expertise accuracy by comparing against actual codebase.

## Arguments

- `$1`: check_git_diff flag (optional, default: false)

## Workflow

1. **Check Git Diff** (if $1 is "true")
   - Run `git diff HEAD~1 --name-only`
   - If no {domain}-related changes, report and exit

2. **Read Current Expertise**
   - Load `.claude/commands/experts/{domain}/expertise.yaml`

3. **Validate Against Codebase**
   - For each file referenced, verify it exists
   - Check line counts are accurate
   - Verify functions/operations exist

4. **Identify Discrepancies**
   - List differences between expertise and code
   - Prioritize significant changes

5. **Update Expertise File**
   - Sync mental model with actual code
   - Add new patterns discovered
   - Remove outdated information

6. **Enforce Line Limit (MAX_LINES: 1000)**
   - Condense if exceeding limit

7. **Validation Check**
   - Ensure valid YAML
   - All file references exist

## Output

Report changes made and expertise health status.
```

### Step 7: Generate Plan Prompt

Create plan.md. **Replace all `{domain}` placeholders:**

```markdown
---
description: Create implementation plan using {domain} expertise
argument-hint: <task-description>
allowed-tools: Read, Write, Glob, Grep
model: opus
---

# {Domain} Expert - Plan

Create a detailed implementation plan using your domain expertise.

## Your Expertise

Read and internalize: `.claude/commands/experts/{domain}/expertise.yaml`

## Task

$ARGUMENTS

## Workflow

1. **Load Expertise**
   - Read your mental model
   - Identify relevant sections

2. **Analyze Task**
   - Break down requirements
   - Map to expertise areas

3. **Create Plan**
   - File changes needed
   - Operations to use
   - Best practices to follow
   - Known issues to avoid

4. **Output**
   - Save to `specs/experts/{domain}/{task-slug}-spec.md`
```

### Step 8: Generate Full Workflow Prompt

Create plan-build-improve.md. **Replace all `{domain}` placeholders:**

```markdown
---
description: Full Act-Learn-Reuse workflow for {domain} task
argument-hint: <task-description>
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, Skill
model: opus
---

# {Domain} Expert - Plan Build Improve

Execute complete Act-Learn-Reuse cycle.

## Task

$ARGUMENTS

## Workflow

### Step 1: Plan (REUSE)

Invoke: `/experts/{domain}/plan $ARGUMENTS`

Wait for spec file to be created.

### Step 2: Build (ACT)

Read the spec file and implement the changes.

### Step 3: Self-Improve (LEARN)

Invoke: `/experts/{domain}/self-improve true`

## Context Protection

Each step runs in a sub-agent to protect top-level context:

- Plan: ~80K tokens (opus)
- Build: varies (sonnet)
- Self-improve: git diff only (opus)
```

## Output

```markdown
## Expert Created: {domain}

### Directory Structure

```text
.claude/commands/experts/{domain}/
  expertise.yaml        # Mental model (blank - run seed to populate)
  question.md           # Query expertise
  self-improve.md       # Sync mental model
  plan.md               # Create plan using expertise
  plan-build-improve.md # Full workflow
```

### Next Steps

1. **Seed the expertise file:**

   ```bash
   /tac:seed-expertise {domain} {focus-areas}
   ```

2. **Or run self-improve to auto-discover:**

   ```bash
   /experts/{domain}/self-improve false
   ```

3. **Test with a question:**

   ```bash
   /experts/{domain}/question "How does X work?"
   ```

### Commands Available

| Command | Purpose |
| --- | --- |
| `/experts/{domain}/question` | Query expertise |
| `/experts/{domain}/self-improve` | Sync mental model |
| `/experts/{domain}/plan` | Create implementation plan |
| `/experts/{domain}/plan-build-improve` | Full ACT->LEARN->REUSE workflow |

## Notes

- See @agent-expert-creation skill for the full pattern
- Mental model is NOT source of truth - codebase is
- Run self-improve after every ACT step
- Enforce 1000 line limit on expertise.yaml

---

**Last Updated:** 2025-12-15
