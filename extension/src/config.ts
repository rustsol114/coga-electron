/**
 * config.ts
 * Centralized configuration for COGA Extension
 * 
 * IMPORTANT: Update PUBLIC_URL here when deploying with a new ngrok URL or custom domain
 */

export const PUBLIC_URL = 'https://recruitable-alesia-nonresponsibly.ngrok-free.dev';

import type { BaselinePreset } from './types';

/**
 * Baseline calibration window (can be adjusted globally)
 * Update this value (in seconds) to change calibration length everywhere.
 */
export const BASELINE_DURATION_SECONDS = 3 * 60; // e.g. 1min=1*60, 3min=3*60, 5min=5*60, 10min=10*60, 15min=15*60, 30min=30*60, 1hour=60*60
export const BASELINE_DURATION_MS = BASELINE_DURATION_SECONDS * 1000;

export const DEFAULT_BASELINE_PRESET: BaselinePreset = {
  mouse: {
    movementVelocity: 1428.10,
    movementVelocityMAD: 435.91,
    movementAcceleration: 780,          // not shown; moderate acceleration for high-velocity users
    movementAccelerationMAD: 250,
    mouseJitter: 40,                     // kept close to prior defaults, no direct measurement available
    mouseJitterMAD: 18,
    clickFrequencyPerMin: 9.0,
    clickFrequencyPerMinMAD: 3.0,
    multiClickRatePerMin: 1.2,           // unchanged – not displayed in snapshot
    multiClickRatePerMinMAD: 0.6,
    pathEfficiency: 0.68,                // unchanged – still a reasonable target
    pathEfficiencyMAD: 0.18,
    pauseRatio: 0.22,                    // unchanged – keeps calm behaviour
    pauseRatioMAD: 0.12,
    scrollVelocity: 1756.02,
    scrollVelocityMAD: 439.01,
  },
  keyboard: {
    typingErrorRate: 0.10,
    typingErrorRateMAD: 0.10,
    typingSpeedPerMin: 50.0,
    typingSpeedPerMinMAD: 50.0,
    pauseRegularity: 0.35,               // untouched (no new data)
    pauseRegularityMAD: 0.15,
    avgPauseDuration: 0.148,             // 148 ms expressed in seconds
    avgPauseDurationMAD: 0.148,
  },
  scroll: {
    velocity: 1756.02,
    velocityMAD: 439.01,
  },
};

/**
 * Metric aggregation window (seconds)
 * Used by event capture and stress detection for rolling calculations.
 */
export const METRIC_WINDOW_SECONDS = 60;
export const METRIC_WINDOW_MS = METRIC_WINDOW_SECONDS * 1000;

/**
 * Get the settings URL
 */
export function getSettingsUrl(): string {
  return `${PUBLIC_URL}/#settings`;
}

// Make available globally for runtime access
if (typeof window !== 'undefined') {
  (window as any).COGA_PUBLIC_URL = PUBLIC_URL;
  (window as any).COGA_BASELINE_SECONDS = BASELINE_DURATION_SECONDS;
  (window as any).COGA_BASELINE_PRESET = DEFAULT_BASELINE_PRESET;
}

