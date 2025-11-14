import type { InterventionCallback, DismissCallback } from '../types';
import type { InterventionStartOptions } from './types';
import { INTERVENTION_DEFINITIONS } from '../config/interventions';
import { ensureBaseStyles, injectScopedStyles } from './sharedStyles';

const STYLE_ID = 'coga-near-far-styles';

const NEAR_FAR_STYLES = `
  .coga-nearfar-card {
    width: 100vw;
    height: 100vh;
    background: #ffffff;
    border-radius: 0;
    padding: 60px;
    box-shadow: none;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 40px;
  }

  .coga-nearfar-header h3 {
    margin: 0;
    font-size: 1.85rem;
    font-weight: 600;
    color: #0f172a;
    text-align: center;
  }

  .coga-nearfar-header p {
    margin: 6px 0 0;
    color: #475569;
    font-size: 1.1rem;
    text-align: center;
  }

  .coga-nearfar-stage {
    background: rgba(226, 232, 240, 0.5);
    border-radius: 24px;
    padding: 40px;
    text-align: center;
    display: flex;
    flex-direction: column;
    gap: 24px;
    min-width: 500px;
  }

  .coga-nearfar-prompt {
    font-size: 1.75rem;
    font-weight: 600;
    color: #1d4ed8;
  }

  .coga-nearfar-description {
    margin: 0;
    color: #475569;
    font-size: 1.1rem;
  }

  .coga-nearfar-timer {
    font-size: 4rem;
    font-weight: 700;
    color: #2563eb;
  }

  .coga-nearfar-actions {
    display: flex;
    justify-content: center;
    gap: 16px;
    margin-top: 20px;
  }

  .coga-nearfar-actions button {
    border-radius: 16px;
    border: none;
    padding: 14px 28px;
    font-weight: 600;
    cursor: pointer;
    font-size: 1rem;
    min-width: 140px;
  }

  .coga-nearfar-actions button.primary {
    background: linear-gradient(135deg, #2563eb, #1d4ed8);
    color: #ffffff;
  }

  .coga-nearfar-actions button.secondary {
    background: rgba(226, 232, 240, 0.7);
    color: #0f172a;
  }
`;

interface FocusPhase {
  label: string;
  description: string;
  duration: number;
}

class NearFarFocusShift {
  private container: HTMLElement | null = null;
  private onComplete: InterventionCallback | null = null;
  private onDismiss: DismissCallback | null = null;
  private onStarted: ((ts: number) => void) | null = null;
  private intervalId: number | null = null;
  private phases: FocusPhase[] = [];
  private phaseIndex = 0;
  private startTime: number | null = null;
  private phaseStart: number | null = null;
  private readonly metadata = INTERVENTION_DEFINITIONS.nearFarFocusShift;

  start(
    onComplete: InterventionCallback,
    onDismiss: DismissCallback,
    options: InterventionStartOptions = {}
  ): void {
    try {
      this.onComplete = onComplete;
      this.onDismiss = onDismiss;
      this.onStarted = options.onStarted ?? null;
      this.startTime = null;
      this.phaseStart = null;
      this.phaseIndex = 0;
      this.clearTimer();

      ensureBaseStyles();
      injectScopedStyles(STYLE_ID, NEAR_FAR_STYLES);

      this.buildPhases();

      if (options.autoStart) {
        this.renderSession();
        this.beginSession();
      } else {
        this.renderPrompt();
      }
    } catch (error) {
      console.error('[COGA] Error starting near-far focus shift:', error);
      this.cleanup();
    }
  }

  cleanup(): void {
    this.clearTimer();
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
    this.container = null;
  }

  private clearTimer(): void {
    if (this.intervalId) {
      window.clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private buildPhases(): void {
    const phasesConfig = this.metadata.timing.phases ?? [
      { id: 'near', label: 'Look Near', durationSeconds: 5, description: 'Focus on something within arm’s reach.' },
      { id: 'far', label: 'Look Far', durationSeconds: 5, description: 'Shift focus to an object 20+ feet away.' },
    ];

    const cycles = this.metadata.timing.cycleCount ?? 4;
    const phases: FocusPhase[] = [];

    for (let c = 0; c < cycles; c += 1) {
      for (const phase of phasesConfig) {
        phases.push({
          label: phase.label,
          description: phase.description ?? '',
          duration: phase.durationSeconds,
        });
      }
    }

    if (phases.length === 0) {
      phases.push({
        label: 'Look Near',
        description: 'Focus on your fingertip 30 cm away.',
        duration: 5,
      });
      phases.push({
        label: 'Look Far',
        description: 'Shift gaze to a window or distant object.',
        duration: 5,
      });
    }

    this.phases = phases;
    this.phaseIndex = 0;
  }

  private renderPrompt(): void {
    this.cleanup();

    const overlay = document.createElement('div');
    overlay.className = 'coga-int-overlay';

    const card = document.createElement('div');
    card.className = 'coga-nearfar-card';

    const header = document.createElement('div');
    header.className = 'coga-nearfar-header';
    header.innerHTML = `
      <h3>Near–Far focus shift</h3>
      <p>Alternate your gaze between something near and far to relax ciliary muscles and ease screen strain.</p>
    `;

    const actions = document.createElement('div');
    actions.className = 'coga-nearfar-actions';

    const skip = document.createElement('button');
    skip.className = 'secondary';
    skip.type = 'button';
    skip.textContent = 'Skip';
    skip.addEventListener('click', () => this.dismiss());

    const start = document.createElement('button');
    start.className = 'primary';
    start.type = 'button';
    start.textContent = 'Begin cycle';
    start.addEventListener('click', () => this.beginSession());

    actions.appendChild(skip);
    actions.appendChild(start);

    card.appendChild(header);
    card.appendChild(actions);
    overlay.appendChild(card);
    document.body.appendChild(overlay);
    this.container = overlay;
  }

  private renderSession(): void {
    this.cleanup();

    const overlay = document.createElement('div');
    overlay.className = 'coga-int-overlay';

    const card = document.createElement('div');
    card.className = 'coga-nearfar-card';

    const header = document.createElement('div');
    header.className = 'coga-nearfar-header';
    header.innerHTML = `
      <h3>Alternate focus</h3>
      <p>Follow the prompts — near for a few seconds, then far. Stay relaxed and blink normally.</p>
    `;

    const stage = document.createElement('div');
    stage.className = 'coga-nearfar-stage';
    stage.innerHTML = `
      <div class="coga-nearfar-prompt" id="coga-nearfar-prompt"></div>
      <p class="coga-nearfar-description" id="coga-nearfar-description"></p>
      <div class="coga-nearfar-timer" id="coga-nearfar-timer"></div>
    `;

    const actions = document.createElement('div');
    actions.className = 'coga-nearfar-actions';

    const skip = document.createElement('button');
    skip.className = 'secondary';
    skip.type = 'button';
    skip.textContent = 'Skip';
    skip.addEventListener('click', () => this.dismiss());

    actions.appendChild(skip);

    card.appendChild(header);
    card.appendChild(stage);
    card.appendChild(actions);
    overlay.appendChild(card);
    document.body.appendChild(overlay);
    this.container = overlay;
  }

  private beginSession(): void {
    this.renderSession();
    this.startTime = Date.now();
    this.phaseStart = this.startTime;
    this.phaseIndex = 0;
    this.notifyStarted();
    this.updatePhase(true);
    this.intervalId = window.setInterval(() => this.updatePhase(false), 200);
  }

  private updatePhase(initial: boolean): void {
    if (this.phaseIndex >= this.phases.length || !this.phaseStart || !this.startTime) {
      this.complete();
      return;
    }

    const now = Date.now();
    const phase = this.phases[this.phaseIndex];
    const elapsed = (now - this.phaseStart) / 1000;
    const remaining = Math.max(0, phase.duration - elapsed);

    const promptEl = document.getElementById('coga-nearfar-prompt');
    const descEl = document.getElementById('coga-nearfar-description');
    const timerEl = document.getElementById('coga-nearfar-timer');

    if (!promptEl || !descEl || !timerEl) {
      this.complete();
      return;
    }

    promptEl.textContent = phase.label;
    descEl.textContent = phase.description;
    timerEl.textContent = String(Math.ceil(remaining));

    if (!initial && remaining <= 0.2) {
      this.phaseIndex += 1;
      this.phaseStart = Date.now();
      if (this.phaseIndex >= this.phases.length) {
        this.complete();
      }
    }
  }

  private notifyStarted(): void {
    if (this.onStarted && this.startTime) {
      try {
        this.onStarted(this.startTime);
      } catch (error) {
        console.error('[COGA] Error notifying near-far start:', error);
      }
      this.onStarted = null;
    }
  }

  private complete(): void {
    try {
      this.clearTimer();
      const totalDuration = this.metadata.timing.totalSeconds * 1000;
      const duration = this.startTime ? Date.now() - this.startTime : totalDuration;
      this.cleanup();
      this.onComplete?.(duration);
    } catch (error) {
      console.error('[COGA] Error completing near-far focus shift:', error);
    }
  }

  private dismiss(): void {
    try {
      this.clearTimer();
      this.cleanup();
      this.onDismiss?.();
    } catch (error) {
      console.error('[COGA] Error dismissing near-far focus shift:', error);
    }
  }
}

export default NearFarFocusShift;

