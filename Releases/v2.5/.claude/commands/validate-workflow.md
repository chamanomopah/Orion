---
description: Validate AI Developer Workflow step outputs and contracts. Use when verifying workflow step completeness before proceeding.
argument-hint: <step-type> [spec-path]
allowed-tools: Read, Glob, Grep, Bash
---

# Validate Workflow

Validate AI Developer Workflow step outputs and ensure contract compliance.

## Arguments

- `$ARGUMENTS`: `<step-type> [spec-path]`
  - `step-type`: One of `plan`, `build`, `review`, `fix`
  - `spec-path`: Optional path to spec file (auto-detected if not provided)

## Step Contracts

| Step | Output Type | Key Requirements |
| --- | --- | --- |
| `plan` | Spec file | Summary, requirements, criteria, approach |
| `build` | Code changes | Commits with prefix, tests pass |
| `review` | Report | PASS/FAIL status, severity-rated issues |
| `fix` | Resolutions | Issues addressed, no new issues |

## Instructions

### Step 1: Identify Step Type

Parse the step type from arguments:

```text
Valid types: plan, build, review, fix
```

### Step 2: Load Step Contract

**Plan Contract:**

- [ ] Spec file exists at `specs/*.md`
- [ ] Contains Summary section
- [ ] Contains Requirements list
- [ ] Contains Acceptance Criteria
- [ ] Contains Technical Approach
- [ ] Scope is bounded and achievable

**Build Contract:**

- [ ] Files modified or created
- [ ] Commits exist with `build:` prefix
- [ ] No build/lint errors
- [ ] Tests pass (if exist)
- [ ] All spec requirements addressed

**Review Contract:**

- [ ] Report generated with structured format
- [ ] STATUS is clearly PASS or FAIL
- [ ] Issues have severity levels (CRITICAL/HIGH/MEDIUM/LOW)
- [ ] Issue descriptions are actionable
- [ ] All code reviewed against spec

**Fix Contract:**

- [ ] All flagged issues addressed
- [ ] Commits exist with `fix:` prefix
- [ ] No new issues introduced
- [ ] Verification confirms resolution

### Step 3: Validate Outputs

**For Plan Step:**

```bash
# Find latest spec file
ls -t specs/*.md | head -1

# Check required sections
grep -c "## Summary\|## Requirements\|## Acceptance\|## Technical" specs/latest.md
```

**For Build Step:**

```bash
# Check for build commits
git log --oneline -5 | grep "^[a-f0-9]* build:"

# Check build status
npm run build 2>&1 | tail -5
# or: dotnet build 2>&1 | tail -5

# Check tests
npm test 2>&1 | tail -10
# or: dotnet test 2>&1 | tail -10
```

**For Review Step:**

```bash
# Check for review report
ls -t .claude/temp/*review*.md 2>/dev/null | head -1

# Verify PASS/FAIL status
grep -E "STATUS:|Result:" review_report.md
```

**For Fix Step:**

```bash
# Check for fix commits
git log --oneline -5 | grep "^[a-f0-9]* fix:"

# Verify no new issues
# (re-run review step)
```

### Step 4: Check Success Criteria

For each criterion in the contract:

1. Execute verification command/check
2. Record pass/fail status
3. Capture evidence (file path, command output, etc.)

### Step 5: Report Results

Generate validation report.

## Output

```markdown
## Workflow Validation Report

### Step Validated

**Step:** {plan|build|review|fix}
**Spec Path:** {path if applicable}
**Timestamp:** {ISO-8601}

### Contract Check

| Requirement | Status | Evidence |
| --- | --- | --- |
| {requirement} | ✅/❌ | {details} |
| {requirement} | ✅/❌ | {details} |
| {requirement} | ✅/❌ | {details} |

### Output Validation

#### {Output Name}

- **Path:** {path}
- **Exists:** ✅/❌
- **Format Valid:** ✅/❌
- **Issues:** {if any}

### Success Criteria

| Criterion | Met | Evidence |
| --- | --- | --- |
| {criterion} | ✅/❌ | {evidence} |
| {criterion} | ✅/❌ | {evidence} |

### Overall Status

**Result:** VALID | INVALID

**Summary:** {brief summary of validation result}

### Issues Found

1. **{Severity}:** {description}
   - **Location:** {where}
   - **Expected:** {what should be}
   - **Actual:** {what was found}
   - **Recommendation:** {how to fix}

### Next Steps

- {Recommended action if invalid}
- {Continue to next step if valid}
```

## Validation Quick Reference

### Plan Validation Commands

```bash
# Check spec exists
test -f specs/*.md && echo "Spec exists"

# Check sections
for section in "Summary" "Requirements" "Acceptance" "Technical"; do
  grep -q "## $section" specs/*.md && echo "$section: OK"
done
```

### Build Validation Commands

```bash
# Check commits
git log --oneline -10 | grep "build:"

# Check tests
npm test --if-present || echo "No npm tests"
dotnet test 2>/dev/null || echo "No dotnet tests"
```

### Review Validation Commands

```bash
# Check report format
grep -E "^STATUS:|^Result:" review_output.md

# Check severity levels
grep -cE "CRITICAL|HIGH|MEDIUM|LOW" review_output.md
```

## Anti-Patterns

| Avoid | Why | Instead |
| --- | --- | --- |
| Skipping validation | Proceeding with incomplete work | Always validate before next step |
| Partial checks | Missing critical issues | Complete all contract checks |
| Auto-fixing during validation | Scope creep | Validate only, fix separately |
| Ignoring warnings | Technical debt | Address all severity levels |

## Cross-References

- @composable-steps.md - Step contracts
- @adw-framework.md - ADW architecture
- `workflow-validator` agent - Automated validation
- `composable-step-design` skill - Step design patterns
