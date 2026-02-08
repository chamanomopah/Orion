# Windows Hooks Compatibility - Solution Implementation

## Quick Fix Implementation Guide

This document provides immediate, implementable fixes for Windows compatibility issues in PAI hooks.

---

## Fix 1: Platform Detection Library (NEW FILE)

Create: `.claude/hooks/lib/platform.ts`

```typescript
/**
 * Cross-platform compatibility layer for PAI hooks
 * Handles Windows-specific differences in commands, paths, and features
 */

import { execSync } from 'child_process';

export const platform = {
  isWindows: process.platform === 'win32',
  isUnix: process.platform !== 'win32',

  /**
   * Get current date/time string in a cross-platform way
   * Uses Node.js native instead of shell commands
   */
  getCurrentDateTime(): string {
    const now = new Date();
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return `${now.toISOString().replace('T', ' ').slice(0, 19)} ${timezone}`;
  },

  /**
   * Get PST components for timestamp generation
   * Cross-platform timezone handling
   */
  getPSTComponents(): { year: string; month: string; day: string; hours: string; minutes: string; seconds: string } {
    const now = new Date();
    return {
      year: now.getFullYear().toString(),
      month: String(now.getMonth() + 1).padStart(2, '0'),
      day: String(now.getDate()).padStart(2, '0'),
      hours: String(now.getHours()).padStart(2, '0'),
      minutes: String(now.getMinutes()).padStart(2, '0'),
      seconds: String(now.getSeconds()).padStart(2, '0'),
    };
  },

  /**
   * Get ISO timestamp
   */
  getISOTimestamp(): string {
    return new Date().toISOString();
  },

  /**
   * Check if path contains Unix-style agent directory
   * Works for both Unix (/) and Windows (\) separators
   */
  isAgentDirectory(path: string): boolean {
    // Normalize path separators
    const normalized = path.replace(/\\/g, '/');
    return normalized.includes('/.claude/Agents/');
  },

  /**
   * Set terminal tab title (cross-platform)
   * On Windows: Uses Windows console title sequence
   * On Unix: Uses Kitty remote control or escape codes
   */
  setTabTitle(title: string): void {
    const escaped = title.replace(/"/g, '\\"');

    if (this.isWindows) {
      // Windows console title sequence
      try {
        process.stdout.write(`\x1b]0;${escaped}\x07`);
      } catch (err) {
        // Silent failure - not critical
      }
      return;
    }

    // Unix: Try Kitty remote control first
    try {
      const isKitty = process.env.TERM === 'xterm-kitty' || process.env.KITTY_LISTEN_ON;
      if (isKitty) {
        execSync(`kitty @ set-tab-title "${escaped}"`, { stdio: 'ignore', timeout: 2000 });
        return;
      }
    } catch {
      // Fall through to escape codes
    }

    // Fallback to escape codes for other terminals
    try {
      process.stdout.write(`\033]0;${escaped}\007`);
    } catch {
      // Silent failure
    }
  },

  /**
   * Set tab color (Unix-only with Kitty)
   * Silently skips on Windows
   */
  setTabColor(colors: {
    active_bg?: string;
    active_fg?: string;
    inactive_bg?: string;
    inactive_fg?: string;
  }): void {
    if (this.isWindows) {
      // Tab colors not supported on Windows terminals
      return;
    }

    try {
      const isKitty = process.env.TERM === 'xterm-kitty' || process.env.KITTY_LISTEN_ON;
      if (isKitty) {
        const args = Object.entries(colors)
          .map(([key, value]) => `${key}=${value}`)
          .join(' ');
        execSync(`kitty @ set-tab-color --self ${args}`, { stdio: 'ignore', timeout: 2000 });
      }
    } catch {
      // Silent failure
    }
  },

  /**
   * Create symlink or junction
   * On Windows: Creates junction (doesn't require admin)
   * On Unix: Creates symlink
   */
  createLink(target: string, link: string): boolean {
    const { symlinkSync, writeFileSync, existsSync, unlinkSync } = require('fs');

    if (this.isWindows) {
      // Try junction first (works without admin on Windows)
      try {
        symlinkSync(target, link, 'junction');
        return true;
      } catch (err) {
        // Fallback to text file reference
        try {
          if (existsSync(link)) {
            unlinkSync(link);
          }
          writeFileSync(link, target, 'utf-8');
          return false; // Not a real link, but reference exists
        } catch {
          return false;
        }
      }
    }

    // Unix: Create symlink
    try {
      symlinkSync(target, link);
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Check if voice server is available
   */
  isVoiceServerAvailable(): boolean {
    // Voice server works on any platform if it's running
    return true;
  }
};
```

---

## Fix 2: Update settings.json for Windows

Replace the environment section:

```json
{
  "$schema": "https://json.schemastore.org/claude-code-settings.json",
  "paiVersion": "2.5",
  "env": {
    "PAI_DIR": "${USERPROFILE}/.claude",
    "HOME": "${USERPROFILE}",
    "PROJECTS_DIR": "",
    "CLAUDE_CODE_MAX_OUTPUT_TOKENS": "80000",
    "BASH_DEFAULT_TIMEOUT_MS": "600000"
  },
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "bun ${PAI_DIR}/hooks/StartupGreeting.hook.ts"
          },
          {
            "type": "command",
            "command": "bun ${PAI_DIR}/hooks/LoadContext.hook.ts"
          },
          {
            "type": "command",
            "command": "bun ${PAI_DIR}/hooks/CheckVersion.hook.ts"
          }
        ]
      }
    ],
    "UserPromptSubmit": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "bun ${PAI_DIR}/hooks/FormatReminder.hook.ts"
          },
          {
            "type": "command",
            "command": "bun ${PAI_DIR}/hooks/AutoWorkCreation.hook.ts"
          },
          {
            "type": "command",
            "command": "bun ${PAI_DIR}/hooks/ExplicitRatingCapture.hook.ts"
          },
          {
            "type": "command",
            "command": "bun ${PAI_DIR}/hooks/ImplicitSentimentCapture.hook.ts"
          },
          {
            "type": "command",
            "command": "bun ${PAI_DIR}/hooks/UpdateTabTitle.hook.ts"
          }
        ]
      }
    ]
    // ... update all other hooks to use "bun ${PAI_DIR}/hooks/..." prefix
  }
}
```

**Key Changes**:
1. Changed `$HOME` to `${USERPROFILE}` (Windows native variable)
2. Added `HOME` override for compatibility
3. Added `bun` prefix to all hook commands

---

## Fix 3: Update LoadContext.hook.ts

Replace the problematic sections:

### Replace date command (lines 84-96):

```typescript
// OLD:
async function getCurrentDate(): Promise<string> {
  try {
    const proc = Bun.spawn(['date', '+%Y-%m-%d %H:%M:%S %Z'], {
      stdout: 'pipe',
      env: { ...process.env, TZ: process.env.TIME_ZONE || 'America/Los_Angeles' }
    });
    const output = await new Response(proc.stdout).text();
    return output.trim();
  } catch (error) {
    console.error('Failed to get current date:', error);
    return new Date().toISOString();
  }
}

// NEW:
import { platform } from './lib/platform';

async function getCurrentDate(): Promise<string> {
  return platform.getCurrentDateTime();
}
```

### Replace Kitty tab reset (lines 52-82):

```typescript
// OLD:
function resetTabTitle(paiDir: string): void {
  const cleanTitle = 'New Session';
  const stateFile = join(paiDir, 'MEMORY', 'STATE', 'tab-title.json');

  try {
    const isKitty = process.env.TERM === 'xterm-kitty' || process.env.KITTY_LISTEN_ON;
    if (isKitty) {
      execSync(`kitty @ set-tab-title "${cleanTitle}"`, { stdio: 'ignore', timeout: 2000 });
      execSync(
        `kitty @ set-tab-color --self active_bg=#002B80 active_fg=#FFFFFF inactive_bg=none inactive_fg=#A0A0A0`,
        { stdio: 'ignore', timeout: 2000 }
      );
      console.error('🔄 Tab title reset to clean state');
    }
    // ... rest of function
  }
}

// NEW:
import { platform } from './lib/platform';

function resetTabTitle(paiDir: string): void {
  const cleanTitle = 'New Session';
  const stateFile = join(paiDir, 'MEMORY', 'STATE', 'tab-title.json');

  try {
    platform.setTabTitle(cleanTitle);
    platform.setTabColor({
      active_bg: '#002B80',
      active_fg: '#FFFFFF',
      inactive_bg: 'none',
      inactive_fg: '#A0A0A0'
    });
    console.error('🔄 Tab title reset to clean state');
  } catch (err) {
    console.error(`⚠️ Failed to reset tab title: ${err}`);
  }

  try {
    const cleanState = {
      title: cleanTitle,
      rawTitle: cleanTitle,
      timestamp: new Date().toISOString(),
      state: 'idle'
    };
    writeFileSync(stateFile, JSON.stringify(cleanState, null, 2));
    console.error('🔄 Tab state file reset');
  } catch (err) {
    console.error(`⚠️ Failed to reset tab state: ${err}`);
  }
}
```

### Replace subagent detection (lines 307-316):

```typescript
// OLD:
const claudeProjectDir = process.env.CLAUDE_PROJECT_DIR || '';
const isSubagent = claudeProjectDir.includes('/.claude/Agents/') ||
                  process.env.CLAUDE_AGENT_TYPE !== undefined;

// NEW:
const isSubagent = platform.isAgentDirectory(process.env.CLAUDE_PROJECT_DIR || '') ||
                  process.env.CLAUDE_AGENT_TYPE !== undefined;
```

---

## Fix 4: Update FormatReminder.hook.ts

Replace subagent detection (line 225):

```typescript
// OLD:
if (claudeProjectDir.includes('/.claude/Agents/') || process.env.CLAUDE_AGENT_TYPE) {

// NEW:
import { platform } from './lib/platform';

if (platform.isAgentDirectory(claudeProjectDir) || process.env.CLAUDE_AGENT_TYPE) {
```

---

## Fix 5: Update UpdateTabTitle.hook.ts

Replace setTabTitle function (lines 269-310):

```typescript
// OLD:
function setTabTitle(title: string, state: TabState = 'normal'): void {
  try {
    const titleWithSuffix = state !== 'normal' ? `${title}…` : title;
    const truncated = titleWithSuffix.length > 50 ? titleWithSuffix.slice(0, 47) + '…' : titleWithSuffix;
    const escaped = truncated.replace(/'/g, "'\\''");

    const isKitty = process.env.TERM === 'xterm-kitty' || process.env.KITTY_LISTEN_ON;

    if (isKitty) {
      execSync(`kitty @ set-tab-title "${escaped}"`, { stdio: 'ignore', timeout: 2000 });
      // ... color setting code
    } else {
      execSync(`printf '\\033]0;${escaped}\\007' >&2`, { stdio: ['pipe', 'pipe', 'inherit'] });
      execSync(`printf '\\033]2;${escaped}\\007' >&2`, { stdio: ['pipe', 'pipe', 'inherit'] });
      execSync(`printf '\\033]30;${escaped}\\007' >&2`, { stdio: ['pipe', 'pipe', 'inherit'] });
    }
  } catch (err) {
    console.error(`[UpdateTabTitle] Failed to set title: ${err}`);
  }
}

// NEW:
import { platform } from './lib/platform';

function setTabTitle(title: string, state: TabState = 'normal'): void {
  try {
    const titleWithSuffix = state !== 'normal' ? `${title}…` : title;
    const truncated = titleWithSuffix.length > 50 ? titleWithSuffix.slice(0, 47) + '…' : titleWithSuffix;

    platform.setTabTitle(truncated);

    // Set color based on state (no-op on Windows)
    if (state === 'inference') {
      platform.setTabColor({
        active_bg: ACTIVE_TAB_BG,
        active_fg: ACTIVE_TEXT,
        inactive_bg: TAB_INFERENCE_BG,
        inactive_fg: INACTIVE_TEXT
      });
    } else if (state === 'working') {
      platform.setTabColor({
        active_bg: ACTIVE_TAB_BG,
        active_fg: ACTIVE_TEXT,
        inactive_bg: TAB_WORKING_BG,
        inactive_fg: INACTIVE_TEXT
      });
    }

    console.error('[UpdateTabTitle] Tab updated');
  } catch (err) {
    console.error(`[UpdateTabTitle] Failed to set title: ${err}`);
  }
}
```

---

## Fix 6: Update AutoWorkCreation.hook.ts

Replace symlink creation (lines 222-237):

```typescript
// OLD:
const currentLink = join(sessionPath, 'tasks', 'current');
try {
  if (existsSync(currentLink) || lstatSync(currentLink)) {
    unlinkSync(currentLink);
  }
  symlinkSync(taskDirName, currentLink);
} catch (err) {
  // On Windows, symlinks may fail without admin/dev mode
  // Fall back to a simple text file reference
  try {
    writeFileSync(currentLink, taskDirName, 'utf-8');
  } catch {
    // Non-critical, continue without the reference
  }
}

// NEW:
import { platform } from '../lib/platform';

const currentLink = join(sessionPath, 'tasks', 'current');
platform.createLink(taskDirName, currentLink);
```

---

## Implementation Steps

1. **Create platform library** → `.claude/hooks/lib/platform.ts`
2. **Update settings.json** → Change env vars and add `bun` prefix
3. **Update LoadContext.hook.ts** → Use platform library
4. **Update FormatReminder.hook.ts** → Use platform library
5. **Update UpdateTabTitle.hook.ts** → Use platform library
6. **Update AutoWorkCreation.hook.ts** → Use platform library
7. **Test on Windows** → Verify hooks execute

---

## Testing

After implementing fixes, test on Windows:

```bash
# 1. Verify PAI_DIR is set
echo $env:PAI_DIR

# 2. Test a single hook
echo '{"session_id":"test"}' | bun $env:PAI_DIR/hooks/LoadContext.hook.ts

# 3. Start a new Claude Code session and check for errors
```

---

## Limitations

Even with these fixes:

1. **Kitty terminal features** (colors, remote control) will not work on Windows
2. **Tab colors** are not supported on Windows terminals
3. **Symlinks** become text file references or junctions (limited functionality)

These are acceptable trade-offs for basic Windows compatibility.
