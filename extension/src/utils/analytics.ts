/**
 * analytics.ts
 * Anonymous event logging and analytics
 */

import StorageManager from './storage';
import type { AnalyticsEvent, AnalyticsSummary, StressScore } from '../types';

class Analytics {
  private storage: StorageManager;
  private events: AnalyticsEvent[];
  private readonly batchSize: number;
  private readonly uploadInterval: number;
  private lastUpload: number;

  constructor() {
    this.storage = new StorageManager('coga_');
    this.events = [];
    this.batchSize = 50;
    this.uploadInterval = 3600000; // 1 hour
    this.lastUpload = Date.now();
  }

  /**
   * Initialize analytics
   */
  async init(): Promise<void> {
    try {
      // Load existing events from storage
      const storedEvents = await this.storage.get<AnalyticsEvent[]>('events');
      if (storedEvents && Array.isArray(storedEvents)) {
        this.events = storedEvents;
      }

      // Set up periodic upload
      this.startPeriodicUpload();
    } catch (error) {
      console.error('[COGA] Error initializing analytics:', error);
    }
  }

  /**
   * Log an event
   */
  logEvent(eventType: string, data: Record<string, any>): void {
    try {
      const event: AnalyticsEvent = {
        type: eventType,
        timestamp: Date.now(),
        data: this.sanitizeData(data),
        sessionId: this.getSessionId(),
      };

      this.events.push(event);

      // Save to storage
      this.saveEvents();

      // Check if we should upload
      if (
        this.events.length >= this.batchSize ||
        Date.now() - this.lastUpload >= this.uploadInterval
      ) {
        this.uploadEvents();
      }
    } catch (error) {
      console.error('[COGA] Error logging event:', error);
    }
  }

  /**
   * Log stress detection event
   */
  logStressDetection(stressScore: StressScore): void {
    this.logEvent('stress_detection', {
      score: stressScore.combined,
      level: stressScore.level,
      mouseScore: stressScore.mouse,
      keyboardScore: stressScore.keyboard,
      percentage: stressScore.percentage,
    });
  }

  /**
   * Log intervention shown
   */
  logInterventionShown(interventionType: string): void {
    this.logEvent('intervention_shown', {
      type: interventionType,
    });
  }

  /**
   * Log intervention completed
   */
  logInterventionCompleted(interventionType: string, duration: number): void {
    this.logEvent('intervention_completed', {
      type: interventionType,
      duration,
    });
  }

  /**
   * Log intervention dismissed
   */
  logInterventionDismissed(interventionType: string): void {
    this.logEvent('intervention_dismissed', {
      type: interventionType,
    });
  }

  /**
   * Log calibration event
   */
  logCalibration(completed: boolean): void {
    this.logEvent('calibration', {
      completed,
    });
  }

  /**
   * Log settings change
   */
  logSettingsChange(setting: string, value: any): void {
    this.logEvent('settings_change', {
      setting,
      value,
    });
  }

  /**
   * Sanitize data to ensure privacy
   */
  private sanitizeData(data: Record<string, any>): Record<string, any> {
    try {
      // Remove any PII or sensitive information
      const sanitized = { ...data };

      // Remove any text content
      delete sanitized.text;
      delete sanitized.content;
      delete sanitized.url;

      return sanitized;
    } catch (error) {
      console.error('[COGA] Error sanitizing data:', error);
      return {};
    }
  }

  /**
   * Get or create session ID
   */
  private getSessionId(): string {
    try {
      let sessionId = sessionStorage.getItem('coga_session_id');

      if (!sessionId) {
        sessionId = this.generateId();
        sessionStorage.setItem('coga_session_id', sessionId);
      }

      return sessionId;
    } catch (error) {
      console.error('[COGA] Error getting session ID:', error);
      return 'unknown';
    }
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Save events to storage
   */
  private async saveEvents(): Promise<void> {
    try {
      await this.storage.set('events', this.events);
    } catch (error) {
      console.error('[COGA] Error saving events:', error);
    }
  }

  /**
   * Upload events to server (placeholder for Phase 1)
   */
  private async uploadEvents(): Promise<void> {
    try {
      console.log(`[COGA] Would upload ${this.events.length} events (Phase 1: local only)`);

      // In Phase 1, we just log locally
      // In future phases, implement actual API upload

      // Clear uploaded events
      this.events = [];
      await this.saveEvents();
      this.lastUpload = Date.now();
    } catch (error) {
      console.error('[COGA] Error uploading events:', error);
    }
  }

  /**
   * Start periodic upload
   */
  private startPeriodicUpload(): void {
    setInterval(() => {
      if (this.events.length > 0) {
        this.uploadEvents();
      }
    }, this.uploadInterval);
  }

  /**
   * Get analytics summary
   */
  async getSummary(): Promise<AnalyticsSummary> {
    try {
      const events = await this.storage.get<AnalyticsEvent[]>('events');
      if (!events || !Array.isArray(events)) {
        return this.getEmptySummary();
      }

      const summary: AnalyticsSummary = {
        totalEvents: events.length,
        stressDetections: events.filter((e) => e.type === 'stress_detection')
          .length,
        interventionsShown: events.filter(
          (e) => e.type === 'intervention_shown'
        ).length,
        interventionsCompleted: events.filter(
          (e) => e.type === 'intervention_completed'
        ).length,
        interventionsDismissed: events.filter(
          (e) => e.type === 'intervention_dismissed'
        ).length,
        completionRate: 0,
      };

      if (summary.interventionsShown > 0) {
        summary.completionRate =
          (summary.interventionsCompleted / summary.interventionsShown) * 100;
      }

      return summary;
    } catch (error) {
      console.error('[COGA] Error getting summary:', error);
      return this.getEmptySummary();
    }
  }

  /**
   * Get empty summary
   */
  private getEmptySummary(): AnalyticsSummary {
    return {
      totalEvents: 0,
      stressDetections: 0,
      interventionsShown: 0,
      interventionsCompleted: 0,
      interventionsDismissed: 0,
      completionRate: 0,
    };
  }

  /**
   * Clear all analytics data
   */
  async clearAll(): Promise<void> {
    try {
      this.events = [];
      await this.storage.remove('events');
    } catch (error) {
      console.error('[COGA] Error clearing analytics:', error);
    }
  }
}

export default Analytics;

