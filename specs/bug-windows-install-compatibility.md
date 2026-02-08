# Bug: INSTALL.ts script fails on Windows

## Bug Description
The INSTALL.ts script is designed for macOS/Linux and fails on Windows due to:
1. Unix-specific commands (chmod, chown, lsof, kill, bash)
2. Hardcoded Unix shell paths (/bin/bash)
3. Unix-style file permissions
4. Zsh-specific configuration (.zshrc)
5. Interactive prompts that may not work properly on Windows CMD/PowerShell

## Problem Statement
JOSE is trying to run the PAI installation wizard on Windows, but the script contains numerous Unix-specific commands and assumptions that will fail:
- `chmod` and `chown` don't exist on Windows
- `lsof` is not available on Windows
- Shell scripts use bash shebangs
- Interactive prompts use readline which may not work properly in Windows terminals
- The script assumes ~/.zshrc exists and should be modified

## Solution Statement
Create a cross-platform INSTALL.ts that:
1. Detects the operating system (Windows, macOS, Linux)
2. Uses appropriate commands for each platform
3. Skips Unix-specific operations on Windows with clear warnings
4. Provides Windows-specific alternatives where possible
5. Maintains full functionality on macOS/Linux while being functional on Windows

## Steps to Reproduce
1. On Windows machine, open Command Prompt or PowerShell
2. Navigate to PAI directory: `cd C:\Users\JOSE\Downloads\Orion`
3. Run: `bun run .claude/INSTALL.ts`
4. **Expected**: Installation completes successfully with Windows-appropriate configuration
5. **Actual**: Script fails with "command not found" errors for chmod, chown, lsof, or hangs on interactive prompts

## Root Cause Analysis

### Platform-Specific Issues Found

#### 1. **Permission Management (Lines 109-141)**
```typescript
execSync(`chmod -R 755 "${targetDir}"`, { stdio: 'pipe' });
execSync(`chown -R ${info.uid}:${info.gid} "${targetDir}"`, { stdio: 'pipe' });
```
- **Problem**: chmod and chown don't exist on Windows
- **Impact**: Script will crash on Windows
- **Windows Reality**: Windows uses ACLs, not Unix permissions. Files created by user are already owned by user.

#### 2. **Voice Server Detection (Lines 147-154)**
```typescript
const result = execSync(`lsof -ti:${VOICE_SERVER_PORT}`, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });
```
- **Problem**: lsof is not available on Windows
- **Impact**: Cannot detect running voice servers
- **Windows Alternative**: `netstat -ano | findstr :8888` or PowerShell `Get-NetTCPConnection`

#### 3. **Process Killing (Line 162)**
```typescript
execSync(`kill -9 ${pid}`, { stdio: 'pipe' });
```
- **Problem**: kill command doesn't exist on Windows
- **Impact**: Cannot stop existing voice servers
- **Windows Alternative**: `taskkill /PID {pid} /F`

#### 4. **Voice Server Start Script (Line 179)**
```typescript
const child = spawn('bash', [startScript], {
```
- **Problem**: bash may not be in PATH on Windows
- **Impact**: Cannot start voice server
- **Windows Reality**: Requires Git Bash, WSL, or native Node.js implementation

#### 5. **Shell Detection in Bun Install (Line 243)**
```typescript
shell: '/bin/bash'
```
- **Problem**: /bin/bash doesn't exist on Windows
- **Impact**: Bun installation via curl script won't work
- **Windows Reality**: Bun provides Windows installer executable

#### 6. **Zsh Alias Setup (Lines 264-285)**
```typescript
const ZSHRC = join(HOME, '.zshrc');
```
- **Problem**: Windows doesn't use .zshrc
- **Impact**: Attempts to modify non-existent file
- **Windows Alternatives**: PowerShell profile, batch file alias, or skip

### Cross-Platform Compatibility Requirements

The INSTALL.ts script needs to:
1. **Detect OS** at runtime using `process.platform`
2. **Skip gracefully** operations that don't apply
3. **Use platform-appropriate commands** where alternatives exist
4. **Inform user** about Windows-specific limitations

## Relevant Files
- `C:\Users\JOSE\Downloads\Orion\.claude\INSTALL.ts` - Main installation script (615 lines)
- `C:\Users\JOSE\Downloads\Orion\.claude\INSTALL.md` - Installation documentation (already has Windows section)
- `C:\Users\JOSE\Downloads\Orion\.claude\VoiceServer\start.sh` - Voice server startup script (bash-specific)

## Step by Step Tasks

### Task 1: Add Platform Detection
**File**: `.claude/INSTALL.ts`
**Location**: After imports (around line 19)

Add platform detection constants:
```typescript
// Platform detection
const IS_WINDOWS = process.platform === 'win32';
const IS_MACOS = process.platform === 'darwin';
const IS_LINUX = process.platform === 'linux';
```

### Task 2: Create Cross-Platform Permission Manager
**File**: `.claude/INSTALL.ts`
**Location**: Replace `fixPermissions()` function (lines 109-141)

Replace with platform-aware implementation:
- On Windows: Skip entirely with info message (Windows uses ACLs)
- On macOS/Linux: Keep existing chmod/chown logic
- Add warning about manual intervention if needed

### Task 3: Create Cross-Platform Process Manager
**File**: `.claude/INSTALL.ts`
**Location**: Replace `findRunningVoiceServers()` and `killVoiceServers()` (lines 147-167)

Implement platform-specific process detection:
- **Windows**: Use `netstat -ano | findstr :8888` and `taskkill /PID {pid} /F`
- **macOS/Linux**: Keep existing `lsof` and `kill` commands
- Return empty array on error for graceful degradation

### Task 4: Update Voice Server Startup
**File**: `.claude/INSTALL.ts`
**Location**: Modify `startVoiceServer()` function (lines 169-199)

Handle multiple scenarios:
- **Windows with Git Bash**: Try bash, warn if not found
- **Windows without bash**: Skip with clear message about WSL/Git Bash requirement
- **macOS/Linux**: Keep existing bash spawn logic
- Consider alternative: Use Bun to run start.sh directly if bash unavailable

### Task 5: Fix Bun Installation for Windows
**File**: `.claude/INSTALL.ts`
**Location**: Update `installBun()` function (lines 218-258)

Handle platform differences:
- **Windows**: Skip curl install script, provide download link
- **macOS/Linux**: Keep existing logic
- Update shell parameter from `/bin/bash` to conditionally set based on platform

### Task 6: Create Cross-Platform Alias Setup
**File**: `.claude/INSTALL.ts`
**Location**: Replace `setupZshAlias()` function (lines 264-285)

Implement platform-specific alias creation:
- **Windows**: Create batch file (`%~USERPROFILE%\pai.bat`) or PowerShell alias
- **macOS**: Update `.zshrc`
- **Linux**: Update `.bashrc` (not `.zshrc`)
- Skip if file doesn't exist with warning

### Task 7: Fix Interactive Prompts for Windows
**File**: `.claude/INSTALL.ts`
**Location**: Update `prompt()` and `promptChoice()` functions (lines 76-103)

Ensure readline works correctly:
- Test in Windows CMD, PowerShell, Git Bash
- Add explicit terminal mode handling if needed
- Consider adding --non-interactive flag for automation

### Task 8: Add Environment Variable Handling
**File**: `.claude/INSTALL.ts`
**Location**: Around line 248 in `installBun()`

Fix PATH manipulation for Windows:
- Windows uses `Path` not `PATH`
- Use `path.join()` for separator correctness
- Don't assume colon separator (Windows uses semicolon)

### Task 9: Update Documentation
**File**: `.claude/INSTALL.md`
**Location**: Add to "Windows Compatibility" section (around line 217)

Document Windows-specific behavior:
- Limitations of Windows installation
- Recommendations for Git Bash or WSL
- Alternative installation methods for Windows users
- How to manually configure alias on Windows

### Task 10: Add Validation for Windows
**File**: `.claude/INSTALL.ts`
**Location**: End of `main()` function before validation (around line 588)

Add platform-specific validation:
- Check if required tools are available (bash on Windows)
- Warn about Windows-specific limitations
- Provide clear next steps for Windows users

## Validation Commands

### Test on Windows
```powershell
# From PowerShell or CMD
cd C:\Users\JOSE\Downloads\Orion
bun run .claude/INSTALL.ts

# Expected outcomes:
# - Script detects Windows platform
# - Skips chmod/chown with info message
# - Uses netstat/taskkill for voice server
# - Creates Windows-appropriate alias
# - Completes without errors
```

### Test on macOS (Regression Test)
```bash
cd ~/.claude
bun run INSTALL.ts

# Ensure existing functionality still works
```

### Automated Tests
```bash
# Test platform detection
bun -e "console.log('Platform:', process.platform)"

# Test Windows commands (on Windows)
netstat -ano | findstr :8888
taskkill /?

# Test Unix commands (on macOS/Linux)
lsof -ti:8888
kill -9 1234

# Test that script parses
node -c .claude/INSTALL.ts
```

### Smoke Test After Installation
```bash
# Verify settings.json was created
cat ~/.claude/settings.json  # or type C:\Users\JOSE\.claude\settings.json on Windows

# Verify directories exist
ls ~/.claude/MEMORY  # or dir C:\Users\JOSE\.claude\MEMORY

# Start Claude Code
cd ~/.claude
claude

# Expected: Greets user by name, shows PAI banner
```

## Notes

### Related Issues
1. **Voice Server (start.sh)**: The voice server startup script is bash-specific. Windows users need Git Bash or WSL to run it. Consider creating a start.bat alternative.
2. **Statusline Feature**: Already documented as requiring Git Bash or WSL on Windows (INSTALL.md line 250-253)
3. **Hook Scripts**: All hooks use relative paths (correct for cross-platform), but may reference Unix commands internally

### Regression Risks
- **High**: Changes to `fixPermissions()` could break macOS/Linux file permissions
- **Medium**: Platform-specific command changes need thorough testing
- **Low**: Documentation additions don't affect code

### Areas to Monitor
1. **Interactive Prompts**: Windows terminal handling of readline may differ from Unix
2. **PATH Manipulation**: Windows uses semicolon separators, not colons
3. **File Paths**: Windows uses backslashes (though Node.js normalizes to forward slashes)
4. **Process Spawning**: Windows spawn() behavior differs from Unix (detached mode)

### Future Improvements
1. **Native Windows Voice Server**: Rewrite start.sh as Node.js script for true cross-platform support
2. **PowerShell Installer**: Create dedicated INSTALL.ps1 for Windows-native experience
3. **Configuration File Support**: Add --config flag to allow non-interactive installation from file
4. **CI Testing**: Add GitHub Actions workflow to test on Windows, macOS, and Linux

### Windows-Specific Recommendations
- **Best Experience**: Use Git Bash or WSL for full Unix compatibility
- **Native Windows**: PowerShell works but with voice server limitations
- **Installation Directory**: Keep using `~/.claude` (works on all platforms via Node.js `homedir()`)
- **API Keys**: `.env` file works cross-platform (no format changes needed)

### Implementation Priority
1. **Critical**: Platform detection + skip Unix commands on Windows (Tasks 1, 2)
2. **High**: Cross-platform process management (Task 3)
3. **High**: Fix Bun installation for Windows (Task 5)
4. **Medium**: Alias setup for Windows (Task 6)
5. **Low**: Voice server startup improvements (Task 4 - can defer)
6. **Ongoing**: Documentation updates (Task 9)

### Testing Strategy
- **Primary**: Test on actual Windows machine (JOSE's environment)
- **Secondary**: Test on macOS to ensure no regressions
- **Optional**: Test on Linux (Ubuntu/Debian)
- **Edge Cases**: Windows without Git Bash, Windows with WSL, different Windows versions (10/11)
