---
description: Configure hook-based event handling for ADW observability. Use when setting up PreToolUse, PostToolUse, or other hooks for workflow monitoring.
argument-hint: <hook-type> [configuration]
allowed-tools: Read, Write, Glob, Grep
---

# Configure Hooks

Configure hook-based event handling for AI Developer Workflow observability.

## Arguments

- `$ARGUMENTS`: `<hook-type> [configuration]`
  - `hook-type`: Type of hook (`PreToolUse`, `PostToolUse`, `Notification`, `Stop`)
  - `configuration`: Optional JSON configuration or description

## Hook Types

> **Documentation Verification:** Hook event types are Claude Code internal types that may change between releases. For authoritative current event types, verify via `hook-management` skill → `docs-management`.

| Hook | Trigger | Use Case |
| --- | --- | --- |
| `PreToolUse` | Before tool execution | Capture intent, validate |
| `PostToolUse` | After tool execution | Capture result, summarize |
| `Notification` | Workflow events | Alert, log, broadcast |
| `Stop` | Error conditions | Halt execution |

## Instructions

### Step 1: Identify Hook Requirements

Determine what events need capturing:

**Common Scenarios:**

- **Observability**: Capture all tool calls for monitoring
- **Cost Tracking**: Track token usage per workflow
- **Debugging**: Log decision points for review
- **Broadcasting**: Stream events to external systems

### Step 2: Design Hook Configuration

Create hook configuration in `settings.json` format:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Write|Edit|Bash",
        "hooks": [
          {
            "type": "command",
            "command": "python /path/to/pre_tool_hook.py"
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "*",
        "hooks": [
          {
            "type": "command",
            "command": "python /path/to/post_tool_hook.py"
          }
        ]
      }
    ]
  }
}
```text

### Step 3: Create Hook Script Template

Generate hook script based on type:

**PreToolUse Script:**

```python
#!/usr/bin/env python3
"""PreToolUse hook for ADW observability."""
import json
import sys
import os

def main():
    # Read hook input from stdin
    input_data = json.load(sys.stdin)

    tool_name = input_data.get("tool_name", "unknown")
    tool_input = input_data.get("tool_input", {})
    adw_id = os.environ.get("ADW_ID", "no-adw")

    # Log event
    event = {
        "type": "PreToolUse",
        "adw_id": adw_id,
        "tool": tool_name,
        "input_preview": str(tool_input)[:100]
    }

    # Write to log or broadcast
    with open(f"agents/{adw_id}/events.jsonl", "a") as f:
        f.write(json.dumps(event) + "\n")

    # Return decision (continue or block)
    print(json.dumps({"decision": "continue"}))

if __name__ == "__main__":
    main()
```text

**PostToolUse Script:**

```python
#!/usr/bin/env python3
"""PostToolUse hook for ADW observability."""
import json
import sys
import os

def main():
    # Read hook input from stdin
    input_data = json.load(sys.stdin)

    tool_name = input_data.get("tool_name", "unknown")
    tool_result = input_data.get("tool_result", "")
    adw_id = os.environ.get("ADW_ID", "no-adw")

    # Log event
    event = {
        "type": "PostToolUse",
        "adw_id": adw_id,
        "tool": tool_name,
        "result_preview": str(tool_result)[:200]
    }

    # Write to log or broadcast
    with open(f"agents/{adw_id}/events.jsonl", "a") as f:
        f.write(json.dumps(event) + "\n")

if __name__ == "__main__":
    main()
```text

### Step 4: Environment Variable Setup

Define ADW context variables:

```bash
export ADW_ID="a1b2c3d4"
export ADW_STEP="build"
export ADW_WORKFLOW="plan_build_review"
export ADW_OUTPUT_DIR="agents/${ADW_ID}"
```text

### Step 5: Create Output Directory

Ensure event output location exists:

```bash
mkdir -p agents/${ADW_ID}
```text

## Output

```markdown
## Hook Configuration Report

**Hook Type:** {hook_type}
**Configuration:** {config}

### Generated Files

| File | Purpose |
| --- | --- |
| `hooks/pre_tool_hook.py` | PreToolUse event capture |
| `hooks/post_tool_hook.py` | PostToolUse event capture |

### Settings Configuration

```json
{settings snippet}
```text

### Environment Variables

| Variable | Value | Purpose |
| --- | --- | --- |
| ADW_ID | {id} | Workflow correlation |
| ADW_STEP | {step} | Current step context |
| ADW_OUTPUT_DIR | {path} | Event output location |

### Verification

Run test command to verify hook fires:

```bash
# In Claude Code session with hooks configured
echo "Test hook" > /dev/null
# Check agents/{adw_id}/events.jsonl for captured events
```text

### Next Steps

1. Add hook scripts to version control
2. Configure settings.json with hook entries
3. Test with sample ADW execution
4. Add WebSocket broadcasting (see `/broadcast-event`)

```text

## Event Payloads

### PreToolUse Payload

```json
{
  "tool_name": "Write",
  "tool_input": {
    "file_path": "/path/to/file.py",
    "content": "..."
  }
}
```text

### PostToolUse Payload

```json
{
  "tool_name": "Write",
  "tool_input": {...},
  "tool_result": "File written successfully"
}
```text

## Cross-References

- @hook-event-patterns.md - Event types and payloads
- @websocket-architecture.md - Broadcasting events
- `hook-event-architecture` skill - Event system design
- `event-broadcaster` agent - Broadcasting design
