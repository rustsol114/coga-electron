/**
 * widget.styles.ts
 * Styles for the COGA widget with white background design
 */

export const widgetStyles = `
  :root {
    --coga-bg: #ffffff;
    --coga-border: #e5e7eb;
    --coga-text: #111827;
    --coga-muted: #6b7280;
    --coga-surface: #f9fafb;
    --coga-shadow: 0 8px 24px rgba(0,0,0,0.08);
    --coga-radius: 12px;
    --coga-transition: 180ms ease;
    --coga-dot-size: 52px;
    --coga-primary: #68B36B;
  }

  #coga-widget,
  #coga-widget * {
    box-sizing: border-box;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    color: var(--coga-text);
    line-height: 1.5;
  }

  #coga-widget {
    font-size: 13px;
  }

  #coga-widget button {
    font-family: inherit;
  }

  #coga-widget h3 {
    font-weight: 600;
    margin: 0;
    padding-top: 12px;
    justify-self: anchor-center;
    padding-bottom: 12px;
  }

  #coga-widget p {
    margin: 0;
    padding-bottom: 15px;
  }

  #coga-widget {
    position: fixed;
    left: 16px;
    top: 16px;
    z-index: 999998;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    color: var(--coga-text);
  }

  .coga-widget-dot {
    width: var(--coga-dot-size);
    height: var(--coga-dot-size);
    border-radius: 50%;
    cursor: pointer;
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid var(--coga-border);
    background: var(--coga-surface);
    transition: transform var(--coga-transition), background var(--coga-transition), box-shadow var(--coga-transition);
    box-shadow: var(--coga-shadow);
  }

  .coga-widget-inner {
    width: 70%;
    height: 70%;
    border-radius: 50%;
    background: var(--coga-bg);
    border: 1px solid var(--coga-border);
  }

  .coga-widget-dot:hover { transform: translateY(-1px); }
  .coga-widget-dot:active { transform: translateY(0); }

  /* Dynamic stress level colors with pulses */
  .coga-widget-dot[data-stress-level="normal"] { 
    background: linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%);
    border-color: #4A90A4;
  }
  .coga-widget-dot[data-stress-level="high"] { 
    background: linear-gradient(135deg, #fef2f2 0%, #fecaca 100%);
    border-color: #ef4444;
    animation: criticalPulse 1s ease-in-out infinite;
  }
  .coga-widget-dot[data-stress-level="moderate"] { 
    background: linear-gradient(135deg, #fff7ed 0%, #fed7aa 100%);
    border-color: #f97316;
    animation: subtlePulse 1.8s ease-in-out infinite;
  }

  /* Calibration progress (subtle ring) */
  .coga-widget-dot[data-calibrating="true"] {
    background: conic-gradient(#68B36B var(--progress, 0%), #eef2ff var(--progress, 0%));
    animation: spinCalibration 2s linear infinite;
  }

  @keyframes subtlePulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.05); }
  }

  @keyframes criticalPulse {
    0%, 100% { transform: scale(1); box-shadow: 0 8px 24px rgba(239, 68, 68, 0.3); }
    50% { transform: scale(1.1); box-shadow: 0 12px 36px rgba(239, 68, 68, 0.5); }
  }

  @keyframes spinCalibration {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  .coga-widget-panel {
    position: absolute;
    top: calc(var(--coga-dot-size) + 10px);
    left: 0;
    width: 360px;
    background: var(--coga-bg);
    border: 1px solid var(--coga-border);
    border-radius: var(--coga-radius);
    box-shadow: var(--coga-shadow);
    animation: slideIn var(--coga-transition);
    overflow: hidden;
  }

  .coga-widget-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 14px;
    border-bottom: 1px solid var(--coga-border);
  }

  .coga-brand { 
    font-weight: 600; 
    font-size: 13px; 
    letter-spacing: .3px; 
    color: var(--coga-muted); 
  }

  .coga-header-actions {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .coga-header-btn {
    background: transparent;
    border: none;
    cursor: pointer;
    color: var(--coga-muted);
    padding: 6px;
    border-radius: 6px;
    transition: all var(--coga-transition);
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
  }

  .coga-header-btn:hover { 
    background: var(--coga-surface);
    color: var(--coga-text);
  }

  .coga-header-btn svg {
    width: 16px;
    height: 16px;
  }

  .coga-widget-close {
    background: transparent;
    border: none;
    cursor: pointer;
    color: var(--coga-muted);
    padding: 6px;
    border-radius: 6px;
    transition: all var(--coga-transition);
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
  }

  .coga-widget-close:hover { 
    background: var(--coga-surface);
    color: var(--coga-text);
  }

  .coga-widget-close svg {
    width: 16px;
    height: 16px;
  }

  .coga-widget-content { padding: 12px 14px; }

  /* LEGACY STYLES - Keep for old view */
  .coga-stress-level {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-bottom: 12px;
  }

  .coga-stress-label { font-size: 11px; color: var(--coga-muted); }
  .coga-stress-row { display: flex; align-items: baseline; justify-content: space-between; }
  .coga-stress-value { font-size: 16px; font-weight: 600; }
  .coga-stress-score { font-size: 12px; color: var(--coga-muted); font-variant-numeric: tabular-nums; }

  .coga-widget-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 12px; }

  .coga-stat {
    display: grid;
    grid-template-columns: 16px 1fr auto;
    align-items: center;
    gap: 8px;
    padding: 10px 8px;
    border: 1px solid var(--coga-border);
    border-radius: 8px;
    background: var(--coga-bg);
  }

  .coga-stat-icon { color: var(--coga-muted); display: inline-flex; }
  .coga-stat-label { font-size: 11px; color: var(--coga-muted); }
  .coga-stat-value { font-size: 13px; font-weight: 600; font-variant-numeric: tabular-nums; }

  .coga-widget-actions { display: flex; gap: 8px; }
  .coga-action-btn {
    flex: 1; padding: 8px 10px; border: 1px solid var(--coga-border); border-radius: 8px;
    background: var(--coga-bg); cursor: pointer; color: var(--coga-text);
    transition: background var(--coga-transition);
  }
  .coga-action-btn:hover { background: var(--coga-surface); }

  /* NEW MODERN DASHBOARD STYLES */
  .coga-dashboard {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .coga-stress-section {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding-bottom: 20px;
  }

  .coga-stress-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .coga-stress-label {
    font-size: 15px;
    font-weight: 500;
    color: var(--coga-muted);
  }

  .coga-stress-value-group {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 2px;
  }

  .coga-stress-value {
    font-size: 18px;
    font-weight: 600;
    color: #68B36B;
  }

  .coga-stress-progress-container {
    width: 100%;
    height: 10px;
    background: var(--coga-surface);
    border-radius: 4px;
    overflow: visible;
    position: relative;
  }

  .coga-stress-progress-bar {
    height: 100%;
    background: linear-gradient(90deg, #68B36B 0%, #5CB85C 100%);
    transition: width 0.3s ease;
    border-radius: 4px;
  }

  .coga-stress-progress-label {
    position: absolute;
    right: 8px;
    top: 50%;
    transform: translateY(-50%);
    font-size: 10px;
    font-weight: 500;
    color: var(--coga-muted);
    pointer-events: none;
    background: rgba(255, 255, 255, 0.85);
    padding: 0 4px;
    border-radius: 3px;
  }

  /* Main Stats - Large Cards for Mouse and Keyboard */
  .coga-main-stats {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    padding-bottom: 15px;
  }

  .coga-main-stat-card {
    background: cadetblue;
    #background: var(--coga-surface);
    #border: 1px solid var(--coga-border);
    border-radius: 10px;
    padding: 14px 12px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    transition: all var(--coga-transition);
  }

  .coga-main-stat-card:hover {
    border-color: #d1d5db;
    transform: translateY(-1px);
  }

  .coga-main-stat-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 6px;
  }

  .coga-main-stat-icon {
    width: 18px;
    height: 18px;
    color: var(--coga-muted);
  }

  .coga-main-stat-label {
    font-size: 12px;
    font-weight: 500;
    color: var(--coga-muted);
  }

  .coga-main-stat-value {
    text-align: center;
    font-size: 20px;
    font-weight: 600;
    color: var(--coga-text);
    font-variant-numeric: tabular-nums;
    line-height: 1;
  }

  /* Main Metrics Section */
  .coga-main-metrics-section {
    margin-bottom: 24px;
    padding: 20px;
    background: var(--coga-surface);
    border: 1px solid var(--coga-border);
    border-radius: var(--coga-radius);
  }

  .coga-main-metrics-title {
    font-size: 16px;
    font-weight: 600;
    color: var(--coga-text);
    margin: 0 0 16px 0;
  }

  .coga-main-metrics-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 16px;
  }

  .coga-main-metric-item {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 12px;
    background: var(--coga-bg);
    border: 1px solid var(--coga-border);
    border-radius: 8px;
    transition: all var(--coga-transition);
  }

  .coga-main-metric-item:hover {
    border-color: #d1d5db;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0,0,0,0.05);
  }

  .coga-main-metric-header {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .coga-main-metric-icon {
    width: 20px;
    height: 20px;
    color: var(--coga-muted);
  }

  .coga-main-metric-label {
    font-size: 12px;
    font-weight: 500;
    color: var(--coga-muted);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .coga-main-metric-value {
    font-size: 20px;
    font-weight: 700;
    color: var(--coga-text);
    font-variant-numeric: tabular-nums;
    line-height: 1.2;
  }

  /* Textarea Section */
  .coga-textarea-section {
    margin-bottom: 24px;
    padding: 20px;
    background: var(--coga-surface);
    border: 1px solid var(--coga-border);
    border-radius: var(--coga-radius);
  }

  .coga-textarea-title {
    font-size: 16px;
    font-weight: 600;
    color: var(--coga-text);
    margin: 0 0 12px 0;
  }

  .coga-test-textarea {
    width: 100%;
    padding: 12px;
    font-size: 14px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    border: 1px solid var(--coga-border);
    border-radius: 8px;
    background: var(--coga-bg);
    color: var(--coga-text);
    resize: vertical;
    transition: all var(--coga-transition);
    line-height: 1.5;
  }

  .coga-test-textarea:focus {
    outline: none;
    border-color: var(--coga-primary);
    box-shadow: 0 0 0 3px rgba(104, 179, 107, 0.1);
  }

  .coga-test-textarea::placeholder {
    color: var(--coga-muted);
  }

  /* Compact Stats Grid */
  .coga-compact-stats-collapsible {
    border: 1px solid var(--coga-border);
    border-radius: 12px;
    background: var(--coga-surface);
    padding: 10px 12px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .coga-collapsible-toggle {
    display: inline-flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    width: 100%;
    border: none;
    background: transparent;
    font-size: 13px;
    font-weight: 600;
    color: var(--coga-text);
    cursor: pointer;
    padding: 6px 0;
  }

  .coga-collapsible-toggle:hover {
    color: #68B36B;
  }

  .coga-collapsible-icon {
    width: 16px;
    height: 16px;
    transition: transform var(--coga-transition);
  }

  .coga-compact-stats-collapsible.is-collapsed .coga-collapsible-icon {
    transform: rotate(-180deg);
  }

  .coga-compact-stats-collapsible.is-collapsed .coga-compact-stats {
    max-height: 0;
    overflow: hidden;
    opacity: 0;
  }

  .coga-compact-stats {
    transition: max-height var(--coga-transition), opacity var(--coga-transition);
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }

  .coga-compact-stat {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .coga-compact-stat:hover {
    border-color: #d1d5db;
  }

  .coga-compact-stat-icon {
    background: var(--coga-surface);
    border: 1px solid var(--coga-border);
    border-radius: 8px;
    padding: 8px;
    transition: all var(--coga-transition);
    width: 32px;
    height: 32px;
    color: var(--coga-muted);
    flex-shrink: 0;
  }

  .coga-compact-stat-content {
    padding-left: 10px;
    display: flex;
    align-items: baseline;
    gap: 4px;
    flex-direction: column;
    min-width: 0;
  }

  .coga-compact-stat-value {
    font-size: 15px;
    font-weight: 600;
    color: var(--coga-text);
    font-variant-numeric: tabular-nums;
  }

  .coga-compact-stat-unit {
    font-size: 10px;
    font-weight: 400;
    color: var(--coga-muted);
    white-space: nowrap;
  }

  /* Full width compact stat */
  .coga-compact-stat.coga-compact-full {
    grid-column: 1 / -1;
  }

  /* Organización de métricas por columnas */
  .coga-mouse-metric {
    grid-column: 1;
  }

  .coga-keyboard-metric {
    grid-column: 2;
  }
  
  /* Calibration prompt */
  .coga-calibration-prompt {
    text-align: center;
    padding: 16px 0;
  }

  .coga-calibration-icon {
    font-size: 25px;
    justify-self: anchor-center;
    padding: 0;
    margin: 0;
  }

  .coga-calibration-icon svg {
    width: 48px;
    height: 48px;
  }

  .coga-calibration-prompt h3 {
    font-size: 16px;
    font-weight: 600;
    color: var(--coga-text);
    margin: 0 0 8px 0;
  }

  .coga-calibration-prompt p {
    font-size: 12px;
    color: var(--coga-muted);
    margin: 0 0 16px 0;
    line-height: 1.5;
  }

  .coga-btn {
    padding: 10px 16px;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    border: none;
  }

  .coga-btn-primary {
    background: #68B36B;
    color: white;
  }

  .coga-btn-primary:hover {
    background: #5CB85C;
    transform: translateY(-1px);
  }

  /* Calibration progress */
  .coga-calibration-progress {
    text-align: center;
    padding: 16px 0;
  }

  .coga-calibration-header {
    margin-bottom: 16px;
  }

  .coga-calibration-icon-large {
    width: 32px;
    height: 32px;
    color: #68B36B;
    margin-bottom: 8px;
    justify-self: anchor-center;
  }

  .coga-calibration-header h3 {
    font-size: 16px;
    font-weight: 600;
    color: var(--coga-text);
    margin: 0;
  }

  .coga-progress-bar-container {
    width: 100%;
    height: 8px;
    background: #e5e7eb;
    border-radius: 4px;
    overflow: hidden;
    margin-bottom: 12px;
  }

  .coga-progress-bar {
    height: 100%;
    background: linear-gradient(90deg, #4ade80 0%, #22c55e 100%);
    transition: width 0.3s ease;
    border-radius: 4px;
    width: 0%;
  }

  .coga-progress-text {
    display: flex;
    justify-content: space-between;
    font-size: 11px;
    color: var(--coga-muted);
    margin-bottom: 25px;
  }

  .coga-calibration-tips p {
    font-size: 11px;
    color: var(--coga-muted);
    margin: 0 0 12px 0;
    padding-bottom: 12px;
  }

  .coga-tips-list {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    justify-content: center;
    list-style: none;
    padding: 12px;
    margin: 0;
  }

  .coga-tips-list li {
    display: flex;
    flex: 1 1 auto;
    justify-content: center;
    align-items: center;
    gap: 8px;
    font-size: 10px;
    color: var(--coga-muted);
    margin-bottom: 6px;
  }

  .coga-tip-icon {
    width: 14px;
    height: 14px;
    color: #68B36B;
  }

  @keyframes slideIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }

  /* Stress progress bar */
  .coga-stress-progress-container {
    width: 100%;
    height: 6px;
    background: #e5e7eb;
    border-radius: 3px;
    overflow: hidden;
    margin-top: 8px;
  }

  .coga-stress-progress-bar {
    height: 100%;
    background: #68B36B;
    // background: linear-gradient(90deg, #3b82f6 0%, #68B36B 50%, #eab308 75%, #f97316 90%, #ef4444 100%);
    transition: width 0.3s ease;
    border-radius: 3px;
    width: 0%;
  }

  .coga-stress-score-percentage {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 12px;
    color: var(--coga-muted);
    margin-top: 4px;
    text-align: right;
  }

  .coga-stress-progress-label {
    font-size: 12px;
    color: var(--coga-muted);
    margin-top: 4px;
    text-align: right;
  }

  /* Settings view */
  .coga-settings-view {
    display: flex;
    flex-direction: column;
    gap: 16px;
    max-height: 500px;
    overflow: hidden;
  }

  .coga-settings-header {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-shrink: 0;
  }

  .coga-settings-header-text h3 {
    font-size: 16px;
    margin: 0;
    color: var(--coga-text);
  }

  .coga-settings-header-text p {
    font-size: 12px;
    color: var(--coga-muted);
    margin: 0;
  }

  .coga-settings-back-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: 8px;
    border: 1px solid var(--coga-border);
    background: var(--coga-bg);
    cursor: pointer;
    transition: background var(--coga-transition), color var(--coga-transition);
  }

  .coga-settings-back-btn:hover {
    background: var(--coga-surface);
    color: var(--coga-text);
  }

  .coga-settings-progress {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-shrink: 0;
  }

  .coga-settings-progress-track {
    flex: 1;
    height: 6px;
    background: var(--coga-surface);
    border-radius: 999px;
    overflow: hidden;
  }

  .coga-settings-progress-bar {
    height: 100%;
    width: 0%;
    background: linear-gradient(90deg, #68B36B 0%, #5CB85C 100%);
    transition: width 0.3s ease;
  }

  .coga-settings-progress-label {
    font-size: 11px;
    color: var(--coga-muted);
    white-space: nowrap;
  }

  .coga-settings-steps {
    flex: 1 1 auto;
    min-height: 0;
    overflow-y: auto;
    padding-right: 4px;
    display: flex;
    flex-direction: column;
    gap: 20px;
    scroll-behavior: smooth;
  }

  .coga-settings-step {
    display: none;
    flex-direction: column;
    gap: 16px;
    background: var(--coga-surface);
    border: 1px solid var(--coga-border);
    border-radius: 12px;
    padding: 16px;
  }

  .coga-settings-step.is-active {
    display: flex;
    max-height: 320px;
    overflow-y: auto;
  }

  .coga-settings-step-title {
    display: flex;
    gap: 12px;
    align-items: flex-start;
  }

  .coga-settings-step-number {
    font-size: 12px;
    font-weight: 600;
    color: var(--coga-primary);
    background: rgba(104, 179, 107, 0.12);
    border-radius: 8px;
    padding: 4px 8px;
  }

  .coga-settings-step-title h4 {
    margin: 0;
    font-size: 15px;
    font-weight: 600;
  }

  .coga-settings-step-title p {
    margin: 4px 0 0;
    font-size: 12px;
    color: var(--coga-muted);
  }

  .coga-sensitivity-buttons {
    display: grid;
    gap: 10px;
  }

  .coga-sensitivity-btn {
    width: 100%;
    border-radius: 10px;
    border: 1px solid var(--coga-border);
    background: var(--coga-bg);
    padding: 6px 14px;
    text-align: left;
    cursor: pointer;
    transition: border-color var(--coga-transition), transform var(--coga-transition), box-shadow var(--coga-transition);
  }

  .coga-sensitivity-btn:hover {
    border-color: #d1d5db;
    transform: translateY(-1px);
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.06);
  }

  .coga-sensitivity-btn.is-active {
    border-color: #68B36B;
    box-shadow: 0 0 0 1px rgba(104, 179, 107, 0.2);
  }

  .coga-sensitivity-label {
    display: block;
    font-weight: 600;
    font-size: 14px;
    color: var(--coga-text);
  }

  .coga-sensitivity-desc {
    display: block;
    font-size: 12px;
    color: var(--coga-muted);
  }

  .coga-limits-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 10px;
  }

  .coga-limit-field {
    display: flex;
    flex-direction: column;
    gap: 6px;
    font-size: 12px;
    color: var(--coga-muted);
    text-align: center;
  }

  .coga-limit-field input {
    border-radius: 8px;
    border: 1px solid var(--coga-border);
    padding: 8px 10px;
    font-size: 13px;
    color: var(--coga-text);
    background: var(--coga-bg);
    text-align: center;
  }

  .coga-domains-input {
    display: flex;
    gap: 8px;
    align-items: center;
  }

  .coga-domains-input input {
    flex: 1;
    border-radius: 8px;
    border: 1px solid var(--coga-border);
    padding: 10px 12px;
    font-size: 13px;
  }

  .coga-domains-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
    max-height: 140px;
    overflow-y: auto;
  }

  .coga-domains-empty {
    font-size: 12px;
    color: var(--coga-muted);
    margin: 0;
  }

  .coga-domain-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 12px;
    border-radius: 10px;
    border: 1px solid var(--coga-border);
    background: var(--coga-bg);
  }

  .coga-domain-item button {
    width: 28px;
    height: 28px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 6px;
    border: none;
    background: var(--coga-surface);
    cursor: pointer;
    color: var(--coga-muted);
    transition: background var(--coga-transition), color var(--coga-transition);
  }

  .coga-domain-item button:hover {
    background: rgba(239, 68, 68, 0.1);
    color: #ef4444;
  }

  .coga-domain-name {
    font-size: 13px;
    font-weight: 500;
  }

  .coga-interventions-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .coga-intervention-option {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 12px;
    align-items: flex-start;
    padding: 12px;
    border-radius: 10px;
    border: 1px solid var(--coga-border);
    background: var(--coga-bg);
  }

  .coga-intervention-option input {
    margin-top: 4px;
  }

  .coga-intervention-option strong {
    display: block;
    font-size: 13px;
    margin-bottom: 2px;
  }

  .coga-intervention-option span {
    font-size: 12px;
    color: var(--coga-muted);
  }

  .coga-settings-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 10px;
    padding-top: 4px;
    flex-shrink: 0;
  }

  .coga-settings-section-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
  }

  .coga-primary-btn,
  .coga-secondary-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 4px 7px;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: transform var(--coga-transition), box-shadow var(--coga-transition), background var(--coga-transition), color var(--coga-transition);
    border: none;
  }

  .coga-primary-btn {
    background: #68B36B;
    color: white;
  }

  .coga-primary-btn:hover {
    background: #5CB85C;
    transform: translateY(-1px);
    box-shadow: 0 10px 20px rgba(92, 184, 92, 0.25);
  }

  .coga-primary-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    box-shadow: none;
    transform: none;
  }

  .coga-secondary-btn {
    border: 1px solid var(--coga-border);
    background: var(--coga-bg);
    color: var(--coga-text);
  }

  .coga-secondary-btn:hover {
    background: var(--coga-surface);
    transform: translateY(-1px);
  }

  .coga-settings-section-message {
    font-size: 12px;
    font-weight: 500;
    border-radius: 8px;
    padding: 8px 10px;
    display: none;
  }

  .coga-settings-section-message.is-visible {
    display: block;
  }

  .coga-settings-section-message.is-success {
    background: rgba(104, 179, 107, 0.12);
    color: #1f7a21;
  }

  .coga-settings-section-message.is-error {
    background: rgba(239, 68, 68, 0.12);
    color: #b91c1c;
  }

  .coga-quick-demo-overlay {
    position: fixed;
    top: 24px;
    right: 24px;
    z-index: 2147483601;
    background: rgba(15, 23, 42, 0.92);
    color: #e2e8f0;
    padding: 12px 18px;
    border-radius: 14px;
    box-shadow: 0 16px 32px rgba(15, 23, 42, 0.35);
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 13px;
    letter-spacing: 0.01em;
    backdrop-filter: blur(4px);
  }

  .coga-quick-demo-overlay strong {
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 0.14em;
    color: #38bdf8;
  }

  .coga-quick-demo-countdown {
    font-size: 1.1rem;
    font-weight: 600;
  }

  .coga-quick-demo-toast {
    position: fixed;
    top: 24px;
    right: 24px;
    background: #0f172a;
    color: #f8fafc;
    padding: 14px 20px;
    border-radius: 14px;
    box-shadow: 0 18px 36px rgba(15, 23, 42, 0.4);
    z-index: 2147483602;
    font-size: 13px;
    transition: opacity 0.3s ease, transform 0.3s ease;
  }

  .coga-quick-demo-toast-hide {
    opacity: 0;
    transform: translateY(-6px);
  }
`;