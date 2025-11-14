/**
 * AnnoyanceRules.ts
 * Prevents intervention fatigue and annoyance
 */

import type { AnnoyanceConfig, InterventionLog } from '../types';
import { ANNOYANCE_DEFAULTS, ANNOYANCE_TIMINGS_MS } from '../config/annoyance';
import type SettingsManager from '../utils/SettingsManager';

class AnnoyanceRules {
  private settingsManager: SettingsManager;
  private config: AnnoyanceConfig;
  private interventionLog: InterventionLog[];
  private dismissalCount: number;
  private lastInterventionTime: number | null;
  private snoozedUntil: number | null;

  constructor(settingsManager: SettingsManager) {
    this.settingsManager = settingsManager;
    this.interventionLog = [];
    this.dismissalCount = 0;
    this.lastInterventionTime = null;
    this.snoozedUntil = null;
    
    // Load initial config from settings
    this.updateConfigFromSettings();
  }

  /**
   * Update config from settings manager
   */
  updateConfigFromSettings(): void {
    try {
      if (!this.settingsManager) {
        console.warn('[COGA] SettingsManager not available');
        return;
      }
      
      const limits = this.settingsManager.getInterventionLimits();
      this.config = {
        maxPerHour: limits.maxPerHour ?? ANNOYANCE_DEFAULTS.maxPerHour,
        maxPerDay: limits.maxPerDay ?? ANNOYANCE_DEFAULTS.maxPerDay,
        cooldownMs:
          typeof limits.cooldownMinutes === 'number'
            ? limits.cooldownMinutes * 60 * 1000
            : ANNOYANCE_TIMINGS_MS.cooldown,
        autoSnoozeAfterDismissals: ANNOYANCE_DEFAULTS.autoSnoozeAfterDismissals,
        snoozeTimeMs: ANNOYANCE_TIMINGS_MS.snooze,
      };
      
      console.log('[COGA] Annoyance config updated:', this.config);
    } catch (error) {
      console.error('[COGA] Error updating annoyance config:', error);
      // Fallback to defaults
      this.config = {
        maxPerHour: ANNOYANCE_DEFAULTS.maxPerHour,
        maxPerDay: ANNOYANCE_DEFAULTS.maxPerDay,
        cooldownMs: ANNOYANCE_TIMINGS_MS.cooldown,
        autoSnoozeAfterDismissals: ANNOYANCE_DEFAULTS.autoSnoozeAfterDismissals,
        snoozeTimeMs: ANNOYANCE_TIMINGS_MS.snooze,
      };
    }
  }

  /**
   * Check if intervention should be shown
   */
  shouldShowIntervention(): boolean {
    try {
      const now = Date.now();

      // Check if snoozed
      if (this.snoozedUntil && now < this.snoozedUntil) {
        console.log('[COGA] Interventions snoozed');
        return false;
      }

      // Check cooldown
      if (
        this.lastInterventionTime &&
        now - this.lastInterventionTime < this.config.cooldownMs
      ) {
        console.log('[COGA] In cooldown period');
        return false;
      }

      // Check hourly limit
      const hourAgo = now - 3600000;
      const recentInterventions = this.interventionLog.filter(
        (log) => log.timestamp > hourAgo
      );

      if (recentInterventions.length >= this.config.maxPerHour) {
        console.log('[COGA] Hourly limit reached');
        return false;
      }

      // Check daily limit
      const dayAgo = now - 86400000;
      const todayInterventions = this.interventionLog.filter(
        (log) => log.timestamp > dayAgo
      );

      if (todayInterventions.length >= this.config.maxPerDay) {
        console.log('[COGA] Daily limit reached');
        return false;
      }

      // Check context rules
      if (!this.checkContextRules()) {
        return false;
      }

      return true;
    } catch (error) {
      console.error('[COGA] Error checking annoyance rules:', error);
      return false;
    }
  }

  /**
   * Check context-based rules
   */
  private checkContextRules(): boolean {
    try {
      // Check if in password field
      const activeElement = document.activeElement;
      if (activeElement) {
        const input = activeElement as HTMLInputElement;
        if (
          input.type === 'password' ||
          input.autocomplete === 'current-password' ||
          input.autocomplete === 'new-password'
        ) {
          console.log('[COGA] In password field');
          return false;
        }

        // Check for payment-related inputs
        if (
          input.autocomplete &&
          (input.autocomplete.includes('cc-') ||
            input.autocomplete.includes('card'))
        ) {
          console.log('[COGA] In payment field');
          return false;
        }
      }

      // Check for video/audio elements playing
      const videos = document.querySelectorAll<HTMLMediaElement>('video, audio');
      for (const media of videos) {
        if (!media.paused && !media.muted) {
          console.log('[COGA] Media playing');
          return false;
        }
      }

      // Check for fullscreen mode
      if (
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement
      ) {
        console.log('[COGA] In fullscreen mode');
        return false;
      }

      return true;
    } catch (error) {
      console.error('[COGA] Error checking context rules:', error);
      return true; // Fail open
    }
  }

  /**
   * Record intervention shown
   */
  recordInterventionShown(): void {
    try {
      const now = Date.now();

      this.interventionLog.push({
        timestamp: now,
        shown: true,
      });

      this.lastInterventionTime = now;

      // Clean old logs (older than 24 hours)
      const dayAgo = now - 86400000;
      this.interventionLog = this.interventionLog.filter(
        (log) => log.timestamp > dayAgo
      );
    } catch (error) {
      console.error('[COGA] Error recording intervention shown:', error);
    }
  }

  /**
   * Record intervention completed
   */
  recordInterventionCompleted(): void {
    try {
      // Reset dismissal count on completion
      this.dismissalCount = 0;

      // Clear snooze if set
      this.snoozedUntil = null;
    } catch (error) {
      console.error('[COGA] Error recording intervention completed:', error);
    }
  }

  /**
   * Record intervention dismissed
   */
  recordInterventionDismissed(): void {
    try {
      this.dismissalCount++;

      // Auto-snooze after consecutive dismissals
      if (this.dismissalCount >= this.config.autoSnoozeAfterDismissals) {
        this.snoozedUntil = Date.now() + this.config.snoozeTimeMs;
        console.log(
          `[COGA] Auto-snoozed for ${this.config.snoozeTimeMs / 60000} minutes`
        );
        this.dismissalCount = 0; // Reset counter
      }
    } catch (error) {
      console.error('[COGA] Error recording intervention dismissed:', error);
    }
  }

  /**
   * Manually snooze interventions
   */
  snooze(durationMs: number = ANNOYANCE_TIMINGS_MS.snooze): void {
    try {
      this.snoozedUntil = Date.now() + durationMs;
      console.log(`[COGA] Snoozed for ${durationMs / 60000} minutes`);
    } catch (error) {
      console.error('[COGA] Error snoozing:', error);
    }
  }

  /**
   * Unsnooze interventions
   */
  unsnooze(): void {
    try {
      this.snoozedUntil = null;
      console.log('[COGA] Snooze cleared');
    } catch (error) {
      console.error('[COGA] Error unsnoozing:', error);
    }
  }

  /**
   * Check if currently snoozed
   */
  isSnoozed(): boolean {
    return !!this.snoozedUntil && Date.now() < this.snoozedUntil;
  }

  /**
   * Get time until snooze ends
   */
  getSnoozeRemaining(): number {
    if (!this.isSnoozed() || !this.snoozedUntil) return 0;
    return Math.max(0, this.snoozedUntil - Date.now());
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<AnnoyanceConfig>): void {
    try {
      this.config = {
        ...this.config,
        ...config,
      };
    } catch (error) {
      console.error('[COGA] Error updating config:', error);
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): AnnoyanceConfig {
    return { ...this.config };
  }

  /**
   * Reset rules
   */
  reset(): void {
    this.interventionLog = [];
    this.dismissalCount = 0;
    this.lastInterventionTime = null;
    this.snoozedUntil = null;
  }
}

export default AnnoyanceRules;

