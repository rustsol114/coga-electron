import type { InterventionCallback, DismissCallback } from '../types';
import type { InterventionStartOptions } from './types';
import { INTERVENTION_DEFINITIONS } from '../config/interventions';
import { ensureBaseStyles, injectScopedStyles } from './sharedStyles';

const STYLE_ID = 'coga-twenty-twenty-gaze-styles';

const GAZE_STYLES = `
  .coga-gaze-card {
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
    text-align: center;
  }

  .coga-gaze-card h3 {
    margin: 0;
    font-size: 1.75rem;
    font-weight: 600;
    color: #0f172a;
  }

  .coga-gaze-card p {
    margin: 0;
    color: #475569;
    font-size: 1.1rem;
  }

  .coga-gaze-actions {
    display: flex;
    gap: 16px;
    justify-content: center;
    margin-top: 20px;
  }

  .coga-gaze-actions button {
    border-radius: 16px;
    border: none;
    padding: 14px 28px;
    font-weight: 600;
    cursor: pointer;
    font-size: 1rem;
    min-width: 140px;
  }

  .coga-gaze-actions button.primary {
    background: linear-gradient(135deg, #2563eb, #1d4ed8);
    color: #ffffff;
  }

  .coga-gaze-actions button.secondary {
    background: rgba(226, 232, 240, 0.7);
    color: #0f172a;
  }

  .coga-gaze-stage {
    display: flex;
    flex-direction: column;
    gap: 24px;
    background: rgba(226, 232, 240, 0.4);
    padding: 40px;
    border-radius: 24px;
  }

  .coga-gaze-timer {
    font-size: 4.5rem;
    font-weight: 700;
    color: #2563eb;
  }
`;

class TwentyTwentyGaze {
  private container: HTMLElement | null = null;
  private onComplete: InterventionCallback | null = null;
  private onDismiss: DismissCallback | null = null;
  private onStarted: ((ts: number) => void) | null = null;
  private intervalId: number | null = null;
  private startTime: number | null = null;
  private readonly metadata = INTERVENTION_DEFINITIONS.twentyTwentyGaze;

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
      this.clearTimer();

      ensureBaseStyles();
      injectScopedStyles(STYLE_ID, GAZE_STYLES);

      if (options.autoStart) {
        this.renderSession();
        this.beginSession();
      } else {
        this.renderPrompt();
      }
    } catch (error) {
      console.error('[COGA] Error starting 20-20-20 gaze intervention:', error);
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

    const card = document.createElement('div');
    card.className = 'coga-gaze-card';
    card.innerHTML = `
      <h3>Give your eyes a quick reset</h3>
      <p>Look 20 feet away for 20 seconds to reduce digital eye strain and relax your focus.</p>
    `;

    const actions = document.createElement('div');
    actions.className = 'coga-gaze-actions';

    const skip = document.createElement('button');
    skip.className = 'secondary';
    skip.type = 'button';
    skip.textContent = 'Maybe later';
    skip.addEventListener('click', () => this.dismiss());

    const start = document.createElement('button');
    start.className = 'primary';
    start.type = 'button';
    start.textContent = 'Start 20-20-20';
    start.addEventListener('click', () => this.beginSession());

    actions.appendChild(skip);
    actions.appendChild(start);

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
    card.className = 'coga-gaze-card';

    card.innerHTML = `
      <h3>Focus 20 feet away</h3>
      <p>Softly rest your gaze on a distant object. Blink and breathe naturally.</p>
    `;

    const stage = document.createElement('div');
    stage.className = 'coga-gaze-stage';

    const timer = document.createElement('div');
    timer.className = 'coga-gaze-timer';
    timer.id = 'coga-gaze-timer';
    timer.textContent = '20';

    const tip = document.createElement('p');
    tip.textContent = 'Tap "Done" if you finish early.';

    stage.appendChild(timer);
    stage.appendChild(tip);

    const actions = document.createElement('div');
    actions.className = 'coga-gaze-actions';

    const skip = document.createElement('button');
    skip.className = 'secondary';
    skip.type = 'button';
    skip.textContent = 'Skip';
    skip.addEventListener('click', () => this.dismiss());

    const done = document.createElement('button');
    done.className = 'primary';
    done.type = 'button';
    done.textContent = 'Done';
    done.addEventListener('click', () => this.complete());

    actions.appendChild(skip);
    actions.appendChild(done);

    card.appendChild(stage);
    card.appendChild(actions);

    overlay.appendChild(card);
    document.body.appendChild(overlay);
    this.container = overlay;
  }

  private beginSession(): void {
    this.renderSession();
    this.startTime = Date.now();
    this.notifyStarted();
    this.updateTimer(true);
    this.intervalId = window.setInterval(() => this.updateTimer(false), 250);
  }

  private updateTimer(initial: boolean): void {
    if (!this.startTime) {
      this.complete();
      return;
    }
    const timerEl = document.getElementById('coga-gaze-timer');
    if (!timerEl) {
      this.complete();
      return;
    }
    const total = this.metadata.timing.totalSeconds;
    const elapsed = (Date.now() - this.startTime) / 1000;
    const remaining = Math.max(0, total - elapsed);
    timerEl.textContent = String(Math.ceil(remaining));
    if (!initial && remaining <= 0) {
      this.complete();
    }
  }

  private notifyStarted(): void {
    if (this.onStarted && this.startTime) {
      try {
        this.onStarted(this.startTime);
      } catch (error) {
        console.error('[COGA] Error notifying gaze start:', error);
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
      console.error('[COGA] Error completing 20-20-20 gaze:', error);
    }
  }

  private dismiss(): void {
    try {
      this.clearTimer();
      this.cleanup();
      this.onDismiss?.();
    } catch (error) {
      console.error('[COGA] Error dismissing 20-20-20 gaze:', error);
    }
  }
}

export default TwentyTwentyGaze;

