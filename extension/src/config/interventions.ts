import type { InterventionKey, StressSeverity } from '../types';

export type InterventionCategory = 'breathwork' | 'oculomotor' | 'break';

export interface InterventionPhase {
  id: string;
  label: string;
  durationSeconds: number;
  description?: string;
}

export interface InterventionTiming {
  totalSeconds: number;
  inhaleSeconds?: number;
  exhaleSeconds?: number;
  holdSeconds?: number;
  pattern?: number[];
  cycleCount?: number;
  phases?: InterventionPhase[];
  minSeconds?: number;
  maxSeconds?: number;
}

export interface InterventionDefinition {
  id: string;
  key: InterventionKey;
  name: string;
  releaseVersion: string;
  category: InterventionCategory;
  modality: {
    visual: boolean;
    audio?: 'optional' | 'required' | 'none';
  };
  description: string;
  severityTargets: StressSeverity[];
  timing: InterventionTiming;
  layout: 'corner' | 'modal' | 'fullscreen' | 'inline';
}

export const INTERVENTION_DEFINITIONS: Record<InterventionKey, InterventionDefinition> = {
  oneBreathReset: {
    id: 'BR-01',
    key: 'oneBreathReset',
    name: 'One-Breath Reset',
    releaseVersion: 'V0+',
    category: 'breathwork',
    modality: {
      visual: true,
    },
    description:
      'A single deep inhale followed by a long, slow exhale to quickly reset autonomic balance. Minimal UI overlay that can sit unobtrusively in a page corner.',
    severityTargets: ['mild', 'moderate'],
    timing: {
      totalSeconds: 10,
      inhaleSeconds: 4,
      exhaleSeconds: 6,
      minSeconds: 8,
      maxSeconds: 12,
    },
    layout: 'corner',
  },
  boxBreathing: {
    id: 'BR-02',
    key: 'boxBreathing',
    name: 'Box Breathing (4-4-4-4)',
    releaseVersion: 'V0+',
    category: 'breathwork',
    modality: {
      visual: true,
      audio: 'optional',
    },
    description:
      'Guided box breathing pattern with expanding/contracting visual cues. Suitable for moderate to severe stress spikes.',
    severityTargets: ['moderate', 'severe'],
    timing: {
      totalSeconds: 60,
      pattern: [4, 4, 4, 4],
      cycleCount: 4,
    },
    layout: 'modal',
  },
  twentyTwentyGaze: {
    id: 'OC-01',
    key: 'twentyTwentyGaze',
    name: '20-20-20 Gaze',
    releaseVersion: 'V0+',
    category: 'oculomotor',
    modality: {
      visual: true,
    },
    description: 'Prompt to look 20 feet away for 20 seconds to reduce eye strain.',
    severityTargets: ['mild', 'moderate'],
    timing: {
      totalSeconds: 20,
    },
    layout: 'corner',
  },
  figureEightSmoothPursuit: {
    id: 'OC-02',
    key: 'figureEightSmoothPursuit',
    name: 'Figure-8 Smooth Pursuit',
    releaseVersion: 'V1+',
    category: 'oculomotor',
    modality: {
      visual: true,
    },
    description:
      'Transparent overlay with a gentle figure-eight path inviting smooth pursuit eye movements to relax ocular muscles.',
    severityTargets: ['moderate'],
    timing: {
      totalSeconds: 30,
    },
    layout: 'fullscreen',
  },
  nearFarFocusShift: {
    id: 'OC-03',
    key: 'nearFarFocusShift',
    name: 'Near-Far Focus Shift',
    releaseVersion: 'V0+',
    category: 'oculomotor',
    modality: {
      visual: true,
    },
    description:
      'Alternating prompts to shift focus between near and far objects to relax ciliary muscles and reduce digital eye strain.',
    severityTargets: ['moderate'],
    timing: {
      totalSeconds: 40,
      phases: [
        { id: 'near', label: 'Look Near', durationSeconds: 5, description: 'Focus on something within arm’s reach.' },
        { id: 'far', label: 'Look Far', durationSeconds: 5, description: 'Shift focus to an object 20+ feet away.' },
      ],
      cycleCount: 4,
    },
    layout: 'modal',
  },
  microBreak: {
    id: 'BRK-01',
    key: 'microBreak',
    name: '3-Minute Micro-Break',
    releaseVersion: 'V2+',
    category: 'break',
    modality: {
      visual: true,
      audio: 'optional',
    },
    description:
      'Full-screen split overlay guiding a short breathing, stretch, and movement break. Includes optional chime and resume button.',
    severityTargets: ['severe'],
    timing: {
      totalSeconds: 180,
      phases: [
        { id: 'breathe', label: 'Breathe + Reset', durationSeconds: 60, description: 'Deep diaphragmatic breathing.' },
        { id: 'stretch', label: 'Stretch + Posture', durationSeconds: 60, description: 'Gentle shoulder and neck stretches.' },
        { id: 'move', label: 'Move + Hydrate', durationSeconds: 60, description: 'Walk, hydrate, or reset your space.' },
      ],
    },
    layout: 'fullscreen',
  },
};

export const INTERVENTION_SEVERITY_PRIORITY: Record<StressSeverity, InterventionKey[]> = {
  mild: ['oneBreathReset', 'twentyTwentyGaze'],
  moderate: ['twentyTwentyGaze', 'oneBreathReset', 'boxBreathing', 'figureEightSmoothPursuit', 'nearFarFocusShift'],
  severe: ['microBreak', 'boxBreathing', 'nearFarFocusShift'],
};


