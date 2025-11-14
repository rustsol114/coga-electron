/**
 * Type definitions for COGA
 */

// ============= Core Types =============

export interface Position {
  x: number;
  y: number;
  timestamp: number;
}

export interface ClickEvent {
  x: number;
  y: number;
  timestamp: number;
}

export interface KeyPress {
  key: string;
  timestamp: number;
}

export interface VelocityData {
  value: number;
  timestamp: number;
}

export interface PauseDuration {
  duration: number;
  timestamp: number;
}

// ============= Metrics Types =============

export interface MouseMetrics {
  movementVelocity: number; // pixels per second
  movementAcceleration: number; // pixels per second^2
  mouseJitter: number; // average absolute jerk (pixels per second^3)
  clickFrequencyPerMin: number; // clicks per minute
  multiClickRatePerMin: number; // double/triple clicks per minute
  pathEfficiency: number; // 0-1 ratio
  pauseRatio: number; // proportion of time spent paused (0-1)
  scrollVelocity: number; // pixels per second
  rageClickDetected?: boolean;
}

export interface KeyboardMetrics {
  typingErrorRate: number; // errors per 10 keystrokes
  typingSpeedPerMin: number; // key presses per minute
  pauseRegularity: number; // coefficient of variation of inter-key pauses
  avgPauseDuration: number; // seconds
}

export interface ScrollMetrics {
  velocity: number; // pixels per second
}

export interface BehavioralMetrics {
  mouse: MouseMetrics;
  keyboard: KeyboardMetrics;
  scroll: ScrollMetrics;
  timestamp: number;
}

// ============= Baseline Types =============

export interface MouseBaseline {
  movementVelocity: number;
  movementVelocityMAD: number;
  movementAcceleration: number;
  movementAccelerationMAD: number;
  mouseJitter: number;
  mouseJitterMAD: number;
  clickFrequencyPerMin: number;
  clickFrequencyPerMinMAD: number;
  multiClickRatePerMin: number;
  multiClickRatePerMinMAD: number;
  pathEfficiency: number;
  pathEfficiencyMAD: number;
  pauseRatio: number;
  pauseRatioMAD: number;
  scrollVelocity: number;
  scrollVelocityMAD: number;
}

export interface KeyboardBaseline {
  typingErrorRate: number;
  typingErrorRateMAD: number;
  typingSpeedPerMin: number;
  typingSpeedPerMinMAD: number;
  pauseRegularity: number;
  pauseRegularityMAD: number;
  avgPauseDuration: number;
  avgPauseDurationMAD: number;
}

export interface ScrollBaseline {
  velocity: number;
  velocityMAD: number;
}

export interface Context {
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night' | 'unknown';
  dayOfWeek: number;
  hour: number;
}

export interface Baseline {
  mouse: MouseBaseline;
  keyboard: KeyboardBaseline;
  scroll: ScrollBaseline;
  history?: BaselineHistoryEntry[];
  timestamp: number;
  context: Context;
}

export interface BaselinePreset {
  mouse: MouseBaseline;
  keyboard: KeyboardBaseline;
  scroll: ScrollBaseline;
}

export interface BaselineHistoryEntry {
  date: string; // YYYY-MM-DD
  baseline: {
    mouse: MouseBaseline;
    keyboard: KeyboardBaseline;
    scroll: ScrollBaseline;
  };
  timestamp: number;
}

// ============= Stress Detection Types =============

export type StressLevel = 'normal' | 'moderate' | 'high' | 'very-high';
export type StressSeverity = 'mild' | 'moderate' | 'severe';
export type StressTrend = 'increasing' | 'decreasing' | 'stable';

export interface StressScore {
  mouse: number;
  keyboard: number;
  combined: number;
  level: StressLevel;
  severity: StressSeverity | null;
  shouldIntervene: boolean;
  timestamp: number;
  percentage: number;
  metrics?: BehavioralMetrics;
}

// ============= Intervention Types =============

export type InterventionKey =
  | 'oneBreathReset'
  | 'boxBreathing'
  | 'twentyTwentyGaze'
  | 'figureEightSmoothPursuit'
  | 'nearFarFocusShift'
  | 'microBreak';

export type InterventionType = InterventionKey;

export interface InterventionHistoryEntry {
  type: InterventionKey | string;
  completed: boolean;
  dismissed?: boolean;
  duration?: number;
  timestamp: number;
}

export interface InterventionStatistics {
  total: number;
  completed: number;
  dismissed: number;
  completionRate: number;
}

export interface CurrentIntervention {
  type: InterventionType | string;
  intervention: any;
  startTime: number;
}

// ============= Annoyance Rules Types =============

export interface AnnoyanceConfig {
  maxPerHour: number;
  maxPerDay: number;
  cooldownMs: number;
  autoSnoozeAfterDismissals: number;
  snoozeTimeMs: number;
}

export interface InterventionLog {
  timestamp: number;
  shown: boolean;
}

// ============= Analytics Types =============

export interface AnalyticsEvent {
  type: string;
  timestamp: number;
  data: Record<string, any>;
  sessionId: string;
}

export interface AnalyticsSummary {
  totalEvents: number;
  stressDetections: number;
  interventionsShown: number;
  interventionsCompleted: number;
  interventionsDismissed: number;
  completionRate: number;
}

// ============= Configuration Types =============

export interface COGAConfig {
  sensitivity: 'low' | 'medium' | 'high';
  detectionInterval: number;
  enabled: boolean;
}

export interface SettingsConfig {
  sensitivity: 'low' | 'medium' | 'high';
  interventionLimits: {
    cooldownMinutes: number;
    maxPerHour: number;
    maxPerDay: number;
  };
  suppressedDomains: string[];
  enabledInterventions: Record<InterventionKey, boolean>;
}

export interface QuickDemoStatus {
  isActive: boolean;
  startedAt: number;
  endsAt: number;
  durationMs: number;
}

export interface COGAStatus {
  version: string;
  isInitialized: boolean;
  isRunning: boolean;
  hasBaseline: boolean;
  isCalibrating: boolean;
  calibrationProgress: number;
  config: COGAConfig;
  quickDemo: QuickDemoStatus | null;
}

export interface COGAStatistics {
  analytics: AnalyticsSummary;
  interventions: InterventionStatistics;
  stress: {
    trend: StressTrend;
    average: number;
  };
}

// ============= Callback Types =============

export type InterventionCallback = (duration?: number) => void;
export type DismissCallback = () => void;

