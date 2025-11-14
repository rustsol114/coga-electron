/**
 * Widget.ts
 * Minimal floating indicator widget with white background design
 */

import type StressDetector from '../core/StressDetector';
import type BaselineManager from '../core/BaselineManager';
import type { StressLevel, InterventionKey } from '../types';
import { widgetStyles } from './widget.styles';
import { widgetTemplate } from './widget.template';
import { BASELINE_DURATION_SECONDS, BASELINE_DURATION_MS } from '../config';
import StorageManager from '../utils/storage';
import SettingsManager from '../utils/SettingsManager';
import type AnnoyanceRules from '../rules/AnnoyanceRules';
import { createIcons, icons } from 'lucide';

interface Position {
  x: number;
  y: number;
}

class Widget {
  private stressDetector: StressDetector;
  private baselineManager: BaselineManager;
  private settingsManager: SettingsManager;
  private annoyanceRules: AnnoyanceRules | null;
  private container: HTMLElement | null;
  private isExpanded: boolean;
  private position: Position;
  private isDragging: boolean;
  private updateIntervalId: number | null;
  private currentLevel: StressLevel;
  private rafId: number | null;
  private lastGlobalStressData: any | null;
  private lastGlobalUpdateTime: number;
  private storageManager: StorageManager;
  private currentView: 'prompt' | 'calibration' | 'dashboard' | 'settings';
  private previousView: 'prompt' | 'calibration' | 'dashboard';
  private readonly calibrationMessages: string[];
  private readonly calibrationMessageIntervalMs: number;
  private lastCalibrationMessageIndex: number;
  private calibrationMessageFallbackStart: number | null;
  private settingsViewInitialized: boolean;
  private settingsStepIndex: number;
  private readonly settingsStepCount: number;
  private originalSettings: {
    sensitivity: 'low' | 'medium' | 'high';
    limits: {
      cooldownMinutes: number;
      maxPerHour: number;
      maxPerDay: number;
    };
    interventions: Record<InterventionKey, boolean>;
    domains: string[];
  };
  private settingsMessageTimeouts: Record<string, number>;
  private readonly interventionToggleMap: Record<InterventionKey, string>;
  private readonly calibrationTotalSeconds: number;
  private readonly calibrationTotalMs: number;
  private quickDemoState: {
    isActive: boolean;
    startedAt: number;
    endsAt: number;
    durationMs: number;
  } | null;
  private quickDemoTimerId: number | null;
  private quickDemoOverlay: HTMLElement | null;
  private quickDemoCountdownEl: HTMLElement | null;

  constructor(
    stressDetector: StressDetector,
    baselineManager: BaselineManager,
    settingsManager: SettingsManager,
    annoyanceRules?: AnnoyanceRules | null
  ) {
    this.stressDetector = stressDetector;
    this.baselineManager = baselineManager;
    this.settingsManager = settingsManager;
    this.annoyanceRules = annoyanceRules ?? null;
    this.container = null;
    this.isExpanded = false;
    this.position = this.getDefaultDockPosition();
    this.isDragging = false;
    this.updateIntervalId = null;
    this.currentLevel = 'normal';
    this.rafId = null;
    this.lastGlobalStressData = null;
    this.lastGlobalUpdateTime = 0;
    this.storageManager = new StorageManager('coga_');
    this.currentView = 'prompt';
    this.previousView = 'prompt';
    this.calibrationMessages = [
      'Learning your normal work patterns to detect stress accurately.',
      'Stress insights will be available after 2-4 hours of active use.'
    ];
    this.calibrationMessageIntervalMs = 3000;
    this.lastCalibrationMessageIndex = -1;
    this.calibrationMessageFallbackStart = null;
    this.settingsViewInitialized = false;
    this.settingsStepIndex = 0;
    this.settingsStepCount = 4;
    this.settingsMessageTimeouts = {};
    this.interventionToggleMap = {
      oneBreathReset: 'coga-settings-intervention-oneBreathReset',
      boxBreathing: 'coga-settings-intervention-boxBreathing',
      twentyTwentyGaze: 'coga-settings-intervention-twentyTwentyGaze',
      figureEightSmoothPursuit: 'coga-settings-intervention-figureEightSmoothPursuit',
      nearFarFocusShift: 'coga-settings-intervention-nearFarFocusShift',
      microBreak: 'coga-settings-intervention-microBreak',
    };
    this.calibrationTotalSeconds = BASELINE_DURATION_SECONDS;
    this.calibrationTotalMs = BASELINE_DURATION_MS;
    this.quickDemoState = null;
    this.quickDemoTimerId = null;
    this.quickDemoOverlay = null;
    this.quickDemoCountdownEl = null;

    try {
      const initialSettings = this.settingsManager.getSettings();
      this.originalSettings = {
        sensitivity: initialSettings.sensitivity ?? 'medium',
        limits: {
          cooldownMinutes: initialSettings.interventionLimits?.cooldownMinutes ?? 8,
          maxPerHour: initialSettings.interventionLimits?.maxPerHour ?? 2,
          maxPerDay: initialSettings.interventionLimits?.maxPerDay ?? 6,
        },
        interventions: {
          oneBreathReset: initialSettings.enabledInterventions?.oneBreathReset ?? true,
          boxBreathing: initialSettings.enabledInterventions?.boxBreathing ?? true,
          twentyTwentyGaze: initialSettings.enabledInterventions?.twentyTwentyGaze ?? true,
          figureEightSmoothPursuit: initialSettings.enabledInterventions?.figureEightSmoothPursuit ?? true,
          nearFarFocusShift: initialSettings.enabledInterventions?.nearFarFocusShift ?? true,
          microBreak: initialSettings.enabledInterventions?.microBreak ?? true,
        },
        domains: Array.isArray(initialSettings.suppressedDomains)
          ? [...initialSettings.suppressedDomains]
          : [],
      };
    } catch (error) {
      console.error('[COGA] Error initializing settings snapshot:', error);
      this.originalSettings = {
        sensitivity: 'medium',
        limits: {
          cooldownMinutes: 8,
          maxPerHour: 2,
          maxPerDay: 6,
        },
        interventions: {
          oneBreathReset: true,
          boxBreathing: true,
          twentyTwentyGaze: true,
          figureEightSmoothPursuit: true,
          nearFarFocusShift: true,
          microBreak: true,
        },
        domains: [],
      };
    }
  }

  /**
   * Get configured calibration duration in seconds
   */
  private getCalibrationDurationSeconds(): number {
    return this.calibrationTotalSeconds > 0 ? this.calibrationTotalSeconds : 60;
  }

  /**
   * Get configured calibration duration in milliseconds
   */
  private getCalibrationDurationMs(): number {
    if (this.calibrationTotalMs > 0) {
      return this.calibrationTotalMs;
    }
    return this.getCalibrationDurationSeconds() * 1000;
  }

  /**
   * Format calibration duration into human-readable text
   */
  private formatCalibrationDurationText(
    seconds = this.getCalibrationDurationSeconds()
  ): string {
    const totalSeconds = Math.max(1, Math.round(seconds));

    if (totalSeconds < 60) {
      return `${totalSeconds} second${totalSeconds !== 1 ? 's' : ''}`;
    }

    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const remainingSeconds = totalSeconds % 60;
    const parts: string[] = [];

    if (hours > 0) {
      parts.push(`${hours} hour${hours !== 1 ? 's' : ''}`);
    }

    if (minutes > 0) {
      parts.push(`${minutes} minute${minutes !== 1 ? 's' : ''}`);
    }

    if (remainingSeconds > 0 && hours === 0) {
      parts.push(`${remainingSeconds} second${remainingSeconds !== 1 ? 's' : ''}`);
    }

    if (parts.length === 0) {
      const totalMinutes = totalSeconds / 60;
      return `${totalMinutes.toFixed(1)} minutes`;
    }

    return parts.join(' ');
  }

  /**
   * Format seconds into clock style (mm:ss or h:mm:ss)
   */
  private formatClockDuration(seconds: number): string {
    const totalSeconds = Math.max(0, Math.round(seconds));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const remainderSeconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${remainderSeconds
        .toString()
        .padStart(2, '0')}`;
    }

    return `${minutes}:${remainderSeconds.toString().padStart(2, '0')}`;
  }

  /**
   * Reset calibration progress indicators to defaults
   */
  private resetCalibrationIndicators(): void {
    try {
      const progressBar = document.getElementById('coga-progress-bar');
      if (progressBar) {
        (progressBar as HTMLElement).style.width = '0%';
      }

      const progressPercent = document.getElementById('coga-progress-percent');
      if (progressPercent) {
        progressPercent.textContent = '0%';
      }

      const progressTime = document.getElementById('coga-progress-time');
      if (progressTime) {
        progressTime.textContent = `0:00 / ${this.formatClockDuration(this.getCalibrationDurationSeconds())}`;
      }
    } catch (error) {
      console.error('[COGA] Error resetting calibration indicators:', error);
    }
  }

  /**
   * Update calibration descriptive copy based on configured duration
   */
  private updateCalibrationCopy(): void {
    try {
      const durationText = this.formatCalibrationDurationText();
      const durationSpan = document.getElementById('coga-calibration-duration-value');
      if (durationSpan) {
        durationSpan.textContent = durationText;
      }

      this.resetCalibrationIndicators();
    } catch (error) {
      console.error('[COGA] Error updating calibration copy:', error);
    }
  }

  public setQuickDemoState(
    state: { isActive: boolean; startedAt: number; endsAt: number; durationMs: number } | null,
    reason?: string
  ): void {
    try {
      this.quickDemoState = state && state.isActive ? { ...state } : null;

      if (this.quickDemoState) {
        this.startQuickDemoCountdown();
      } else {
        this.stopQuickDemoCountdown();
        if (reason === 'expired') {
          this.showQuickDemoToast('Quick demo ended. Please run calibration to continue.');
        }
      }
    } catch (error) {
      console.error('[COGA] Error updating quick demo state:', error);
    }
  }

  private startQuickDemoCountdown(): void {
    try {
      if (!this.quickDemoState) {
        return;
      }

      this.stopQuickDemoCountdown();
      this.ensureQuickDemoOverlay();
      this.updateQuickDemoOverlay();

      this.quickDemoTimerId = window.setInterval(() => {
        if (!this.quickDemoState) {
          this.stopQuickDemoCountdown();
          return;
        }

        const remainingMs = this.quickDemoState.endsAt - Date.now();
        if (remainingMs <= 0) {
          this.stopQuickDemoCountdown();
          return;
        }

        this.updateQuickDemoOverlay();
      }, 1000);
    } catch (error) {
      console.error('[COGA] Error starting quick demo countdown:', error);
    }
  }

  private stopQuickDemoCountdown(): void {
    try {
      if (this.quickDemoTimerId) {
        window.clearInterval(this.quickDemoTimerId);
        this.quickDemoTimerId = null;
      }

      if (this.quickDemoOverlay && this.quickDemoOverlay.parentNode) {
        this.quickDemoOverlay.parentNode.removeChild(this.quickDemoOverlay);
      }
      this.quickDemoOverlay = null;
      this.quickDemoCountdownEl = null;
    } catch (error) {
      console.error('[COGA] Error stopping quick demo countdown:', error);
    }
  }

  private ensureQuickDemoOverlay(): void {
    try {
      if (this.quickDemoOverlay) {
        return;
      }

      const overlay = document.createElement('div');
      overlay.className = 'coga-quick-demo-overlay';

      const label = document.createElement('strong');
      label.textContent = 'Quick Demo';

      const countdown = document.createElement('span');
      countdown.className = 'coga-quick-demo-countdown';
      countdown.textContent = '00:00';

      overlay.appendChild(label);
      overlay.appendChild(countdown);

      document.body.appendChild(overlay);

      this.quickDemoOverlay = overlay;
      this.quickDemoCountdownEl = countdown;
    } catch (error) {
      console.error('[COGA] Error creating quick demo overlay:', error);
    }
  }

  private updateQuickDemoOverlay(): void {
    try {
      if (!this.quickDemoState || !this.quickDemoCountdownEl) {
        return;
      }

      const remainingMs = Math.max(0, this.quickDemoState.endsAt - Date.now());
      const remainingSeconds = Math.round(remainingMs / 1000);
      this.quickDemoCountdownEl.textContent = this.formatClockDuration(remainingSeconds);
    } catch (error) {
      console.error('[COGA] Error updating quick demo overlay:', error);
    }
  }

  private showQuickDemoToast(message: string, duration = 4000): void {
    try {
      const toast = document.createElement('div');
      toast.className = 'coga-quick-demo-toast';
      toast.textContent = message;

      document.body.appendChild(toast);

      window.setTimeout(() => {
        if (toast.parentNode) {
          toast.classList.add('coga-quick-demo-toast-hide');
          window.setTimeout(() => {
            if (toast.parentNode) {
              toast.parentNode.removeChild(toast);
            }
          }, 300);
        }
      }, duration);
    } catch (error) {
      console.error('[COGA] Error showing quick demo toast:', error);
    }
  }

  private getDefaultDockPosition(): Position {
    try {
      const padding = 24;
      const dotSize = 52;
      const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 0;
      const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 0;

      if (!viewportWidth || !viewportHeight) {
        return { x: 16, y: 16 };
      }

      const x = Math.max(padding, viewportWidth - dotSize - padding);
      const y = Math.max(padding, viewportHeight - dotSize - padding);
      return { x, y };
    } catch (error) {
      console.error('[COGA] Error calculating default widget position:', error);
      return { x: 16, y: 16 };
    }
  }

  /**
   * Initialize and render the widget
   */
  async init(): Promise<void> {
    try {
      this.createWidget();
      this.updateCalibrationCopy();
      if (this.quickDemoState?.isActive) {
        this.startQuickDemoCountdown();
      }
      this.initializeIcons(); // Inicializar iconos después de crear el widget
      this.attachEventListeners();
      this.setupGlobalSync(); // Setup global synchronization first
      await this.loadInitialGlobalState(); // AWAIT - Load current global state before continuing
      this.updateWidgetState(); // Check initial state after sync
      this.startUpdateLoop();
    } catch (error) {
      console.error('[COGA] Error initializing widget:', error);
    }
  }

  /**
   * Load initial global state from chrome.storage via bridge
   */
  private async loadInitialGlobalState(): Promise<void> {
    try {
      // console.log('[COGA Widget] Loading initial global state...');
      
      // IMPORTANT: Always try to load baseline from storage first (via bridge)
      // This ensures we know if baseline exists before showing any UI
      if (this.baselineManager) {
        console.log('[COGA Widget] Loading baseline via storage manager...');
        await this.baselineManager.loadBaseline().catch((err) => {
          console.warn('[COGA Widget] Failed to load baseline:', err);
        });
        
        if (this.baselineManager.hasBaseline()) {
          console.log('[COGA Widget] ✅ Baseline loaded successfully on init');
        } else {
          console.log('[COGA Widget] No baseline found on init');
        }
      }

      // Try to load global state via window.postMessage bridge
      if (typeof window !== 'undefined' && window.postMessage) {
        try {
          const requestId = `init_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          
          const result = await new Promise<any>((resolve, reject) => {
            const timeout = setTimeout(() => {
              window.removeEventListener('message', messageHandler);
              console.warn('[COGA Widget] Timeout loading initial state, using local data only');
              resolve({});
            }, 500);//3000);
            
            const messageHandler = (event: MessageEvent) => {
              if (event.source !== window) return;
              if (event.data.type === 'COGA_STORAGE_RESPONSE' && event.data.requestId === requestId) {
                clearTimeout(timeout);
                window.removeEventListener('message', messageHandler);
                resolve(event.data.data || {});
              }
            };
            
            window.addEventListener('message', messageHandler);
            
            // Request ALL keys at once
            window.postMessage({
              type: 'COGA_STORAGE_REQUEST',
              action: 'get',
              keys: [
                'coga_baseline',
                'coga_calibration_state',
                'coga_stress_data',
              'coga_widget_expanded',
              'coga_widget_position'
              ],
              requestId: requestId
            }, '*');
          });

          // console.log('[COGA Widget] Received initial state:', Object.keys(result));

          // Sync baseline if found in chrome.storage
          if (result.coga_baseline && this.baselineManager) {
            // console.log('[COGA Widget] Found baseline in chrome.storage, syncing to baselineManager...');
            // Force reload baseline to ensure it's in sync
            await this.baselineManager.loadBaseline().catch(() => {});
          }

          // Sync calibration state
          if (result.coga_calibration_state) {
            const state = result.coga_calibration_state;
            // console.log('[COGA Widget] Calibration state from chrome.storage:', state);

            if (this.baselineManager && state) {
              this.baselineManager.updateCalibrationState({
                isCalibrating: state.isCalibrating,
                calibrationStartTime: state.calibrationStartTime,
                progress: state.progress,
              });

              if (state.sessionId) {
                this.baselineManager.updateCalibrationState({
                  sessionId: state.sessionId,
                });
              }

              if (Array.isArray(state.calibrationData)) {
                this.baselineManager.updateCalibrationState({
                  calibrationData: state.calibrationData,
                });
              }

              const hasBaseline = this.baselineManager.hasBaseline();
              const calibrationComplete = !state.isCalibrating && typeof state.progress === 'number' && state.progress >= 100;

              if (hasBaseline && calibrationComplete) {
                this.baselineManager.updateCalibrationState({
                  isCalibrating: false,
                  calibrationStartTime: null,
                  progress: Math.max(100, Math.round(state.progress ?? 100)),
                  sessionId: null,
                });
                void this.resetCalibrationStateGlobal();
              }
            }
            
            if (state.isCalibrating && state.calibrationStartTime) {
              const progress = typeof state.progress === 'number'
                ? Math.max(0, Math.min(100, Math.round(state.progress)))
                : this.baselineManager
                  ? this.baselineManager.getCalibrationProgress()
                  : 0;
              
              if (progress < 100) {
                // console.log('[COGA Widget] Calibration in progress, showing progress:', progress);
                this.showCalibrationProgress(progress);
              }
            }
          }

          // Sync panel expanded state from other tabs
          if (typeof result.coga_widget_expanded === 'boolean') {
            this.setPanelState(result.coga_widget_expanded, false);
          }

          if (this.isValidPosition(result.coga_widget_position)) {
            this.setPosition(result.coga_widget_position, false);
          } else {
            const fallbackPosition = await this.storageManager.get<Position>('widget_position');
            if (this.isValidPosition(fallbackPosition)) {
              this.setPosition(fallbackPosition, false);
        } else {
          //this.setPosition(this.getDefaultDockPosition(), false);
          this.position = this.getDefaultDockPosition();
          this.updatePosition();
            }
          }

          // Update widget state after syncing baseline and calibration
          // This will show: calibration prompt (no baseline), calibration progress (calibrating), or dashboard (has baseline)
          this.updateWidgetState();

          // CRITICAL: Load and display stress data from chrome.storage
          const hasBaseline = this.baselineManager && this.baselineManager.hasBaseline();
          const isCalibrating = this.baselineManager && this.baselineManager.isCurrentlyCalibrating();
          
          if (hasBaseline && !isCalibrating) {
            // console.log('[COGA Widget] Has baseline, loading stress data...');
            
            if (result.coga_stress_data) {
              const stressData = result.coga_stress_data;
              // console.log('[COGA Widget] ✅ Found stress data in chrome.storage:', stressData.level, stressData.combined);
              
              // Update dot color immediately
              if (stressData.level) {
                this.updateDotColor(stressData.level);
              }
              
              // Update panel content if expanded
              if (this.isExpanded) {
                this.updatePanelContent(stressData);
              }
            } else {
              console.log('[COGA Widget] No stress data found in chrome.storage yet');
              this.updateDotColor('normal');
            }
          } else {
            // console.log('[COGA Widget] Before calibration or during calibration - showing normal state');
            this.updateDotColor('normal');
          }
        } catch (bridgeError) {
          console.error('[COGA Widget] Error using bridge:', bridgeError);
        }
      }
    } catch (error) {
      console.error('[COGA] Error loading initial global state:', error);
      // Ensure widget state is updated even on error
      this.updateWidgetState();
    }
  }

  /**
   * Setup global synchronization using chrome.storage
   */
  private setupGlobalSync(): void {
    try {
      // Only setup sync if in extension context
      const chromeApi = (typeof window !== 'undefined' && (window as any).chrome) || 
                       (typeof global !== 'undefined' && (global as any).chrome) ||
                       null;
      
      // Listen for storage changes via window.postMessage bridge (from content script)
      if (typeof window !== 'undefined') {
        // console.log('[COGA Widget] Setting up storage change listener via window.postMessage bridge');
        
        window.addEventListener('message', (event) => {
          if (event.source !== window) return;
          if (event.data.type === 'COGA_STORAGE_CHANGED' && event.data.areaName === 'local') {
            const changes = event.data.changes;
            // console.log('[COGA Widget] ✨ Storage changed (via bridge):', Object.keys(changes));
            this.handleStorageChanges(changes);
          }
        });
      }
      
      // Also try direct listener if available (for true content script context)
      if (chromeApi && chromeApi.storage && chromeApi.storage.onChanged) {
        // console.log('[COGA Widget] Setting up direct chrome.storage.onChanged listener (fallback)');
        
        // Listen for calibration state changes
        chromeApi.storage.onChanged.addListener((changes: any, areaName: string) => {
          // console.log('[COGA Widget] Storage changed (direct):', areaName, Object.keys(changes));
          
          if (areaName !== 'local') return;
          this.handleStorageChanges(changes);
        });
      }
    } catch (error) {
      console.error('[COGA] Error setting up global sync:', error);
    }
  }

  /**
   * Handle storage changes from chrome.storage.onChanged
   */
  private handleStorageChanges(changes: any): void {
    try {

          // Sync baseline changes - when baseline is set, calibration is complete
          if (changes['coga_baseline']) {
            const newBaseline = changes['coga_baseline'].newValue;
            const oldBaseline = changes['coga_baseline'].oldValue;
            
            if (newBaseline && !oldBaseline) {
              // Baseline was just created (calibration just completed)
              // console.log('[COGA Widget] ✨ Baseline created in another tab - syncing now!');
              // console.log('[COGA Widget] New baseline data:', newBaseline);
              
              // Force sync the baseline manager state immediately
              if (this.baselineManager) {
                // Load baseline and update UI
                // console.log('[COGA Widget] Loading baseline from storage...');
                this.baselineManager.loadBaseline().then(() => {
                  console.log('[COGA Widget] Baseline loaded successfully, updating UI...');
                  // Also ensure the dot calibration state is cleared
                  const dot = document.getElementById('coga-widget-dot');
                  if (dot) {
                    dot.removeAttribute('data-calibrating');
                    dot.style.removeProperty('--progress');
                  }
                  
                  // Ensure calibration state is cleared locally
                  if (this.baselineManager) {
                    this.baselineManager.updateCalibrationState({
                      isCalibrating: false,
                      calibrationStartTime: null,
                      progress: 100
                    });
                  }

                  void this.resetCalibrationStateGlobal();

                  // Ensure calibration progress view is hidden
                  const calibrationProgress = document.getElementById('coga-calibration-progress');
                  if (calibrationProgress) {
                    calibrationProgress.style.display = 'none';
                  }

                  // Force update widget state after baseline is loaded
                  // This will switch from calibration progress to dashboard
                  this.updateWidgetStateSync();
                  
                  // If panel is open, make sure it shows the dashboard and stays open
                  if (this.isExpanded) {
                    this.updateDisplay();
                  } else {
                    // If panel was closed, ensure it can be opened and will show dashboard
                    // The dashboard will be shown when user clicks the dot
                  }
                }).catch(() => {
                  this.updateWidgetStateSync();
                });
              } else {
                this.updateWidgetStateSync();
              }
            } else if (newBaseline && oldBaseline) {
              // Baseline was updated (recalibration)
              if (this.baselineManager) {
                this.baselineManager.loadBaseline().then(() => {
                  this.baselineManager.updateCalibrationState({
                    isCalibrating: false,
                    calibrationStartTime: null,
                    progress: 100
                  });
                    void this.resetCalibrationStateGlobal();
                  this.updateWidgetStateSync();
                }).catch(() => {});
              }
            } else {
              // Baseline was removed
              this.updateWidgetStateSync();
            }
          }

          // Sync calibration state changes
          if (changes['coga_calibration_state']) {
            const state = changes['coga_calibration_state'].newValue;
            const oldState = changes['coga_calibration_state'].oldValue;
            
            if (state) {
              if (this.baselineManager) {
                this.baselineManager.updateCalibrationState({
                  isCalibrating: state.isCalibrating,
                  calibrationStartTime: state.calibrationStartTime,
                  progress: state.progress,
                });
              }

              if (state.isCalibrating && state.calibrationStartTime) {
                // Calibration is in progress - show progress
                const progress = typeof state.progress === 'number'
                  ? Math.max(0, Math.min(100, Math.round(state.progress)))
                  : this.baselineManager
                    ? this.baselineManager.getCalibrationProgress()
                    : 0;
                
                if (progress < 100) {
                  this.showCalibrationProgress(progress);
                  // Force update widget state to show calibration progress view
                  this.updateWidgetState();
                }
              } else if (oldState && oldState.isCalibrating && !state.isCalibrating) {
                // Calibration just completed - force update to dashboard
                // Ensure baseline is loaded first
                if (this.baselineManager) {
                  this.baselineManager.loadBaseline().then(() => {
                    this.baselineManager.updateCalibrationState({
                      isCalibrating: false,
                      calibrationStartTime: null,
                      progress: 100
                    });
                    void this.resetCalibrationStateGlobal();
                    this.updateWidgetStateSync();
                    // Ensure dashboard is visible if panel is open
                    if (this.isExpanded) {
                      this.updateDisplay();
                    }
                  }).catch(() => {
                    this.baselineManager?.updateCalibrationState({
                      isCalibrating: false,
                      calibrationStartTime: null,
                      progress: 100
                    });
                    void this.resetCalibrationStateGlobal();
                    this.updateWidgetStateSync();
                  });
                } else {
                  this.updateWidgetState();
                }
              } else {
                // Calibration is not in progress - check if we should show prompt or dashboard
                this.updateWidgetState();
              }
            } else {
              // State was cleared
              this.updateWidgetState();
            }
          }

          // Sync calibration progress (for real-time updates during calibration)
          if (changes['coga_calibration_progress']) {
            const progress = changes['coga_calibration_progress'].newValue;
            if (typeof progress === 'number') {
              if (this.baselineManager) {
                this.baselineManager.updateCalibrationState({ progress });
              }

              // If calibration already completed elsewhere, ignore stale progress updates
              const isCalibrating = this.baselineManager
                ? this.baselineManager.isCurrentlyCalibrating()
                : false;

              if (!isCalibrating) {
                this.updateWidgetState();
                void this.resetCalibrationStateGlobal();
                return;
              }

              this.showCalibrationProgress(progress);
            }
          }

          // Sync stress data - always update dot and panel if expanded
          if (changes['coga_stress_data']) {
            const stressData = changes['coga_stress_data'].newValue;
            if (stressData && this.isValidStressData(stressData)) {
              // Store latest global data to prevent overwriting
              this.lastGlobalStressData = stressData;
              this.lastGlobalUpdateTime = Date.now();
              
              // Always update dot color
              if (stressData.level) {
                this.updateDotColor(stressData.level);
              }
              
              // Update panel if expanded
              if (this.isExpanded) {
                this.updatePanelContent(stressData);
              }
            }
          }

      // Sync widget panel state (expanded/collapsed) across tabs
      if (changes['coga_widget_expanded']) {
        const isExpanded = changes['coga_widget_expanded'].newValue;
        if (typeof isExpanded === 'boolean') {
          this.setPanelState(isExpanded, false);
        }
      }

      if (changes['coga_widget_position']) {
        const newPosition = changes['coga_widget_position'].newValue;
        if (this.isValidPosition(newPosition)) {
          this.setPosition(newPosition, false);
        }
      }
    } catch (error) {
      console.error('[COGA] Error handling storage changes:', error);
    }
  }

  /**
   * Create widget UI
   */
  private createWidget(): void {
    try {
      // Check if widget already exists in this tab
      const existingWidget = document.getElementById('coga-widget');
      if (existingWidget) {
        console.log('[COGA] Widget already exists in this tab, reusing existing widget');
        this.container = existingWidget;
        return;
      }

      this.container = document.createElement('div');
      this.container.id = 'coga-widget';
      this.container.innerHTML = widgetTemplate;

      this.injectStyles();
      document.body.appendChild(this.container);
      this.updatePosition();
    } catch (error) {
      console.error('[COGA] Error creating widget:', error);
    }
  }

  /**
   * Initialize Lucide icons
   */
  private initializeIcons(): void {
    try {
      // Initialize all Lucide icons within the widget container
      if (this.container) {
      createIcons({
          icons,
          attrs: {
            'stroke-width': 2,
            width: '16',
            height: '16'
          },
          nameAttr: 'data-lucide'
        });
      }
    } catch (error) {
      console.error('[COGA] Error initializing icons:', error);
    }
  }

  /**
   * Attach event listeners
   */
  private attachEventListeners(): void {
    try {
      const dot = document.getElementById('coga-widget-dot');
      const close = document.getElementById('coga-widget-close');

      if (dot) {
        // Separate click from drag
        let dragStartTime = 0;
        let dragDistance = 0;
        let hasDragged = false;

        dot.addEventListener('mousedown', (e) => {
          dragStartTime = Date.now();
          dragDistance = 0;
          hasDragged = false;
          const startX = e.clientX;
          const startY = e.clientY;

          const onMouseMove = (moveEvent: MouseEvent) => {
            const dx = moveEvent.clientX - startX;
            const dy = moveEvent.clientY - startY;
            dragDistance = Math.sqrt(dx * dx + dy * dy);
            
            // If moved more than 5px, it's a drag, not a click
            if (dragDistance > 5) {
              hasDragged = true;
            }
          };

          const onMouseUp = () => {
            const clickDuration = Date.now() - dragStartTime;
            
            // Only toggle if it was a click (short duration and minimal movement)
            if (!hasDragged && dragDistance <= 5 && clickDuration < 300) {
              this.togglePanel();
            }
            
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
          };

          document.addEventListener('mousemove', onMouseMove);
          document.addEventListener('mouseup', onMouseUp);
        });

        // Make draggable
        this.makeDraggable(dot);
      }

      if (close) {
        close.addEventListener('click', () => {
          this.setPanelState(false, true);
        });
      }

      // Prevent panel from closing when clicking inside
      const panel = document.getElementById('coga-widget-panel');
      if (panel) {
        panel.addEventListener('click', (e) => e.stopPropagation());
      }

      // Calibration button
      const startCalibrationBtn = document.getElementById('coga-start-calibration');
      if (startCalibrationBtn) {
        startCalibrationBtn.addEventListener('click', () => this.onStartCalibration());
      }

      // Recalibration button
      const recalibrateBtn = document.getElementById('coga-recalibrate-btn');
      if (recalibrateBtn) {
        recalibrateBtn.addEventListener('click', () => this.onStartCalibration());
      }

      // Settings button
      const settingsBtn = document.getElementById('coga-settings-btn');
      if (settingsBtn) {
        settingsBtn.addEventListener('click', () => this.openSettings());
      }

      // Listen for calibration completion to update widget state
      window.addEventListener('coga:calibration-complete', async () => {
        try {
          // Ensure baseline is loaded before updating widget state
          if (this.baselineManager) {
            await this.baselineManager.loadBaseline().catch(() => {});
          }
          // Force update widget state to show dashboard
          this.updateWidgetState();
          // Also ensure dashboard is visible if panel is open
          if (this.isExpanded) {
            this.updateDisplay();
          }
        } catch (error) {
          console.error('[COGA] Error handling calibration complete event:', error);
          this.updateWidgetState();
        }
      });

      // Reposition panel on window resize
      window.addEventListener('resize', () => {
        this.setPosition(this.position, false);
        if (this.isExpanded) {
          const panel = document.getElementById('coga-widget-panel');
          const dot = document.getElementById('coga-widget-dot');
          if (panel && dot) {
            this.positionPanel(panel, dot);
          }
        }
      });
      const compactToggle = document.getElementById('coga-compact-toggle');
      const compactStats = document.getElementById('coga-compact-stats');
      const compactWrapper = compactToggle?.closest('.coga-compact-stats-collapsible');

      if (compactToggle && compactStats && compactWrapper) {
        compactToggle.addEventListener('click', () => {
          const isCollapsed = compactWrapper.classList.toggle('is-collapsed');
          compactToggle.setAttribute('aria-expanded', (!isCollapsed).toString());
        });
      }
    } catch (error) {
      console.error('[COGA] Error attaching event listeners:', error);
    }
  }

  /**
   * Handle calibration start
   */
  private onStartCalibration(): void {
    try {
      // Dispatch custom event that COGA class can listen to
      const event = new CustomEvent('coga:start-calibration');
      window.dispatchEvent(event);
    } catch (error) {
      console.error('[COGA] Error starting calibration:', error);
    }
  }

  /**
   * Open settings page
   */
  private openSettings(): void {
    try {
      this.expandPanel();
      if (this.currentView !== 'settings') {
        if (this.currentView === 'calibration' || this.currentView === 'prompt' || this.currentView === 'dashboard') {
          this.previousView = this.currentView;
        } else {
          this.previousView = 'dashboard';
        }
      }

      this.currentView = 'settings';
      this.applyView('settings');
      this.initializeSettingsView();
      this.settingsStepIndex = 0;
      this.updateSettingsStep(0);
      void this.loadSettingsView();
    } catch (error) {
      console.error('[COGA] Error opening settings:', error);
    }
  }

  /**
   * Initialize settings view listeners
   */
  private initializeSettingsView(): void {
    if (this.settingsViewInitialized) {
      return;
    }

    try {
      const backBtn = document.getElementById('coga-settings-back-btn');
      if (backBtn) {
        backBtn.addEventListener('click', () => this.closeSettingsView());
      }

      const prevBtn = document.getElementById('coga-settings-prev-step');
      if (prevBtn) {
        prevBtn.addEventListener('click', (event) => {
          event.preventDefault();
          this.updateSettingsStep(this.settingsStepIndex - 1);
        });
      }

      const nextBtn = document.getElementById('coga-settings-next-step');
      if (nextBtn) {
        nextBtn.addEventListener('click', (event) => {
          event.preventDefault();
          const isLastStep = this.settingsStepIndex >= this.settingsStepCount - 1;
          if (isLastStep) {
            this.closeSettingsView();
            return;
          }
          this.updateSettingsStep(this.settingsStepIndex + 1);
        });
      }

      document.querySelectorAll<HTMLElement>('.coga-sensitivity-btn').forEach((btn) => {
        btn.addEventListener('click', (event) => {
          event.preventDefault();
          const level = btn.getAttribute('data-sensitivity');
          if (level === 'low' || level === 'medium' || level === 'high') {
            void this.handleSensitivitySelection(level);
          }
        });
      });

      const limitInputIds = [
        'coga-settings-cooldown-minutes',
        'coga-settings-max-per-hour',
        'coga-settings-max-per-day',
      ];
      limitInputIds.forEach((id) => {
        const input = document.getElementById(id) as HTMLInputElement | null;
        if (input) {
          input.addEventListener('input', () => this.updateSettingsActionStates());
        }
      });

      const saveLimitsBtn = document.getElementById('coga-settings-save-limits');
      if (saveLimitsBtn) {
        saveLimitsBtn.addEventListener('click', (event) => {
          event.preventDefault();
          void this.handleSaveLimits();
        });
      }

      const resetLimitsBtn = document.getElementById('coga-settings-reset-limits');
      if (resetLimitsBtn) {
        resetLimitsBtn.addEventListener('click', (event) => {
          event.preventDefault();
          this.resetLimitsToOriginal();
        });
      }

      const domainInput = document.getElementById('coga-settings-domain-input') as HTMLInputElement | null;
      const addDomainBtn = document.getElementById('coga-settings-add-domain');
      if (domainInput) {
        domainInput.addEventListener('input', () => this.updateSettingsActionStates());
        domainInput.addEventListener('keypress', (event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            void this.handleAddDomain();
          }
        });
      }
      if (addDomainBtn) {
        addDomainBtn.addEventListener('click', (event) => {
          event.preventDefault();
          void this.handleAddDomain();
        });
      }

      const domainsList = document.getElementById('coga-settings-domains-list') as HTMLElement | null;
      if (domainsList && !domainsList.dataset.listenerAttached) {
        domainsList.addEventListener('click', (event) => {
          const target = event.target as HTMLElement | null;
          if (!target) {
            return;
          }
          const button = target.closest<HTMLButtonElement>('[data-action="remove-domain"]');
          if (button) {
            event.preventDefault();
            const domain = button.dataset.domain;
            if (domain) {
              void this.handleRemoveDomain(domain);
            }
          }
        });
        domainsList.dataset.listenerAttached = 'true';
      }

      Object.values(this.interventionToggleMap).forEach((id) => {
        const checkbox = document.getElementById(id) as HTMLInputElement | null;
        if (checkbox) {
          checkbox.addEventListener('change', () => {
            this.updateSettingsActionStates();
            this.updateSelectAllButtonState();
          });
        }
      });

      const saveInterventionsBtn = document.getElementById('coga-settings-save-interventions');
      if (saveInterventionsBtn) {
        saveInterventionsBtn.addEventListener('click', (event) => {
          event.preventDefault();
          void this.handleSaveInterventions();
        });
      }

      const selectAllBtn = document.getElementById('coga-settings-select-all');
      if (selectAllBtn) {
        selectAllBtn.addEventListener('click', (event) => {
          event.preventDefault();
          this.toggleSelectAllInterventions();
        });
      }
    } catch (error) {
      console.error('[COGA] Error initializing settings view listeners:', error);
    } finally {
      this.settingsViewInitialized = true;
    }
  }

  /**
   * Load settings values into the settings view
   */
  private async loadSettingsView(): Promise<void> {
    try {
      const settings = this.settingsManager.getSettings();
      this.originalSettings = {
        sensitivity: settings.sensitivity ?? 'medium',
        limits: {
          cooldownMinutes: settings.interventionLimits?.cooldownMinutes ?? 8,
          maxPerHour: settings.interventionLimits?.maxPerHour ?? 2,
          maxPerDay: settings.interventionLimits?.maxPerDay ?? 6,
        },
        interventions: {
          oneBreathReset: settings.enabledInterventions?.oneBreathReset ?? true,
          boxBreathing: settings.enabledInterventions?.boxBreathing ?? true,
          twentyTwentyGaze: settings.enabledInterventions?.twentyTwentyGaze ?? true,
          figureEightSmoothPursuit: settings.enabledInterventions?.figureEightSmoothPursuit ?? true,
          nearFarFocusShift: settings.enabledInterventions?.nearFarFocusShift ?? true,
          microBreak: settings.enabledInterventions?.microBreak ?? true,
        },
        domains: Array.isArray(settings.suppressedDomains) ? [...settings.suppressedDomains] : [],
      };

      this.markActiveSensitivityButton(this.originalSettings.sensitivity);

      (document.getElementById('coga-settings-cooldown-minutes') as HTMLInputElement | null)?.setAttribute(
        'value',
        String(this.originalSettings.limits.cooldownMinutes)
      );
      const cooldownInput = document.getElementById('coga-settings-cooldown-minutes') as HTMLInputElement | null;
      if (cooldownInput) {
        cooldownInput.value = String(this.originalSettings.limits.cooldownMinutes);
      }

      const hourInput = document.getElementById('coga-settings-max-per-hour') as HTMLInputElement | null;
      if (hourInput) {
        hourInput.value = String(this.originalSettings.limits.maxPerHour);
      }
      const dayInput = document.getElementById('coga-settings-max-per-day') as HTMLInputElement | null;
      if (dayInput) {
        dayInput.value = String(this.originalSettings.limits.maxPerDay);
      }

      this.renderDomainList(this.originalSettings.domains);
      this.applyInterventionSelections(this.originalSettings.interventions);
      this.updateSettingsActionStates();
      this.updateSelectAllButtonState();
      this.refreshSettingsProgress();
      this.initializeIcons();
    } catch (error) {
      console.error('[COGA] Error loading settings view:', error);
      this.showSettingsMessage('sensitivity', 'Error loading settings. Please try again.', 'error');
    }
  }

  /**
   * Close settings view and return to previous view
   */
  private closeSettingsView(): void {
    try {
      if (this.currentView !== 'settings') {
        return;
      }
      const hasBaseline = this.baselineManager.hasBaseline();
      const fallbackView: 'dashboard' | 'prompt' = hasBaseline ? 'dashboard' : 'prompt';
      const targetView: 'prompt' | 'calibration' | 'dashboard' =
        this.previousView ? this.previousView : fallbackView;

      this.applyView(targetView);
      this.currentView = targetView;
      this.previousView = targetView;
      this.settingsStepIndex = 0;
      this.updateSettingsStep(0);
      setTimeout(() => {
        try {
          this.updateWidgetStateSync();
        } catch (updateError) {
          console.error('[COGA] Error refreshing widget view after closing settings:', updateError);
        }
      }, 0);
    } catch (error) {
      console.error('[COGA] Error closing settings view:', error);
      this.currentView = 'dashboard';
      this.applyView('dashboard');
    }
  }

  /**
   * Update active settings step
   */
  private updateSettingsStep(step: number): void {
    try {
      const steps = Array.from(document.querySelectorAll<HTMLElement>('.coga-settings-step'));
      if (!steps.length) {
        return;
      }

      const clamped = Math.max(0, Math.min(step, this.settingsStepCount - 1));
      this.settingsStepIndex = clamped;

      steps.forEach((section, index) => {
        if (index === clamped) {
          section.classList.add('is-active');
        } else {
          section.classList.remove('is-active');
        }
      });

      const stepsContainer = document.getElementById('coga-settings-steps');
      if (stepsContainer) {
        stepsContainer.scrollTo({ top: 0, behavior: 'smooth' });
      }

      this.refreshSettingsProgress();
      this.updateSettingsNavigationState();
    } catch (error) {
      console.error('[COGA] Error updating settings step:', error);
    }
  }

  /**
   * Update step progress indicator
   */
  private refreshSettingsProgress(): void {
    try {
      const progressBar = document.getElementById('coga-settings-progress-bar');
      const indicator = document.getElementById('coga-settings-step-indicator');
      const progress = ((this.settingsStepIndex + 1) / this.settingsStepCount) * 100;

      if (progressBar) {
        (progressBar as HTMLElement).style.width = `${progress}%`;
      }
      if (indicator) {
        indicator.textContent = String(this.settingsStepIndex + 1);
      }
    } catch (error) {
      console.error('[COGA] Error refreshing settings progress:', error);
    }
  }

  /**
   * Update navigation button states in settings view
   */
  private updateSettingsNavigationState(): void {
    try {
      const prevBtn = document.getElementById('coga-settings-prev-step') as HTMLButtonElement | null;
      const nextBtn = document.getElementById('coga-settings-next-step') as HTMLButtonElement | null;
      const isFirst = this.settingsStepIndex === 0;
      const isLast = this.settingsStepIndex >= this.settingsStepCount - 1;

      if (prevBtn) {
        prevBtn.disabled = isFirst;
        prevBtn.style.visibility = isFirst ? 'hidden' : 'visible';
      }

      if (nextBtn) {
        const label = nextBtn.querySelector('span');
        if (label) {
          label.textContent = isLast ? 'Done' : 'Next';
        }

        const icon = nextBtn.querySelector('svg') || nextBtn.querySelector('i');
        if (icon) {
          (icon as HTMLElement).style.display = isLast ? 'none' : '';
        }

        nextBtn.disabled = false;
      }
    } catch (error) {
      console.error('[COGA] Error updating settings navigation state:', error);
    }
  }

  /**
   * Highlight selected sensitivity button
   */
  private markActiveSensitivityButton(selected: 'low' | 'medium' | 'high'): void {
    try {
      document.querySelectorAll<HTMLElement>('.coga-sensitivity-btn').forEach((btn) => {
        const level = btn.getAttribute('data-sensitivity');
        if (level === selected) {
          btn.classList.add('is-active');
        } else {
          btn.classList.remove('is-active');
        }
      });
    } catch (error) {
      console.error('[COGA] Error highlighting sensitivity button:', error);
    }
  }

  /**
   * Handle sensitivity selection
   */
  private async handleSensitivitySelection(sensitivity: 'low' | 'medium' | 'high'): Promise<void> {
    try {
      if (this.originalSettings.sensitivity === sensitivity) {
        this.markActiveSensitivityButton(sensitivity);
        this.showSettingsMessage('sensitivity', 'Sensitivity already set to this level.', 'success');
        return;
      }

      await this.settingsManager.setSensitivity(sensitivity);
      this.stressDetector.setSensitivity(sensitivity);
      this.originalSettings.sensitivity = sensitivity;
      this.markActiveSensitivityButton(sensitivity);
      this.showSettingsMessage('sensitivity', 'Sensitivity updated successfully.', 'success');
    } catch (error) {
      console.error('[COGA] Error updating sensitivity:', error);
      this.showSettingsMessage('sensitivity', 'Could not update sensitivity. Please retry.', 'error');
    }
  }

  /**
   * Determine if limits have changed
   */
  private haveLimitsChanged(): boolean {
    try {
      const cooldown = this.getNumericValue('coga-settings-cooldown-minutes');
      const perHour = this.getNumericValue('coga-settings-max-per-hour');
      const perDay = this.getNumericValue('coga-settings-max-per-day');

      return (
        cooldown !== this.originalSettings.limits.cooldownMinutes ||
        perHour !== this.originalSettings.limits.maxPerHour ||
        perDay !== this.originalSettings.limits.maxPerDay
      );
    } catch (error) {
      console.error('[COGA] Error checking limit changes:', error);
      return false;
    }
  }

  /**
   * Get numeric value from input
   */
  private getNumericValue(id: string): number {
    const input = document.getElementById(id) as HTMLInputElement | null;
    if (!input) {
      return 0;
    }
    const value = parseInt(input.value, 10);
    return Number.isFinite(value) ? value : 0;
  }

  /**
   * Reset limits inputs to original values
   */
  private resetLimitsToOriginal(): void {
    try {
      const { cooldownMinutes, maxPerHour, maxPerDay } = this.originalSettings.limits;
      const cooldownInput = document.getElementById('coga-settings-cooldown-minutes') as HTMLInputElement | null;
      if (cooldownInput) {
        cooldownInput.value = String(cooldownMinutes);
      }
      const hourInput = document.getElementById('coga-settings-max-per-hour') as HTMLInputElement | null;
      if (hourInput) {
        hourInput.value = String(maxPerHour);
      }
      const dayInput = document.getElementById('coga-settings-max-per-day') as HTMLInputElement | null;
      if (dayInput) {
        dayInput.value = String(maxPerDay);
      }
      this.updateSettingsActionStates();
      this.showSettingsMessage('limits', 'Limits restored to last saved values.', 'success');
    } catch (error) {
      console.error('[COGA] Error resetting limits:', error);
      this.showSettingsMessage('limits', 'Could not reset limits.', 'error');
    }
  }

  /**
   * Save intervention limits
   */
  private async handleSaveLimits(): Promise<void> {
    try {
      const cooldown = this.getNumericValue('coga-settings-cooldown-minutes');
      const perHour = this.getNumericValue('coga-settings-max-per-hour');
      const perDay = this.getNumericValue('coga-settings-max-per-day');

      if (cooldown < 1 || cooldown > 60) {
        this.showSettingsMessage('limits', 'Cooldown must be between 1 and 60 minutes.', 'error');
        return;
      }
      if (perHour < 1 || perHour > 10) {
        this.showSettingsMessage('limits', 'Max per hour must be between 1 and 10.', 'error');
        return;
      }
      if (perDay < 1 || perDay > 50) {
        this.showSettingsMessage('limits', 'Max per day must be between 1 and 50.', 'error');
        return;
      }

      await this.settingsManager.setInterventionLimits({
        cooldownMinutes: cooldown,
        maxPerHour: perHour,
        maxPerDay: perDay,
      });

      if (this.annoyanceRules && typeof this.annoyanceRules.updateConfigFromSettings === 'function') {
        this.annoyanceRules.updateConfigFromSettings();
      }

      this.originalSettings.limits = {
        cooldownMinutes: cooldown,
        maxPerHour: perHour,
        maxPerDay: perDay,
      };
      this.updateSettingsActionStates();
      this.showSettingsMessage('limits', 'Intervention limits updated successfully.', 'success');
    } catch (error) {
      console.error('[COGA] Error saving intervention limits:', error);
      this.showSettingsMessage('limits', 'Could not save limits. Please retry.', 'error');
    }
  }

  /**
   * Render suppressed domains list
   */
  private renderDomainList(domains: string[]): void {
    try {
      const container = document.getElementById('coga-settings-domains-list');
      if (!container) {
        return;
      }

      container.innerHTML = '';
      if (!domains.length) {
        const empty = document.createElement('p');
        empty.className = 'coga-domains-empty';
        empty.textContent = 'No suppressed domains yet';
        container.appendChild(empty);
        return;
      }

      domains.forEach((domain) => {
        const item = document.createElement('div');
        item.className = 'coga-domain-item';

        const span = document.createElement('span');
        span.className = 'coga-domain-name';
        span.textContent = domain;
        item.appendChild(span);

        const button = document.createElement('button');
        button.type = 'button';
        button.setAttribute('data-domain', domain);
        button.setAttribute('data-action', 'remove-domain');
        button.innerHTML = '<i data-lucide="x"></i>';
        item.appendChild(button);

        container.appendChild(item);
      });
      this.initializeIcons();
    } catch (error) {
      console.error('[COGA] Error rendering domains list:', error);
    }
  }

  /**
   * Add domain to suppression list
   */
  private async handleAddDomain(): Promise<void> {
    try {
      const input = document.getElementById('coga-settings-domain-input') as HTMLInputElement | null;
      if (!input) {
        return;
      }
      const value = input.value.trim();
      if (!value) {
        this.showSettingsMessage('domains', 'Please enter a domain.', 'error');
        return;
      }

      if (!/^[a-zA-Z0-9.-]+$/.test(value)) {
        this.showSettingsMessage('domains', 'Invalid domain format.', 'error');
        return;
      }

      const before = this.settingsManager.getSuppressedDomains();
      await this.settingsManager.addSuppressedDomain(value);
      const updated = this.settingsManager.getSuppressedDomains();

      if (updated.length === before.length) {
        this.showSettingsMessage('domains', 'Domain is already in the list.', 'error');
        return;
      }

      input.value = '';
      this.originalSettings.domains = [...updated];
      this.renderDomainList(this.originalSettings.domains);
      this.updateSettingsActionStates();
      this.showSettingsMessage('domains', 'Domain added successfully.', 'success');
    } catch (error) {
      console.error('[COGA] Error adding domain:', error);
      this.showSettingsMessage('domains', 'Could not add domain. Please retry.', 'error');
    }
  }

  /**
   * Remove domain from suppression list
   */
  private async handleRemoveDomain(domain: string): Promise<void> {
    try {
      await this.settingsManager.removeSuppressedDomain(domain);
      const updated = this.settingsManager.getSuppressedDomains();
      this.originalSettings.domains = [...updated];
      this.renderDomainList(this.originalSettings.domains);
      this.updateSettingsActionStates();
      this.showSettingsMessage('domains', 'Domain removed.', 'success');
    } catch (error) {
      console.error('[COGA] Error removing domain:', error);
      this.showSettingsMessage('domains', 'Could not remove domain. Please retry.', 'error');
    }
  }

  /**
   * Apply intervention checkbox selections
   */
  private applyInterventionSelections(interventions: Record<InterventionKey, boolean>): void {
    try {
      (Object.keys(this.interventionToggleMap) as InterventionKey[]).forEach((key) => {
        const id = this.interventionToggleMap[key];
        const checkbox = document.getElementById(id) as HTMLInputElement | null;
        if (checkbox) {
          checkbox.checked = interventions[key] ?? false;
        }
      });
    } catch (error) {
      console.error('[COGA] Error applying intervention selections:', error);
    }
  }

  /**
   * Determine if intervention selections changed
   */
  private haveInterventionChanges(): boolean {
    try {
      return (Object.keys(this.interventionToggleMap) as InterventionKey[]).some((key) => {
        const id = this.interventionToggleMap[key];
        const checkbox = document.getElementById(id) as HTMLInputElement | null;
        if (!checkbox) {
          return false;
        }
        return checkbox.checked !== (this.originalSettings.interventions[key] ?? false);
      });
    } catch (error) {
      console.error('[COGA] Error detecting intervention changes:', error);
      return false;
    }
  }

  /**
   * Save intervention selections
   */
  private async handleSaveInterventions(): Promise<void> {
    try {
      const updates: Record<InterventionKey, boolean> = {
        oneBreathReset: false,
        boxBreathing: false,
        twentyTwentyGaze: false,
        figureEightSmoothPursuit: false,
        nearFarFocusShift: false,
        microBreak: false,
      };

      (Object.keys(this.interventionToggleMap) as InterventionKey[]).forEach((key) => {
        const checkbox = document.getElementById(this.interventionToggleMap[key]) as HTMLInputElement | null;
        updates[key] = checkbox ? checkbox.checked : false;
      });

      await Promise.all(
        (Object.keys(updates) as InterventionKey[]).map((key) =>
          this.settingsManager.setInterventionEnabled(key, updates[key])
        )
      );

      this.originalSettings.interventions = { ...updates };
      this.updateSettingsActionStates();
      this.updateSelectAllButtonState();
      this.showSettingsMessage('interventions', 'Interventions updated successfully.', 'success');
    } catch (error) {
      console.error('[COGA] Error saving interventions:', error);
      this.showSettingsMessage('interventions', 'Could not update interventions.', 'error');
    }
  }

  /**
   * Toggle select all / deselect all interventions
   */
  private toggleSelectAllInterventions(): void {
    try {
      const shouldSelectAll = !this.areAllInterventionsSelected();
      (Object.keys(this.interventionToggleMap) as InterventionKey[]).forEach((key) => {
        const checkbox = document.getElementById(this.interventionToggleMap[key]) as HTMLInputElement | null;
        if (checkbox) {
          checkbox.checked = shouldSelectAll;
        }
      });
      this.updateSettingsActionStates();
      this.updateSelectAllButtonState();
    } catch (error) {
      console.error('[COGA] Error toggling intervention selections:', error);
    }
  }

  /**
   * Check if all interventions are selected
   */
  private areAllInterventionsSelected(): boolean {
    try {
      return (Object.keys(this.interventionToggleMap) as InterventionKey[]).every((key) => {
        const checkbox = document.getElementById(this.interventionToggleMap[key]) as HTMLInputElement | null;
        return checkbox ? checkbox.checked : false;
      });
    } catch (error) {
      console.error('[COGA] Error checking if all interventions selected:', error);
      return false;
    }
  }

  /**
   * Update select-all button label
   */
  private updateSelectAllButtonState(): void {
    try {
      const button = document.getElementById('coga-settings-select-all');
      if (!button) {
        return;
      }
      const allSelected = this.areAllInterventionsSelected();
      button.textContent = allSelected ? 'Deselect All' : 'Select All';
    } catch (error) {
      console.error('[COGA] Error updating select-all state:', error);
    }
  }

  /**
   * Update action button states based on changes
   */
  private updateSettingsActionStates(): void {
    try {
      const limitsChanged = this.haveLimitsChanged();
      const saveLimitsBtn = document.getElementById('coga-settings-save-limits') as HTMLButtonElement | null;
      const resetLimitsBtn = document.getElementById('coga-settings-reset-limits') as HTMLButtonElement | null;
      if (saveLimitsBtn) {
        saveLimitsBtn.disabled = !limitsChanged;
      }
      if (resetLimitsBtn) {
        resetLimitsBtn.disabled = !limitsChanged;
      }

      const domainInput = document.getElementById('coga-settings-domain-input') as HTMLInputElement | null;
      const addDomainBtn = document.getElementById('coga-settings-add-domain') as HTMLButtonElement | null;
      const hasDomainValue = domainInput ? domainInput.value.trim().length > 0 : false;
      if (addDomainBtn) {
        addDomainBtn.disabled = !hasDomainValue;
      }

      const interventionsChanged = this.haveInterventionChanges();
      const saveInterventionsBtn = document.getElementById('coga-settings-save-interventions') as HTMLButtonElement | null;
      if (saveInterventionsBtn) {
        saveInterventionsBtn.disabled = !interventionsChanged;
      }
    } catch (error) {
      console.error('[COGA] Error updating settings action states:', error);
    }
  }

  /**
   * Show message for settings section
   */
  private showSettingsMessage(
    section: 'sensitivity' | 'limits' | 'domains' | 'interventions',
    message: string,
    type: 'success' | 'error'
  ): void {
    try {
      const element = document.querySelector<HTMLElement>(`.coga-settings-section-message[data-section="${section}"]`);
      if (!element) {
        return;
      }

      element.textContent = message;
      element.classList.remove('is-success', 'is-error', 'is-visible');
      element.classList.add('is-visible', type === 'success' ? 'is-success' : 'is-error');

      if (this.settingsMessageTimeouts[section]) {
        window.clearTimeout(this.settingsMessageTimeouts[section]);
      }

      this.settingsMessageTimeouts[section] = window.setTimeout(() => {
        try {
          element.classList.remove('is-success', 'is-error', 'is-visible');
          delete this.settingsMessageTimeouts[section];
        } catch (hideError) {
          console.error('[COGA] Error clearing settings message:', hideError);
        }
      }, 3000);
    } catch (error) {
      console.error('[COGA] Error showing settings message:', error);
    }
  }

  /**
   * Update widget state based on baseline and calibration status
   */
  private updateWidgetState(): void {
    try {
      // Force sync from global state if needed (async, won't block)
      const chromeApi = (typeof window !== 'undefined' && (window as any).chrome) || 
                       (typeof global !== 'undefined' && (global as any).chrome) ||
                       null;
      
      if (chromeApi && chromeApi.storage && chromeApi.storage.local) {
        // Quick sync check - if we don't have local state, sync from global
        chromeApi.storage.local.get(['coga_baseline', 'coga_calibration_state'], async (result: any) => {
          if (!chromeApi.runtime.lastError && result) {
            // Sync baseline if we don't have it locally
            if (result.coga_baseline && !this.baselineManager.getBaseline()) {
              await this.baselineManager.loadBaseline().catch(() => {});
            }
            
            // Sync calibration state if we don't have it locally
            if (result.coga_calibration_state) {
              const calState = result.coga_calibration_state;
              if (this.baselineManager) {
                this.baselineManager.updateCalibrationState({
                  isCalibrating: calState.isCalibrating,
                  calibrationStartTime: calState.calibrationStartTime,
                  progress: calState.progress,
                });
              }
              if (calState.isCalibrating && calState.calibrationStartTime) {
                // Update local state from global
                const elapsed = Date.now() - calState.calibrationStartTime;
                if (elapsed < this.getCalibrationDurationMs()) { // Still within calibration duration
                  // Force sync the baseline manager state
                  await this.baselineManager.loadBaseline().catch(() => {});
                  // Then update UI
                  this.updateWidgetStateSync();
                  return;
                }
              }
            }
          }
          
          // Update UI with current state
          this.updateWidgetStateSync();
        });
      } else {
        // Not in extension context, use local state only
        this.updateWidgetStateSync();
      }
    } catch (error) {
      console.error('[COGA] Error updating widget state:', error);
      // Fallback to sync update
      this.updateWidgetStateSync();
    }
  }
  
  /**
   * Synchronously update widget state (internal helper)
   */
  private updateWidgetStateSync(): void {
    try {
      if (this.currentView === 'settings') {
        this.applyView('settings');
        return;
      }

      // Ensure baseline is loaded before checking state
      const baseline = this.baselineManager.getBaseline();
      const isCalibrating = this.baselineManager.isCurrentlyCalibrating();
      const hasBaseline = baseline !== null || this.baselineManager.hasBaseline();
      const targetView: 'prompt' | 'calibration' | 'dashboard' = isCalibrating
        ? 'calibration'
        : hasBaseline
          ? 'dashboard'
          : 'prompt';

      this.applyView(targetView);
    } catch (error) {
      console.error('[COGA] Error updating widget state sync:', error);
    }
  }

  private applyView(
    view: 'prompt' | 'calibration' | 'dashboard' | 'settings'
  ): void {
    try {
      const viewChanged = this.currentView !== view;

      if (viewChanged) {
        const baselineState = this.baselineManager?.hasBaseline() ?? false;
        const calibratingState = this.baselineManager?.isCurrentlyCalibrating() ?? false;
        // console.log(`[COGA Widget] View changed → ${view} (baseline=${baselineState}, calibrating=${calibratingState})`);
      }

      this.currentView = view;

      const calibrationPrompt = document.getElementById('coga-calibration-prompt');
      const dashboard = document.getElementById('coga-dashboard');
      const calibrationProgress = document.getElementById('coga-calibration-progress');
      const settingsView = document.getElementById('coga-settings-view');
      const dot = document.getElementById('coga-widget-dot');
      const progressBar = document.getElementById('coga-progress-bar');
      const progressPercent = document.getElementById('coga-progress-percent');
      const progressTime = document.getElementById('coga-progress-time');

      if (calibrationPrompt) calibrationPrompt.style.display = 'none';
      if (dashboard) dashboard.style.display = 'none';
      if (calibrationProgress) calibrationProgress.style.display = 'none';
      if (settingsView) settingsView.style.display = 'none';

      if (view === 'settings') {
        if (settingsView) {
          settingsView.style.display = 'block';
        }
        if (dot) {
          dot.removeAttribute('data-calibrating');
          dot.style.removeProperty('--progress');
        }
        this.resetCalibrationIndicators();
        this.resetCalibrationMessage();
        this.initializeIcons();
        return;
      }

      if (view === 'calibration') {
        if (calibrationProgress) calibrationProgress.style.display = 'block';
        if (dot) {
          dot.setAttribute('data-calibrating', 'true');
        }
        this.updateCalibrationMessage(true);
      } else {
        if (dot) {
          dot.removeAttribute('data-calibrating');
          dot.style.removeProperty('--progress');
        }

        this.resetCalibrationIndicators();

        if (view === 'dashboard') {
          if (dashboard) dashboard.style.display = 'block';
        } else {
          if (calibrationPrompt) calibrationPrompt.style.display = 'block';
        }
        this.resetCalibrationMessage();
      }
    } catch (error) {
      console.error('[COGA] Error applying widget view:', error);
    }
  }

  private updateCalibrationMessage(forceUpdate = false): void {
    try {
      if (!this.calibrationMessages.length) {
        return;
      }

      const messageElement = document.getElementById('coga-calibration-message');
      if (!messageElement) {
        if (forceUpdate) {
          console.warn('[COGA] Calibration message element not found.');
        }
        return;
      }

      const index = this.calculateCalibrationMessageIndex();
      if (!forceUpdate && index === this.lastCalibrationMessageIndex) {
        return;
      }

      const safeIndex = index >= 0 && index < this.calibrationMessages.length ? index : 0;
      messageElement.textContent = this.calibrationMessages[safeIndex];
      this.lastCalibrationMessageIndex = safeIndex;
    } catch (error) {
      console.error('[COGA] Error updating calibration message:', error);
    }
  }

  private calculateCalibrationMessageIndex(): number {
    try {
      const totalMessages = this.calibrationMessages.length;
      if (totalMessages === 0) {
        return 0;
      }

      const calibrationStart =
        typeof this.baselineManager.getCalibrationStartTime === 'function'
          ? this.baselineManager.getCalibrationStartTime()
          : null;

      let referenceStart = calibrationStart ?? this.calibrationMessageFallbackStart;
      if (calibrationStart !== null) {
        this.calibrationMessageFallbackStart = calibrationStart;
      }

      if (referenceStart === null) {
        referenceStart = Date.now();
        this.calibrationMessageFallbackStart = referenceStart;
      }

      const elapsed = Math.max(0, Date.now() - referenceStart);
      const interval = this.calibrationMessageIntervalMs > 0 ? this.calibrationMessageIntervalMs : 3000;
      const index = Math.floor(elapsed / interval) % totalMessages;

      return Number.isFinite(index) ? index : 0;
    } catch (error) {
      console.error('[COGA] Error calculating calibration message index:', error);
      return 0;
    }
  }

  private resetCalibrationMessage(): void {
    try {
      this.lastCalibrationMessageIndex = -1;
      this.calibrationMessageFallbackStart = null;

      const messageElement = document.getElementById('coga-calibration-message');
      if (messageElement && this.calibrationMessages.length) {
        messageElement.textContent = this.calibrationMessages[0];
      }
    } catch (error) {
      console.error('[COGA] Error resetting calibration message:', error);
    }
  }

  /**
   * Make widget draggable
   */
  private makeDraggable(element: HTMLElement): void {
    try {
      let startX: number, startY: number, initialX: number, initialY: number;
      let hasMoved = false;

      const onMouseDown = (e: MouseEvent) => {
        this.isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        hasMoved = false;
        if (this.container) {
          const rect = this.container.getBoundingClientRect();
          initialX = rect.left;
          initialY = rect.top;
        }

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
        e.preventDefault();
      };

      const onMouseMove = (e: MouseEvent) => {
        if (!this.isDragging) return;

        const dx = e.clientX - startX;
        const dy = e.clientY - startY;

        hasMoved = true;
        this.setPosition(
          {
            x: initialX + dx,
            y: initialY + dy
          },
          false
        );
        
        // Reposition panel if open
        if (this.isExpanded) {
          const panel = document.getElementById('coga-widget-panel');
          const dot = document.getElementById('coga-widget-dot');
          if (panel && dot) {
            this.positionPanel(panel, dot);
          }
        }
      };

      const onMouseUp = () => {
        this.isDragging = false;
        if (hasMoved) {
          void this.broadcastPosition(this.position);
        }
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
      };

      element.addEventListener('mousedown', onMouseDown);
    } catch (error) {
      console.error('[COGA] Error making draggable:', error);
    }
  }

  /**
   * Update widget position
   */
  private updatePosition(): void {
    if (this.container) {
      this.container.style.left = `${this.position.x}px`;
      this.container.style.top = `${this.position.y}px`;
    }
  }

  /**
   * Toggle panel visibility
   */
  private togglePanel(): void {
    try {
      this.setPanelState(!this.isExpanded, true);
    } catch (error) {
      console.error('[COGA] Error toggling panel:', error);
    }
  }

  /**
   * Expand panel (show it)
   */
  private expandPanel(): void {
    try {
      this.setPanelState(true, false);
    } catch (error) {
      console.error('[COGA] Error expanding panel:', error);
    }
  }

  /**
   * Collapse panel (hide it)
   */
  private collapsePanel(): void {
    try {
      this.setPanelState(false, false);
    } catch (error) {
      console.error('[COGA] Error collapsing panel:', error);
    }
  }

  private setPanelState(isExpanded: boolean, broadcast: boolean): void {
    try {
      const panel = document.getElementById('coga-widget-panel');
      const dot = document.getElementById('coga-widget-dot');

      this.isExpanded = isExpanded;

      if (panel) {
        if (isExpanded) {
          panel.style.display = 'block';
          if (dot) {
            this.positionPanel(panel, dot);
          }
          this.updateDisplay();
        } else {
          panel.style.display = 'none';
        }
      }

      if (broadcast) {
        void this.broadcastPanelState(isExpanded);
      }
    } catch (error) {
      console.error('[COGA] Error setting panel state:', error);
    }
  }

  private async broadcastPanelState(isExpanded: boolean): Promise<void> {
    try {
      const result = await this.storageManager.set('widget_expanded', isExpanded);
      if (!result) {
        console.warn('[COGA Widget] Failed to sync widget expanded state');
      }
    } catch (error) {
      console.error('[COGA Widget] Error broadcasting panel state:', error);
    }
  }

  /**
   * Position panel dynamically based on dot position to avoid screen edges
   */
  private positionPanel(panel: HTMLElement, dot: HTMLElement): void {
    try {
      const dotRect = dot.getBoundingClientRect();
      const panelRect = panel.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      // Default position (bottom-right of dot)
      let panelX = dotRect.right + 10;
      let panelY = dotRect.bottom + 10;
      
      // Check if panel would overflow right edge
      if (panelX + panelRect.width > viewportWidth) {
        // Position to the left of dot instead
        panelX = dotRect.left - panelRect.width - 10;
      }
      
      // Check if panel would overflow left edge (after repositioning)
      if (panelX < 0) {
        // Center horizontally relative to dot
        panelX = dotRect.left + (dotRect.width / 2) - (panelRect.width / 2);
        // Clamp to viewport
        panelX = Math.max(10, Math.min(panelX, viewportWidth - panelRect.width - 10));
      }
      
      // Check if panel would overflow bottom edge
      if (panelY + panelRect.height > viewportHeight) {
        // Position above dot instead
        panelY = dotRect.top - panelRect.height - 10;
      }
      
      // Check if panel would overflow top edge (after repositioning)
      if (panelY < 0) {
        // Center vertically relative to dot
        panelY = dotRect.top + (dotRect.height / 2) - (panelRect.height / 2);
        // Clamp to viewport
        panelY = Math.max(10, Math.min(panelY, viewportHeight - panelRect.height - 10));
      }
      
      // Set position relative to container
      const containerRect = this.container?.getBoundingClientRect();
      if (containerRect) {
        panel.style.left = `${panelX - containerRect.left}px`;
        panel.style.top = `${panelY - containerRect.top}px`;
      }
    } catch (error) {
      console.error('[COGA] Error positioning panel:', error);
    }
  }

  /**
   * Start update loop
   */
  private startUpdateLoop(): void {
    // Use requestAnimationFrame for near real-time UI updates
    let last = 0;
    const step = (ts: number) => {
      // Update at ~60fps but throttle computations to every 100ms
      // During calibration, update more frequently (every 50ms) for smoother progress
      const isCalibrating = this.baselineManager.isCurrentlyCalibrating();
      const updateInterval = isCalibrating ? 50 : 100;
      
      if (ts - last >= updateInterval) {
        this.updateDisplay();
        last = ts;
      }
      this.rafId = requestAnimationFrame(step);
    };
    this.rafId = requestAnimationFrame(step);
  }

  /**
   * Update widget display
   */
  private updateDisplay(): void {
    try {
      // IMPORTANT: Do not show stress data during calibration or before baseline exists
      const isCalibrating = this.baselineManager.isCurrentlyCalibrating();
      const hasBaseline = this.baselineManager.hasBaseline();
      
      // Always update widget state first (shows correct view: calibration prompt, progress, or dashboard)
      this.updateWidgetState();
      
      // Only show stress data if we have a baseline AND are not calibrating
      if (!hasBaseline || isCalibrating) {
        // Before calibration or during calibration - show normal/default state
        if (isCalibrating) {
          this.updateCalibrationMessage();
        }

        if (hasBaseline) {
          // During calibration - show normal state
          this.updateDotColor('normal');
        } else {
          // Before first calibration - show normal state
          this.updateDotColor('normal');
        }
        return;
      }
      
      // After calibration - can show stress data
      // In extension context, sync baseline and calibration state periodically
      const chromeApi = (typeof window !== 'undefined' && (window as any).chrome) || 
                       (typeof global !== 'undefined' && (global as any).chrome) ||
                       null;
      
      // CRITICAL: If we have recent global data (updated in last 10 seconds), use it instead of polling
      // This prevents race conditions where updateDisplay overwrites fresh data from handleStorageChanges
      const timeSinceLastGlobalUpdate = Date.now() - this.lastGlobalUpdateTime;
      if (this.lastGlobalStressData && timeSinceLastGlobalUpdate < 10000) {
        // Use cached global data (recently updated via storage.onChanged)
        const stressData = this.lastGlobalStressData;
        this.updateDotColor(stressData.level);
        if (this.isExpanded) {
          this.updatePanelContent(stressData);
        }
        return; // Don't poll storage, we already have fresh data
      }
      
      if (chromeApi && chromeApi.storage && chromeApi.storage.local) {
        // Sync baseline and calibration state from global storage every update cycle
        chromeApi.storage.local.get(['coga_baseline', 'coga_calibration_state', 'coga_stress_data'], async (result: any) => {
          if (chromeApi.runtime.lastError) {
            // Only fallback to local if we don't have recent global data
            if (!this.lastGlobalStressData || timeSinceLastGlobalUpdate >= 10000) {
              this.updateFromLocalHistory();
            }
            return;
          }
          
          // Sync baseline if it exists globally but not locally
          if (result.coga_baseline && !this.baselineManager.getBaseline()) {
            await this.baselineManager.loadBaseline().catch(() => {});
          }
          
          // Sync calibration state for real-time progress updates
          if (result.coga_calibration_state) {
            const calState = result.coga_calibration_state;
              if (calState.isCalibrating && calState.calibrationStartTime) {
              const elapsed = Date.now() - calState.calibrationStartTime;
              const duration = this.getCalibrationDurationMs();
              const progress = Math.min(100, Math.round((elapsed / duration) * 100));
              this.showCalibrationProgress(progress);
              // Don't show stress data during calibration
              return;
            }
          }
          
          // Update stress display from global data (only after calibration)
          if (result.coga_stress_data && hasBaseline && !isCalibrating) {
            const stressData = result.coga_stress_data;
            
            // Only update if data is valid and more recent than cached data
            if (this.isValidStressData(stressData)) {
              // Update cache
              this.lastGlobalStressData = stressData;
              this.lastGlobalUpdateTime = stressData.timestamp || Date.now();
              
              this.updateDotColor(stressData.level);
              if (this.isExpanded) {
                this.updatePanelContent(stressData);
              }
            }
          } else {
            // Only fallback to local history if we don't have recent global data cached
            // AND no global data exists in storage
            if (hasBaseline && !isCalibrating) {
              if (!this.lastGlobalStressData || timeSinceLastGlobalUpdate >= 10000) {
                // No recent global updates, safe to show local fallback
                this.updateFromLocalHistory();
              }
            }
          }
        });
      } else {
        // Not extension context, use local state only (only if baseline exists and not calibrating)
        if (hasBaseline && !isCalibrating) {
          this.updateFromLocalHistory();
        }
      }
    } catch (error) {
      console.error('[COGA] Error updating display:', error);
      // Fallback - ensure widget state is correct
      this.updateWidgetState();
    }
  }

  /**
   * Update widget from local stress history
   */
  private updateFromLocalHistory(): void {
    try {
      // IMPORTANT: Only update stress data if baseline exists and we're not calibrating
      const isCalibrating = this.baselineManager.isCurrentlyCalibrating();
      const hasBaseline = this.baselineManager.hasBaseline();
      
      if (!hasBaseline || isCalibrating) {
        // Before calibration or during calibration - show normal state
        this.updateDotColor('normal');
        if (this.isExpanded) {
          // Show default/empty metrics
          const valueEl = document.getElementById('coga-stress-value');
          const scoreEl = document.getElementById('coga-stress-score');
          const mouseEl = document.getElementById('coga-mouse-score');
          const keyboardEl = document.getElementById('coga-keyboard-score');

          if (valueEl) {
            valueEl.textContent = 'Normal';
            valueEl.style.color = this.stressDetector.getStressColor('normal');
          }

          if (scoreEl) {
            scoreEl.textContent = '0.00';
          }

          if (mouseEl) {
            mouseEl.textContent = '0.00';
          }

          if (keyboardEl) {
            keyboardEl.textContent = '0.00';
          }
        }
        return;
      }
      
      // After calibration - can show stress data
      const history = this.stressDetector.getHistory();
      
      // If we have history, use latest score
      if (history.length > 0) {
        const latestScore = history[history.length - 1];

        // Update dot with smooth color transition
        this.updateDotColor(latestScore.level);

        // Update panel if expanded
        if (this.isExpanded) {
          this.updatePanelContent(latestScore);
        }
      } else {
        // If no history yet (just after calibration), show normal state
        // This ensures the widget shows the dashboard view immediately after calibration
        this.updateDotColor('normal');
        
        // If panel is expanded, show default/empty metrics
        if (this.isExpanded) {
          const valueEl = document.getElementById('coga-stress-value');
          const scoreEl = document.getElementById('coga-stress-score');
          const mouseEl = document.getElementById('coga-mouse-score');
          const keyboardEl = document.getElementById('coga-keyboard-score');

          if (valueEl) {
            valueEl.textContent = 'Normal';
            valueEl.style.color = this.stressDetector.getStressColor('normal');
          }

          if (scoreEl) {
            scoreEl.textContent = '0.00';
          }

          if (mouseEl) {
            mouseEl.textContent = '0.00';
          }

          if (keyboardEl) {
            keyboardEl.textContent = '0.00';
          }
        }
      }
    } catch (error) {
      console.error('[COGA] Error updating from local history:', error);
    }
  }

  /**
   * Update dot color based on stress level with smooth transitions
   */
  private updateDotColor(level: StressLevel): void {
    try {
      const dot = document.getElementById('coga-widget-dot');
      if (!dot) return;

      // Only update if level changed to avoid unnecessary DOM updates
      if (this.currentLevel !== level) {
        dot.setAttribute('data-stress-level', level);
        this.currentLevel = level;
      }
    } catch (error) {
      console.error('[COGA] Error updating dot color:', error);
    }
  }

  /**
   * Validate stress data structure
   */
  private isValidStressData(stressData: any): boolean {
    if (!stressData || typeof stressData !== 'object') {
      return false;
    }
    
    // Check required fields
    if (typeof stressData.level !== 'string' || !stressData.level) {
      return false;
    }
    
    // Check numeric fields (should be numbers, not NaN or undefined)
    if (typeof stressData.combined !== 'number' || isNaN(stressData.combined)) {
      return false;
    }
    
    if (typeof stressData.mouse !== 'number' || isNaN(stressData.mouse)) {
      return false;
    }
    
    if (typeof stressData.keyboard !== 'number' || isNaN(stressData.keyboard)) {
      return false;
    }
    
    if (typeof stressData.percentage !== 'number' || isNaN(stressData.percentage)) {
      return false;
    }
    
    return true;
  }

  private async resetCalibrationStateGlobal(): Promise<void> {
    try {
      const results = await Promise.allSettled([
        this.storageManager.set('calibration_state', {
          isCalibrating: false,
          calibrationStartTime: null,
          progress: 100
        }),
        this.storageManager.set('calibration_progress', 100)
      ]);

      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          if (!result.value) {
            console.warn(`[COGA Widget] Calibration reset operation ${index} stored locally only`);
          }
        } else {
          console.error('[COGA Widget] Calibration reset failed:', result.reason);
        }
      });
    } catch (error) {
      console.error('[COGA Widget] Error resetting calibration state globally:', error);
    }
  }

  private isValidPosition(position: any): position is Position {
    return Boolean(
      position &&
      typeof position === 'object' &&
      typeof position.x === 'number' &&
      typeof position.y === 'number' &&
      isFinite(position.x) &&
      isFinite(position.y)
    );
  }

  private constrainPosition(position: Position): Position {
    try {
      if (typeof window === 'undefined' || typeof document === 'undefined') {
        return position;
      }

      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const dotSize = parseFloat(getComputedStyle(document.documentElement)
        .getPropertyValue('--coga-dot-size')) || 52;
      const padding = 8;

      const maxX = Math.max(viewportWidth - dotSize - padding, padding);
      const maxY = Math.max(viewportHeight - dotSize - padding, padding);

      return {
        x: Math.min(Math.max(position.x, padding), maxX),
        y: Math.min(Math.max(position.y, padding), maxY)
      };
    } catch (error) {
      console.error('[COGA] Error constraining position:', error);
      return position;
    }
  }

  private setPosition(position: Position, broadcast: boolean): void {
    try {
      const constrained = this.constrainPosition(position);

      const hasChanged =
        this.position.x !== constrained.x || this.position.y !== constrained.y;

      this.position = constrained;
      this.updatePosition();

      if (broadcast && hasChanged) {
        void this.broadcastPosition(constrained);
      }
    } catch (error) {
      console.error('[COGA] Error setting widget position:', error);
    }
  }

  private async broadcastPosition(position: Position): Promise<void> {
    try {
      const result = await this.storageManager.set('widget_position', position);
      if (!result) {
        console.warn('[COGA Widget] Failed to sync widget position');
      }
    } catch (error) {
      console.error('[COGA Widget] Error broadcasting position:', error);
    }
  }

  /**
   * Update panel content
   */
  private updatePanelContent(score: any): void {
    try {
      // Validate data before updating
      if (!this.isValidStressData(score)) {
        console.warn('[COGA Widget] Invalid stress data received:', score);
        return;
      }
      
      const valueEl = document.getElementById('coga-stress-value');
      const scoreEl = document.getElementById('coga-stress-score');
      const mouseEl = document.getElementById('coga-mouse-score');
      const keyboardEl = document.getElementById('coga-keyboard-score');
      const progressBar = document.getElementById('coga-stress-progress-bar');
      const progressLabel = document.getElementById('coga-stress-progress-label');

      if (valueEl) {
        valueEl.textContent = this.capitalizeFirst(score.level);
        valueEl.style.color = this.stressDetector.getStressColor(score.level);
      }

      if (scoreEl) {
        scoreEl.textContent = `${score.combined.toFixed(2)}σ`;
      }

      if (mouseEl) {
        // Use absolute value for display (z-scores can be negative)
        mouseEl.textContent = Math.abs(score.mouse).toFixed(2);
      }

      if (keyboardEl) {
        // Use absolute value for display (z-scores can be negative)
        keyboardEl.textContent = Math.abs(score.keyboard).toFixed(2);
      }

      if (progressBar) {
        const rawPercentage =
          typeof score.percentage === 'number'
            ? score.percentage
            : Math.min(100, Math.max(0, Math.abs(score.combined) * 25));
        const percentage = Math.min(100, Math.max(0, rawPercentage));
        progressBar.style.width = `${percentage}%`;
        if (progressLabel) {
          progressLabel.textContent = `${percentage.toFixed(1)}%`;
        }
      }

      const metrics = score.metrics || this.lastGlobalStressData?.metrics;
      if (metrics) {
        const { mouse, keyboard } = metrics;
        this.updateMetricValue('coga-typing-errors', keyboard.typingErrorRate, 2);
        this.updateMetricValue('coga-click-frequency', mouse.clickFrequencyPerMin, 1);
        this.updateMetricValue('coga-multi-clicks', mouse.multiClickRatePerMin, 1);
        this.updateMetricValue('coga-mouse-velocity', mouse.movementVelocity, 0);
        this.updateMetricValue('coga-mouse-acceleration', mouse.movementAcceleration, 0);
        this.updateMetricValue('coga-scroll-velocity', mouse.scrollVelocity, 0);
        console.debug('[COGA Widget] Metric snapshot', metrics);
      }
    } catch (error) {
      console.error('[COGA] Error updating panel content:', error);
    }
  }

  /**
   * Capitalize first letter
   */
  private capitalizeFirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /**
   * Update metric value helper with safety checks
   */
  private updateMetricValue(elementId: string, value: number, decimals = 2): void {
    try {
      const element = document.getElementById(elementId);
      if (!element) {
        return;
      }

      if (!Number.isFinite(value)) {
        element.textContent = '0.00';
        return;
      }

      element.textContent = value.toFixed(decimals);
    } catch (error) {
      console.error(`[COGA Widget] Error updating metric ${elementId}:`, error);
    }
  }

  /**
   * Show calibration progress
   */
  showCalibrationProgress(progress: number): void {
    try {
      const isCalibrating = this.baselineManager
        ? this.baselineManager.isCurrentlyCalibrating()
        : false;

      // Ignore stale updates when calibration already finished
      if (!isCalibrating) {
        this.updateWidgetState();
        return;
      }

      this.applyView('calibration');
      this.updateCalibrationMessage();

      // Update dot animation
      const dot = document.getElementById('coga-widget-dot');
      if (dot) {
        dot.setAttribute('data-calibrating', 'true');
        dot.style.setProperty('--progress', `${progress}%`);
      }

      // Update panel progress bar
      const progressBar = document.getElementById('coga-progress-bar');
      if (progressBar) {
        (progressBar as HTMLElement).style.width = `${progress}%`;
      }

      // Update progress text
      const progressPercent = document.getElementById('coga-progress-percent');
      if (progressPercent) {
        progressPercent.textContent = `${progress}%`;
      }

      // Update time remaining
      const progressTime = document.getElementById('coga-progress-time');
      if (progressTime) {
        const totalSeconds = this.getCalibrationDurationSeconds();
        const elapsed = Math.min(
          totalSeconds,
          Math.max(0, Math.round((progress / 100) * totalSeconds))
        );
        const remaining = Math.max(0, totalSeconds - elapsed);
        progressTime.textContent = `${this.formatClockDuration(remaining)} / ${this.formatClockDuration(totalSeconds)}`;
      }

      if (progress >= 100) {
        // Remove calibration state after completion
        setTimeout(() => {
          if (dot) {
            dot.removeAttribute('data-calibrating');
            dot.style.removeProperty('--progress');
          }
          // Force widget state update to show dashboard after calibration completes
          // This ensures the dashboard is displayed automatically
          this.updateWidgetState();
        }, 500);
      }
    } catch (error) {
      console.error('[COGA] Error showing calibration progress:', error);
    }
  }

  /**
   * Inject CSS styles
   */
  private injectStyles(): void {
    if (document.getElementById('coga-widget-styles')) return;

    const style = document.createElement('style');
    style.id = 'coga-widget-styles';
    style.textContent = widgetStyles;

    document.head.appendChild(style);
  }

  /**
   * Show intervention in demo mode (does not count in statistics)
   * Used for the interventions demo page on the landing site
   */
  async showInterventionDemo(interventionKey: InterventionKey): Promise<void> {
    try {
      console.log('[COGA Widget] Showing demo intervention:', interventionKey);
      
      // Import interventions dynamically
      const interventionMap: Record<InterventionKey, any> = {
        oneBreathReset: (await import('../interventions/OneBreathReset')).default,
        boxBreathing: (await import('../interventions/BoxBreathing')).default,
        twentyTwentyGaze: (await import('../interventions/TwentyTwentyGaze')).default,
        figureEightSmoothPursuit: (await import('../interventions/FigureEightSmoothPursuit')).default,
        nearFarFocusShift: (await import('../interventions/NearFarFocusShift')).default,
        microBreak: (await import('../interventions/MicroBreak')).default,
      };

      const InterventionClass = interventionMap[interventionKey];
      if (!InterventionClass) {
        console.error('[COGA Widget] Unknown intervention:', interventionKey);
        return;
      }

      const intervention = new InterventionClass();
      
      // Start intervention with callbacks (no statistics recording)
      const onComplete = () => {
        console.log('[COGA Widget] Demo intervention completed:', interventionKey);
      };
      
      const onDismiss = () => {
        console.log('[COGA Widget] Demo intervention dismissed:', interventionKey);
      };

      // Start the intervention
      await intervention.start(onComplete, onDismiss);
    } catch (error) {
      console.error('[COGA Widget] Error showing demo intervention:', error);
    }
  }

  /**
   * Destroy widget
   */
  destroy(): void {
    try {
      // Stop update loop
      if (this.updateIntervalId) {
        clearInterval(this.updateIntervalId);
        this.updateIntervalId = null;
      }

      this.resetCalibrationMessage();

      // Remove widget from DOM
      if (this.container && this.container.parentNode) {
        this.container.parentNode.removeChild(this.container);
        this.container = null;
      }

      // Cancel animation frame
      if (this.rafId) {
        cancelAnimationFrame(this.rafId);
        this.rafId = null;
      }

      // Remove styles
      const styleEl = document.getElementById('coga-widget-styles');
      if (styleEl && styleEl.parentNode) {
        styleEl.parentNode.removeChild(styleEl);
      }
    } catch (error) {
      console.error('[COGA] Error destroying widget:', error);
    }
  }
}

export default Widget;