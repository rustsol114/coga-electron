import type { StressLevel, StressSeverity } from '../types';

export const STRESS_SEVERITY_THRESHOLDS = {
  mild: 35,
  moderate: 55,
  severe: 75,
} as const;

export function deriveStressSeverity(
  percentage: number | null | undefined,
  level: StressLevel
): StressSeverity | null {
  const value = typeof percentage === 'number' ? Math.max(0, percentage) : 0;

  if (value >= STRESS_SEVERITY_THRESHOLDS.severe) {
    return 'severe';
  }
  if (value >= STRESS_SEVERITY_THRESHOLDS.moderate) {
    return 'moderate';
  }
  if (value >= STRESS_SEVERITY_THRESHOLDS.mild) {
    return 'mild';
  }

  if (level === 'high') {
    return 'severe';
  }
  if (level === 'moderate') {
    return 'moderate';
  }

  return null;
}


