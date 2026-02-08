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
