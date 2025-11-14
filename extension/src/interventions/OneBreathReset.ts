import type { InterventionCallback, DismissCallback } from '../types';
import type { InterventionStartOptions } from './types';
import { INTERVENTION_DEFINITIONS } from '../config/interventions';
import { ensureBaseStyles, injectScopedStyles } from './sharedStyles';

const STYLE_ID = 'coga-one-breath-reset-styles';

const ONE_BREATH_STYLES = `
  .coga-one-breath-card {
    width: 100vw;
    height: 100vh;
    padding: 48px;
    display: flex;
    flex-direction: column;
    gap: 32px;
    align-items: center;
    justify-content: center;
    background: linear-gradient(180deg, rgba(15, 23, 42, 0.98), rgba(15, 23, 42, 0.95));
    color: #e2e8f0;
    border-radius: 0;
    border: none;
    box-shadow: none;
    text-align: center;
  }

  .coga-one-breath-card h3 {
    margin: 0;
    font-size: 1.28rem;
    font-weight: 600;
    color: #f8fafc;
  }

  .coga-one-breath-card p {
    margin: 0;
    font-size: 0.95rem;
    color: rgba(226, 232, 240, 0.78);
    line-height: 1.5;
  }

  .coga-one-breath-circle {
    width: 220px;
    height: 220px;
    border-radius: 50%;
    margin: 0 auto;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #0f172a;
    font-weight: 600;
    font-size: 1.25rem;
    background: radial-gradient(circle at 30% 30%, rgba(125, 211, 252, 0.94), rgba(59, 130, 246, 0.62));
    box-shadow: 0 0 60px rgba(56, 189, 248, 0.55);
    transition: transform var(--breath-duration, 0.6s) ease, box-shadow var(--breath-duration, 0.6s) ease;
    transform-origin: center;
  }

  .coga-one-breath-circle[data-state='inhale'] {
    transform: scale(1.08);
  }

  .coga-one-breath-circle[data-state='exhale'] {
    transform: scale(0.82);
  }

  .coga-one-breath-timer {
    font-size: 0.9rem;
    color: rgba(226, 232, 240, 0.78);
    letter-spacing: 0.02em;
  }

  .coga-one-breath-actions {
    display: flex;
    gap: 12px;
    justify-content: center;
  }

  .coga-one-breath-actions button {
    min-width: 120px;
    border-radius: 999px;
    border: none;
    padding: 11px 18px;
    font-weight: 600;
    font-size: 0.95rem;
    cursor: pointer;
    transition: transform 0.15s ease, box-shadow 0.15s ease;
  }

  .coga-one-breath-start {
    background: linear-gradient(135deg, #38bdf8, #2563eb);
    color: #ffffff;
    box-shadow: 0 12px 24px rgba(37, 99, 235, 0.25);
  }

  .coga-one-breath-start:hover {
    transform: translateY(-1px);
    box-shadow: 0 16px 28px rgba(37, 99, 235, 0.28);
  }

  .coga-one-breath-dismiss {
    background: rgba(148, 163, 184, 0.15);
    color: rgba(226, 232, 240, 0.85);
  }
`;

class OneBreathReset {
  private container: HTMLElement | null = null;
  private onComplete: InterventionCallback | null = null;
  private onDismiss: DismissCallback | null = null;
  private onStarted: ((ts: number) => void) | null = null;
  private intervalId: number | null = null;
  private startTime: number | null = null;
  private isActive = false;
  private readonly metadata = INTERVENTION_DEFINITIONS.oneBreathReset;

  async start(
    onComplete: InterventionCallback,
    onDismiss: DismissCallback,
    options: InterventionStartOptions = {}
  ): Promise<void> {
    try {
      this.onComplete = onComplete;
      this.onDismiss = onDismiss;
      this.onStarted = options.onStarted ?? null;
      this.startTime = null;
      this.isActive = false;
      this.clearTimers();

      ensureBaseStyles();
      injectScopedStyles(STYLE_ID, ONE_BREATH_STYLES);

      if (options.autoStart) {
        this.renderSession();
        this.beginSession();
      } else {
        this.renderPrompt();
      }
    } catch (error) {
      console.error('[COGA] Error starting One-Breath Reset:', error);
      this.cleanup();
    }
  }

  cleanup(): void {
    this.clearTimers();
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
    this.container = null;
    this.isActive = false;
  }

  private clearTimers(): void {
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
    card.className = 'coga-one-breath-card';
    card.innerHTML = `
      <h3>Pause for one deep breath</h3>
      <p>Inhale slowly through your nose and exhale gently to reset your rhythm.</p>
      <p>We detected elevated stress signals — this will take about 10 seconds.</p>
    `;

    const actions = document.createElement('div');
    actions.className = 'coga-one-breath-actions';

    const dismissBtn = document.createElement('button');
    dismissBtn.className = 'coga-one-breath-dismiss';
    dismissBtn.type = 'button';
    dismissBtn.textContent = 'Maybe later';
    dismissBtn.addEventListener('click', () => this.dismiss());

    const startBtn = document.createElement('button');
    startBtn.className = 'coga-one-breath-start';
    startBtn.type = 'button';
    startBtn.textContent = "Let's breathe";
    startBtn.addEventListener('click', () => this.beginSession());

    actions.appendChild(dismissBtn);
    actions.appendChild(startBtn);
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
    card.className = 'coga-one-breath-card';

    const title = document.createElement('h3');
    title.textContent = 'One-breath reset';

    const description = document.createElement('p');
    description.textContent = 'Follow the circle — inhale as it expands, exhale as it softens.';

    const circle = document.createElement('div');
    circle.className = 'coga-one-breath-circle';
    circle.id = 'coga-one-breath-circle';
    circle.textContent = 'Ready';

    const timer = document.createElement('div');
    timer.className = 'coga-one-breath-timer';
    timer.id = 'coga-one-breath-timer';
    timer.textContent = 'About 10 seconds';

    const actions = document.createElement('div');
    actions.className = 'coga-one-breath-actions';
    const skipBtn = document.createElement('button');
    skipBtn.className = 'coga-one-breath-dismiss';
    skipBtn.textContent = 'Skip';
    skipBtn.type = 'button';
    skipBtn.addEventListener('click', () => this.dismiss());
    actions.appendChild(skipBtn);

    card.appendChild(title);
    card.appendChild(description);
    card.appendChild(circle);
    card.appendChild(timer);
    card.appendChild(actions);

    overlay.appendChild(card);
    document.body.appendChild(overlay);
    this.container = overlay;
  }

  private beginSession(): void {
    this.renderSession();

    const circle = document.getElementById('coga-one-breath-circle');
    const timerEl = document.getElementById('coga-one-breath-timer');
    if (!circle || !timerEl) {
      this.complete();
      return;
    }

    this.startTime = Date.now();
    this.isActive = true;
    this.notifyStarted();

    const inhaleMs = (this.metadata.timing.inhaleSeconds ?? 4) * 1000;
    const exhaleMs = (this.metadata.timing.exhaleSeconds ?? 6) * 1000;
    const totalMs = inhaleMs + exhaleMs;

    circle.dataset.state = 'inhale';
    circle.style.setProperty('--breath-duration', `${inhaleMs / 1000}s`);
    circle.textContent = 'Inhale';

    const updateTimer = () => {
      if (!this.startTime || !this.isActive) return;
      const elapsed = Date.now() - this.startTime;
      const remaining = Math.max(0, totalMs - elapsed);
      timerEl.textContent = remaining > 0 ? `${Math.ceil(remaining / 1000)}s remaining` : 'Nice work';

      if (elapsed >= inhaleMs) {
        circle.dataset.state = 'exhale';
        circle.style.setProperty('--breath-duration', `${exhaleMs / 1000}s`);
        circle.textContent = 'Exhale';
      }

      if (elapsed >= totalMs) {
        this.complete(totalMs);
      }
    };

    updateTimer();
    this.intervalId = window.setInterval(updateTimer, 200);
  }

  private notifyStarted(): void {
    if (this.onStarted && this.startTime) {
      try {
        this.onStarted(this.startTime);
      } catch (error) {
        console.error('[COGA] Error notifying intervention start:', error);
      }
      this.onStarted = null;
    }
  }

  private complete(durationOverride?: number): void {
    if (!this.isActive) {
      return;
    }

    try {
      this.isActive = false;
      const duration =
        typeof durationOverride === 'number'
          ? durationOverride
          : this.startTime
          ? Date.now() - this.startTime
          : 0;
      this.cleanup();
      this.onComplete?.(duration);
    } catch (error) {
      console.error('[COGA] Error completing One-Breath Reset:', error);
    }
  }

  private dismiss(): void {
    try {
      this.isActive = false;
      this.cleanup();
      this.onDismiss?.();
    } catch (error) {
      console.error('[COGA] Error dismissing One-Breath Reset:', error);
    }
  }
}

export default OneBreathReset;


