/**
 * COGA.ts
 * Main COGA class - orchestrates all components
 */

import EventCapture from './core/EventCapture';
import BaselineManager from './core/BaselineManager';
import StressDetector from './core/StressDetector';
import InterventionManager from './interventions/InterventionManager';
import Widget from './ui/Widget';
import Analytics from './utils/analytics';
import StorageManager from './utils/storage';
import SettingsManager from './utils/SettingsManager';
import { DEFAULT_BASELINE_PRESET } from './config';
import { deriveStressSeverity } from './config/stress';
import type {
  BehavioralMetrics,
  BaselinePreset,
  COGAConfig,
  COGAStatus,
  COGAStatistics,
  StressLevel,
  StressScore,
} from './types';

const QUICK_DEMO_STATE_KEY = 'quick_demo_state';
const DEFAULT_QUICK_DEMO_DURATION_MS = 10 * 60 * 1000;

interface QuickDemoState extends Record<string, unknown> {
  isActive: boolean;
  startedAt: number;
  endsAt: number;
  durationMs: number;
  endedAt?: number;
  reason?: 'expired' | 'manual';
}

class COGA {
  readonly version: string;
  private isInitialized: boolean;
  private isRunning: boolean;
  private calibrationListenerAttached: boolean;
  private calibrationSyncListenerAttached: boolean;
  private storage: StorageManager;
  private analytics: Analytics;
  private settingsManager: SettingsManager;
  private eventCapture: EventCapture;
  private baselineManager: BaselineManager;
  private stressDetector: StressDetector;
  private interventionManager: InterventionManager;
  private widget: Widget;
  private config: COGAConfig;
  private detectionIntervalId: number | null;
  private calibrationProgressIntervalId: number | null;
  private calibrationDataIntervalId: number | null;
  private isCalibrationTickActive: boolean;
  private isCalibrationResumePending: boolean;
  private stressListenerAttached: boolean;
  private lastStressTimestampHandled: number | null;
  private latestStressScore: StressScore | null;
  private quickDemoState: QuickDemoState | null;
  private quickDemoTimeoutId: number | null;
  private quickDemoStartHandler: (event: Event) => void;
  private quickDemoEndHandler: (event: Event) => void;

  constructor() {
    this.version = '0.1.0';
    this.isInitialized = false;
    this.isRunning = false;
    this.calibrationListenerAttached = false;
    this.calibrationSyncListenerAttached = false;

    // Initialize components with proper storage manager
    this.storage = new StorageManager('coga_');
    this.settingsManager = new SettingsManager();
    this.analytics = new Analytics();
    this.eventCapture = new EventCapture();
    this.baselineManager = new BaselineManager();
    this.stressDetector = new StressDetector(this.baselineManager, this.settingsManager);
    this.interventionManager = new InterventionManager(this.analytics, this.settingsManager);
    this.widget = new Widget(
      this.stressDetector,
      this.baselineManager,
      this.settingsManager,
      this.interventionManager.getAnnoyanceRules()
    );

    // Configuration
    this.config = {
      sensitivity: 'medium',
      detectionInterval: 1000, // 1 second for near real-time updates
      enabled: true,
    };

    // State
    this.detectionIntervalId = null;
    this.calibrationProgressIntervalId = null;
    this.calibrationDataIntervalId = null;
    this.isCalibrationTickActive = false;
    this.isCalibrationResumePending = false;
    this.stressListenerAttached = false;
    this.lastStressTimestampHandled = null;
    this.latestStressScore = null;
    this.quickDemoState = null;
    this.quickDemoTimeoutId = null;
    this.quickDemoStartHandler = this.handleQuickDemoStartEvent.bind(this);
    this.quickDemoEndHandler = this.handleQuickDemoEndEvent.bind(this);

    if (typeof window !== 'undefined') {
      window.addEventListener('coga:start-quick-demo', this.quickDemoStartHandler as EventListener);
      window.addEventListener('coga:end-quick-demo', this.quickDemoEndHandler as EventListener);
    }
  }

  /**
   * Initialize COGA
   */
  async init(): Promise<void> {
    try {
      if (this.isInitialized) {
        console.log('[COGA] Already initialized');
        return;
      }

      console.log(`[COGA] Initializing v${this.version}...`);

      // Initialize settings manager first
      await this.settingsManager.init();

      // Initialize analytics
      await this.analytics.init();

      // Load configuration
      await this.loadConfig();

      // Restore any in-progress calibration session before loading baseline
      await this.baselineManager.restoreCalibrationState();

      // IMPORTANT: Try to load baseline from storage
      // If no baseline exists, this will return null and we stay in "first time setup" mode
      const baseline = await this.baselineManager.loadBaseline();
      const quickDemoActive = await this.loadQuickDemoState();

      if (baseline) {
        console.log('[COGA] Baseline found, starting stress detection...');
      } else if (quickDemoActive) {
        console.log('[COGA] Quick demo baseline active, starting stress detection...');
      } else {
        console.log('[COGA] No baseline found - First time setup required');
        // Do NOT start detection without a baseline
        // Widget will show calibration prompt
      }

      if (baseline || quickDemoActive) {
        await this.start();
      }

      // Initialize widget (will show calibration prompt if no baseline)
      await this.widget.init();
      if (this.quickDemoState && typeof (this.widget as any).setQuickDemoState === 'function') {
        (this.widget as any).setQuickDemoState(this.quickDemoState);
      }
      await this.interventionManager.init();
      this.setupCalibrationSyncListeners();
      await this.resumeCalibrationIfNeeded();
      this.setupStressListeners();
      await this.loadInitialStressData();

      // Listen for calibration start event (only once)
      if (!this.calibrationListenerAttached) {
        window.addEventListener('coga:start-calibration', () => {
          // console.log('[COGA] Calibration start event received');
          this.startCalibration().catch((err) => {
            console.error('[COGA] Error in calibration handler:', err);
          });
        });
        this.calibrationListenerAttached = true;
      }

      this.isInitialized = true;
      console.log('[COGA] Initialization complete');
    } catch (error) {
      console.error('[COGA] Initialization error:', error);
      throw error;
    }
  }

  /**
   * Start calibration process
   */
  async startCalibration(): Promise<void> {
    try {
      console.log('[COGA] Starting baseline calibration...');

      await this.endQuickDemoInternal('manual', { silent: false, resetBaseline: false });

      // IMPORTANT: Stop stress detection during calibration
      if (this.isRunning) {
        this.stop();
      }

      this.clearCalibrationTimers();

      // Start event capture (needed for calibration data collection)
      await this.eventCapture.start();

      // Start baseline calibration
      await this.baselineManager.startCalibration();

      this.startCalibrationLoops();

      // Log calibration start
      this.analytics.logCalibration(false);
    } catch (error) {
      console.error('[COGA] Calibration error:', error);
      this.clearCalibrationTimers();
      throw error;
    }
  }

  private async resumeCalibrationIfNeeded(): Promise<void> {
    if (this.isCalibrationResumePending) {
      return;
    }

    this.isCalibrationResumePending = true;
    try {
      if (!this.baselineManager.isCurrentlyCalibrating()) {
        return;
      }

      if (this.isRunning) {
        this.stop();
      }

      await this.baselineManager.restoreCalibrationState();
      await this.eventCapture.start();
      this.startCalibrationLoops();
    } catch (error) {
      console.error('[COGA] Error resuming calibration:', error);
    } finally {
      this.isCalibrationResumePending = false;
    }
  }

  private async loadQuickDemoState(): Promise<boolean> {
    try {
      const state = await this.storage.get<QuickDemoState | null>(QUICK_DEMO_STATE_KEY);
      const now = Date.now();

      if (state && state.isActive) {
        if (state.endsAt <= now) {
          await this.endQuickDemoInternal('expired', { silent: true, resetBaseline: true });
          return false;
        }

        this.quickDemoState = state;
        this.scheduleQuickDemoExpiration(state.endsAt);

        if (!this.baselineManager.hasBaseline()) {
          await this.baselineManager.applyPresetBaseline(DEFAULT_BASELINE_PRESET, {
            addToHistory: false,
          });
        }

        this.broadcastQuickDemoEvent('update', this.quickDemoState);
        return true;
      }

      this.quickDemoState = null;
      await this.storage.remove(QUICK_DEMO_STATE_KEY);
      return false;
    } catch (error) {
      console.error('[COGA] Error loading quick demo state:', error);
      this.quickDemoState = null;
      return false;
    }
  }

  private async saveQuickDemoState(state: QuickDemoState | null): Promise<void> {
    try {
      if (state) {
        await this.storage.set(QUICK_DEMO_STATE_KEY, state);
      } else {
        await this.storage.remove(QUICK_DEMO_STATE_KEY);
      }
    } catch (error) {
      console.error('[COGA] Error saving quick demo state:', error);
    }
  }

  private scheduleQuickDemoExpiration(endsAt: number): void {
    if (this.quickDemoTimeoutId) {
      window.clearTimeout(this.quickDemoTimeoutId);
      this.quickDemoTimeoutId = null;
    }

    const delay = Math.max(0, endsAt - Date.now());
    this.quickDemoTimeoutId = window.setTimeout(() => {
      this.quickDemoTimeoutId = null;
      void this.endQuickDemo('expired');
    }, delay);
  }

  private clearQuickDemoTimeout(): void {
    if (this.quickDemoTimeoutId) {
      window.clearTimeout(this.quickDemoTimeoutId);
      this.quickDemoTimeoutId = null;
    }
  }

  private broadcastQuickDemoEvent(
    type: 'start' | 'update' | 'end',
    detail?: Record<string, unknown>
  ): void {
    try {
      if (typeof window === 'undefined') {
        return;
      }
      window.dispatchEvent(
        new CustomEvent(`coga:quick-demo-${type}`, {
          detail,
        })
      );
    } catch (error) {
      console.error('[COGA] Error broadcasting quick demo event:', error);
    }
  }

  async startQuickDemo(
    durationMs: number = DEFAULT_QUICK_DEMO_DURATION_MS,
    preset: BaselinePreset = DEFAULT_BASELINE_PRESET
  ): Promise<void> {
    try {
      await this.endQuickDemoInternal('manual', { silent: true, resetBaseline: false });

      const normalizedDuration = Math.max(60 * 1000, Math.floor(durationMs));
      const startedAt = Date.now();
      const endsAt = startedAt + normalizedDuration;

      await this.baselineManager.applyPresetBaseline(preset, { addToHistory: false });

      this.quickDemoState = {
        isActive: true,
        startedAt,
        endsAt,
        durationMs: normalizedDuration,
      };

      await this.saveQuickDemoState(this.quickDemoState);
      this.scheduleQuickDemoExpiration(endsAt);

      await this.start();
      if (this.widget && typeof (this.widget as any).setQuickDemoState === 'function') {
        (this.widget as any).setQuickDemoState(this.quickDemoState);
      }

      this.broadcastQuickDemoEvent('start', this.quickDemoState);
    } catch (error) {
      console.error('[COGA] Error starting quick demo:', error);
      throw error;
    }
  }

  async endQuickDemo(reason: 'expired' | 'manual' = 'manual'): Promise<void> {
    await this.endQuickDemoInternal(reason, { silent: false, resetBaseline: true });
  }

  private async endQuickDemoInternal(
    reason: 'expired' | 'manual',
    options: { silent?: boolean; resetBaseline?: boolean } = {}
  ): Promise<void> {
    try {
      const wasActive = this.quickDemoState?.isActive ?? false;
      if (!wasActive) {
        if (!options.silent) {
          await this.saveQuickDemoState(null);
        }
        this.quickDemoState = null;
        return;
      }

      this.clearQuickDemoTimeout();

      const endedAt = Date.now();
      const previousState = this.quickDemoState;

      if (options.resetBaseline !== false) {
        await this.baselineManager.resetBaseline();
        this.stop();
      }

      this.quickDemoState = null;
      await this.saveQuickDemoState(null);

      if (this.widget && typeof (this.widget as any).setQuickDemoState === 'function') {
        (this.widget as any).setQuickDemoState(null, reason);
      }

      if (!options.silent) {
        this.broadcastQuickDemoEvent('end', {
          reason,
          endedAt,
          startedAt: previousState?.startedAt,
          durationMs: previousState?.durationMs,
        });
      }
    } catch (error) {
      console.error('[COGA] Error ending quick demo:', error);
    }
  }

  private handleQuickDemoStartEvent(event: Event): void {
    try {
      const detail = (event as CustomEvent<any>).detail || {};
      const duration = Number(detail.durationMs);
      const preset: BaselinePreset =
        (detail.preset && typeof detail.preset === 'object'
          ? detail.preset
          : DEFAULT_BASELINE_PRESET) as BaselinePreset;
      void this.startQuickDemo(
        Number.isFinite(duration) && duration > 0 ? duration : DEFAULT_QUICK_DEMO_DURATION_MS,
        preset
      );
    } catch (error) {
      console.error('[COGA] Error handling quick demo start event:', error);
    }
  }

  private handleQuickDemoEndEvent(): void {
    void this.endQuickDemo('manual');
  }

  getQuickDemoState(): QuickDemoState | null {
    if (!this.quickDemoState) {
      return null;
    }
    return { ...this.quickDemoState };
  }

  private startCalibrationLoops(): void {
    try {
      if (!this.baselineManager.isCurrentlyCalibrating()) {
        return;
      }

      if (typeof window === 'undefined' || typeof window.setInterval !== 'function') {
        console.warn('[COGA] Cannot start calibration loops without window context');
        return;
      }

      this.clearCalibrationTimers();

      const updateProgress = () => {
        try {
          if (!this.baselineManager.isCurrentlyCalibrating()) {
            this.clearCalibrationTimers();
            return;
          }
          const progress = this.baselineManager.getCalibrationProgress();
          this.widget.showCalibrationProgress(progress);
        } catch (error) {
          console.error('[COGA] Error updating calibration progress:', error);
        }
      };

      updateProgress();

      this.calibrationProgressIntervalId = window.setInterval(updateProgress, 1000);
      this.calibrationDataIntervalId = window.setInterval(() => {
        void this.tickCalibrationData();
      }, 1000);

      void this.tickCalibrationData();
    } catch (error) {
      console.error('[COGA] Error starting calibration loops:', error);
    }
  }

  private clearCalibrationTimers(): void {
    try {
      if (this.calibrationProgressIntervalId !== null) {
        clearInterval(this.calibrationProgressIntervalId);
        this.calibrationProgressIntervalId = null;
      }

      if (this.calibrationDataIntervalId !== null) {
        clearInterval(this.calibrationDataIntervalId);
        this.calibrationDataIntervalId = null;
      }
    } catch (error) {
      console.error('[COGA] Error clearing calibration timers:', error);
    } finally {
      this.isCalibrationTickActive = false;
    }
  }

  private async tickCalibrationData(): Promise<void> {
    if (this.isCalibrationTickActive) {
      return;
    }

    this.isCalibrationTickActive = true;
    try {
      if (!this.baselineManager.isCurrentlyCalibrating()) {
        this.clearCalibrationTimers();
        return;
      }

      const metrics = this.eventCapture.getMetrics();
      const isComplete = await this.baselineManager.addCalibrationData(metrics);

      if (isComplete) {
        this.clearCalibrationTimers();
        await this.onCalibrationComplete();
      }
    } catch (error) {
      console.error('[COGA] Error collecting calibration data:', error);
    } finally {
      this.isCalibrationTickActive = false;
    }
  }

  private setupCalibrationSyncListeners(): void {
    if (this.calibrationSyncListenerAttached) {
      return;
    }

    try {
      if (typeof window !== 'undefined') {
        window.addEventListener('message', (event: MessageEvent) => {
          try {
            if (event.source !== window) return;
            if (event.data?.type === 'COGA_STORAGE_CHANGED' && event.data.areaName === 'local') {
              this.handleCalibrationStorageChanges(event.data.changes);
            }
          } catch (listenerError) {
            console.error('[COGA] Error handling calibration bridge message:', listenerError);
          }
        });
      }

      const chromeApi =
        (typeof window !== 'undefined' && (window as any).chrome) ||
        (typeof global !== 'undefined' && (global as any).chrome) ||
        null;

      if (chromeApi && chromeApi.storage && chromeApi.storage.onChanged) {
        chromeApi.storage.onChanged.addListener((changes: any, areaName: string) => {
          try {
            if (areaName !== 'local') {
              return;
            }
            this.handleCalibrationStorageChanges(changes);
          } catch (listenerError) {
            console.error('[COGA] Error handling calibration storage change:', listenerError);
          }
        });
      }

      this.calibrationSyncListenerAttached = true;
    } catch (error) {
      console.error('[COGA] Error setting up calibration sync listeners:', error);
    }
  }

  private setupStressListeners(): void {
    if (this.stressListenerAttached) {
      return;
    }

    try {
      const forwardStress = (payload: any) => {
        this.handleIncomingStressData(payload);
      };

      if (typeof window !== 'undefined') {
        window.addEventListener('message', (event: MessageEvent) => {
          try {
            if (event.source !== window) return;
            if (event.data?.type === 'COGA_STORAGE_CHANGED' && event.data.areaName === 'local') {
              const changes = event.data.changes;
              if (changes?.coga_stress_data?.newValue) {
                forwardStress(changes.coga_stress_data.newValue);
              }
              if (Object.prototype.hasOwnProperty.call(changes, 'coga_intervention_state')) {
                this.interventionManager.handleExternalState(
                  changes.coga_intervention_state?.newValue ?? null
                );
              }
            }
          } catch (listenerError) {
            console.error('[COGA] Error handling stress bridge message:', listenerError);
          }
        });
      }

      const chromeApi =
        (typeof window !== 'undefined' && (window as any).chrome) ||
        (typeof global !== 'undefined' && (global as any).chrome) ||
        null;

      if (chromeApi && chromeApi.storage && chromeApi.storage.onChanged) {
        chromeApi.storage.onChanged.addListener((changes: any, areaName: string) => {
          try {
            if (areaName !== 'local') {
              return;
            }
            if (changes?.coga_stress_data?.newValue) {
              forwardStress(changes.coga_stress_data.newValue);
            }
            if (Object.prototype.hasOwnProperty.call(changes, 'coga_intervention_state')) {
              this.interventionManager.handleExternalState(
                changes.coga_intervention_state?.newValue ?? null
              );
            }
          } catch (listenerError) {
            console.error('[COGA] Error handling stress storage change:', listenerError);
          }
        });
      }

      this.stressListenerAttached = true;
    } catch (error) {
      console.error('[COGA] Error setting up stress listeners:', error);
    }
  }

  private async loadInitialStressData(): Promise<void> {
    try {
      const chromeApi =
        (typeof window !== 'undefined' && (window as any).chrome) ||
        (typeof global !== 'undefined' && (global as any).chrome) ||
        null;

      if (chromeApi && chromeApi.storage && chromeApi.storage.local) {
        const { stressData, interventionState } = await new Promise<{
          stressData: any;
          interventionState: any;
        }>((resolve) => {
          try {
            chromeApi.storage.local.get(
              ['coga_stress_data', 'coga_intervention_state'],
              (result: any) => {
                resolve({
                  stressData: result?.coga_stress_data ?? null,
                  interventionState: result?.coga_intervention_state ?? null,
                });
              }
            );
          } catch (storageError) {
            console.error('[COGA] Error reading initial stress data:', storageError);
            resolve({
              stressData: null,
              interventionState: null,
            });
          }
        });

        if (stressData) {
          this.handleIncomingStressData(stressData);
        }

        if (interventionState) {
          this.interventionManager.handleExternalState(interventionState);
        }
      }
    } catch (error) {
      console.error('[COGA] Error loading initial stress data:', error);
    }
  }

  private handleIncomingStressData(raw: any): void {
    try {
      if (!raw || typeof raw !== 'object') {
        return;
      }

      if (!this.baselineManager.hasBaseline()) {
        return;
      }

      if (this.baselineManager.isCurrentlyCalibrating()) {
        return;
      }

      if (this.interventionManager.isActive()) {
        return;
      }

      if (typeof document !== 'undefined') {
        if (document.visibilityState === 'hidden') {
          return;
        }
        if (typeof document.hasFocus === 'function' && !document.hasFocus()) {
          return;
        }
      }

      const timestamp =
        typeof raw.timestamp === 'number' && Number.isFinite(raw.timestamp) ? raw.timestamp : Date.now();

      if (this.lastStressTimestampHandled && timestamp <= this.lastStressTimestampHandled) {
        return;
      }

      this.lastStressTimestampHandled = timestamp;

      const level = (raw.level as StressLevel) || 'normal';
      const percentage = typeof raw.percentage === 'number' ? raw.percentage : 0;
      const severity = deriveStressSeverity(percentage, level);

      if (!severity) {
        return;
      }

      const stressScore: StressScore = {
        mouse: typeof raw.mouse === 'number' ? raw.mouse : 0,
        keyboard: typeof raw.keyboard === 'number' ? raw.keyboard : 0,
        combined: typeof raw.combined === 'number' ? raw.combined : 0,
        level,
        severity,
        shouldIntervene: raw.shouldIntervene ?? severity === 'severe',
        timestamp,
        percentage,
        metrics: raw.metrics,
      };

      this.latestStressScore = stressScore;

      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('coga:stress-updated', {
            detail: stressScore,
          })
        );
      }

      this.interventionManager
        .trigger(stressScore)
        .catch((error) => console.error('[COGA] Error triggering intervention:', error));
    } catch (error) {
      console.error('[COGA] Error processing stress data for interventions:', error);
    }
  }

  private handleCalibrationStorageChanges(changes: Record<string, { newValue: any; oldValue: any }>): void {
    try {
      if (!changes || typeof changes !== 'object') {
        return;
      }

      const calibrationChange = changes['coga_calibration_state'];
      if (calibrationChange) {
        const newState = calibrationChange.newValue;
        const oldState = calibrationChange.oldValue;

        if (newState && newState.isCalibrating) {
          if (this.isRunning) {
            this.stop();
          }

          this.baselineManager.updateCalibrationState({
            isCalibrating: true,
            calibrationStartTime: newState.calibrationStartTime ?? null,
            progress: typeof newState.progress === 'number' ? newState.progress : undefined,
            sessionId: newState.sessionId ?? null,
          });

          if (Array.isArray(newState.calibrationData)) {
            this.baselineManager.updateCalibrationState({
              calibrationData: newState.calibrationData,
            });
          }

          const loopsRunning =
            this.calibrationDataIntervalId !== null || this.calibrationProgressIntervalId !== null;

          if (!loopsRunning) {
            void this.baselineManager.restoreCalibrationState().then(() => this.resumeCalibrationIfNeeded());
          }
        } else if (oldState && oldState.isCalibrating && (!newState || !newState.isCalibrating)) {
          this.baselineManager.updateCalibrationState({
            isCalibrating: false,
            calibrationStartTime: null,
            progress:
              typeof newState?.progress === 'number'
                ? newState.progress
                : this.baselineManager.getCalibrationProgress(),
            sessionId: null,
          });
          this.clearCalibrationTimers();
          this.eventCapture.reset();
          void this.start();
        }
      }

      const progressChange = changes['coga_calibration_progress'];
      if (progressChange && typeof progressChange.newValue === 'number') {
        this.baselineManager.updateCalibrationState({
          progress: progressChange.newValue,
        });
      }

      const dataChange = changes['coga_calibration_data'];
      if (dataChange && Array.isArray(dataChange.newValue)) {
        this.baselineManager.updateCalibrationState({
          calibrationData: dataChange.newValue,
        });
      }

      const sessionChange = changes['coga_calibration_session'];
      if (sessionChange) {
        const newSessionId =
          sessionChange.newValue && sessionChange.newValue.id ? sessionChange.newValue.id : null;
        this.baselineManager.updateCalibrationState({
          sessionId: newSessionId,
        });
      }

      const shouldResume =
        this.baselineManager.isCurrentlyCalibrating() &&
        this.calibrationDataIntervalId === null &&
        this.calibrationProgressIntervalId === null;

      if (shouldResume) {
        void this.resumeCalibrationIfNeeded();
      } else if (!this.baselineManager.isCurrentlyCalibrating()) {
        void this.start();
      }
    } catch (error) {
      console.error('[COGA] Error processing calibration storage changes:', error);
    }
  }

  /**
   * Handle calibration completion
   */
  private async onCalibrationComplete(): Promise<void> {
    try {
      this.clearCalibrationTimers();
      // console.log('[COGA] Calibration complete - baseline should be saved');

      // Baseline should already be saved by completeCalibration()
      // Just verify it exists
      if (!this.baselineManager.hasBaseline()) {
        console.error('[COGA] Baseline was not saved after calibration - this should not happen');
        return;
      }

      console.log('[COGA] Baseline confirmed saved, preparing to start stress detection...');

      // IMPROVED: Reset event capture and stress detector for clean post-calibration start
      // This prevents calibration data from being interpreted as elevated stress
      this.eventCapture.reset();
      this.stressDetector.reset();
      console.log('[COGA] Event capture and stress detector reset for clean detection start');

      // Log completion
      this.analytics.logCalibration(true);

      // Start stress detection now that baseline is confirmed
      await this.start();

      // Dispatch event to notify dashboard and widget
      // Wait a brief moment to ensure storage is fully synced across extension
      setTimeout(() => {
        // console.log('[COGA] Dispatching calibration-complete event');
        window.dispatchEvent(new CustomEvent('coga:calibration-complete'));
      }, 200); // Increased to 200ms to ensure chrome.storage sync is complete
    } catch (error) {
      console.error('[COGA] Error handling calibration completion:', error);
    }
  }

  /**
   * Start stress detection
   * NOW: Just sends events to background, doesn't calculate stress locally
   */
  async start(): Promise<void> {
    try {
      if (this.isRunning) {
        console.log('[COGA] Already running');
        return;
      }

      // Check if current domain is suppressed
      if (this.settingsManager.isCurrentDomainSuppressed()) {
        // console.log('[COGA] Current domain is suppressed, detection disabled');
        return;
      }

      if (!this.baselineManager.hasBaseline()) {
        console.warn('[COGA] Cannot start without baseline');
        return;
      }

      // console.log('[COGA] Starting event capture (forwarding to background)...');

      // Start event capture
      await this.eventCapture.start();

      // NEW ARCHITECTURE: Send events to background every 5 seconds
      // Background script will calculate stress globally
      this.detectionIntervalId = window.setInterval(() => {
        this.sendEventsToBackground();
      }, this.config.detectionInterval);

      // Notify background that baseline is ready
      this.notifyBackgroundBaselineReady();

      this.isRunning = true;
    } catch (error) {
      console.error('[COGA] Error starting:', error);
    }
  }

  /**
   * Stop stress detection
   */
  stop(): void {
    try {
      this.clearCalibrationTimers();

      if (!this.isRunning) {
        console.log('[COGA] Not running');
        return;
      }

      console.log('[COGA] Stopping stress detection...');

      // Stop event capture
      this.eventCapture.stop();

      // Stop detection loop
      if (this.detectionIntervalId) {
        clearInterval(this.detectionIntervalId);
        this.detectionIntervalId = null;
      }

      this.isRunning = false;
    } catch (error) {
      console.error('[COGA] Error stopping:', error);
    }
  }

  /**
   * NEW: Send captured events to background for global processing
   * Background script will calculate stress and update chrome.storage
   */
  private sendEventsToBackground(): void {
    try {
      // IMPORTANT: Do not send events during calibration
      if (this.baselineManager.isCurrentlyCalibrating()) {
        return;
      }

      // Check if baseline exists
      if (!this.baselineManager.hasBaseline()) {
        return;
      }

      // Check if current domain is suppressed
      if (this.settingsManager.isCurrentDomainSuppressed()) {
        return;
      }

      if (!this.config.enabled) {
        return;
      }

      // Get captured events (not metrics)
      const events = this.eventCapture.getEvents();
      const metrics = this.eventCapture.getMetrics();

      if (metrics) {
        this.processLocalStress(metrics);
      }

      if (!events || events.length === 0) {
        // console.log('[COGA] No events to send to background');
        return;
      }

      // console.log(`[COGA] Sending ${events.length} events to background for global stress calculation`);

      // Try to use chrome.runtime directly (if available in content script context)
      const chromeApi = (typeof window !== 'undefined' && (window as any).chrome) || 
                       (typeof global !== 'undefined' && (global as any).chrome) ||
                       null;

      if (chromeApi && chromeApi.runtime && chromeApi.runtime.sendMessage) {
        // Direct access to chrome.runtime (content script context)
        chromeApi.runtime.sendMessage({
          action: 'addEvents',
          events,
          metrics
        }, (response: any) => {
          if (chromeApi.runtime.lastError) {
            console.warn('[COGA] Failed to send events to background:', chromeApi.runtime.lastError);
          } else {
            // console.log('[COGA] ✅ Events sent to background successfully');
          }
        });
      } else {
        // Use bridge mechanism (page context - bookmarklet or injected script)
        const requestId = `events_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Send via window.postMessage bridge
        window.postMessage({
          type: 'COGA_RUNTIME_MESSAGE',
          action: 'addEvents',
          events,
          metrics,
          requestId: requestId
        }, '*');
        
        // Optional: Listen for response (for debugging)
        const responseHandler = (event: MessageEvent) => {
          if (event.source !== window) return;
          if (event.data.type === 'COGA_RUNTIME_RESPONSE' && event.data.requestId === requestId) {
            window.removeEventListener('message', responseHandler);
            if (event.data.success) {
              // console.log('[COGA] ✅ Events sent to background successfully (via bridge)');
            } else {
              console.warn('[COGA] Failed to send events via bridge:', event.data.error);
            }
          }
        };
        
        window.addEventListener('message', responseHandler);
        
        // Cleanup listener after timeout
        setTimeout(() => {
          window.removeEventListener('message', responseHandler);
        }, 5000);
      }

      // Clear events after sending
      this.eventCapture.clearEvents();
    } catch (error) {
      console.error('[COGA] Error sending events to background:', error);
    }
  }

  /**
   * Calculate stress locally when background processing is unavailable
   */
  private processLocalStress(metrics: BehavioralMetrics | null): void {
    try {
      if (!metrics) {
        return;
      }

      if (!this.baselineManager.hasBaseline() || this.baselineManager.isCurrentlyCalibrating()) {
        return;
      }

      const stressScore = this.stressDetector.calculateStressScore(metrics);
      this.latestStressScore = stressScore;

      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('coga:stress-updated', {
            detail: stressScore,
          })
        );
      }

      this.handleIncomingStressData(stressScore);
    } catch (error) {
      console.error('[COGA] Error processing local stress:', error);
    }
  }

  /**
   * Notify background that baseline is ready
   */
  private notifyBackgroundBaselineReady(): void {
    try {
      const chromeApi = (typeof window !== 'undefined' && (window as any).chrome) || 
                       (typeof global !== 'undefined' && (global as any).chrome) ||
                       null;

      if (chromeApi && chromeApi.runtime && chromeApi.runtime.sendMessage) {
        // Direct access
        chromeApi.runtime.sendMessage({
          action: 'baselineUpdated'
        }, (response: any) => {
          if (chromeApi.runtime.lastError) {
            console.warn('[COGA] Failed to notify background of baseline:', chromeApi.runtime.lastError);
          } else {
            // console.log('[COGA] ✅ Background notified of baseline');
          }
        });
      } else {
        // Use bridge mechanism
        const requestId = `baseline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        window.postMessage({
          type: 'COGA_RUNTIME_MESSAGE',
          action: 'baselineUpdated',
          requestId: requestId
        }, '*');
        
        // console.log('[COGA] ✅ Baseline notification sent via bridge');
      }
    } catch (error) {
      console.error('[COGA] Error notifying background:', error);
    }
  }

  /**
   * Load configuration
   */
  private async loadConfig(): Promise<void> {
    try {
      // Load from SettingsManager instead
      const settings = this.settingsManager.getSettings();
      this.config.sensitivity = settings.sensitivity;
      
      // Apply sensitivity to stress detector
      this.stressDetector.setSensitivity(settings.sensitivity);
    } catch (error) {
      console.error('[COGA] Error loading config:', error);
    }
  }

  /**
   * Save configuration
   */
  private async saveConfig(): Promise<void> {
    try {
      await this.storage.set('config', this.config);
    } catch (error) {
      console.error('[COGA] Error saving config:', error);
    }
  }

  /**
   * Update sensitivity
   */
  async setSensitivity(sensitivity: 'low' | 'medium' | 'high'): Promise<void> {
    try {
      if (!['low', 'medium', 'high'].includes(sensitivity)) {
        throw new Error('Invalid sensitivity value');
      }

      await this.settingsManager.setSensitivity(sensitivity);
      this.config.sensitivity = sensitivity;
      this.stressDetector.setSensitivity(sensitivity);

      this.analytics.logSettingsChange('sensitivity', sensitivity);
      // console.log(`[COGA] Sensitivity set to: ${sensitivity}`);
    } catch (error) {
      console.error('[COGA] Error setting sensitivity:', error);
    }
  }

  /**
   * Get settings manager instance (for external access)
   */
  getSettingsManager(): SettingsManager {
    return this.settingsManager;
  }

  /**
   * Sync stress data to global storage (for extension context)
   */
  private async syncStressData(stressScore: any): Promise<void> {
    try {
      const chromeApi = (typeof window !== 'undefined' && (window as any).chrome) || 
                       (typeof global !== 'undefined' && (global as any).chrome) ||
                       null;
      
      if (chromeApi && chromeApi.storage && chromeApi.storage.local) {
        // Store latest stress data for widget synchronization
        const stressData = {
          level: stressScore.level,
          combined: stressScore.combined,
          mouse: stressScore.mouse,
          keyboard: stressScore.keyboard,
          percentage: stressScore.percentage ?? 0,
          timestamp: stressScore.timestamp,
          metrics: stressScore.metrics,
        };
        
        await chromeApi.storage.local.set({ 
          coga_stress_data: stressData
        });
      }
    } catch (error) {
      // Ignore errors silently
    }
  }

  /**
   * Get annoyance rules instance (for external access)
   */
  getAnnoyanceRules() {
    return this.interventionManager.getAnnoyanceRules();
  }

  /**
   * Enable/disable interventions
   */
  async setEnabled(enabled: boolean): Promise<void> {
    try {
      this.config.enabled = enabled;
      await this.saveConfig();

      if (enabled) {
        this.interventionManager.enable();
      } else {
        this.interventionManager.disable();
      }

      this.analytics.logSettingsChange('enabled', enabled);
      // console.log(`[COGA] Interventions ${enabled ? 'enabled' : 'disabled'}`);
    } catch (error) {
      console.error('[COGA] Error setting enabled:', error);
    }
  }

  /**
   * Get current status
   */
  getStatus(): any {
    return {
      version: this.version,
      isInitialized: this.isInitialized,
      isRunning: this.isRunning,
      baselineExists: this.baselineManager.hasBaseline(),
      calibrating: this.baselineManager.isCurrentlyCalibrating(),
      calibrationProgress: this.baselineManager.getCalibrationProgress(),
      config: { ...this.config },
      quickDemo: this.quickDemoState
        ? {
            isActive: this.quickDemoState.isActive,
            startedAt: this.quickDemoState.startedAt,
            endsAt: this.quickDemoState.endsAt,
            durationMs: this.quickDemoState.durationMs,
          }
        : null,
    };
  }

  /**
   * Get stress history
   */
  getHistory(): any[] {
    return this.stressDetector.getHistory();
  }

  /**
   * Get latest stress score snapshot
   */
  getLatestStressScore(): StressScore | null {
    return this.latestStressScore;
  }

  /**
   * Get current behavioral metrics
   */
  getCurrentMetrics(): any {
    try {
      return this.eventCapture.getMetrics();
    } catch (error) {
      console.error('[COGA] Error getting current metrics:', error);
      return null;
    }
  }

  /**
   * Get baseline data
   */
  getBaseline(): any {
    try {
      return this.baselineManager.getBaseline();
    } catch (error) {
      console.error('[COGA] Error getting baseline:', error);
      return null;
    }
  }

  /**
   * Get key statistics
   */
  getKeyStatistics(): any {
    try {
      return this.eventCapture.getKeyStatistics();
    } catch (error) {
      console.error('[COGA] Error getting key statistics:', error);
      return [];
    }
  }

  /**
   * Get mouse zone statistics
   */
  getMouseZoneStatistics(): any {
    try {
      return this.eventCapture.getMouseZoneStatistics();
    } catch (error) {
      console.error('[COGA] Error getting mouse zone statistics:', error);
      return [];
    }
  }

  /**
   * Get calibration progress
   */
  getCalibrationProgress(): number {
    return this.baselineManager.getCalibrationProgress();
  }

  /**
   * Get statistics
   */
  async getStatistics(): Promise<COGAStatistics | null> {
    try {
      const analyticsStats = await this.analytics.getSummary();
      const interventionStats = this.interventionManager.getStatistics();
      const stressTrend = this.stressDetector.getStressTrend();
      const averageStress = this.stressDetector.getAverageStress();

      return {
        analytics: analyticsStats,
        interventions: interventionStats,
        stress: {
          trend: stressTrend,
          average: averageStress,
        },
      };
    } catch (error) {
      console.error('[COGA] Error getting statistics:', error);
      return null;
    }
  }

  /**
   * Trigger an intervention manually in demo mode (does not count in statistics)
   * This is used for the interventions demo page on the landing site
   */
  async triggerInterventionDemo(interventionKey: string): Promise<void> {
    try {
      console.log('[COGA] Triggering demo intervention:', interventionKey);
      
      // Validate intervention key
      const validKeys = [
        'oneBreathReset',
        'boxBreathing',
        'twentyTwentyGaze',
        'figureEightSmoothPursuit',
        'nearFarFocusShift',
        'microBreak'
      ];
      
      if (!validKeys.includes(interventionKey)) {
        console.error('[COGA] Invalid intervention key:', interventionKey);
        return;
      }

      // Use widget to show the intervention in demo mode
      // The widget has a method to show interventions directly
      if (this.widget && typeof (this.widget as any).showInterventionDemo === 'function') {
        await (this.widget as any).showInterventionDemo(interventionKey);
      } else {
        // Fallback: dispatch custom event that intervention components can listen to
        window.dispatchEvent(new CustomEvent('coga:show-intervention-demo', {
          detail: { interventionKey }
        }));
      }
    } catch (error) {
      console.error('[COGA] Error triggering demo intervention:', error);
    }
  }

  /**
   * Reset all data
   */
  async reset(): Promise<void> {
    try {
      // console.log('[COGA] Resetting all data...');

      // Stop if running
      if (this.isRunning) {
        this.stop();
      }

      // Reset components
      this.eventCapture.reset();
      await this.baselineManager.resetBaseline();
      this.stressDetector.reset();
      this.interventionManager.reset();
      await this.analytics.clearAll();

      // Clear config
      await this.storage.clear();

      this.isInitialized = false;
      this.latestStressScore = null;
      this.lastStressTimestampHandled = null;
      // console.log('[COGA] Reset complete');
    } catch (error) {
      console.error('[COGA] Error resetting:', error);
    }
  }

  /**
   * Destroy COGA instance
   */
  destroy(): void {
    try {
      // console.log('[COGA] Destroying instance...');

      // Stop detection
      this.stop();

      // Destroy widget
      this.widget.destroy();

      this.isInitialized = false;
      // console.log('[COGA] Instance destroyed');
    } catch (error) {
      console.error('[COGA] Error destroying:', error);
    }
  }
}

export default COGA;

