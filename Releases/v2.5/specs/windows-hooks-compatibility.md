# PAI Windows Hooks Compatibility Bug

## Status
**OPEN** | **Priority**: HIGH | **Category**: Platform Compatibility

## Summary
The PAI hook system is designed primarily for macOS/Linux and has multiple compatibility issues when running on Windows. Hooks fail to execute properly due to platform-specific assumptions in shell execution, path handling, shebangs, and Unix-only commands.

## Root Cause Analysis

### 1. Shebang Lines Not Recognized on Windows
**Location**: All `.hook.ts` files

**Problem**:
```typescript
#!/usr/bin/env bun
```

This shebang line is not recognized by Windows. Windows doesn't use shebangs for script execution - it relies on file associations and the PATHEXT environment variable.

**Impact**: Hooks may not execute at all or may be opened in a text editor instead of being run.

---

### 2. Environment Variable Path Issues
**Location**: `settings.json`, `lib/paths.ts`

**Problem in settings.json**:
```json
"env": {
  "PAI_DIR": "$HOME/.claude"
}
```

**Issues**:
- `$HOME` is not a standard Windows environment variable (Windows uses `%USERPROFILE%`)
- Path separators are forward slashes (`/`) instead of backslashes (`\`)
- Variable expansion (`$HOME`, `${HOME}`) works differently on Windows

**Impact**: The `PAI_DIR` environment variable is not properly resolved, causing all hooks to fail finding their dependencies.

---

### 3. Unix-Specific Commands in Hooks
**Location**: Multiple hooks

#### a) `date` command (LoadContext.hook.ts:86-95)
```typescript
const proc = Bun.spawn(['date', '+%Y-%m-%d %H:%M:%S %Z'], {
```

**Problem**: The `date` command with Unix format specifiers doesn't exist on Windows. Windows uses `date /t` or PowerShell's `Get-Date`.

**Impact**: Fallback to ISO timestamp, but may not reflect timezone correctly.

#### b) `kitty` terminal commands (LoadContext.hook.ts:60-66, UpdateTabTitle.hook.ts:281-298)
```typescript
execSync(`kitty @ set-tab-title "${cleanTitle}"`, { stdio: 'ignore', timeout: 2000 });
execSync(`kitty @ set-tab-color --self active_bg=#002B80...`, { stdio: 'ignore', timeout: 2000 });
```

**Problem**: Kitty is a Unix-specific terminal emulator. It doesn't exist on Windows.

**Impact**: Tab title and color management features fail silently or throw errors.

#### c) `printf` with escape codes (UpdateTabTitle.hook.ts:303-305)
```typescript
execSync(`printf '\\033]0;${escaped}\\007' >&2`, { stdio: ['pipe', 'pipe', 'inherit'] });
```

**Problem**: Windows Command Prompt doesn't support ANSI escape codes the same way. PowerShell supports some but syntax differs.

**Impact**: Tab title fallback fails on Windows terminals.

---

### 4. Path Separator Issues
**Location**: Multiple locations

#### a) Unix path check (FormatReminder.hook.ts:225, LoadContext.hook.ts:309)
```typescript
if (claudeProjectDir.includes('/.claude/Agents/')) {
```

**Problem**: Uses forward slash (`/`) which doesn't match Windows paths (`\.claude\Agents\`).

**Impact**: Subagent detection fails on Windows, causing hooks to run when they shouldn't.

#### b) Path construction throughout codebase
```typescript
join(paiDir, 'MEMORY', 'WORK')  // Works on Node.js
```

**Status**: Node.js `path.join()` handles cross-platform paths correctly, so this is NOT an issue.

---

### 5. Symlink Creation Issues
**Location**: AutoWorkCreation.hook.ts:222-237

**Current Code** (with fallback):
```typescript
try {
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
```

**Problem**: Windows requires:
- Administrator privileges, OR
- Developer Mode enabled

to create symbolic links. The fallback exists but creates a text file instead of a symlink, breaking any code that expects a real symlink.

**Impact**: The `current` reference may not work as expected on Windows.

---

### 6. File Execution on Windows
**Location**: settings.json hook configuration

**Problem**:
```json
{
  "type": "command",
  "command": "${PAI_DIR}/hooks/LoadContext.hook.ts"
}
```

On Windows:
- `.ts` files are not directly executable
- Need to run through `bun` explicitly
- Path expansion may not work correctly

**Impact**: Hooks may not execute at all on Windows.

---

## Affected Components

| Component | Severity | Issue |
|-----------|----------|-------|
| **LoadContext.hook.ts** | CRITICAL | date command, kitty commands, path checks |
| **UpdateTabTitle.hook.ts** | HIGH | kitty commands, printf escape codes |
| **FormatReminder.hook.ts** | MEDIUM | Unix path check for subagent detection |
| **AutoWorkCreation.hook.ts** | MEDIUM | Symlink creation |
| **WorkCompletionLearning.hook.ts** | LOW | Uses homedir() which works cross-platform |
| **settings.json** | CRITICAL | $HOME variable, path expansion |
| **All .hook.ts files** | CRITICAL | Shebang not recognized |

---

## Error Symptoms

1. **Hooks don't execute**: Silent failures with no output
2. **Tab title features broken**: No visual feedback in terminal
3. **Date/time incorrect**: ISO timestamps without timezone
4. **Subagent detection fails**: Hooks run when they shouldn't
5. **PAI_DIR not resolved**: All path-dependent features fail
6. **Symlink creation fails**: "current" reference broken

---

## Proposed Solutions

### Solution 1: Cross-Platform Shim Layer (Recommended)

Create a Windows compatibility layer:

```typescript
// lib/platform.ts
export const platform = {
  isWindows: process.platform === 'win32',
  isUnix: process.platform !== 'win32',

  // Cross-platform date command
  async getDate(format: string): Promise<string> {
    if (this.isWindows) {
      // Use PowerShell or Node.js native
      return new Date().toLocaleString();
    }
    // Use Unix date command
    const proc = Bun.spawn(['date', format], { ... });
    // ...
  },

  // Cross-platform tab title
  setTabTitle(title: string): void {
    if (this.isWindows) {
      // Windows terminal title sequence
      process.stdout.write(`\x1b]0;${title}\x07`);
      return;
    }
    // Unix Kitty/escape codes
    // ...
  },

  // Cross-platform symlink
  createSymlink(target: string, link: string): void {
    if (this.isWindows) {
      // Windows junction or skip
      try {
        symlinkSync(target, link, 'junction');
      } catch {
        // Use text file fallback
      }
      return;
    }
    symlinkSync(target, link);
  }
};
```

### Solution 2: Detect and Warn on Windows

Add Windows detection in each hook:

```typescript
if (process.platform === 'win32') {
  console.error('⚠️ WARNING: PAI hooks have limited Windows support.');
  console.error('⚠️ Some features may not work correctly.');
  // Continue with degraded functionality
}
```

### Solution 3: Windows-Specific Hook Scripts

Create parallel `.hook.cmd` or `.hook.ps1` files for Windows:

```
hooks/
├── LoadContext.hook.ts      # Unix
├── LoadContext.hook.cmd     # Windows
└── LoadContext.hook.ps1     # PowerShell
```

Update settings.json to use platform-specific commands.

---

## Solution 4: Fix settings.json for Windows

Update environment variable resolution:

```json
{
  "env": {
    "PAI_DIR": "${USERPROFILE}/.claude",
    "HOME": "${USERPROFILE}"
  }
}
```

Or better, use absolute paths:

```json
{
  "env": {
    "PAI_DIR": "C:\\Users\\YOUR_USERNAME\\.claude"
  }
}
```

---

## Implementation Priority

1. **HIGH**: Fix `settings.json` PAI_DIR resolution for Windows
2. **HIGH**: Create cross-platform platform shim (`lib/platform.ts`)
3. **HIGH**: Fix path separator checks (use `path.sep` or regex with both separators)
4. **MEDIUM**: Replace Unix-only commands with cross-platform alternatives
5. **MEDIUM**: Windows-specific terminal title handling
6. **LOW**: Gracefully degrade Kitty-specific features on Windows

---

## Testing Checklist

- [ ] Verify hooks execute on Windows
- [ ] Verify PAI_DIR resolves correctly
- [ ] Verify date/time functions work
- [ ] Verify subagent detection works
- [ ] Verify tab title features (or graceful degradation)
- [ ] Verify symlink creation (or text file fallback)
- [ ] Verify all hooks complete without fatal errors

---

## References

- **Issue**: Windows hooks compatibility
- **Affected Files**:
  - `.claude/hooks/*.hook.ts` (all hook files)
  - `.claude/lib/paths.ts`
  - `.claude/settings.json`
  - `.claude/hooks/LoadContext.hook.ts`
  - `.claude/hooks/UpdateTabTitle.hook.ts`
  - `.claude/hooks/FormatReminder.hook.ts`
  - `.claude/hooks/AutoWorkCreation.hook.ts`

---

## Notes

The PAI system was designed primarily for Unix-like systems (macOS/Linux). Windows support was not a primary consideration during development. This spec identifies all Windows-specific issues to guide a cross-platform compatibility effort.

**Estimated Effort**: 4-8 hours to implement core fixes, 2-4 hours for testing and refinement.

**Risk Level**: MEDIUM - Changes are primarily additive (cross-platform shims) rather than modifying existing Unix behavior.
