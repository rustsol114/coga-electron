/**
 * BaselineManager.ts
 * Manages personal baseline calibration for stress detection
 */

import { BASELINE_DURATION_MS, BASELINE_DURATION_SECONDS } from '../config';
import StorageManager from '../utils/storage';
import type { Baseline, BaselinePreset, BehavioralMetrics, Context } from '../types';
import type { BaselineHistoryEntry } from '../types';

const CALIBRATION_STATE_KEY = 'calibration_state';
const CALIBRATION_PROGRESS_KEY = 'calibration_progress';
const CALIBRATION_DATA_KEY = 'calibration_data';
const CALIBRATION_SESSION_KEY = 'calibration_session';

interface CalibrationSessionMetadata {
  id: string;
  startedAt: number;
}

declare const chrome: any;

class BaselineManager {
  private storage: StorageManager;
  private baseline: Baseline | null;
  private calibrationData: BehavioralMetrics[];
  private isCalibrating: boolean;
  private calibrationStartTime: number | null;
  private readonly calibrationDuration: number;
  private lastKnownProgress: number;
  private baselineHistory: BaselineHistoryEntry[];
  private calibrationSessionId: string | null;

  constructor() {
    this.storage = new StorageManager('coga_');
    this.baseline = null;
    this.calibrationData = [];
    this.isCalibrating = false;
    this.calibrationStartTime = null;
    this.calibrationDuration = BASELINE_DURATION_MS;
    this.lastKnownProgress = 0;
    this.baselineHistory = [];
    this.calibrationSessionId = null;
  }

  /**
   * Restore calibration state from persistent storage (used after reloads)
   */
  async restoreCalibrationState(): Promise<void> {
    try {
      const [state, progressValue, data, sessionMetadata] = await Promise.all([
        this.storage.get<{ isCalibrating: boolean; calibrationStartTime: number | null; progress?: number }>(
          CALIBRATION_STATE_KEY
        ),
        this.storage.get<number>(CALIBRATION_PROGRESS_KEY),
        this.storage.get<BehavioralMetrics[]>(CALIBRATION_DATA_KEY),
        this.storage.get<CalibrationSessionMetadata | null>(CALIBRATION_SESSION_KEY),
      ]);

      if (state && typeof state.isCalibrating === 'boolean') {
        this.isCalibrating = state.isCalibrating;
        this.calibrationStartTime = state.calibrationStartTime ?? null;

        if (typeof state.progress === 'number') {
          this.lastKnownProgress = state.progress;
        }
      }

      if (typeof progressValue === 'number') {
        this.lastKnownProgress = progressValue;
      }

      if (Array.isArray(data)) {
        this.calibrationData = data;
      } else if (!this.isCalibrating) {
        this.calibrationData = [];
      }

      if (sessionMetadata && sessionMetadata.id) {
        this.calibrationSessionId = sessionMetadata.id;
      } else if (!this.isCalibrating) {
        this.calibrationSessionId = null;
      }

      if (!this.isCalibrating) {
        this.calibrationStartTime = null;
        this.lastKnownProgress = this.baseline ? 100 : 0;
      }
    } catch (error) {
      console.error('[COGA] Error restoring calibration state:', error);
    }
  }

  /**
   * Persist baseline history for per-day tracking
   */
  private async persistBaselineHistory(baseline: Baseline): Promise<void> {
    try {
      const currentDate = new Date(baseline.timestamp).toISOString().slice(0, 10);
      const entry: BaselineHistoryEntry = {
        date: currentDate,
        baseline: {
          mouse: baseline.mouse,
          keyboard: baseline.keyboard,
          scroll: baseline.scroll,
        },
        timestamp: baseline.timestamp,
      };

      const existingHistory =
        (await this.storage.get<BaselineHistoryEntry[]>('baseline_history')) || [];

      const filteredHistory = existingHistory.filter((item) => item.date !== currentDate);
      filteredHistory.push(entry);

      // Keep last 30 days of history
      const sortedHistory = filteredHistory
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .slice(-30);

      this.baselineHistory = sortedHistory;
      baseline.history = sortedHistory;

      const saved = await this.storage.set('baseline_history', sortedHistory);
      if (!saved) {
        console.warn('[COGA] Baseline history stored locally only (chrome.storage unavailable)');
      }
    } catch (error) {
      console.error('[COGA] Error persisting baseline history:', error);
    }
  }

  /**
   * Start calibration process
   */
  async startCalibration(): Promise<void> {
    try {
      this.isCalibrating = true;
      this.calibrationStartTime = Date.now();
      this.calibrationData = [];
      this.calibrationSessionId = this.generateSessionId();

      await this.persistCalibrationData();
      await this.persistCalibrationSessionMetadata();

      // Sync calibration state globally IMMEDIATELY so all tabs see it
      await this.syncCalibrationState();

      const durationMinutes = (BASELINE_DURATION_SECONDS / 60).toFixed(1);
      // console.log(`[COGA] Starting baseline calibration (${durationMinutes} minute${durationMinutes !== '1.0' ? 's' : ''})...`);
    } catch (error) {
      console.error('[COGA] Error starting calibration:', error);
      throw error;
    }
  }

  /**
   * Sync calibration state to global storage
   */
  private async syncCalibrationState(progressOverride?: number): Promise<void> {
    try {
      const progress =
        typeof progressOverride === 'number'
          ? progressOverride
          : this.getCalibrationProgress();

      const state = {
        isCalibrating: this.isCalibrating,
        calibrationStartTime: this.calibrationStartTime,
        progress,
        sessionId: this.calibrationSessionId,
      };

      this.lastKnownProgress = progress;

      const results = await Promise.allSettled([
        this.storage.set(CALIBRATION_STATE_KEY, state),
        this.storage.set(CALIBRATION_PROGRESS_KEY, progress),
      ]);

      results.forEach((result, index) => {
        if (result.status === 'fulfilled' && !result.value) {
          console.warn(
            `[COGA] Calibration sync target ${index} returned false (local storage fallback)`
          );
        } else if (result.status === 'rejected') {
          console.error('[COGA] Calibration sync failed:', result.reason);
        }
      });
    } catch (error) {
      console.error('[COGA] Error syncing calibration state:', error);
    }
  }

  /**
   * Add calibration data point
   * Returns true if calibration is complete, false otherwise
   */
  async addCalibrationData(metrics: BehavioralMetrics): Promise<boolean> {
    try {
      if (!this.isCalibrating || !this.calibrationStartTime) {
        // console.log('[COGA] addCalibrationData called but not calibrating');
        return false;
      }

      const elapsed = Date.now() - this.calibrationStartTime;
      const progress = Math.min(100, Math.round((elapsed / this.calibrationDuration) * 100));
      
      // Log progress every 10% for debugging
      if (progress % 10 === 0 && progress > 0) {
        // console.log(`[COGA] Calibration progress: ${progress}% (${elapsed}ms / ${this.calibrationDuration}ms)`);
      }

      if (elapsed < this.calibrationDuration) {
        this.calibrationData.push({
          ...metrics,
          timestamp: Date.now(),
        });
        void this.persistCalibrationData();
        
        // Sync progress to global storage frequently (for real-time updates across tabs)
        void this.syncCalibrationState(progress);
        
        return false; // Not complete yet
      } else {
        // Calibration complete - WAIT for completion to finish before returning
        // console.log('[COGA] ✓ Calibration duration reached! Starting completion...');
        // console.log(`[COGA] Collected ${this.calibrationData.length} data points`);
        await this.completeCalibration();
        // console.log('[COGA] ✓ Calibration completion finished successfully');
        return true; // Complete!
      }
    } catch (error) {
      console.error('[COGA] Error adding calibration data:', error);
      return false;
    }
  }

  /**
   * Complete calibration and calculate baseline
   */
  async completeCalibration(): Promise<Baseline> {
    try {
      // console.log('[COGA] Starting baseline completion...');
      // console.log('[COGA] Calibration data collected:', this.calibrationData.length, 'samples');
      
      if (this.calibrationData.length === 0) {
        throw new Error('No calibration data collected');
      }

      // Clear calibration state first
      this.isCalibrating = false;
      this.calibrationStartTime = null;
      this.lastKnownProgress = 100;
      this.calibrationSessionId = null;

      // Calculate baseline using median and MAD (Median Absolute Deviation)
      // console.log('[COGA] Calculating baseline metrics...');
      const extract = (selector: (metrics: BehavioralMetrics) => number): number[] =>
        this.calibrationData
          .map(selector)
          .filter((value) => Number.isFinite(value)) as number[];

      const baseline: Baseline = {
        mouse: {
          movementVelocity: this.calculateMedian(extract((d) => d.mouse.movementVelocity)),
          movementVelocityMAD: this.calculateMAD(extract((d) => d.mouse.movementVelocity)),
          movementAcceleration: this.calculateMedian(extract((d) => d.mouse.movementAcceleration)),
          movementAccelerationMAD: this.calculateMAD(extract((d) => d.mouse.movementAcceleration)),
          mouseJitter: this.calculateMedian(extract((d) => d.mouse.mouseJitter)),
          mouseJitterMAD: this.calculateMAD(extract((d) => d.mouse.mouseJitter)),
          clickFrequencyPerMin: this.calculateMedian(extract((d) => d.mouse.clickFrequencyPerMin)),
          clickFrequencyPerMinMAD: this.calculateMAD(extract((d) => d.mouse.clickFrequencyPerMin)),
          multiClickRatePerMin: this.calculateMedian(extract((d) => d.mouse.multiClickRatePerMin)),
          multiClickRatePerMinMAD: this.calculateMAD(extract((d) => d.mouse.multiClickRatePerMin)),
          pathEfficiency: this.calculateMedian(extract((d) => d.mouse.pathEfficiency)),
          pathEfficiencyMAD: this.calculateMAD(extract((d) => d.mouse.pathEfficiency)),
          pauseRatio: this.calculateMedian(extract((d) => d.mouse.pauseRatio)),
          pauseRatioMAD: this.calculateMAD(extract((d) => d.mouse.pauseRatio)),
          scrollVelocity: this.calculateMedian(extract((d) => d.mouse.scrollVelocity)),
          scrollVelocityMAD: this.calculateMAD(extract((d) => d.mouse.scrollVelocity)),
        },
        keyboard: {
          typingErrorRate: this.calculateMedian(extract((d) => d.keyboard.typingErrorRate)),
          typingErrorRateMAD: this.calculateMAD(extract((d) => d.keyboard.typingErrorRate)),
          typingSpeedPerMin: this.calculateMedian(extract((d) => d.keyboard.typingSpeedPerMin)),
          typingSpeedPerMinMAD: this.calculateMAD(extract((d) => d.keyboard.typingSpeedPerMin)),
          pauseRegularity: this.calculateMedian(extract((d) => d.keyboard.pauseRegularity)),
          pauseRegularityMAD: this.calculateMAD(extract((d) => d.keyboard.pauseRegularity)),
          avgPauseDuration: this.calculateMedian(extract((d) => d.keyboard.avgPauseDuration)),
          avgPauseDurationMAD: this.calculateMAD(extract((d) => d.keyboard.avgPauseDuration)),
        },
        scroll: {
          velocity: this.calculateMedian(extract((d) => d.scroll.velocity)),
          velocityMAD: this.calculateMAD(extract((d) => d.scroll.velocity)),
        },
        timestamp: Date.now(),
        context: this.getContext(),
      };

      await this.saveBaseline(baseline, { addToHistory: true });

      return this.baseline!;
    } catch (error) {
      console.error('[COGA] Error completing calibration:', error);
      throw error;
    }
  }

  async applyPresetBaseline(preset: BaselinePreset, options?: { addToHistory?: boolean }): Promise<Baseline> {
    try {
      this.isCalibrating = false;
      this.calibrationStartTime = null;
      this.lastKnownProgress = 100;
      this.calibrationSessionId = null;
      this.calibrationData = [];

      const baseline: Baseline = {
        mouse: { ...preset.mouse },
        keyboard: { ...preset.keyboard },
        scroll: { ...preset.scroll },
        timestamp: Date.now(),
        context: this.getContext(),
      };

      await this.saveBaseline(baseline, { addToHistory: options?.addToHistory ?? false });
      return this.baseline!;
    } catch (error) {
      console.error('[COGA] Error applying preset baseline:', error);
      throw error;
    }
  }

  /**
   * NEW: Notify background that baseline is ready
   */
  private notifyBackgroundBaselineReady(): void {
    try {
      const chromeApi = (typeof window !== 'undefined' && (window as any).chrome) || 
                        (typeof global !== 'undefined' && (global as any).chrome) ||
                        null;

      if (chromeApi && chromeApi.runtime && chromeApi.runtime.sendMessage) {
        chromeApi.runtime.sendMessage({
          action: 'baselineUpdated'
        }, (response: any) => {
          if (chromeApi.runtime.lastError) {
            console.warn('[COGA BaselineManager] Failed to notify background:', chromeApi.runtime.lastError);
          } else {
            // console.log('[COGA BaselineManager] ✅ Background notified of new baseline');
          }
        });
      }
    } catch (error) {
      console.error('[COGA BaselineManager] Error notifying background:', error);
    }
  }

  /**
   * Load existing baseline from storage
   */
  async loadBaseline(): Promise<Baseline | null> {
    try {
      this.baselineHistory =
        (await this.storage.get<BaselineHistoryEntry[]>('baseline_history')) || [];

      // IMPORTANT: Always use StorageManager first (localStorage or chrome.storage)
      this.baseline = await this.storage.get<Baseline>('baseline');
      
      // If we found a baseline in localStorage, validate it before using
      if (this.baseline) {
        // Validate baseline structure
        if (!this.baseline.mouse || !this.baseline.keyboard || !this.baseline.scroll) {
          console.warn('[COGA] Invalid baseline structure found, ignoring');
          this.baseline = null;
          // Clear invalid baseline from storage
          await this.storage.remove('baseline');
        }
        if (this.baseline && this.baselineHistory.length > 0) {
          this.baseline.history = this.baselineHistory;
        }
      }
      
      // Try to sync from chrome.storage if available (for global sync across tabs)
      try {
        const chromeApi = (typeof window !== 'undefined' && (window as any).chrome) || 
                         (typeof global !== 'undefined' && (global as any).chrome) ||
                         null;
        
        if (chromeApi && chromeApi.storage && chromeApi.storage.local) {
          const result = await new Promise<any>((resolve) => {
            try {
              chromeApi.storage.local.get(
                [
                  'coga_baseline',
                  'coga_calibration_state',
                  'coga_baseline_history',
                  'coga_calibration_progress',
                  'coga_calibration_data',
                  'coga_calibration_session',
                ],
                (result: any) => {
                if (chromeApi.runtime && chromeApi.runtime.lastError) {
                  resolve(null);
                  return;
                }
                resolve(result || null);
                }
              );
            } catch (err) {
              resolve(null);
            }
          });
          
          // Load baseline from chrome.storage if available and we don't have one locally
          if (result && result.coga_baseline && !this.baseline) {
            this.baseline = result.coga_baseline;
            if (this.baseline) {
              if (result.coga_baseline_history) {
                this.baselineHistory = result.coga_baseline_history;
              }
              this.baseline.history = this.baselineHistory;
            }
            // Sync to local storage for consistency
            await this.storage.set('baseline', this.baseline);
            if (this.baselineHistory.length > 0) {
              await this.storage.set('baseline_history', this.baselineHistory);
            }
            // console.log('[COGA] Baseline loaded from chrome.storage');
          } else if (this.baseline && (!result || !result.coga_baseline)) {
            // We have local baseline but not in chrome.storage - sync it
            await chromeApi.storage.local.set({
              coga_baseline: this.baseline,
              coga_baseline_history: this.baselineHistory,
            });
          }
          
          // Sync calibration state from global storage
          if (result && result.coga_calibration_state) {
            const calState = result.coga_calibration_state;
            // Just sync the state as-is, don't check time
            this.isCalibrating = calState.isCalibrating || false;
            this.calibrationStartTime = calState.calibrationStartTime || null;
            if (typeof calState.progress === 'number') {
              this.lastKnownProgress = calState.progress;
            }
          }

          if (result && typeof result.coga_calibration_progress === 'number') {
            this.lastKnownProgress = result.coga_calibration_progress;
          }

          if (result && Array.isArray(result.coga_calibration_data)) {
            this.calibrationData = result.coga_calibration_data;
          } else if (!this.isCalibrating) {
            this.calibrationData = [];
          }

          if (result && result.coga_calibration_session && result.coga_calibration_session.id) {
            this.calibrationSessionId = result.coga_calibration_session.id;
          } else if (!this.isCalibrating) {
            this.calibrationSessionId = null;
          }
        }
      } catch (syncError) {
        // Ignore sync errors - local storage is the primary storage
        // console.log('[COGA] Could not sync baseline from chrome.storage (using local storage)');
      }

      // Final validation: if we have a baseline, validate and log
      if (this.baseline) {
        // Check for zero MAD values and warn
        const zeroMadIssues: string[] = [];
        if (this.baseline.mouse.movementVelocityMAD === 0) zeroMadIssues.push('mouse movement velocity');
        if (this.baseline.mouse.clickFrequencyPerMinMAD === 0) zeroMadIssues.push('mouse click frequency');
        if (this.baseline.keyboard.typingErrorRateMAD === 0) zeroMadIssues.push('keyboard typing error rate');
        if (this.baseline.keyboard.avgPauseDurationMAD === 0) zeroMadIssues.push('keyboard pause duration');
        if (this.baseline.scroll.velocityMAD === 0) zeroMadIssues.push('scroll velocity');
        
        if (zeroMadIssues.length > 0) {
          console.warn(
            `[COGA] Baseline has zero MAD values for: ${zeroMadIssues.join(', ')}. Consider recalibrating.`
          );
        }
        
        // console.log('[COGA] Baseline loaded from storage');
        return this.baseline;
      }

      // No baseline found - this is expected on first run
      // console.log('[COGA] No baseline found - awaiting first calibration');
      return null;
    } catch (error) {
      console.error('[COGA] Error loading baseline:', error);
      return null;
    }
  }

  private async saveBaseline(baseline: Baseline, options?: { addToHistory?: boolean }): Promise<void> {
    try {
      const addToHistory = options?.addToHistory ?? true;

      this.baseline = {
        ...baseline,
      };

      if (addToHistory) {
        await this.persistBaselineHistory(this.baseline);
      } else {
        this.baselineHistory = [];
        this.baseline.history = [];
      }

      if (!this.baseline.history) {
        this.baseline.history = this.baselineHistory;
      }

      const saveResult = await this.storage.set('baseline', this.baseline);
      if (!saveResult) {
        console.error('[COGA] Failed to save baseline to localStorage');
      }

      const verifyBaseline = await this.storage.get<Baseline>('baseline');
      if (!verifyBaseline) {
        console.error('[COGA] Baseline NOT found in localStorage after save!');
      }

      const chromeApi =
        (typeof window !== 'undefined' && (window as any).chrome) ||
        (typeof global !== 'undefined' && (global as any).chrome) ||
        null;

      if (chromeApi && chromeApi.storage && chromeApi.storage.local) {
        try {
          await new Promise<void>((resolve, reject) => {
            chromeApi.storage.local.set(
              {
                coga_baseline: this.baseline,
                coga_baseline_history: this.baselineHistory,
                coga_calibration_state: {
                  isCalibrating: false,
                  calibrationStartTime: null,
                  progress: 100,
                  sessionId: null,
                },
                coga_calibration_progress: 100,
              },
              () => {
                if (chromeApi.runtime && chromeApi.runtime.lastError) {
                  reject(chromeApi.runtime.lastError);
                  return;
                }

                if (
                  chromeApi.storage &&
                  chromeApi.storage.local &&
                  typeof chromeApi.storage.local.remove === 'function'
                ) {
                  chromeApi.storage.local.remove(
                    ['coga_calibration_data', 'coga_calibration_session'],
                    () => {
                      if (chromeApi.runtime && chromeApi.runtime.lastError) {
                        console.warn(
                          '[COGA] Warning clearing calibration temp data:',
                          chromeApi.runtime.lastError
                        );
                      }
                      resolve();
                    }
                  );
                } else {
                  resolve();
                }
              }
            );
          });
        } catch (chromeError) {
          console.error('[COGA] ❌ Chrome storage sync failed:', chromeError);

          if (chromeApi && chromeApi.runtime && chromeApi.runtime.sendMessage) {
            try {
              const response = await new Promise<any>((resolve) => {
                chromeApi.runtime.sendMessage(
                  {
                    action: 'storageSet',
                    data: {
                      coga_baseline: this.baseline,
                      coga_baseline_history: this.baselineHistory,
                      coga_calibration_state: {
                        isCalibrating: false,
                        calibrationStartTime: null,
                        progress: 100,
                        sessionId: null,
                      },
                      coga_calibration_progress: 100,
                      coga_calibration_data: null,
                      coga_calibration_session: null,
                    },
                  },
                  (response) => {
                    resolve(response);
                  }
                );
              });

              if (!response || !response.success) {
                console.error('[COGA] ❌ Background script sync also failed');
              }
            } catch (msgError) {
              console.error('[COGA] ❌ Background messaging failed:', msgError);
            }
          }
        }
      }

      this.notifyBackgroundBaselineReady();
      await this.syncCalibrationState(100);
      await this.clearCalibrationPersistence();
    } catch (error) {
      console.error('[COGA] Error saving baseline:', error);
      throw error;
    }
  }

  /**
   * Get current baseline
   */
  getBaseline(): Baseline | null {
    return this.baseline;
  }

  /**
   * Check if baseline exists (checks local state, triggers async sync if needed)
   */
  hasBaseline(): boolean {
    // Check local state first (fast path)
    if (this.baseline !== null) return true;
    
    // If we don't have baseline locally, trigger async sync from global storage
    // This ensures we eventually get the correct state
    const chromeApi = (typeof window !== 'undefined' && (window as any).chrome) || 
                     (typeof global !== 'undefined' && (global as any).chrome) ||
                     null;
    
    if (chromeApi && chromeApi.storage && chromeApi.storage.local) {
      // Trigger async sync to update local state (don't block)
      this.syncFromGlobalState().catch(() => {});
    }
    
    return this.baseline !== null;
  }

  /**
   * Check if currently calibrating
   * IMPORTANT: Does NOT check time - only checks the flag
   * Time checking is done in addCalibrationData() to ensure proper completion
   */
  isCurrentlyCalibrating(): boolean {
    // Simply return the flag - let addCalibrationData() handle time expiration
    return this.isCalibrating;
  }
  
  /**
   * Sync state from global storage
   */
  private async syncFromGlobalState(): Promise<void> {
    try {
      const chromeApi = (typeof window !== 'undefined' && (window as any).chrome) || 
                       (typeof global !== 'undefined' && (global as any).chrome) ||
                       null;
      
      if (!chromeApi || !chromeApi.storage || !chromeApi.storage.local) {
        return;
      }
      
      const result = await new Promise<any>((resolve) => {
        chromeApi.storage.local.get(['coga_baseline', 'coga_calibration_state'], (result: any) => {
          if (chromeApi.runtime.lastError) {
            resolve(null);
            return;
          }
          resolve(result);
        });
      });
      
      if (result) {
        // Sync baseline
        if (result.coga_baseline) {
          this.baseline = result.coga_baseline;
        }
        
        // Sync calibration state
        if (result.coga_calibration_state) {
          const calState = result.coga_calibration_state;
          // Just sync the state as-is, don't check time
          this.isCalibrating = calState.isCalibrating || false;
          this.calibrationStartTime = calState.calibrationStartTime || null;
        }
      }
    } catch (error) {
      console.error('[COGA] Error syncing from global state:', error);
    }
  }

  /**
   * Get calibration progress (0-100) - syncs from global storage if needed
   */
  getCalibrationProgress(): number {
    // Calculate progress based on elapsed time
    if (this.isCalibrating && this.calibrationStartTime) {
      const elapsed = Date.now() - this.calibrationStartTime;
      // Allow going up to 100%, but don't mark calibration as complete here
      const progress = Math.min(100, (elapsed / this.calibrationDuration) * 100);
      return Math.round(progress);
    }
    
    return Math.round(this.lastKnownProgress) || 0;
  }

  getCalibrationStartTime(): number | null {
    try {
      return this.calibrationStartTime;
    } catch (error) {
      console.error('[COGA] Error getting calibration start time:', error);
      return null;
    }
  }

  /**
   * Update calibration state from external source (e.g., another tab)
   */
  updateCalibrationState(state: {
    isCalibrating?: boolean;
    calibrationStartTime?: number | null;
    progress?: number;
    calibrationData?: BehavioralMetrics[];
    sessionId?: string | null;
  }): void {
    try {
      if (typeof state.isCalibrating === 'boolean') {
        this.isCalibrating = state.isCalibrating;
        if (!state.isCalibrating) {
          this.calibrationData = [];
          this.calibrationSessionId = null;
        }
      }

      if (Object.prototype.hasOwnProperty.call(state, 'calibrationStartTime')) {
        this.calibrationStartTime = state.calibrationStartTime ?? null;
      }

      if (typeof state.progress === 'number') {
        this.lastKnownProgress = state.progress;
      }

      if (Array.isArray(state.calibrationData)) {
        this.calibrationData = state.calibrationData;
      }

      if (Object.prototype.hasOwnProperty.call(state, 'sessionId')) {
        this.calibrationSessionId = state.sessionId ?? null;
      }
    } catch (error) {
      console.error('[COGA] Error updating calibration state:', error);
    }
  }

  private generateSessionId(): string {
    return `cal-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  }

  private async persistCalibrationData(): Promise<void> {
    try {
      await this.storage.set(CALIBRATION_DATA_KEY, this.calibrationData);
    } catch (error) {
      console.error('[COGA] Error persisting calibration data:', error);
    }
  }

  private async persistCalibrationSessionMetadata(): Promise<void> {
    try {
      if (!this.calibrationSessionId || !this.calibrationStartTime) {
        await this.storage.remove(CALIBRATION_SESSION_KEY);
        return;
      }

      const metadata: CalibrationSessionMetadata = {
        id: this.calibrationSessionId,
        startedAt: this.calibrationStartTime,
      };

      await this.storage.set(CALIBRATION_SESSION_KEY, metadata);
    } catch (error) {
      console.error('[COGA] Error persisting calibration session metadata:', error);
    }
  }

  private async clearCalibrationPersistence(): Promise<void> {
    try {
      this.calibrationData = [];
      this.calibrationSessionId = null;

      await Promise.allSettled([
        this.storage.remove(CALIBRATION_DATA_KEY),
        this.storage.remove(CALIBRATION_SESSION_KEY),
      ]);
    } catch (error) {
      console.error('[COGA] Error clearing calibration persistence:', error);
    }
  }

  /**
   * Calculate median of an array
   */
  private calculateMedian(arr: number[]): number {
    try {
      if (!arr || arr.length === 0) return 0;

      const sorted = [...arr].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);

      if (sorted.length % 2 === 0) {
        return (sorted[mid - 1] + sorted[mid]) / 2;
      }

      return sorted[mid];
    } catch (error) {
      console.error('[COGA] Error calculating median:', error);
      return 0;
    }
  }

  /**
   * Calculate Median Absolute Deviation (MAD)
   * Enhanced with higher floor to prevent hypersensitivity
   */
  private calculateMAD(arr: number[]): number {
    try {
      if (!arr || arr.length === 0) return 0;

      const median = this.calculateMedian(arr);
      const deviations = arr.map((val) => Math.abs(val - median));
      const mad = this.calculateMedian(deviations);

      // IMPROVED: Higher minimum MAD to prevent hypersensitivity
      // Use 25% of median or 0.1 as floor (much higher than before)
      const minMad = Math.max(median * 0.25, 0.1);
      return Math.max(mad, minMad);
    } catch (error) {
      console.error('[COGA] Error calculating MAD:', error);
      return 0;
    }
  }

  /**
   * Calculate standard deviation
   */
  private calculateStdDev(arr: number[]): number {
    try {
      if (!arr || arr.length === 0) return 0;

      const avg = arr.reduce((sum, val) => sum + val, 0) / arr.length;
      const squaredDiffs = arr.map((val) => Math.pow(val - avg, 2));
      const avgSquaredDiff =
        squaredDiffs.reduce((sum, val) => sum + val, 0) / arr.length;

      return Math.sqrt(avgSquaredDiff);
    } catch (error) {
      console.error('[COGA] Error calculating standard deviation:', error);
      return 0;
    }
  }

  /**
   * Get current context (time of day, etc.)
   */
  private getContext(): Context {
    try {
      const now = new Date();
      const hour = now.getHours();

      let timeOfDay: Context['timeOfDay'];
      if (hour >= 6 && hour < 12) {
        timeOfDay = 'morning';
      } else if (hour >= 12 && hour < 18) {
        timeOfDay = 'afternoon';
      } else if (hour >= 18 && hour < 22) {
        timeOfDay = 'evening';
      } else {
        timeOfDay = 'night';
      }

      return {
        timeOfDay,
        dayOfWeek: now.getDay(),
        hour,
      };
    } catch (error) {
      console.error('[COGA] Error getting context:', error);
      return {
        timeOfDay: 'unknown',
        dayOfWeek: 0,
        hour: 0,
      };
    }
  }

  /**
   * Reset baseline
   */
  async resetBaseline(): Promise<void> {
    try {
      this.baseline = null;
      this.calibrationData = [];
      this.isCalibrating = false;
      this.calibrationSessionId = null;
      await this.storage.remove('baseline');
      await this.storage.remove('baseline_history');
      await this.clearCalibrationPersistence();
      this.baselineHistory = [];
      // console.log('[COGA] Baseline reset');
    } catch (error) {
      console.error('[COGA] Error resetting baseline:', error);
      throw error;
    }
  }

  /**
   * Update baseline with new data (adaptive learning)
   */
  async updateBaseline(metrics: BehavioralMetrics): Promise<void> {
    try {
      if (!this.baseline) return;

      // Slowly adapt baseline over time (exponential moving average)
      const alpha = 0.05; // Learning rate

      const blend = (current: number, baselineValue: number) =>
        alpha * current + (1 - alpha) * baselineValue;

      this.baseline.mouse.movementVelocity = blend(
        metrics.mouse.movementVelocity,
        this.baseline.mouse.movementVelocity
      );
      this.baseline.mouse.movementAcceleration = blend(
        metrics.mouse.movementAcceleration,
        this.baseline.mouse.movementAcceleration
      );
      this.baseline.mouse.mouseJitter = blend(
        metrics.mouse.mouseJitter,
        this.baseline.mouse.mouseJitter
      );
      this.baseline.mouse.clickFrequencyPerMin = blend(
        metrics.mouse.clickFrequencyPerMin,
        this.baseline.mouse.clickFrequencyPerMin
      );
      this.baseline.mouse.multiClickRatePerMin = blend(
        metrics.mouse.multiClickRatePerMin,
        this.baseline.mouse.multiClickRatePerMin
      );
      this.baseline.mouse.pathEfficiency = blend(
        metrics.mouse.pathEfficiency,
        this.baseline.mouse.pathEfficiency
      );
      this.baseline.mouse.pauseRatio = blend(
        metrics.mouse.pauseRatio,
        this.baseline.mouse.pauseRatio
      );
      this.baseline.mouse.scrollVelocity = blend(
        metrics.mouse.scrollVelocity,
        this.baseline.mouse.scrollVelocity
      );

      this.baseline.keyboard.typingErrorRate = blend(
        metrics.keyboard.typingErrorRate,
        this.baseline.keyboard.typingErrorRate
      );
      this.baseline.keyboard.typingSpeedPerMin = blend(
        metrics.keyboard.typingSpeedPerMin,
        this.baseline.keyboard.typingSpeedPerMin
      );
      this.baseline.keyboard.pauseRegularity = blend(
        metrics.keyboard.pauseRegularity,
        this.baseline.keyboard.pauseRegularity
      );
      this.baseline.keyboard.avgPauseDuration = blend(
        metrics.keyboard.avgPauseDuration,
        this.baseline.keyboard.avgPauseDuration
      );

      this.baseline.scroll.velocity = blend(
        metrics.scroll.velocity,
        this.baseline.scroll.velocity
      );

      // Save updated baseline periodically
      await this.storage.set('baseline', this.baseline);
    } catch (error) {
      console.error('[COGA] Error updating baseline:', error);
    }
  }
}

export default BaselineManager;

