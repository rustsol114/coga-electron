const BASE_STYLE_ID = 'coga-interventions-base-styles';

const BASE_STYLES = `
  .coga-int-overlay {
    position: fixed;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(9, 23, 42, 0.92);
    backdrop-filter: blur(4px);
    z-index: 2147483600;
    font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    color: #0f172a;
    transition: opacity 0.25s ease, transform 0.25s ease;
    padding: 0;
  }

  .coga-int-overlay[data-variant='dimmer'] {
    background: rgba(6, 14, 28, 0.95);
  }

  .coga-int-card {
    width: 100vw;
    height: 100vh;
    border-radius: 0;
    background: #ffffff;
    padding: 48px;
    box-shadow: none;
    border: none;
    position: relative;
    overflow-y: auto;
    animation: coga-int-fade-in 280ms ease;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }

  .coga-int-card h2,
  .coga-int-card h3 {
    margin: 0;
    color: #0f172a;
  }

  .coga-int-card h2 {
    font-size: 1.35rem;
    font-weight: 600;
    margin-bottom: 0.35rem;
  }

  .coga-int-card h3 {
    font-size: 1.1rem;
    font-weight: 600;
    margin-bottom: 0.75rem;
  }

  .coga-int-subtitle {
    color: #475569;
    font-size: 0.95rem;
    margin-bottom: 1.5rem;
  }

  .coga-int-actions {
    display: flex;
    gap: 12px;
    margin-top: 22px;
  }

  .coga-int-btn {
    flex: 1;
    border-radius: 999px;
    font-size: 0.95rem;
    font-weight: 600;
    border: none;
    cursor: pointer;
    padding: 12px 18px;
    transition: transform 0.15s ease, box-shadow 0.15s ease, opacity 0.2s ease;
  }

  .coga-int-btn-primary {
    background: linear-gradient(135deg, #2563eb, #1d4ed8);
    color: #ffffff;
    box-shadow: 0 8px 18px rgba(37, 99, 235, 0.25);
  }

  .coga-int-btn-primary:hover {
    transform: translateY(-1px);
    box-shadow: 0 12px 22px rgba(37, 99, 235, 0.28);
  }

  .coga-int-btn-secondary {
    background: rgba(226, 232, 240, 0.6);
    color: #0f172a;
  }

  .coga-int-btn-secondary:hover {
    background: rgba(203, 213, 225, 0.9);
  }

  .coga-int-close {
    position: fixed;
    top: 24px;
    right: 24px;
    width: 48px;
    height: 48px;
    border-radius: 999px;
    border: none;
    background: rgba(226, 232, 240, 0.92);
    color: #0f172a;
    cursor: pointer;
    font-size: 1.5rem;
    line-height: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10;
    transition: all 0.2s ease;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  .coga-int-close:hover {
    background: rgba(203, 213, 225, 1);
    transform: scale(1.05);
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.15);
  }

  .coga-int-progress-track {
    width: 100%;
    height: 8px;
    border-radius: 999px;
    background: rgba(148, 163, 184, 0.25);
    overflow: hidden;
    margin: 16px 0;
  }

  .coga-int-progress-fill {
    height: 100%;
    width: 0;
    border-radius: inherit;
    background: linear-gradient(135deg, #38bdf8, #2563eb);
    transition: width 0.2s ease;
  }

  @keyframes coga-int-fade-in {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`;

export function ensureBaseStyles(): void {
  try {
    if (typeof document === 'undefined') return;
    if (document.getElementById(BASE_STYLE_ID)) return;

    const style = document.createElement('style');
    style.id = BASE_STYLE_ID;
    style.textContent = BASE_STYLES;
    document.head.appendChild(style);
  } catch (error) {
    console.error('[COGA] Error injecting intervention base styles:', error);
  }
}

export function injectScopedStyles(id: string, styles: string): void {
  try {
    if (typeof document === 'undefined') return;
    if (document.getElementById(id)) return;

    const style = document.createElement('style');
    style.id = id;
    style.textContent = styles;
    document.head.appendChild(style);
  } catch (error) {
    console.error('[COGA] Error injecting scoped styles:', error);
  }
}


