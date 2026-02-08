---
description: Start an AI Developer Workflow with composable steps. Use when executing plan_build, plan_build_review, or plan_build_review_fix workflows.
argument-hint: <workflow-type> <task-description>
allowed-tools: Read, Write, Glob, Grep, Task
---

# Start ADW

Start an AI Developer Workflow with composable Plan/Build/Review/Fix steps.

## Arguments

- `$ARGUMENTS`: `<workflow-type> <task-description>`
  - `workflow-type`: One of `plan_build`, `plan_build_review`, `plan_build_review_fix`
  - `task-description`: What the ADW should accomplish

## Workflow Types

| Type | Steps | Use Case |
| --- | --- | --- |
| `plan_build` | Plan → Build | High confidence, simple tasks |
| `plan_build_review` | Plan → Build → Review | Quality-focused tasks |
| `plan_build_review_fix` | Plan → Build → Review → [Fix loop] | Full autonomy, ZTE goal |

## Instructions

### Step 1: Parse Arguments

Extract workflow type and task description:

```text
Example: "plan_build_review Add rate limiting to auth endpoints"
→ workflow_type: plan_build_review
→ task: "Add rate limiting to auth endpoints"
```

### Step 2: Generate ADW ID

Create an 8-character unique identifier:

```bash
# Generate unique ADW ID
head -c 4 /dev/urandom | xxd -p
```

### Step 3: Create Spec Path

Determine spec file location:

```text
specs/{type}-{adw_id}-{slugified-description}.md

Example: specs/feature-a1b2c3d4-add-rate-limiting.md
```

### Step 4: Execute Plan Step

Use the `/plan` command or spawn a planning agent:

**Expected Output:**

- Spec file created at known path
- Summary section present
- Requirements enumerated
- Acceptance criteria defined
- Technical approach outlined

### Step 5: Execute Build Step

Read the spec and implement:

**Expected Output:**

- Code changes made
- Commits with `build:` prefix
- Tests pass (if exist)

### Step 6: Execute Review Step (if included)

For `plan_build_review` and `plan_build_review_fix`:

**Expected Output:**

- Structured review report
- STATUS: PASS or FAIL
- Issues categorized by severity

### Step 7: Execute Fix Loop (if included)

For `plan_build_review_fix` only:

**Loop Constraints:**

- MAX_FIX_ATTEMPTS = 3
- Exit on PASS or max attempts
- Escalate if max attempts reached

**Expected Output:**

- Issues addressed
- Commits with `fix:` prefix
- Review passes after fix

## Output

```markdown
## ADW Execution Report

**ADW ID:** {adw_id}
**Workflow:** {workflow_type}
**Task:** {task_description}
**Started:** {timestamp}

### Step Results

| Step | Status | Duration | Details |
| --- | --- | --- | --- |
| Plan | ✅ | {time} | Spec: {path} |
| Build | ✅ | {time} | Commits: {count} |
| Review | ✅/❌ | {time} | Status: {PASS/FAIL} |
| Fix | ✅/⚠️ | {time} | Attempts: {n}/{max} |

### Spec File

`{spec_path}`

### Commits Made

- `{commit_hash}`: {message}
- `{commit_hash}`: {message}

### Final Status

**Result:** SUCCESS | FAILED | ESCALATED

**Summary:** {brief summary}

### Metrics

- Total Duration: {time}
- Tokens Used: {estimate}
- Fix Attempts: {n} (if applicable)
```

## SDK Note

> **Implementation Note:** Full ADW orchestration with fix loops requires Claude Agent SDK for proper step isolation. This command provides the design pattern; SDK implementation enables production execution.

## Error Recovery

| Step | Failure | Recovery |
| --- | --- | --- |
| Plan | Can't generate spec | Retry with more context |
| Build | Build errors | Return to plan with feedback |
| Review | Critical issues | Proceed to fix (if enabled) |
| Fix | Can't resolve | Escalate after max attempts |

## Cross-References

- @adw-framework.md - ADW architecture
- @composable-steps.md - Step contracts
- `composable-step-design` skill - Step design patterns
- `adw-orchestrator` agent - Orchestration planning
