/**
 * InterventionManager.ts
 * Coordinates intervention selection, synchronization, and execution across tabs
 */

import OneBreathReset from './OneBreathReset';
import BoxBreathing from './BoxBreathing';
import TwentyTwentyGaze from './TwentyTwentyGaze';
import FigureEightSmoothPursuit from './FigureEightSmoothPursuit';
import NearFarFocusShift from './NearFarFocusShift';
import MicroBreak from './MicroBreak';
import AnnoyanceRules from '../rules/AnnoyanceRules';
import StorageManager from '../utils/storage';
import { INTERVENTION_DEFINITIONS, INTERVENTION_SEVERITY_PRIORITY } from '../config/interventions';
import { deriveStressSeverity } from '../config/stress';
import type Analytics from '../utils/analytics';
import type SettingsManager from '../utils/SettingsManager';
import type {
  InterventionKey,
  InterventionHistoryEntry,
  InterventionStatistics,
  StressScore,
  StressSeverity,
} from '../types';
import type { InterventionStartOptions } from './types';

interface Intervention {
  start: (
    onComplete: (duration?: number) => void,
    onDismiss: () => void,
    options?: InterventionStartOptions
  ) => void | Promise<void>;
  cleanup?: () => void;
}

type InterventionStatus = 'idle' | 'prompt' | 'running';

interface InterventionGlobalState {
  status: InterventionStatus;
  type: InterventionKey | null;
  initiatedAt: number | null;
  startedAt: number | null;
  initiatedBy: string | null;
  startedBy: string | null;
  result?: 'completed' | 'dismissed';
  updatedAt: number;
}

interface ActiveIntervention {
  type: InterventionKey;
  status: 'prompt' | 'running';
  ownerId: string | null;
  startTime: number | null;
  intervention: Intervention;
}

const GLOBAL_STATE_KEY = 'intervention_state';
const GLOBAL_STATE_STALE_MS = 5 * 60 * 1000;
const HISTORY_KEY = 'intervention_history';
const HISTORY_STORAGE_KEY = 'coga_intervention_history';
const MAX_HISTORY_ENTRIES = 300;

class InterventionManager {
  private analytics: Analytics;
  private settingsManager: SettingsManager;
  private annoyanceRules: AnnoyanceRules;
  private interventions: Record<InterventionKey, Intervention>;
  private storage: StorageManager;
  private currentIntervention: ActiveIntervention | null;
  private globalState: InterventionGlobalState;
  private interventionHistory: InterventionHistoryEntry[];
  private enabled: boolean;
  private readonly instanceId: string;
  private syncInitialized: boolean;

  constructor(analytics: Analytics, settingsManager: SettingsManager) {
    this.analytics = analytics;
    this.settingsManager = settingsManager;
    this.annoyanceRules = new AnnoyanceRules(settingsManager);
    this.storage = new StorageManager('coga_');
    this.instanceId = `int-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    this.syncInitialized = false;

    this.interventions = {
      oneBreathReset: new OneBreathReset(),
      boxBreathing: new BoxBreathing(),
      twentyTwentyGaze: new TwentyTwentyGaze(),
      figureEightSmoothPursuit: new FigureEightSmoothPursuit(),
      nearFarFocusShift: new NearFarFocusShift(),
      microBreak: new MicroBreak(),
    };

    this.currentIntervention = null;
    this.globalState = this.buildIdleState();
    this.interventionHistory = [];
    this.enabled = true;
    this.setupHistorySync();
  }

  async init(): Promise<void> {
    if (this.syncInitialized) return;
    try {
      const state = await this.fetchGlobalState();
      if (state) {
        this.applyGlobalState(state, 'init');
      }
      await this.loadHistoryFromStorage();
      this.broadcastInterventionStats();
    } catch (error) {
      console.error('[COGA] Error initializing intervention sync:', error);
    } finally {
      this.syncInitialized = true;
    }
  }

  handleExternalState(state: InterventionGlobalState | null): void {
    if (!state) {
      this.applyGlobalState(this.buildIdleState('dismissed'), 'external');
      return;
    }
    this.applyGlobalState(state, 'external');
  }

  async trigger(stressScore: StressScore): Promise<boolean> {
    try {
      if (!this.enabled) {
        console.log('[COGA] Interventions are disabled');
        return false;
      }

      const severity =
        stressScore.severity ?? deriveStressSeverity(stressScore.percentage, stressScore.level);
      if (!severity) {
        return false;
      }

      const existing = await this.fetchGlobalState();
      if (existing) {
        if (this.isStateActive(existing)) {
          this.applyGlobalState(existing, 'trigger-existing');
          return false;
        }
        if (Date.now() - existing.updatedAt > GLOBAL_STATE_STALE_MS) {
          await this.saveGlobalState(this.buildIdleState(existing.result));
        }
      }

      if (!this.annoyanceRules.shouldShowIntervention()) {
        console.log('[COGA] Blocked by annoyance rules');
        return false;
      }

      const interventionType = this.selectIntervention(severity);
      if (!interventionType) {
        console.log('[COGA] No suitable intervention found');
        return false;
      }

      const promptState: InterventionGlobalState = {
        status: 'prompt',
        type: interventionType,
        initiatedAt: Date.now(),
        startedAt: null,
        initiatedBy: this.instanceId,
        startedBy: null,
        updatedAt: Date.now(),
      };

      await this.saveGlobalState(promptState);
      this.annoyanceRules.recordInterventionShown();
      this.analytics.logInterventionShown(interventionType);
      this.applyGlobalState(promptState, 'trigger-new');
      return true;
    } catch (error) {
      console.error('[COGA] Error triggering intervention:', error);
      return false;
    }
  }

  isActive(): boolean {
    return this.currentIntervention !== null;
  }

  enable(): void {
    this.enabled = true;
  }

  disable(): void {
    this.enabled = false;
    this.dismissCurrentIntervention();
  }

  getHistory(): InterventionHistoryEntry[] {
    return this.interventionHistory;
  }

  getStatistics(): InterventionStatistics {
    const total = this.interventionHistory.length;
    const completed = this.interventionHistory.filter((h) => h.completed).length;
    const dismissed = this.interventionHistory.filter((h) => h.dismissed).length;
    return {
      total,
      completed,
      dismissed,
      completionRate: total > 0 ? (completed / total) * 100 : 0,
    };
  }

  reset(): void {
    this.interventionHistory = [];
    this.annoyanceRules.reset();
    void this.persistInterventionHistory();
  }

  getAnnoyanceRules(): AnnoyanceRules {
    return this.annoyanceRules;
  }

  private buildIdleState(result?: 'completed' | 'dismissed'): InterventionGlobalState {
    return {
      status: 'idle',
      type: null,
      initiatedAt: null,
      startedAt: null,
      initiatedBy: null,
      startedBy: null,
      result,
      updatedAt: Date.now(),
    };
  }

  private async loadHistoryFromStorage(): Promise<void> {
    try {
      const stored = await this.storage.get<InterventionHistoryEntry[]>(HISTORY_KEY);
      if (Array.isArray(stored)) {
        this.interventionHistory = stored.slice(-MAX_HISTORY_ENTRIES);
      }
    } catch (error) {
      console.error('[COGA] Error loading intervention history:', error);
    }
  }

  private async persistInterventionHistory(): Promise<void> {
    try {
      this.interventionHistory = this.interventionHistory.slice(-MAX_HISTORY_ENTRIES);
      const success = await this.storage.set(HISTORY_KEY, this.interventionHistory);
      if (!success) {
        console.warn('[COGA] Intervention history stored locally only');
      }
    } catch (error) {
      console.error('[COGA] Error persisting intervention history:', error);
    } finally {
      this.broadcastInterventionStats();
    }
  }

  private setupHistorySync(): void {
    if (typeof window === 'undefined') {
      return;
    }

    window.addEventListener('storage', (event: StorageEvent) => {
      if (!event.key || event.key !== HISTORY_STORAGE_KEY) {
        return;
      }
      if (!event.newValue) {
        this.interventionHistory = [];
        this.broadcastInterventionStats();
        return;
      }
      try {
        const parsed = JSON.parse(event.newValue);
        if (Array.isArray(parsed)) {
          this.interventionHistory = parsed.slice(-MAX_HISTORY_ENTRIES);
          this.broadcastInterventionStats();
        }
      } catch (error) {
        console.error('[COGA] Error syncing intervention history:', error);
      }
    });
  }

  private broadcastInterventionStats(): void {
    try {
      if (typeof window === 'undefined') {
        return;
      }
      const stats = this.getStatistics();
      window.dispatchEvent(
        new CustomEvent('coga:intervention-history-updated', {
          detail: stats,
        })
      );
    } catch (error) {
      console.error('[COGA] Error broadcasting intervention stats:', error);
    }
  }

  private async fetchGlobalState(): Promise<InterventionGlobalState | null> {
    try {
      const state = await this.storage.get<InterventionGlobalState>(GLOBAL_STATE_KEY);
      if (state && typeof state === 'object') {
        return state;
      }
    } catch (error) {
      console.error('[COGA] Error fetching intervention state:', error);
    }
    return null;
  }

  private async saveGlobalState(state: InterventionGlobalState): Promise<void> {
    this.globalState = state;
    try {
      await this.storage.set(GLOBAL_STATE_KEY, state);
    } catch (error) {
      console.error('[COGA] Error saving intervention state:', error);
    }
  }

  private isStateActive(state: InterventionGlobalState): boolean {
    if (state.status === 'idle' || !state.type) {
      return false;
    }
    if (Date.now() - state.updatedAt > GLOBAL_STATE_STALE_MS) {
      return false;
    }
    return true;
  }

  private applyGlobalState(
    state: InterventionGlobalState,
    origin: 'init' | 'trigger-new' | 'trigger-existing' | 'external' | 'self'
  ): void {
    this.globalState = state;

    if (!this.isStateActive(state)) {
      this.dismissCurrentIntervention();
      return;
    }

    const type = state.type!;
    const ownerId = state.startedBy ?? state.initiatedBy;
    const autoStart = state.status === 'running';
    const alreadyRunning =
      this.currentIntervention &&
      this.currentIntervention.type === type &&
      this.currentIntervention.status === (autoStart ? 'running' : 'prompt');

    if (alreadyRunning) {
      return;
    }

    const onStarted =
      !autoStart && state.type
        ? (timestamp: number) => this.transitionToRunning(state.type as InterventionKey, timestamp)
        : undefined;

    this.showIntervention(type, {
      autoStart,
      onStarted,
      ownerId: ownerId ?? null,
    });
  }

  private showIntervention(
    type: InterventionKey,
    options: { autoStart: boolean; onStarted?: (ts: number) => void; ownerId: string | null }
  ): void {
    this.dismissCurrentIntervention();

    const intervention = this.interventions[type];
    if (!intervention) {
      console.error(`[COGA] Unknown intervention type: ${type}`);
      return;
    }

    const startOptions: InterventionStartOptions = {
      autoStart: options.autoStart,
      onStarted: options.onStarted,
    };

    const startResult = intervention.start(
      (duration) => this.handleComplete(type, duration ?? 0),
      () => this.handleDismiss(type),
      startOptions
    );

    const setActive = () => {
      this.currentIntervention = {
        type,
        status: options.autoStart ? 'running' : 'prompt',
        ownerId: options.ownerId,
        startTime: options.autoStart ? Date.now() : null,
        intervention,
      };
      console.log(`[COGA] Showing intervention: ${type} (${options.autoStart ? 'running' : 'prompt'})`);
    };

    if (startResult instanceof Promise) {
      startResult
        .then(() => setActive())
        .catch((error) => {
          console.error('[COGA] Error starting intervention:', error);
          this.currentIntervention = null;
        });
    } else {
      setActive();
    }
  }

  private async transitionToRunning(type: InterventionKey, startedAt: number): Promise<void> {
    try {
      const state = await this.fetchGlobalState();
      if (!state || state.status !== 'prompt' || state.type !== type) {
        return;
      }

      const runningState: InterventionGlobalState = {
        ...state,
        status: 'running',
        startedAt,
        startedBy: this.instanceId,
        updatedAt: Date.now(),
      };

      await this.saveGlobalState(runningState);
      this.applyGlobalState(runningState, 'self');
    } catch (error) {
      console.error('[COGA] Error transitioning intervention to running:', error);
    }
  }

  private async clearGlobalState(result: 'completed' | 'dismissed'): Promise<void> {
    await this.saveGlobalState(this.buildIdleState(result));
    this.applyGlobalState(this.buildIdleState(result), 'self');
  }

  private dismissCurrentIntervention(): void {
    if (this.currentIntervention) {
      const { intervention } = this.currentIntervention;
      if (intervention && typeof intervention.cleanup === 'function') {
        try {
          intervention.cleanup();
        } catch (error) {
          console.error('[COGA] Error cleaning up intervention:', error);
        }
      }
      this.currentIntervention = null;
    }
  }

  private handleComplete(type: InterventionKey, duration: number): void {
    try {
      const isOwner = this.isOwner();
      if (isOwner) {
        this.annoyanceRules.recordInterventionCompleted();
        this.analytics.logInterventionCompleted(type, duration);
        this.interventionHistory.push({
          type,
          completed: true,
          duration,
          timestamp: Date.now(),
        });
        void this.persistInterventionHistory();
      }
      void this.clearGlobalState('completed');
    } catch (error) {
      console.error('[COGA] Error handling intervention completion:', error);
    }
  }

  private handleDismiss(type: InterventionKey): void {
    try {
      const isOwner = this.isOwner();
      if (isOwner) {
        this.annoyanceRules.recordInterventionDismissed();
        this.analytics.logInterventionDismissed(type);
        this.interventionHistory.push({
          type,
          completed: false,
          dismissed: true,
          timestamp: Date.now(),
        });
        void this.persistInterventionHistory();
      }
      void this.clearGlobalState('dismissed');
    } catch (error) {
      console.error('[COGA] Error handling intervention dismissal:', error);
    }
  }

  private isOwner(): boolean {
    const ownerId = this.globalState.startedBy ?? this.globalState.initiatedBy;
    return ownerId ? ownerId === this.instanceId : true;
  }

  private selectIntervention(severity: StressSeverity): InterventionKey | null {
    try {
      const enabledInterventions = this.settingsManager.getEnabledInterventions();
      const severityOrder: Array<'mild' | 'moderate' | 'severe'> =
        severity === 'severe'
          ? ['severe', 'moderate', 'mild']
          : severity === 'moderate'
            ? ['moderate', 'mild', 'severe']
            : ['mild', 'moderate'];

      const recent = this.interventionHistory
        .slice(-3)
        .map((entry) => entry.type)
        .filter((key): key is InterventionKey => !!key && key in this.interventions);

      for (const level of severityOrder) {
        const priorityKeys = INTERVENTION_SEVERITY_PRIORITY[level] || [];
        const candidates = priorityKeys.filter(
          (key) =>
            enabledInterventions[key] &&
            INTERVENTION_DEFINITIONS[key].severityTargets.includes(level)
        );

        if (candidates.length === 0) continue;

        const filtered = candidates.find((key) => !recent.includes(key));
        return filtered ?? candidates[0];
      }

      return null;
    } catch (error) {
      console.error('[COGA] Error selecting intervention:', error);
      return null;
    }
  }
}

export default InterventionManager;


