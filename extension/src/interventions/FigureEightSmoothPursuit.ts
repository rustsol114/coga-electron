import type { InterventionCallback, DismissCallback } from '../types';
import type { InterventionStartOptions } from './types';
import { INTERVENTION_DEFINITIONS } from '../config/interventions';
import { ensureBaseStyles, injectScopedStyles } from './sharedStyles';

const STYLE_ID = 'coga-figure-eight-styles';

const FIGURE_EIGHT_STYLES = `
  .coga-eight-card {
    width: 100vw;
    height: 100vh;
    background: rgba(15, 23, 42, 0.97);
    border-radius: 0;
    padding: 60px;
    color: #e2e8f0;
    box-shadow: none;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 40px;
  }

  .coga-eight-header h3 {
    margin: 0;
    font-size: 1.85rem;
    font-weight: 600;
    color: #f8fafc;
    text-align: center;
  }

  .coga-eight-header p {
    margin: 6px 0 0;
    color: rgba(226, 232, 240, 0.75);
    font-size: 1.1rem;
    line-height: 1.5;
    text-align: center;
  }

  .coga-eight-stage {
    display: flex;
    flex-direction: column;
    gap: 32px;
    align-items: center;
    width: 100%;
  }

  .coga-eight-canvas {
    position: relative;
    width: 420px;
    height: 280px;
    margin: 0 auto;
    border-radius: 28px;
    background: rgba(30, 41, 59, 0.75);
    border: 1px solid rgba(148, 163, 184, 0.25);
    overflow: hidden;
  }

  .coga-eight-path {
    position: absolute;
    inset: 0;
    background: radial-gradient(circle at 35% 35%, rgba(59, 130, 246, 0.22), transparent),
                radial-gradient(circle at 65% 65%, rgba(125, 211, 252, 0.28), transparent);
  }

  .coga-eight-dot {
    position: absolute;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: linear-gradient(135deg, #38bdf8, #2563eb);
    box-shadow: 0 0 24px rgba(56, 189, 248, 0.7);
  }

  .coga-eight-info {
    display: flex;
    flex-direction: column;
    gap: 16px;
    align-items: center;
    text-align: center;
  }

  .coga-eight-info p {
    margin: 0;
    font-size: 1.1rem;
    color: rgba(226, 232, 240, 0.8);
  }

  .coga-eight-timer {
    font-size: 3.5rem;
    font-weight: 700;
    color: #e0f2fe;
  }

  .coga-eight-actions {
    display: flex;
    justify-content: center;
    gap: 16px;
    margin-top: 20px;
  }

  .coga-eight-actions button {
    border-radius: 16px;
    border: none;
    padding: 14px 28px;
    font-weight: 600;
    cursor: pointer;
    font-size: 1rem;
    min-width: 140px;
  }

  .coga-eight-actions button.primary {
    background: linear-gradient(135deg, #2563eb, #1d4ed8);
    color: #ffffff;
  }

  .coga-eight-actions button.secondary {
    background: rgba(226, 232, 240, 0.12);
    color: rgba(226, 232, 240, 0.85);
  }
`;

class FigureEightSmoothPursuit {
  private container: HTMLElement | null = null;
  private onComplete: InterventionCallback | null = null;
  private onDismiss: DismissCallback | null = null;
  private onStarted: ((ts: number) => void) | null = null;
  private startTime: number | null = null;
  private intervalId: number | null = null;
  private dotAnimationId: number | null = null;
  private readonly metadata = INTERVENTION_DEFINITIONS.figureEightSmoothPursuit;

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
      this.clearTimers();

      ensureBaseStyles();
      injectScopedStyles(STYLE_ID, FIGURE_EIGHT_STYLES);

      if (options.autoStart) {
        this.renderSession();
        this.beginSession();
      } else {
        this.renderPrompt();
      }
    } catch (error) {
      console.error('[COGA] Error starting Figure-8 pursuit intervention:', error);
      this.cleanup();
    }
  }

  cleanup(): void {
    this.clearTimers();
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
    this.container = null;
  }

  private clearTimers(): void {
    if (this.intervalId) {
      window.clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (this.dotAnimationId) {
      window.cancelAnimationFrame(this.dotAnimationId);
      this.dotAnimationId = null;
    }
  }

  private renderPrompt(): void {
    this.cleanup();

    const overlay = document.createElement('div');
    overlay.className = 'coga-int-overlay';
    overlay.dataset.variant = 'dimmer';

    const card = document.createElement('div');
    card.className = 'coga-eight-card';

    const header = document.createElement('div');
    header.className = 'coga-eight-header';
    header.innerHTML = `
      <h3>Figure-8 smooth pursuit</h3>
      <p>Trace the glowing dot with your eyes (not your head) for 30 seconds to relax ocular muscles.</p>
    `;

    const actions = document.createElement('div');
    actions.className = 'coga-eight-actions';

    const skip = document.createElement('button');
    skip.className = 'secondary';
    skip.type = 'button';
    skip.textContent = 'Skip';
    skip.addEventListener('click', () => this.dismiss());

    const start = document.createElement('button');
    start.className = 'primary';
    start.type = 'button';
    start.textContent = 'Start exercise';
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
    overlay.dataset.variant = 'dimmer';

    const card = document.createElement('div');
    card.className = 'coga-eight-card';

    const header = document.createElement('div');
    header.className = 'coga-eight-header';
    header.innerHTML = `
      <h3>Follow the glowing dot</h3>
      <p>Keep your head steady. Let your gaze glide along the path. Blink naturally.</p>
    `;

    const stage = document.createElement('div');
    stage.className = 'coga-eight-stage';

    const canvas = document.createElement('div');
    canvas.className = 'coga-eight-canvas';
    const path = document.createElement('div');
    path.className = 'coga-eight-path';
    const dot = document.createElement('div');
    dot.className = 'coga-eight-dot';
    dot.id = 'coga-eight-dot';

    canvas.appendChild(path);
    canvas.appendChild(dot);

    const info = document.createElement('div');
    info.className = 'coga-eight-info';

    const timer = document.createElement('div');
    timer.className = 'coga-eight-timer';
    timer.id = 'coga-eight-timer';
    timer.textContent = '30';

    const tip = document.createElement('p');
    tip.textContent = 'Press Skip if you need to stop early.';

    info.appendChild(timer);
    info.appendChild(tip);

    stage.appendChild(canvas);
    stage.appendChild(info);

    const actions = document.createElement('div');
    actions.className = 'coga-eight-actions';

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
    this.notifyStarted();
    this.animateDot();
    this.updateTimer(true);
    this.intervalId = window.setInterval(() => this.updateTimer(false), 250);
  }

  private animateDot(): void {
    const dot = document.getElementById('coga-eight-dot') as HTMLElement | null;
    const canvas = dot?.parentElement;
    if (!dot || !canvas || !this.startTime) {
      return;
    }

    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const duration = 6000; // ms per loop

    const step = () => {
      if (!this.startTime) return;
      const elapsed = (Date.now() - this.startTime) % duration;
      const t = elapsed / duration;
      const angle = 2 * Math.PI * t;

      const a = (width / 2) * 0.7;
      const b = (height / 2) * 0.6;

      const x = a * Math.sin(angle * 2);
      const y = b * Math.sin(angle);

      const centerX = width / 2 - dot.offsetWidth / 2;
      const centerY = height / 2 - dot.offsetHeight / 2;

      dot.style.transform = `translate(${centerX + x}px, ${centerY + y}px)`;
      this.dotAnimationId = window.requestAnimationFrame(step);
    };

    this.dotAnimationId = window.requestAnimationFrame(step);
  }

  private updateTimer(initial: boolean): void {
    if (!this.startTime) {
      this.complete();
      return;
    }

    const timerEl = document.getElementById('coga-eight-timer');
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
        console.error('[COGA] Error notifying Figure-8 start:', error);
      }
      this.onStarted = null;
    }
  }

  private complete(): void {
    try {
      const duration =
        this.startTime !== null ? Date.now() - this.startTime : this.metadata.timing.totalSeconds * 1000;
      this.cleanup();
      this.onComplete?.(duration);
    } catch (error) {
      console.error('[COGA] Error completing Figure-8 pursuit:', error);
    }
  }

  private dismiss(): void {
    try {
      this.cleanup();
      this.onDismiss?.();
    } catch (error) {
      console.error('[COGA] Error dismissing Figure-8 pursuit:', error);
    }
  }
}

export default FigureEightSmoothPursuit;

