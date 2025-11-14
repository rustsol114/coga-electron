import type { InterventionCallback, DismissCallback } from '../types';
import type { InterventionStartOptions } from './types';
import { INTERVENTION_DEFINITIONS } from '../config/interventions';
import { ensureBaseStyles, injectScopedStyles } from './sharedStyles';

const STYLE_ID = 'coga-micro-break-styles';

const MICRO_BREAK_STYLES = `
  .coga-micro-card {
    width: 100vw;
    height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 40px;
    padding: 60px;
    background: rgba(15, 23, 42, 0.96);
    border-radius: 0;
    color: #e2e8f0;
    box-shadow: none;
  }

  .coga-micro-left h3 {
    margin: 0;
    font-size: 2rem;
    font-weight: 600;
    color: #f8fafc;
    text-align: center;
  }

  .coga-micro-left p {
    margin: 10px 0 20px;
    color: rgba(226, 232, 240, 0.78);
    font-size: 1.1rem;
    line-height: 1.6;
    text-align: center;
  }

  .coga-micro-steps {
    display: flex;
    flex-wrap: wrap;
    gap: 20px;
    justify-content: center;
    max-width: 900px;
  }

  .coga-micro-step {
    background: rgba(30, 41, 59, 0.85);
    border-radius: 20px;
    padding: 24px;
    border: 1px solid rgba(148, 163, 184, 0.25);
    flex: 1 1 250px;
    max-width: 280px;
  }

  .coga-micro-step h4 {
    margin: 0;
    font-size: 1.15rem;
    font-weight: 600;
    color: #f1f5f9;
  }

  .coga-micro-step p {
    margin: 6px 0 0;
    font-size: 1rem;
    color: rgba(226, 232, 240, 0.78);
  }

  .coga-micro-stage {
    background: rgba(30, 41, 59, 0.9);
    border-radius: 24px;
    padding: 40px;
    border: 1px solid rgba(148, 163, 184, 0.25);
    display: flex;
    flex-direction: column;
    gap: 20px;
    text-align: center;
    min-width: 400px;
  }

  .coga-micro-phase {
    font-size: 1.1rem;
    font-weight: 600;
    color: rgba(226, 232, 240, 0.85);
  }

  .coga-micro-phase-title {
    font-size: 1.75rem;
    font-weight: 700;
    color: #f8fafc;
  }

  .coga-micro-timer {
    font-size: 4rem;
    font-weight: 700;
    color: #38bdf8;
  }

  .coga-micro-actions {
    display: flex;
    gap: 16px;
    justify-content: center;
    margin-top: 20px;
  }

  .coga-micro-actions button {
    border-radius: 16px;
    border: none;
    padding: 14px 28px;
    font-weight: 600;
    cursor: pointer;
    font-size: 1rem;
    min-width: 140px;
  }

  .coga-micro-actions button.primary {
    background: linear-gradient(135deg, #22d3ee, #2563eb);
    color: #0f172a;
  }

  .coga-micro-actions button.secondary {
    background: rgba(226, 232, 240, 0.15);
    color: rgba(226, 232, 240, 0.85);
  }

  .coga-micro-toggle {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.85rem;
    color: rgba(226, 232, 240, 0.75);
    margin-bottom: 12px;
  }

  .coga-micro-toggle input {
    accent-color: #38bdf8;
  }
`;

interface BreakPhase {
  label: string;
  description: string;
  duration: number;
}

class MicroBreak {
  private container: HTMLElement | null = null;
  private onComplete: InterventionCallback | null = null;
  private onDismiss: DismissCallback | null = null;
  private onStarted: ((ts: number) => void) | null = null;
  private startTime: number | null = null;
  private intervalId: number | null = null;
  private phases: BreakPhase[] = [];
  private phaseIndex = 0;
  private phaseStart: number | null = null;
  private audioEnabled = false;
  private audioContext: AudioContext | null = null;
  private readonly metadata = INTERVENTION_DEFINITIONS.microBreak;

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
      this.buildPhases();

      ensureBaseStyles();
      injectScopedStyles(STYLE_ID, MICRO_BREAK_STYLES);

      if (options.autoStart) {
        this.renderSession();
        this.beginSession();
      } else {
        this.renderPrompt();
      }
    } catch (error) {
      console.error('[COGA] Error starting micro-break:', error);
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
    const phases = this.metadata.timing.phases ?? [];
    if (phases.length) {
      this.phases = phases.map((phase) => ({
        label: phase.label,
        description: phase.description ?? '',
        duration: phase.durationSeconds,
      }));
    } else {
      this.phases = [
        { label: 'Breathe + Reset', description: 'Deep diaphragmatic breathing.', duration: 60 },
        { label: 'Stretch + Posture', description: 'Gentle shoulder and neck stretches.', duration: 60 },
        { label: 'Move + Hydrate', description: 'Walk, hydrate, or reset your space.', duration: 60 },
      ];
    }
    this.phaseIndex = 0;
  }

  private renderPrompt(): void {
    this.cleanup();

    const overlay = document.createElement('div');
    overlay.className = 'coga-int-overlay';

    const card = document.createElement('div');
    card.className = 'coga-micro-card';

    const left = document.createElement('div');
    left.className = 'coga-micro-left';
    left.innerHTML = `
      <h3>3-minute reset</h3>
      <p>Let’s step away together: breathe, stretch, and move. You’ll come back with a calmer baseline.</p>
    `;

    const stepsList = document.createElement('div');
    stepsList.className = 'coga-micro-steps';
    this.phases.forEach((phase) => {
      const item = document.createElement('div');
      item.className = 'coga-micro-step';
      item.innerHTML = `<h4>${phase.label}</h4><p>${phase.description}</p>`;
      stepsList.appendChild(item);
    });
    left.appendChild(stepsList);

    const right = document.createElement('div');
    right.className = 'coga-micro-stage';

    const toggle = document.createElement('label');
    toggle.className = 'coga-micro-toggle';
    toggle.innerHTML = `
      <input type="checkbox" id="coga-micro-audio" />
      Add soft chime at phase changes
    `;
    right.appendChild(toggle);

    const actions = document.createElement('div');
    actions.className = 'coga-micro-actions';

    const skip = document.createElement('button');
    skip.className = 'secondary';
    skip.type = 'button';
    skip.textContent = 'Skip';
    skip.addEventListener('click', () => this.dismiss());

    const start = document.createElement('button');
    start.className = 'primary';
    start.type = 'button';
    start.textContent = 'Start guided break';
    start.addEventListener('click', () => this.beginSession());

    actions.appendChild(skip);
    actions.appendChild(start);
    right.appendChild(actions);

    card.appendChild(left);
    card.appendChild(right);
    overlay.appendChild(card);
    document.body.appendChild(overlay);
    this.container = overlay;

    const audioToggle = document.getElementById('coga-micro-audio') as HTMLInputElement | null;
    if (audioToggle) {
      audioToggle.addEventListener('change', () => {
        this.audioEnabled = audioToggle.checked;
      });
    }
  }

  private renderSession(): void {
    this.cleanup();

    const overlay = document.createElement('div');
    overlay.className = 'coga-int-overlay';

    const card = document.createElement('div');
    card.className = 'coga-micro-card';

    const left = document.createElement('div');
    left.className = 'coga-micro-left';
    left.innerHTML = `
      <h3>Guided micro-break</h3>
      <p id="coga-micro-phase-description">${this.phases[0]?.description ?? ''}</p>
      <div class="coga-int-progress-track">
        <div class="coga-int-progress-fill" id="coga-micro-progress"></div>
      </div>
    `;

    const right = document.createElement('div');
    right.className = 'coga-micro-stage';
    right.innerHTML = `
      <div class="coga-micro-phase" id="coga-micro-phase-step"></div>
      <div class="coga-micro-phase-title" id="coga-micro-phase-title"></div>
      <div class="coga-micro-timer" id="coga-micro-timer"></div>
    `;

    const actions = document.createElement('div');
    actions.className = 'coga-micro-actions';

    const skip = document.createElement('button');
    skip.className = 'secondary';
    skip.type = 'button';
    skip.textContent = 'Skip';
    skip.addEventListener('click', () => this.dismiss());

    const done = document.createElement('button');
    done.className = 'primary';
    done.type = 'button';
    done.textContent = 'Resume work';
    done.addEventListener('click', () => this.complete());

    actions.appendChild(skip);
    actions.appendChild(done);
    right.appendChild(actions);

    card.appendChild(left);
    card.appendChild(right);
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
    this.intervalId = window.setInterval(() => this.updatePhase(false), 250);
  }

  private updatePhase(initial: boolean): void {
    if (this.phaseIndex >= this.phases.length || !this.phaseStart || !this.startTime) {
      this.complete();
      return;
    }

    const phase = this.phases[this.phaseIndex];
    const now = Date.now();
    const elapsedPhase = (now - this.phaseStart) / 1000;
    const remaining = Math.max(0, phase.duration - elapsedPhase);
    const elapsedTotal = (now - this.startTime) / 1000;

    const stepEl = document.getElementById('coga-micro-phase-step');
    const titleEl = document.getElementById('coga-micro-phase-title');
    const descEl = document.getElementById('coga-micro-phase-description');
    const timerEl = document.getElementById('coga-micro-timer');
    const progressEl = document.getElementById('coga-micro-progress') as HTMLElement | null;

    if (!stepEl || !titleEl || !descEl || !timerEl || !progressEl) {
      this.complete();
      return;
    }

    stepEl.textContent = `Step ${this.phaseIndex + 1} of ${this.phases.length}`;
    titleEl.textContent = phase.label;
    descEl.textContent = phase.description;
    timerEl.textContent = `${Math.ceil(remaining)}s`;

    const totalDuration = this.metadata.timing.totalSeconds;
    progressEl.style.width = `${Math.min(100, (elapsedTotal / totalDuration) * 100)}%`;

    if (!initial && remaining <= 0.2) {
      this.phaseIndex += 1;
      this.phaseStart = Date.now();
      if (this.audioEnabled) {
        this.playChime();
      }
    }
  }

  private notifyStarted(): void {
    if (this.onStarted && this.startTime) {
      try {
        this.onStarted(this.startTime);
      } catch (error) {
        console.error('[COGA] Error notifying micro-break start:', error);
      }
      this.onStarted = null;
    }
  }

  private playChime(): void {
    try {
      if (!this.audioContext) {
        this.audioContext = new AudioContext();
      }
      const ctx = this.audioContext;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(660, ctx.currentTime);
      gain.gain.setValueAtTime(0.001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.08, ctx.currentTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.6);
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.65);
    } catch (error) {
      console.warn('[COGA] Unable to play micro-break chime:', error);
    }
  }

  private complete(): void {
    try {
      this.clearTimer();
      const duration =
        this.startTime !== null ? Date.now() - this.startTime : this.metadata.timing.totalSeconds * 1000;
      this.cleanup();
      this.onComplete?.(duration);
    } catch (error) {
      console.error('[COGA] Error completing micro-break:', error);
    }
  }

  private dismiss(): void {
    try {
      this.clearTimer();
      this.cleanup();
      this.onDismiss?.();
    } catch (error) {
      console.error('[COGA] Error dismissing micro-break:', error);
    }
  }
}

export default MicroBreak;

