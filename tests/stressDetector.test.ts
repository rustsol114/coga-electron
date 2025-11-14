import assert from 'node:assert/strict';
import StressDetector from '../extension/src/core/StressDetector';
import type { Baseline, BehavioralMetrics } from '../extension/src/types';

class StubBaselineManager {
  constructor(private readonly baseline: Baseline) {}

  getBaseline(): Baseline {
    return this.baseline;
  }
}

class StubSettingsManager {
  getSensitivity(): 'low' | 'medium' | 'high' {
    return 'medium';
  }
}

const baseline: Baseline = {
  mouse: {
    movementVelocity: 320,
    movementVelocityMAD: 20,
    movementAcceleration: 90,
    movementAccelerationMAD: 10,
    mouseJitter: 25,
    mouseJitterMAD: 5,
    clickFrequencyPerMin: 18,
    clickFrequencyPerMinMAD: 4,
    multiClickRatePerMin: 1,
    multiClickRatePerMinMAD: 0.4,
    pathEfficiency: 0.9,
    pathEfficiencyMAD: 0.05,
    pauseRatio: 0.2,
    pauseRatioMAD: 0.05,
    scrollVelocity: 200,
    scrollVelocityMAD: 30,
  },
  keyboard: {
    typingErrorRate: 1,
    typingErrorRateMAD: 0.25,
    typingSpeedPerMin: 220,
    typingSpeedPerMinMAD: 20,
    pauseRegularity: 0.2,
    pauseRegularityMAD: 0.05,
    avgPauseDuration: 0.35,
    avgPauseDurationMAD: 0.05,
  },
  scroll: {
    velocity: 200,
    velocityMAD: 30,
  },
  timestamp: Date.now(),
  context: {
    timeOfDay: 'afternoon',
    dayOfWeek: 2,
    hour: 14,
  },
};

function cloneMetrics(): BehavioralMetrics {
  return {
    mouse: {
      movementVelocity: baseline.mouse.movementVelocity,
      movementAcceleration: baseline.mouse.movementAcceleration,
      mouseJitter: baseline.mouse.mouseJitter,
      clickFrequencyPerMin: baseline.mouse.clickFrequencyPerMin,
      multiClickRatePerMin: baseline.mouse.multiClickRatePerMin,
      pathEfficiency: baseline.mouse.pathEfficiency,
      pauseRatio: baseline.mouse.pauseRatio,
      scrollVelocity: baseline.mouse.scrollVelocity,
    },
    keyboard: {
      typingErrorRate: baseline.keyboard.typingErrorRate,
      typingSpeedPerMin: baseline.keyboard.typingSpeedPerMin,
      pauseRegularity: baseline.keyboard.pauseRegularity,
      avgPauseDuration: baseline.keyboard.avgPauseDuration,
    },
    scroll: {
      velocity: baseline.scroll.velocity,
    },
    timestamp: Date.now(),
  };
}

const detector = new StressDetector(
  new StubBaselineManager(baseline) as unknown as any,
  new StubSettingsManager() as unknown as any
);

function runNeutralScenario() {
  const metrics = cloneMetrics();
  const score = detector.calculateStressScore(metrics);

  assert.equal(score.level, 'normal', 'Neutral metrics should be normal');
  assert.ok(score.percentage <= 50, 'Neutral percentage should stay below 50%');
  assert.equal(score.severity, null, 'Neutral severity should be null');
  assert.equal(score.shouldIntervene, false, 'No intervention for neutral data');
  assert.ok(score.metrics, 'Metrics payload should be returned');
  assert.equal(score.metrics?.mouse.movementVelocity, metrics.mouse.movementVelocity);
}

function runModerateScenario() {
  const metrics = cloneMetrics();
  metrics.mouse.clickFrequencyPerMin += baseline.mouse.clickFrequencyPerMinMAD * 2.0;
  metrics.mouse.movementVelocity += baseline.mouse.movementVelocityMAD * 1.8;
  metrics.mouse.movementAcceleration += baseline.mouse.movementAccelerationMAD * 1.6;
  metrics.keyboard.typingErrorRate += baseline.keyboard.typingErrorRateMAD * 2.1;
  metrics.mouse.multiClickRatePerMin += baseline.mouse.multiClickRatePerMinMAD * 1.5;
  metrics.mouse.pathEfficiency -= baseline.mouse.pathEfficiencyMAD * 0.8;
  metrics.mouse.pauseRatio += baseline.mouse.pauseRatioMAD * 0.7;

  const score = detector.calculateStressScore(metrics);

  assert.equal(score.level, 'moderate', 'Moderate deviations should map to moderate stress');
  assert.ok(
    score.percentage >= 50 && score.percentage < 80,
    `Moderate percentage expected between 50 and 80, received ${score.percentage}`
  );
  assert.ok(
    score.severity === 'mild' || score.severity === 'moderate',
    `Moderate scenario should produce mild/moderate severity, received ${score.severity}`
  );
  assert.ok(score.mouse > 0 && score.keyboard > 0, 'Z-scores should be positive for elevated metrics');
}

function runHighScenario() {
  const metrics = cloneMetrics();
  metrics.mouse.clickFrequencyPerMin += baseline.mouse.clickFrequencyPerMinMAD * 3.5;
  metrics.mouse.multiClickRatePerMin += baseline.mouse.multiClickRatePerMinMAD * 4;
  metrics.mouse.movementVelocity += baseline.mouse.movementVelocityMAD * 3;
  metrics.mouse.movementAcceleration += baseline.mouse.movementAccelerationMAD * 3;
  metrics.mouse.mouseJitter += baseline.mouse.mouseJitterMAD * 4;
  metrics.mouse.scrollVelocity += baseline.mouse.scrollVelocityMAD * 3.2;
  metrics.keyboard.typingErrorRate += baseline.keyboard.typingErrorRateMAD * 3;
  metrics.keyboard.pauseRegularity += baseline.keyboard.pauseRegularityMAD * 2.5;
  metrics.keyboard.avgPauseDuration += baseline.keyboard.avgPauseDurationMAD * 2.8;
  metrics.mouse.pathEfficiency -= baseline.mouse.pathEfficiencyMAD * 1.5;
  metrics.mouse.pauseRatio += baseline.mouse.pauseRatioMAD * 1.2;

  const score = detector.calculateStressScore(metrics);

  assert.equal(score.level, 'high', 'Significant deviations should map to high stress');
  assert.ok(score.percentage >= 80, 'High stress should produce >= 80%');
  assert.equal(score.shouldIntervene, true, 'High stress should trigger intervention flag');
  assert.equal(score.severity, 'severe', 'High stress should map to severe severity');
}

runNeutralScenario();
runModerateScenario();
runHighScenario();

console.log('StressDetector metric tests passed ✅');

