---
description: Design WebSocket event broadcasting for ADW observability. Use when streaming workflow events to external dashboards or monitoring systems.
argument-hint: <event-type> [payload-description]
allowed-tools: Read, Write, Glob, Grep
---

# Broadcast Event

Design WebSocket event broadcasting for AI Developer Workflow observability.

## Arguments

- `$ARGUMENTS`: `<event-type> [payload-description]`
  - `event-type`: Type of event to broadcast (e.g., `ToolUseBlock`, `StepComplete`)
  - `payload-description`: Optional payload structure description

## Event Types

| Event Type | Source | Payload |
| --- | --- | --- |
| `TextBlock` | Agent output | Text content |
| `ToolUseBlock` | Tool invocation | Tool name, input |
| `ThinkingBlock` | Extended thinking | Thinking content |
| `StepStart` | Workflow step | Step name, timestamp |
| `StepEnd` | Workflow step | Step name, status |
| `ADWComplete` | Workflow finish | Final status, metrics |

## Instructions

### Step 1: Define Message Format

Standard ADW event structure:

```json
{
  "type": "adw_event",
  "adw_id": "a1b2c3d4",
  "step": "build",
  "event_type": "ToolUseBlock",
  "timestamp": "2026-01-01T14:30:00Z",
  "summary": "Writing authentication middleware to src/auth.py",
  "payload": {
    "tool_name": "Write",
    "file_path": "src/auth.py",
    "content_preview": "class AuthMiddleware:..."
  }
}
```text

### Step 2: Design Summarization Strategy

Use Haiku for fast, cheap summaries:

**Prompt Template:**

```text
Summarize this {event_type} in 15 words or less for a developer dashboard:

Tool: {tool_name}
Input: {tool_input_preview}

Summary:
```text

**Events to Summarize:**

- `ToolUseBlock`: Summarize tool action
- `TextBlock`: Summarize content (if long)
- `ThinkingBlock`: Summarize reasoning

**Events to Pass Through:**

- `StepStart`: Use fixed format
- `StepEnd`: Use fixed format
- `ADWComplete`: Use fixed format

### Step 3: Design WebSocket Server

Server specification:

```python
# adws/websocket_server.py
from fastapi import FastAPI, WebSocket
from typing import Dict, Set
import asyncio

app = FastAPI()

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, Set[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, adw_id: str):
        await websocket.accept()
        if adw_id not in self.active_connections:
            self.active_connections[adw_id] = set()
        self.active_connections[adw_id].add(websocket)

    async def broadcast(self, adw_id: str, message: dict):
        if adw_id in self.active_connections:
            for connection in self.active_connections[adw_id]:
                await connection.send_json(message)

manager = ConnectionManager()

@app.websocket("/ws/{adw_id}")
async def websocket_endpoint(websocket: WebSocket, adw_id: str):
    await manager.connect(websocket, adw_id)
    try:
        while True:
            await websocket.receive_text()  # Keep alive
    except:
        manager.active_connections[adw_id].discard(websocket)
```text

### Step 4: Design Client Subscription

Client subscription message:

```json
{
  "action": "subscribe",
  "filters": {
    "adw_id": "a1b2c3d4",
    "steps": ["build", "review"],
    "event_types": ["ToolUseBlock", "StepEnd"]
  }
}
```text

### Step 5: Design Resilience Patterns

**Reconnection Strategy:**

```javascript
class ResilientWebSocket {
  constructor(url) {
    this.url = url;
    this.maxReconnectDelay = 30000;
    this.reconnectAttempts = 0;
  }

  connect() {
    this.ws = new WebSocket(this.url);

    this.ws.onclose = () => {
      const delay = Math.min(
        1000 * Math.pow(2, this.reconnectAttempts),
        this.maxReconnectDelay
      );
      setTimeout(() => this.connect(), delay);
      this.reconnectAttempts++;
    };

    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
    };
  }
}
```text

**Heartbeat Mechanism:**

- Interval: 30 seconds
- Timeout: 90 seconds
- Message: `{"type": "ping"}`

## Output

```markdown
## Event Broadcasting Specification

**Event Type:** {event_type}
**ADW Context:** {adw_id}

### Message Format

```json
{message_structure}
```text

### Summarization

**Strategy:** {haiku/passthrough}
**Prompt:** {if haiku}

### Server Endpoint

**URL:** `ws://localhost:8000/ws/{adw_id}`
**Protocol:** WebSocket

### Client Subscription

```json
{subscription_message}
```text

### Resilience

| Pattern | Value |
| --- | --- |
| Reconnect Strategy | Exponential backoff |
| Max Delay | 30 seconds |
| Max Attempts | 10 |
| Heartbeat Interval | 30 seconds |

### Integration

Hook scripts broadcast via HTTP POST to server:

```python
import httpx

async def broadcast(event: dict):
    async with httpx.AsyncClient() as client:
        await client.post(
            f"http://localhost:8000/broadcast/{event['adw_id']}",
            json=event
        )
```text

### Next Steps

1. Implement WebSocket server (`adws/websocket_server.py`)
2. Integrate with hooks (`/configure-hooks`)
3. Build swimlane UI (`swimlane-visualization` skill)
4. Add event persistence (optional database logging)

```text

## SDK Note

> **Implementation Note:** Full WebSocket integration requires production backend. This command provides the specification; implementation requires FastAPI/asyncio setup.

## Cross-References

- @websocket-architecture.md - WebSocket patterns
- @hook-event-patterns.md - Event types
- `event-broadcaster` agent - Broadcasting design
- `swimlane-visualization` skill - UI consumption
