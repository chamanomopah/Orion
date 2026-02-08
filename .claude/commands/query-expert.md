---
description: Ask an agent expert a question using its expertise mental model. Use for quick domain-specific answers without code exploration.
argument-hint: <domain-name> <your-question>
allowed-tools: Read, Glob
---

# Query Expert

Ask an agent expert a question, getting answers grounded in its expertise mental model.

## Arguments

- `$1`: Domain name (required, e.g., "database", "websocket")
- Remaining arguments after `$1`: Your question (required)

**Note:** Extract the question by removing the domain name from `$ARGUMENTS`, or use `$2`, `$3`, etc. to capture question words.

## Instructions

You are querying an agent expert to get answers based on its domain expertise.

### Step 1: Parse Arguments

Extract:

- Domain name from `$1` (required)
- Question from remaining arguments (required)

If no domain provided, STOP and ask for domain name.
If no question provided, STOP and ask for the question.

### Step 2: Validate Expert Exists

Check if expertise file exists and has content using the Read tool:

```text
Read: .claude/commands/experts/{$1}/expertise.yaml
```

If not found or empty:

- STOP and report "Expert not found or not seeded."
- Suggest: `/tac:create-expert {domain}` or `/tac:seed-expertise {domain}`

### Step 3: Load Expertise

Read the expertise file:

- Parse YAML structure
- Understand the mental model
- Note coverage areas

### Step 4: Answer Question

Using the expertise as your knowledge base:

1. Identify relevant sections
2. Extract pertinent information
3. Validate against codebase if needed (read actual files)
4. Formulate answer

### Step 5: Report

```markdown
## {Domain} Expert Response

### Question

{question}

### Answer

{Your answer based on expertise}

### Sources

- **Expertise sections used:** [list]
- **Files referenced:** [list if any]

### Confidence: [High/Medium/Low]

{Explanation of confidence level}

### If Low Confidence

The expertise file may need updating. Run:

```bash
/tac:improve-expertise {domain} false
```

## Quick Usage

```bash
# Ask database expert
/tac:query-expert database "How does connection pooling work?"

# Ask websocket expert
/tac:query-expert websocket "What events are available?"

# Ask about specific operation
/tac:query-expert database "How do I batch insert records?"
```

## Confidence Levels

| Level | Meaning |
| --- | --- |
| **High** | Expertise directly covers this topic |
| **Medium** | Expertise partially covers, some inference needed |
| **Low** | Expertise doesn't cover well, recommend self-improve |

## Notes

- Answers are grounded in the expertise mental model
- If expertise seems outdated, recommend self-improve
- Mental model is NOT source of truth - validate against code when uncertain
- This is the REUSE step of Act-Learn-Reuse

---

**Last Updated:** 2025-12-15
