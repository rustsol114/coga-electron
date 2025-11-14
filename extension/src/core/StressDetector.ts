/**
 * StressDetector.ts
 * Calculates stress scores based on behavioral metrics and baseline
 */

import type BaselineManager from './BaselineManager';
import type SettingsManager from '../utils/SettingsManager';
import type {
  BehavioralMetrics,
  StressScore,
  StressLevel,
  StressTrend,
  Baseline,
} from '../types';
import { deriveStressSeverity } from '../config/stress';

class StressDetector {
  private baselineManager: BaselineManager;
  private settingsManager: SettingsManager;
  private stressHistory: StressScore[];
  private readonly maxHistoryLength: number;
  private stressThreshold: number;
  private lastActivityTime: number;
  private readonly inactivityDecayTime: number; // Time in ms before starting decay (0.5 minutes)
  private readonly decayInterval: number; // How often to check for decay (1 minute)
  
  // NEW: Smoothing and hysteresis for realistic detection
  private smoothedCombined: number;
  private lastLevel: StressLevel;
  private consecutiveHighCount: number;
  private consecutiveNormalCount: number;
  private readonly smoothingAlpha: number; // EMA smoothing factor
  private readonly hysteresisThreshold: number; // Required consecutive readings for level change

  constructor(baselineManager: BaselineManager, settingsManager: SettingsManager) {
    this.baselineManager = baselineManager;
    this.settingsManager = settingsManager;
    this.stressHistory = [];
    this.maxHistoryLength = 100;
    
    // Get initial threshold from settings
    const sensitivity = settingsManager.getSensitivity();
    this.setSensitivity(sensitivity);
    
    this.lastActivityTime = Date.now();
    this.inactivityDecayTime = 0.5 * 60 * 1000; // 0.5 minutes
    this.decayInterval = 5 * 1000; // 1 seconds
    
    // Initialize smoothing and hysteresis
    this.smoothedCombined = 0;
    this.lastLevel = 'normal';
    this.consecutiveHighCount = 0;
    this.consecutiveNormalCount = 0;
    this.smoothingAlpha = 0.3; // 30% new data, 70% history (smooth transitions)
    this.hysteresisThreshold = 3; // Need 3 consecutive readings to change level
    
    // Start decay check interval
    this.startDecayCheck();
  }

  /**
   * Calculate stress score from current metrics with smoothing and hysteresis
   */
  calculateStressScore(metrics: BehavioralMetrics): StressScore {
    try {
      const baseline = this.baselineManager.getBaseline();

      if (!baseline) {
        console.log(
          '[COGA StressDetector] Baseline not available yet — returning neutral stress score (mouse=0, keyboard=0, combined=0, percentage=0)'
        );
        return {
          mouse: 0,
          keyboard: 0,
          combined: 0,
          level: 'normal',
          severity: null,
          shouldIntervene: false,
          timestamp: Date.now(),
          percentage: 0,
        };
      }

      // Calculate z-scores for each metric
      const mouseScore = this.calculateMouseScore(metrics, baseline);
      const keyboardScore = this.calculateKeyboardScore(metrics, baseline);

      // Raw combined score
      const rawCombined = mouseScore * 0.7 + keyboardScore * 0.3;
      
      // IMPROVED: Apply exponential moving average for smoothing
      this.smoothedCombined = this.smoothingAlpha * rawCombined + (1 - this.smoothingAlpha) * this.smoothedCombined;
      
      // Use smoothed score for level determination
      const combined = this.smoothedCombined;
      
      // IMPROVED: Get level with hysteresis to prevent rapid fluctuations
      const level = this.getStressLevelWithHysteresis(combined);
      
      const percentage = this.calculateStressPercentage(combined);
      const severity = deriveStressSeverity(percentage, level);
      const shouldIntervene = level === 'high';
      
      console.log(
        `[COGA StressDetector] Raw combined: ${rawCombined.toFixed(4)}, Smoothed: ${combined.toFixed(4)}, Level: ${level}`
      );

      const stressScore: StressScore = {
        mouse: mouseScore,
        keyboard: keyboardScore,
        combined,
        level,
        severity,
        shouldIntervene,
        timestamp: Date.now(),
        percentage,
        metrics,
      };

      console.debug('[COGA] Computed stress score', stressScore);

      // Update last activity time
      this.lastActivityTime = Date.now();

      // Add to history
      this.stressHistory.push(stressScore);
      if (this.stressHistory.length > this.maxHistoryLength) {
        this.stressHistory.shift();
      }

      return stressScore;
    } catch (error) {
      console.error('[COGA] Error calculating stress score:', error);
      return this.getEmptyScore();
    }
  }

  /**
   * Calculate mouse-related stress score
   */
  private calculateMouseScore(
    metrics: BehavioralMetrics,
    baseline: Baseline
  ): number {
    try {
      const weights: Array<{ z: number; weight: number }> = [];

      weights.push({
        z: this.computeDirectionalZ(
          metrics.mouse.clickFrequencyPerMin,
          baseline.mouse.clickFrequencyPerMin,
          baseline.mouse.clickFrequencyPerMinMAD,
          'higher',
          0.2
        ),
        weight: 0.15,
      });

      weights.push({
        z: this.computeDirectionalZ(
          metrics.mouse.multiClickRatePerMin,
          baseline.mouse.multiClickRatePerMin,
          baseline.mouse.multiClickRatePerMinMAD,
          'higher',
          0.2
        ),
        weight: 0.15,
      });

      weights.push({
        z: this.computeDirectionalZ(
          metrics.mouse.movementVelocity,
          baseline.mouse.movementVelocity,
          baseline.mouse.movementVelocityMAD,
          'higher',
          0.1
        ),
        weight: 0.1,
      });

      weights.push({
        z: this.computeDirectionalZ(
          metrics.mouse.movementAcceleration,
          baseline.mouse.movementAcceleration,
          baseline.mouse.movementAccelerationMAD,
          'higher',
          0.1
        ),
        weight: 0.1,
      });

      weights.push({
        z: this.computeDirectionalZ(
          metrics.mouse.mouseJitter,
          baseline.mouse.mouseJitter,
          baseline.mouse.mouseJitterMAD,
          'higher',
          0.15
        ),
        weight: 0.1,
      });

      weights.push({
        z: this.computeDirectionalZ(
          metrics.mouse.scrollVelocity,
          baseline.mouse.scrollVelocity,
          baseline.mouse.scrollVelocityMAD,
          'higher',
          0.1
        ),
        weight: 0.1,
      });

      const weightSum = weights.reduce((acc, item) => acc + item.weight, 0);
      if (weightSum === 0) {
        return 0;
      }

      const scoreSum = weights.reduce((acc, item) => {
        if (!Number.isFinite(item.z) || item.z <= 0) {
          return acc;
        }
        return acc + item.z * item.weight;
      }, 0);

      let score = scoreSum / weightSum;

      if (metrics.mouse.pathEfficiency < baseline.mouse.pathEfficiency) {
        const efficiencyDelta =
          baseline.mouse.pathEfficiency - metrics.mouse.pathEfficiency;
        const efficiencyPenalty = Math.min(1, efficiencyDelta * 2);
        score += efficiencyPenalty * 0.1;
        console.log(
          `[COGA StressDetector] Mouse path-efficiency penalty: baseline=${baseline.mouse.pathEfficiency.toFixed(
            4
          )}, current=${metrics.mouse.pathEfficiency.toFixed(
            4
          )}, Δ=${efficiencyDelta.toFixed(4)}, penalty=${(efficiencyPenalty * 0.1).toFixed(4)}`
        );
      }

      if (metrics.mouse.pauseRatio > baseline.mouse.pauseRatio) {
        const pauseDelta = metrics.mouse.pauseRatio - baseline.mouse.pauseRatio;
        const pausePenalty = Math.min(0.5, pauseDelta * 2);
        score += pausePenalty;
        console.log(
          `[COGA StressDetector] Mouse pause-ratio penalty: baseline=${baseline.mouse.pauseRatio.toFixed(
            4
          )}, current=${metrics.mouse.pauseRatio.toFixed(
            4
          )}, Δ=${pauseDelta.toFixed(4)}, penalty=${pausePenalty.toFixed(4)}`
        );
      }

      const mouseFormula = weights
        .map(
          (item) =>
            `(${item.z.toFixed(4)} * ${item.weight.toFixed(2)})`
        )
        .join(' + ');
      console.log(
        `[COGA StressDetector] Mouse weighted sum: ${mouseFormula} = ${scoreSum.toFixed(
          4
        )}; divisor=${weightSum.toFixed(2)} ⇒ mouseScore=${score.toFixed(4)}`
      );

      return score;
    } catch (error) {
      console.error('[COGA] Error calculating mouse score:', error);
      return 0;
    }
  }

  /**
   * Calculate keyboard-related stress score
   * IMPROVED: Now includes typing speed as a stress indicator
   */
  private calculateKeyboardScore(
    metrics: BehavioralMetrics,
    baseline: Baseline
  ): number {
    try {
      const weights: Array<{ z: number; weight: number }> = [];

      // Typing errors (high weight - strong stress indicator)
      weights.push({
        z: this.computeDirectionalZ(
          metrics.keyboard.typingErrorRate,
          baseline.keyboard.typingErrorRate,
          baseline.keyboard.typingErrorRateMAD,
          'higher',
          0.2
        ),
        weight: 0.50, // Reduced from 0.75 to accommodate typing speed
      });

      // FIXED: Typing speed (elevated speed indicates stress)
      weights.push({
        z: this.computeDirectionalZ(
          metrics.keyboard.typingSpeedPerMin,
          baseline.keyboard.typingSpeedPerMin,
          baseline.keyboard.typingSpeedPerMinMAD,
          'higher',
          0.15 // Only count if significantly above baseline
        ),
        weight: 0.25, // NEW: Significant weight for typing speed
      });

      // Pause irregularity (erratic pausing indicates stress)
      weights.push({
        z: this.computeDirectionalZ(
          metrics.keyboard.pauseRegularity,
          baseline.keyboard.pauseRegularity,
          baseline.keyboard.pauseRegularityMAD,
          'higher',
          0.1
        ),
        weight: 0.15,
      });

      // Average pause duration (longer pauses may indicate confusion/stress)
      weights.push({
        z: this.computeDirectionalZ(
          metrics.keyboard.avgPauseDuration,
          baseline.keyboard.avgPauseDuration,
          baseline.keyboard.avgPauseDurationMAD,
          'higher',
          0.1
        ),
        weight: 0.1,
      });

      const weightSum = weights.reduce((acc, item) => acc + item.weight, 0);
      if (weightSum === 0) {
        return 0;
      }

      const scoreSum = weights.reduce((acc, item) => {
        if (!Number.isFinite(item.z) || item.z <= 0) {
          return acc;
        }
        return acc + item.z * item.weight;
      }, 0);

      const score = scoreSum / weightSum;
      const keyboardFormula = weights
        .map(
          (item) =>
            `(${item.z.toFixed(4)} * ${item.weight.toFixed(2)})`
        )
        .join(' + ');
      console.log(
        `[COGA StressDetector] Keyboard weighted sum: ${keyboardFormula} = ${scoreSum.toFixed(
          4
        )}; divisor=${weightSum.toFixed(2)} ⇒ keyboardScore=${score.toFixed(4)}`
      );
      return score;
    } catch (error) {
      console.error('[COGA] Error calculating keyboard score:', error);
      return 0;
    }
  }

  /**
   * Get stress level category with hysteresis to prevent rapid level changes
   */
  private getStressLevelWithHysteresis(combinedScore: number): StressLevel {
    try {
      const highThreshold = this.stressThreshold;
      const moderateThreshold = this.getModerateThreshold();

      // Determine raw level from thresholds
      let rawLevel: StressLevel;
      if (combinedScore >= highThreshold) {
        rawLevel = 'high';
      } else if (combinedScore >= moderateThreshold) {
        rawLevel = 'moderate';
      } else {
        rawLevel = 'normal';
      }

      // Apply hysteresis: require N consecutive readings to change level
      if (rawLevel === 'high' || rawLevel === 'moderate') {
        this.consecutiveHighCount++;
        this.consecutiveNormalCount = 0;
      } else {
        this.consecutiveNormalCount++;
        this.consecutiveHighCount = 0;
      }

      // Only change level if we have enough consecutive readings
      let finalLevel = this.lastLevel;
      
      if (this.consecutiveHighCount >= this.hysteresisThreshold) {
        finalLevel = rawLevel; // Switch to high/moderate
      } else if (this.consecutiveNormalCount >= this.hysteresisThreshold) {
        finalLevel = 'normal'; // Switch to normal
      }

      this.lastLevel = finalLevel;

      console.log(
        `[COGA StressDetector] Raw level: ${rawLevel}, Final level: ${finalLevel} (consecutive high: ${this.consecutiveHighCount}, normal: ${this.consecutiveNormalCount})`
      );

      return finalLevel;
    } catch (error) {
      console.error('[COGA] Error getting stress level:', error);
      return 'normal';
    }
  }

  /**
   * Get stress level category (legacy - kept for background script compatibility)
   */
  private getStressLevel(combinedScore: number): StressLevel {
    try {
      const highThreshold = this.stressThreshold;
      const moderateThreshold = this.getModerateThreshold();

      let resolved: StressLevel;
      if (combinedScore >= highThreshold) {
        resolved = 'high';
      } else if (combinedScore >= moderateThreshold) {
        resolved = 'moderate';
      } else {
        resolved = 'normal';
      }

      return resolved;
    } catch (error) {
      console.error('[COGA] Error getting stress level:', error);
      return 'normal';
    }
  }

  /**
   * Get color for stress level
   */
  getStressColor(level: StressLevel): string {
    const colors: Record<StressLevel, string> = {
      normal: '#3b82f6', // blue
      moderate: '#f97316', // orange
      high: '#ef4444', // red
    };

    return colors[level] || colors.normal;
  }

  private getModerateThreshold(): number {
    return Math.max(0.8, this.stressThreshold * 0.5);
  }

  private calculateStressPercentage(score: number): number {
    const clampedScore = Math.max(0, score);
    const moderateThreshold = this.getModerateThreshold();
    const highThreshold = this.stressThreshold;
    const maxReference = highThreshold * 1.5;

    if (moderateThreshold <= 0) {
      console.log(
        '[COGA StressDetector] Percentage mapping aborted: moderate threshold <= 0'
      );
      return 0;
    }

    if (clampedScore <= moderateThreshold) {
      const ratio = clampedScore / moderateThreshold;
      const percentage = Math.min(50, Math.max(0, ratio * 50));
      console.log(
        `[COGA StressDetector] Percentage (normal range): (${clampedScore.toFixed(
          4
        )} / ${moderateThreshold.toFixed(4)}) * 50 = ${percentage.toFixed(2)}%`
      );
      return percentage;
    }

    if (clampedScore >= highThreshold) {
      const cappedScore = Math.min(maxReference, clampedScore);
      const extra = cappedScore - highThreshold;
      const range = Math.max(0.001, maxReference - highThreshold);
      const percentage = Math.min(100, 80 + (extra / range) * 20);
      console.log(
        `[COGA StressDetector] Percentage (high range): capped=${cappedScore.toFixed(
          4
        )}, extra=${extra.toFixed(4)}, range=${range.toFixed(4)} ⇒ percentage=${percentage.toFixed(
          2
        )}%`
      );
      return percentage;
    }

    const ratio = (clampedScore - moderateThreshold) / Math.max(0.001, highThreshold - moderateThreshold);
    const percentage = Math.min(80, 50 + ratio * 30);
    console.log(
      `[COGA StressDetector] Percentage (moderate range): ((score ${clampedScore.toFixed(
        4
      )} - ${moderateThreshold.toFixed(4)}) / (${highThreshold.toFixed(
        4
      )} - ${moderateThreshold.toFixed(4)})) * 30 + 50 = ${percentage.toFixed(2)}%`
    );
    return percentage;
  }

  /**
   * Get recent stress trend
   */
  getStressTrend(windowSize: number = 10): StressTrend {
    try {
      if (this.stressHistory.length < windowSize) {
        return 'stable';
      }

      const recent = this.stressHistory.slice(-windowSize);
      const scores = recent.map((s) => s.combined);

      // Calculate linear regression slope
      const n = scores.length;
      const sumX = (n * (n - 1)) / 2;
      const sumY = scores.reduce((sum, val) => sum + val, 0);
      const sumXY = scores.reduce((sum, val, idx) => sum + val * idx, 0);
      const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;

      const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);

      if (slope > 0.1) {
        return 'increasing';
      } else if (slope < -0.1) {
        return 'decreasing';
      } else {
        return 'stable';
      }
    } catch (error) {
      console.error('[COGA] Error calculating stress trend:', error);
      return 'stable';
    }
  }

  /**
   * Get average stress score over time window
   */
  getAverageStress(timeWindowMs: number = 300000): number {
    try {
      const now = Date.now();
      const recentScores = this.stressHistory.filter(
        (score) => now - score.timestamp < timeWindowMs
      );

      if (recentScores.length === 0) return 0;

      const sum = recentScores.reduce((acc, score) => acc + score.combined, 0);
      return sum / recentScores.length;
    } catch (error) {
      console.error('[COGA] Error calculating average stress:', error);
      return 0;
    }
  }

  /**
   * Get stress history
   */
  getHistory(): StressScore[] {
    return this.stressHistory;
  }

  /**
   * Get empty stress score
   */
  private getEmptyScore(): StressScore {
    return {
      mouse: 0,
      keyboard: 0,
      combined: 0,
      level: 'normal',
      severity: null,
      shouldIntervene: false,
      timestamp: Date.now(),
      percentage: 0,
    };
  }

  /**
   * Reset stress history and smoothing state
   * IMPROVED: Also reset smoothing and hysteresis for clean start
   */
  reset(): void {
    this.stressHistory = [];
    this.lastActivityTime = Date.now();
    
    // Reset smoothing and hysteresis state
    this.smoothedCombined = 0;
    this.lastLevel = 'normal';
    this.consecutiveHighCount = 0;
    this.consecutiveNormalCount = 0;
  }

  /**
   * Set stress threshold
   */
  setThreshold(threshold: number): void {
    try {
      if (threshold < 0 || threshold > 10) {
        throw new Error('Threshold must be between 0 and 10');
      }
      this.stressThreshold = threshold;
    } catch (error) {
      console.error('[COGA] Error setting threshold:', error);
    }
  }

  /**
   * Get current threshold
   */
  getThreshold(): number {
    return this.stressThreshold;
  }

  /**
   * Adjust threshold based on sensitivity setting
   * IMPROVED: Higher thresholds to reduce false positives
   */
  setSensitivity(sensitivity: 'low' | 'medium' | 'high'): void {
    try {
      // IMPROVED: Fine-tuned thresholds for realistic detection
      const thresholds: Record<'low' | 'medium' | 'high', number> = {
        low: 3.5,    // Least sensitive (fewer interventions)
        medium: 2.8, // Balanced (default)
        high: 2.2,   // Most sensitive (more interventions)
      };

      this.stressThreshold = thresholds[sensitivity] || thresholds.medium;
      
      // Reset smoothing and hysteresis when sensitivity changes
      this.smoothedCombined = 0;
      this.lastLevel = 'normal';
      this.consecutiveHighCount = 0;
      this.consecutiveNormalCount = 0;
      
      // Update settings manager if it's available
      if (this.settingsManager) {
        console.log(`[COGA] Sensitivity set to: ${sensitivity} (threshold: ${this.stressThreshold})`);
      }
    } catch (error) {
      console.error('[COGA] Error setting sensitivity:', error);
    }
  }

  /**
   * Start periodic decay check
   */
  private startDecayCheck(): void {
    try {
      setInterval(() => {
        this.applyDecayIfInactive();
      }, this.decayInterval);
    } catch (error) {
      console.error('[COGA] Error starting decay check:', error);
    }
  }

  /**
   * Apply progressive decay to stress history when inactive
   */
  private applyDecayIfInactive(): void {
    try {
      const now = Date.now();
      const timeSinceLastActivity = now - this.lastActivityTime;

      // Only apply decay if user has been inactive for more than the threshold
      if (timeSinceLastActivity < this.inactivityDecayTime) {
        return;
      }

      // Calculate how much time has passed since decay should have started
      const inactiveTime = timeSinceLastActivity - this.inactivityDecayTime;
      
      // Remove entries that are older than 5 seconds per 30 seconds of inactivity
      // This means after 30 min inactive: remove entries older than 5 min
      // After 60 min inactive: remove entries older than 10 min, etc.
      const decayWindowMs = Math.min(
        0.5 * 60 * 1000, // Max 30 seconds
        (inactiveTime / (this.inactivityDecayTime)) * 5 * 1000 // 5 sec per 30 sec inactive
      );

      const cutoffTime = now - decayWindowMs;
      
      // Filter out old entries
      const beforeCount = this.stressHistory.length;
      this.stressHistory = this.stressHistory.filter(
        (score) => score.timestamp >= cutoffTime
      );
      
      const afterCount = this.stressHistory.length;
      
      if (beforeCount !== afterCount) {
        console.log(
          `[COGA] Decay applied: Removed ${beforeCount - afterCount} old stress history entries (inactive for ${Math.round(timeSinceLastActivity / 60000)} minutes)`
        );
      }
    } catch (error) {
      console.error('[COGA] Error applying decay:', error);
    }
  }

  /**
   * Compute robust z-score based on direction
   * IMPROVED: Higher safeMad floor and stricter thresholds
   */
  private computeDirectionalZ(
    value: number,
    baselineValue: number,
    baselineMad: number,
    direction: 'higher' | 'lower',
    minimumThreshold = 0
  ): number {
    try {
      if (!Number.isFinite(value) || !Number.isFinite(baselineValue)) {
        return 0;
      }

      // IMPROVED: Higher MAD floor to prevent hypersensitivity (25% of baseline or 0.1 minimum)
      const safeMad = baselineMad > 0 ? baselineMad : Math.max(Math.abs(baselineValue) * 0.25, 0.1);
      
      const difference =
        direction === 'higher'
          ? value - baselineValue
          : baselineValue - value;

      if (difference <= 0) {
        return 0;
      }

      const zScore = difference / safeMad;
      
      // IMPROVED: Cap at 4σ instead of 6σ to reduce extreme scores
      const capped = Math.min(zScore, 4);

      if (capped <= minimumThreshold) {
        return 0;
      }

      // Subtract minimum threshold to avoid double counting
      const finalScore = capped - minimumThreshold;
      
      return finalScore;
    } catch (error) {
      console.error('[COGA] Error computing directional z-score:', error);
      return 0;
    }
  }
}

export default StressDetector;

