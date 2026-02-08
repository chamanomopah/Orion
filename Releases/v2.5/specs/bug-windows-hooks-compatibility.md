# Bug: PAI Hooks Not Compatible with Windows

## Bug Description

PAI (Personal AI Infrastructure) hooks fail to work correctly on Windows because the codebase was designed primarily for macOS/Linux environments. The hooks use Mac-specific commands (`kitty`, `kitten`), Unix-style path separators, and make platform-specific assumptions that don't translate to Windows environments.

## Problem Statement

**Current Behavior:**
- Hooks invoke `kitty` and `kitten` commands directly, which don't exist on Windows
- Tab color and title features fail silently on Windows
- Path separators in code checks assume Unix-style (`/`) paths
- Voice notifications may fail due to platform-specific implementation issues
- Some hooks contain hardcoded Mac-specific commands without Windows fallbacks

**User Impact:**
- Windows users cannot use PAI hooks effectively
- Visual feedback (tab colors, titles) doesn't work on Windows
- Silent failures make debugging difficult
- PAI system appears "broken" on Windows despite core functionality working

## Solution Statement

**Expected Behavior:**
- All hooks should detect the platform and use appropriate commands for each OS
- Windows should use Windows Terminal compatible sequences or skip unsupported features gracefully
- Path operations should use Node.js `path` module for cross-platform compatibility
- Tab color/title features should work on Windows or disable with clear logging
- All Mac-specific code should have Windows equivalents

## Steps to Reproduce

1. Install PAI on Windows 10/11
2. Configure hooks in `settings.json`
3. Start a Claude Code session
4. Observe the following failures:
   - **Expected:** Hooks execute with platform-appropriate commands
   - **Actual:** Hooks fail silently or throw errors for `kitty`/`kitten` commands
5. Check terminal tab behavior:
   - **Expected:** Tab title updates, colors change based on state
   - **Actual:** No visual feedback, tab remains static
6. Review console output:
   - **Expected:** Clear status messages or graceful degradation
   - **Actual:** Silent failures or cryptic error messages

## Root Cause Analysis

### 1. **Hardcoded Mac Commands**

Multiple hooks directly invoke `kitty` and `kitten` without platform detection:

**Files Affected:**
- `SetQuestionTab.hook.ts` (lines 55, 58)
- `TabState.ts` (lines 207, 210)
- `StartupGreeting.hook.ts` (line 121)

**Issue:** These commands only exist on macOS/Linux with Kitty terminal installed. Windows terminals use different protocols.

### 2. **Unix-Style Path Assumptions**

Code checks for Unix-style paths without normalization:

**Files Affected:**
- `StartupGreeting.hook.ts` (line 63)
- `platform.ts` (line 52) - Already has fix, but not consistently used

**Issue:** `/.claude/Agents/` path check fails on Windows where paths use backslashes: `\.claude\Agents\`

### 3. **Incomplete Platform Abstraction**

While `platform.ts` exists and provides some Windows compatibility, it's not consistently used:

**Problems:**
- `UpdateTabTitle.hook.ts` uses `platform` for some operations but not all
- `SetQuestionTab.hook.ts` doesn't use `platform.ts` at all
- `TabState.ts` directly invokes `kitten @` without platform check

### 4. **Silent Failures**

Error handling swallows exceptions without logging platform-specific issues:

**Example from `SetQuestionTab.hook.ts`:**
```typescript
} catch (error) {
  // Silently fail if kitty remote control is not available
  console.error('[SetQuestionTab] Kitty remote control unavailable');
}
```

**Issue:** User sees "Kitty unavailable" message on Windows, which is confusing since Kitty is a Mac/Linux terminal emulator and isn't expected on Windows.

## Relevant Files

### Core Platform Library
- **`.claude/hooks/lib/platform.ts`** - Cross-platform compatibility layer (PARTIALLY IMPLEMENTED)
  - ✅ Has Windows detection
  - ✅ Has `setTabTitle()` with Windows fallback
  - ✅ Has `setTabColor()` that skips on Windows
  - ❌ NOT consistently used across all hooks

### Hooks with Platform Issues
- **`.claude/hooks/SetQuestionTab.hook.ts`** - Uses `kitten @` directly (NO platform check)
- **`.claude/hooks/UpdateTabTitle.hook.ts`** - Uses `platform` module (GOOD, but needs verification)
- **`.claude/hooks/StartupGreeting.hook.ts`** - Uses `kitty @` directly (NO platform check)
- **`.claude/handlers/TabState.ts`** - Uses `kitten @` directly (NO platform check)

### Path Operations
- **`.claude/hooks/lib/paths.ts`** - Uses Node.js `path.join()` (GOOD - already cross-platform)

## Step by Step Tasks

### Task 1: Audit Platform.ts Usage
**File:** All hook files
**Action:** Search for direct `kitty`/`kitten` invocations and `execSync` calls
**Expected:** Find 3-5 files not using `platform.ts`

### Task 2: Fix SetQuestionTab.hook.ts
**File:** `.claude/hooks/SetQuestionTab.hook.ts`
**Lines:** 55, 58
**Change:** Replace direct `kitten @` calls with `platform.setTabTitle()` and `platform.setTabColor()`
**Code:**
```typescript
// OLD (Mac-only):
await Bun.$`kitten @ set-tab-color --self active_bg=${ACTIVE_TAB_BG}...`;
await Bun.$`kitty @ set-tab-title ${QUESTION_TITLE}`;

// NEW (cross-platform):
platform.setTabColor({
  active_bg: ACTIVE_TAB_BG,
  active_fg: TAB_TEXT,
  inactive_bg: TAB_AWAITING_BG,
  inactive_fg: INACTIVE_TEXT
});
platform.setTabTitle(QUESTION_TITLE);
```

### Task 3: Fix TabState.ts Handler
**File:** `.claude/hooks/handlers/TabState.ts`
**Lines:** 207, 210
**Change:** Import and use `platform` module instead of direct `kitten` calls
**Code:**
```typescript
// Add import:
import { platform } from '../lib/platform';

// Replace lines 207-210:
// OLD:
await Bun.$`kitten @ set-tab-color --self active_bg=${ACTIVE_TAB_COLOR}...`;
await Bun.$`kitty @ set-tab-title ${tabTitle}`;

// NEW:
platform.setTabColor({
  active_bg: ACTIVE_TAB_COLOR,
  active_fg: ACTIVE_TEXT_COLOR,
  inactive_bg: stateColor,
  inactive_fg: INACTIVE_TEXT_COLOR
});
platform.setTabTitle(tabTitle);
```

### Task 4: Fix StartupGreeting.hook.ts
**File:** `.claude/hooks/StartupGreeting.hook.ts`
**Lines:** 118-125
**Change:** Use `platform.setTabTitle()` instead of direct `kitty @` call
**Code:**
```typescript
// Add import:
import { platform } from './lib/platform';

// Replace lines 118-125:
// OLD:
const isKitty = process.env.TERM === 'xterm-kitty' || process.env.KITTY_LISTEN_ON;
if (isKitty) {
  try {
    execSync(`kitty @ set-tab-title "Ready to work..."`, { stdio: 'ignore', timeout: 2000 });
  } catch {
    // Silent failure
  }
}

// NEW:
platform.setTabTitle('Ready to work...');
```

### Task 5: Improve Error Messages on Windows
**File:** All hook files
**Action:** Change error messages to be platform-aware
**Code:**
```typescript
// OLD (confusing on Windows):
console.error('[SetQuestionTab] Kitty remote control unavailable');

// NEW (clear):
if (platform.isWindows) {
  console.error('[SetQuestionTab] Tab colors not supported on Windows terminals');
} else {
  console.error('[SetQuestionTab] Kitty remote control unavailable');
}
```

### Task 6: Verify UpdateTabTitle.hook.ts
**File:** `.claude/hooks/UpdateTabTitle.hook.ts`
**Action:** Confirm it's already using `platform` module correctly
**Lines:** 77, 275, 279-291
**Status:** ✅ Already using platform module (VERIFICATION NEEDED)

### Task 7: Add Windows Terminal Integration (OPTIONAL ENHANCEMENT)
**File:** `.claude/hooks/lib/platform.ts`
**Action:** Add Windows Terminal-specific escape sequences for better Windows support
**Code:**
```typescript
/**
 * Set tab color on Windows Terminal (optional enhancement)
 * Uses Windows Terminal escape sequences if available
 */
setWindowsTerminalColor(colors: ColorScheme): void {
  // Check if running in Windows Terminal
  const wtProgram = process.env.WT_SESSION;
  if (!wtProgram) return;

  // Windows Terminal supports ANSI color changes
  // Implementation: Use OSC 12 escape sequence
}
```

## Validation Commands

### 1. Test Platform Detection
```bash
# On Windows
cd C:\Users\JOSE\Downloads\Nero\PAI\Releases\v2.5
bun .claude/hooks/lib/platform.ts
# Expected: No errors, platform detection works
```

### 2. Test SetQuestionTab Hook
```bash
# Simulate hook execution
echo '{}' | bun .claude/hooks/SetQuestionTab.hook.ts
# Expected on Windows: "Tab colors not supported on Windows terminals"
# Expected on Mac: Tab color changes to teal
```

### 3. Test TabState Handler
```bash
# Test with sample transcript
bun .claude/hooks/handlers/TabState.ts
# Expected: No errors about missing "kitten" command
```

### 4. Integration Test - Start Claude Code Session
```bash
# Start session and observe hooks
claude
# Expected: Clean startup, no "command not found" errors
# Expected on Windows: Tab title updates (colors skipped gracefully)
# Expected on Mac: Tab title AND color updates
```

### 5. Regression Test - Mac/Linux
```bash
# Run on Mac/Linux to ensure no breakage
claude
# Expected: All features work as before (tab colors, titles, voice)
```

## Notes

### Related Issues
- **Path normalization**: `StartupGreeting.hook.ts` line 63 checks for `/.claude/Agents/` which won't match Windows paths `\.claude\Agents\`
- **Fix**: Use `platform.isAgentDirectory()` which already handles this (line 49-53 in `platform.ts`)

### Regression Risks
- **Medium**: Changes to core hook files could break Mac/Linux functionality
- **Mitigation**: Test on all three platforms (Windows, macOS, Linux)
- **Rollback**: Keep backup of original hook files before modifications

### Areas to Monitor
1. **Terminal emulator diversity**: Windows has multiple terminals (PowerShell, CMD, Windows Terminal, Git Bash)
   - Each may handle escape sequences differently
2. **Feature parity**: Windows users may miss tab color feature
   - Consider documenting this limitation or adding Windows Terminal support
3. **Performance**: Platform detection overhead should be minimal
   - `process.platform` check is O(1), no performance concern

### Future Enhancements
1. **Windows Terminal OSC sequences**: Windows Terminal supports some OSC escape sequences for colors
2. **Windows Terminal tab title**: Already works via console escape sequences (implemented in `platform.ts`)
3. **Feature detection**: Could detect terminal capabilities instead of just platform
4. **Configuration**: Allow users to enable/disable features per terminal

### Testing Strategy
- **Unit tests**: Test `platform.ts` functions in isolation
- **Integration tests**: Test hooks with mock stdin/stdout
- **Manual tests**: Run on real Windows, Mac, and Linux systems
- **CI/CD**: Add platform-specific tests to GitHub Actions

## References

### Cross-Platform Best Practices
- Node.js `path` module for paths (✅ already used in `paths.ts`)
- `process.platform` for platform detection (✅ already used in `platform.ts`)
- Graceful degradation for unsupported features (⚠️ needs improvement)

### Windows Terminal Escape Sequences
- OSC 2 ; <title> ST - Set window title (✅ already implemented)
- OSC 12 ; <color> ST - Set cursor color (potential enhancement)
- ANSI colors work in most modern Windows terminals

### Kitty Terminal Remote Control
- `kitty @` commands only work with Kitty terminal
- Not available on Windows by design (Kitty is Unix-only)
- Fallback to ANSI escape codes for other terminals
