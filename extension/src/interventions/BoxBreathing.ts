import type { InterventionCallback, DismissCallback } from '../types';
import type { InterventionStartOptions } from './types';
import { INTERVENTION_DEFINITIONS } from '../config/interventions';
import { ensureBaseStyles, injectScopedStyles } from './sharedStyles';

const STYLE_ID = 'coga-box-breathing-styles';

const BOX_BREATHING_STYLES = `
  .coga-box-card {
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
    gap: 32px;
  }

  .coga-box-header h3 {
    margin: 0;
    font-size: 1.42rem;
    font-weight: 600;
    color: #0f172a;
  }

  .coga-box-header p {
    margin: 6px 0 0;
    color: #475569;
    font-size: 0.96rem;
  }

  .coga-box-stage {
    display: flex;
    flex-direction: column;
    gap: 40px;
    align-items: center;
    width: 100%;
  }

  .coga-box-square {
    width: 280px;
    height: 280px;
    margin: 0 auto;
    border-radius: 32px;
    border: 8px solid rgba(59, 130, 246, 0.6);
    position: relative;
    background: rgba(241, 245, 249, 0.78);
    box-shadow: inset 0 0 0 3px rgba(59, 130, 246, 0.18);
    transition: transform var(--phase-duration, 0.6s) ease, border-color var(--phase-duration, 0.6s) ease;
    transform-origin: center;
  }

  .coga-box-square::after {
    content: '';
    position: absolute;
    inset: 20px;
    border-radius: inherit;
    background: radial-gradient(circle at 25% 25%, rgba(56, 189, 248, 0.32), transparent 70%);
    pointer-events: none;
  }

  .coga-box-square[data-state='inhale'] {
    transform: scale(1.08);
    border-color: rgba(37, 99, 235, 0.92);
  }

  .coga-box-square[data-state='hold-in'] {
    transform: scale(1.08);
    border-color: rgba(37, 99, 235, 0.92);
  }

  .coga-box-square[data-state='exhale'] {
    transform: scale(0.82);
    border-color: rgba(56, 189, 248, 0.55);
  }

  .coga-box-square[data-state='hold-out'] {
    transform: scale(0.82);
    border-color: rgba(56, 189, 248, 0.55);
  }

  .coga-box-guidance {
    display: flex;
    flex-direction: column;
    gap: 16px;
    align-items: center;
    text-align: center;
  }

  .coga-box-guidance h4 {
    margin: 0;
    font-size: 1.15rem;
    font-weight: 600;
    color: #0f172a;
  }

  .coga-box-phase {
    font-size: 1.85rem;
    font-weight: 700;
    color: #2563eb;
  }

  .coga-box-countdown {
    font-size: 4rem;
    font-weight: 700;
    color: #1d4ed8;
  }

  .coga-box-progress {
    margin-top: 10px;
  }

  .coga-box-actions {
    display: flex;
    justify-content: center;
    gap: 16px;
    margin-top: 20px;
  }

  .coga-box-actions button {
    border-radius: 16px;
    border: none;
    padding: 14px 28px;
    font-weight: 600;
    cursor: pointer;
    font-size: 1rem;
    min-width: 140px;
  }

  .coga-box-actions button.primary {
    background: linear-gradient(135deg, #2563eb, #1d4ed8);
    color: #ffffff;
    box-shadow: 0 16px 32px rgba(37, 99, 235, 0.24);
  }

  .coga-box-actions button.secondary {
    background: rgba(226, 232, 240, 0.7);
    color: #0f172a;
  }
`;

interface PhaseStep {
  label: string;
  duration: number;
  state: 'inhale' | 'hold-in' | 'exhale' | 'hold-out';
}

class BoxBreathing {
  private container: HTMLElement | null = null;
  private onComplete: InterventionCallback | null = null;
  private onDismiss: DismissCallback | null = null;
  private onStarted: ((ts: number) => void) | null = null;
  private intervalId: number | null = null;
  private startTime: number | null = null;
  private phaseIndex = 0;
  private phases: PhaseStep[] = [];
  private phaseStart: number | null = null;
  private readonly metadata = INTERVENTION_DEFINITIONS.boxBreathing;

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
      this.phaseIndex = 0;
      this.phaseStart = null;
      this.clearTimer();

      ensureBaseStyles();
      injectScopedStyles(STYLE_ID, BOX_BREATHING_STYLES);

      if (options.autoStart) {
        this.renderSession();
        this.beginSession();
      } else {
        this.renderPrompt();
      }
    } catch (error) {
      console.error('[COGA] Error starting box breathing:', error);
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

  private renderPrompt(): void {
    this.cleanup();

    const overlay = document.createElement('div');
    overlay.className = 'coga-int-overlay';
    overlay.dataset.variant = 'dimmer';

    const card = document.createElement('div');
    card.className = 'coga-box-card';

    const header = document.createElement('div');
    header.className = 'coga-box-header';
    header.innerHTML = `
      <h3>Reset with box breathing</h3>
      <p>We detected a stress spike. Take 60 seconds to follow the 4-4-4-4 rhythm and rebalance.</p>
    `;

    const actions = document.createElement('div');
    actions.className = 'coga-box-actions';

    const dismiss = document.createElement('button');
    dismiss.className = 'secondary';
    dismiss.type = 'button';
    dismiss.textContent = 'Skip';
    dismiss.addEventListener('click', () => this.dismiss());

    const start = document.createElement('button');
    start.className = 'primary';
    start.type = 'button';
    start.textContent = 'Start breathing';
    start.addEventListener('click', () => this.beginSession());

    actions.appendChild(dismiss);
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
    overlay.dataset.variant = 'dimmer';

    const card = document.createElement('div');
    card.className = 'coga-box-card';

    const header = document.createElement('div');
    header.className = 'coga-box-header';
    header.innerHTML = `
      <h3>Box Breathing (4-4-4-4)</h3>
      <p>Inhale → Hold → Exhale → Hold. Let the square guide your cadence.</p>
    `;

    const stage = document.createElement('div');
    stage.className = 'coga-box-stage';

    const square = document.createElement('div');
    square.className = 'coga-box-square';
    square.id = 'coga-box-square';

    const guidance = document.createElement('div');
    guidance.className = 'coga-box-guidance';
    guidance.innerHTML = `
      <h4 id="coga-box-cycle"></h4>
      <div class="coga-box-phase" id="coga-box-phase"></div>
      <div class="coga-box-countdown" id="coga-box-countdown"></div>
      <div class="coga-int-progress-track coga-box-progress">
        <div class="coga-int-progress-fill" id="coga-box-progress"></div>
      </div>
      <p id="coga-box-tip"></p>
    `;

    stage.appendChild(square);
    stage.appendChild(guidance);

    const actions = document.createElement('div');
    actions.className = 'coga-box-actions';

    const dismiss = document.createElement('button');
    dismiss.className = 'secondary';
    dismiss.type = 'button';
    dismiss.textContent = 'Skip';
    dismiss.addEventListener('click', () => this.dismiss());

    actions.appendChild(dismiss);

    card.appendChild(header);
    card.appendChild(stage);
    card.appendChild(actions);
    overlay.appendChild(card);
    document.body.appendChild(overlay);
    this.container = overlay;
  }

  private buildPhases(): void {
    const pattern = this.metadata.timing.pattern ?? [4, 4, 4, 4];
    const labels: Array<PhaseStep> = [
      { label: 'Inhale', duration: pattern[0], state: 'inhale' },
      { label: 'Hold', duration: pattern[1], state: 'hold-in' },
      { label: 'Exhale', duration: pattern[2], state: 'exhale' },
      { label: 'Hold', duration: pattern[3], state: 'hold-out' },
    ];

    const totalSeconds = this.metadata.timing.totalSeconds;
    const schedule: PhaseStep[] = [];

    let elapsed = 0;
    while (elapsed < totalSeconds) {
      for (const phase of labels) {
        const remaining = totalSeconds - elapsed;
        if (remaining <= 0) break;
        schedule.push({
          label: phase.label,
          state: phase.state,
          duration: Math.min(phase.duration, remaining),
        });
        elapsed += phase.duration;
      }
    }

    if (schedule.length === 0) {
      schedule.push({ label: 'Inhale', duration: 4, state: 'inhale' });
    }

    this.phases = schedule;
    this.phaseIndex = 0;
  }

  private beginSession(): void {
    this.renderSession();
    this.buildPhases();
    this.startTime = Date.now();
    this.phaseStart = this.startTime;
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
    const totalDuration = this.metadata.timing.totalSeconds;
    const phase = this.phases[this.phaseIndex];
    const elapsedPhase = (now - this.phaseStart) / 1000;
    const remainingPhase = Math.max(0, phase.duration - elapsedPhase);
    const elapsedTotal = (now - this.startTime) / 1000;

    const square = document.getElementById('coga-box-square');
    const cycleEl = document.getElementById('coga-box-cycle');
    const phaseEl = document.getElementById('coga-box-phase');
    const countdownEl = document.getElementById('coga-box-countdown');
    const tipEl = document.getElementById('coga-box-tip');
    const progressEl = document.getElementById('coga-box-progress') as HTMLElement | null;

    if (!square || !cycleEl || !phaseEl || !countdownEl || !tipEl || !progressEl) {
      this.complete();
      return;
    }

    square.dataset.state = phase.state;
    square.style.setProperty('--phase-duration', `${Math.max(0.2, phase.duration)}s`);
    phaseEl.textContent = phase.label;
    countdownEl.textContent = String(Math.ceil(remainingPhase));
    progressEl.style.width = `${Math.min(100, (elapsedTotal / totalDuration) * 100)}%`;

    const totalCycles = Math.ceil(this.phases.length / 4);
    const currentCycle = Math.min(totalCycles, Math.floor(this.phaseIndex / 4) + 1);
    cycleEl.textContent = `Cycle ${currentCycle} of ${totalCycles}`;

    if (phase.state === 'inhale') {
      tipEl.textContent = 'Draw a slow, even breath through your nose.';
    } else if (phase.state === 'exhale') {
      tipEl.textContent = 'Release gently through your mouth, letting tension fall away.';
    } else {
      tipEl.textContent = 'Hold softly. Keep your shoulders relaxed.';
    }

    if (!initial && remainingPhase <= 0.25) {
      this.phaseIndex += 1;
      this.phaseStart = Date.now();
    }

    if (elapsedTotal >= totalDuration) {
      this.complete();
    }
  }

  private notifyStarted(): void {
    if (this.onStarted && this.startTime) {
      try {
        this.onStarted(this.startTime);
      } catch (error) {
        console.error('[COGA] Error notifying box breathing start:', error);
      }
      this.onStarted = null;
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
      console.error('[COGA] Error completing box breathing:', error);
    }
  }

  private dismiss(): void {
    try {
      this.clearTimer();
      this.cleanup();
      this.onDismiss?.();
    } catch (error) {
      console.error('[COGA] Error dismissing box breathing:', error);
    }
  }
}

export default BoxBreathing;


