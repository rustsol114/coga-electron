export const ANNOYANCE_DEFAULTS = {
  cooldownMinutes: 8,
  maxPerHour: 2,
  maxPerDay: 6,
  autoSnoozeAfterDismissals: 2,
  snoozeMinutes: 3,
} as const;

export const ANNOYANCE_TIMINGS_MS = {
  cooldown: ANNOYANCE_DEFAULTS.cooldownMinutes * 60 * 1000,
  snooze: ANNOYANCE_DEFAULTS.snoozeMinutes * 60 * 1000,
};


