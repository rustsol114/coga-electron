/**
 * ElectronDashboardView.ts
 * Full-window dashboard for Electron using widget UI components
 */

import { widgetTemplate } from '../../extension/src/ui/widget.template';
import { widgetStyles } from '../../extension/src/ui/widget.styles';
import { createIcons, icons } from 'lucide';
import type { StressScore, StressLevel } from '../../extension/src/types';

class ElectronDashboardView {
  private container: HTMLElement | null;
  private cogaInstance: any;
  private updateInterval: number | null;
  private isInitialized: boolean;

  constructor() {
    this.container = null;
    this.updateInterval = null;
    this.isInitialized = false;
  }

  /**
   * Initialize the dashboard view
   */
  async init(): Promise<void> {
    try {
      // Wait for COGA
      await this.waitForCOGA();
      
      // Create dashboard container
      this.createDashboard();
      
      // Setup event listeners
      this.attachEventListeners();
      
      // Start updates
      this.startUpdates();
      
      // Check initial state
      await this.checkInitialState();
      
      this.isInitialized = true;
      console.log('[ElectronDashboardView] Initialized');
    } catch (error) {
      console.error('[ElectronDashboardView] Initialization error:', error);
      throw error;
    }
  }

  /**
   * Wait for COGA instance
   */
  private async waitForCOGA(): Promise<void> {
    return new Promise((resolve, reject) => {
      let attempts = 0;
      const maxAttempts = 100;

      const checkCOGA = () => {
        attempts++;
        if ((window as any).COGA) {
          this.cogaInstance = (window as any).COGA;
          resolve();
        } else if (attempts >= maxAttempts) {
          reject(new Error('COGA instance not found'));
        } else {
          setTimeout(checkCOGA, 100);
        }
      };

      checkCOGA();
    });
  }

  /**
   * Create dashboard using widget template
   */
  private createDashboard(): void {
    // Find or create dashboard container
    let dashboard = document.getElementById('dashboard');
    if (!dashboard) {
      dashboard = document.createElement('div');
      dashboard.id = 'dashboard';
      document.body.appendChild(dashboard);
    }

    // Create widget container inside dashboard
    this.container = document.createElement('div');
    this.container.id = 'coga-widget';
    this.container.className = 'coga-electron-dashboard';
    
    // Inject widget template
    this.container.innerHTML = widgetTemplate;
    
    // Inject widget styles (adapted for full-window)
    this.injectStyles();
    
    // Append to dashboard
    dashboard.appendChild(this.container);
    
    // Initialize icons
    this.initializeIcons();
    
    // Show panel immediately (no dot for Electron)
    const panel = document.getElementById('coga-widget-panel');
    if (panel) {
      panel.style.display = 'block';
    }
    
    // Hide the dot (not needed for full-window)
    const dot = document.getElementById('coga-widget-dot');
    if (dot) {
      dot.style.display = 'none';
    }
  }

  /**
   * Inject widget styles adapted for Electron full-window
   */
  private injectStyles(): void {
    // Check if styles already injected
    if (document.getElementById('coga-widget-styles')) {
      return;
    }

    const style = document.createElement('style');
    style.id = 'coga-widget-styles';
    
    // Base widget styles
    let adaptedStyles = widgetStyles;
    
    // Override for Electron full-window mode
    adaptedStyles += `
      /* Electron full-window overrides */
      .coga-electron-dashboard {
        position: relative !important;
        left: auto !important;
        top: auto !important;
        width: 100% !important;
        height: 100% !important;
        z-index: 1 !important;
      }
      
      .coga-electron-dashboard .coga-widget-dot {
        display: none !important;
      }
      
      .coga-electron-dashboard .coga-widget-panel {
        position: relative !important;
        top: auto !important;
        left: auto !important;
        width: 100% !important;
        max-width: 100% !important;
        height: 100% !important;
        min-height: 100vh !important;
        border-radius: 0 !important;
        box-shadow: none !important;
        background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%) !important;
        color: #f1f5f9 !important;
        display: flex !important;
        flex-direction: column !important;
      }
      
      .coga-electron-dashboard .coga-widget-content {
        flex: 1 !important;
        overflow-y: auto !important;
        padding: 2rem !important;
        max-width: 1400px !important;
        margin: 0 auto !important;
        width: 100% !important;
      }
      
      .coga-electron-dashboard .coga-widget-header {
        padding: 1.5rem 2rem !important;
        background: rgba(15, 23, 42, 0.6) !important;
        backdrop-filter: blur(12px) !important;
        border-bottom: 1px solid rgba(148, 163, 184, 0.1) !important;
        width: 100% !important;
      }
      
      .coga-electron-dashboard .coga-widget-close {
        display: none !important;
      }
      
      /* Dark theme color overrides */
      .coga-electron-dashboard {
        --coga-bg: rgba(15, 23, 42, 0.6);
        --coga-text: #f1f5f9;
        --coga-muted: #94a3b8;
        --coga-surface: rgba(30, 58, 138, 0.3);
        --coga-border: rgba(148, 163, 184, 0.2);
      }
      
      .coga-electron-dashboard .coga-brand {
        color: #f1f5f9 !important;
      }
      
      .coga-electron-dashboard .coga-stress-value {
        color: #f1f5f9 !important;
      }
      
      .coga-electron-dashboard .coga-main-stat-value {
        color: #f1f5f9 !important;
      }
      
      .coga-electron-dashboard .coga-compact-stat-value {
        color: #f1f5f9 !important;
      }
      
      .coga-electron-dashboard .coga-compact-stat-label {
        color: #cbd5f5 !important;
      }
      
      .coga-electron-dashboard .coga-stress-label {
        color: #cbd5f9 !important;
      }
      
      .coga-electron-dashboard .coga-main-stat-label {
        color: #cbd5f9 !important;
      }
      
      .coga-electron-dashboard .coga-btn {
        background: #818cf8 !important;
        color: #f1f5f9 !important;
      }
      
      .coga-electron-dashboard .coga-btn:hover {
        background: #6366f1 !important;
      }
    `;

    document.head.appendChild(style);
    style.textContent = adaptedStyles;
  }

  /**
   * Initialize Lucide icons
   */
  private initializeIcons(): void {
    try {
      if (this.container) {
        createIcons({
          icons,
          attrs: {
            'stroke-width': 2,
            width: '16',
            height: '16'
          },
          nameAttr: 'data-lucide'
        });
      }
    } catch (error) {
      console.error('[ElectronDashboardView] Error initializing icons:', error);
    }
  }

  /**
   * Attach event listeners
   */
  private attachEventListeners(): void {
    // Recalibrate button
    const recalibrateBtn = document.getElementById('coga-recalibrate-btn');
    if (recalibrateBtn) {
      recalibrateBtn.addEventListener('click', () => {
        this.startCalibration();
      });
    }

    // Settings button
    const settingsBtn = document.getElementById('coga-settings-btn');
    if (settingsBtn) {
      settingsBtn.addEventListener('click', () => {
        this.showSettings();
      });
    }

    // Start calibration button
    const startCalibrationBtn = document.getElementById('coga-start-calibration');
    if (startCalibrationBtn) {
      startCalibrationBtn.addEventListener('click', () => {
        this.startCalibration();
      });
    }

    // Settings navigation
    const settingsBackBtn = document.getElementById('coga-settings-back-btn');
    if (settingsBackBtn) {
      settingsBackBtn.addEventListener('click', () => {
        this.showDashboard();
      });
    }

    // Settings step navigation
    const prevStepBtn = document.getElementById('coga-settings-prev-step');
    const nextStepBtn = document.getElementById('coga-settings-next-step');
    if (prevStepBtn) {
      prevStepBtn.addEventListener('click', () => {
        this.navigateSettingsStep(-1);
      });
    }
    if (nextStepBtn) {
      nextStepBtn.addEventListener('click', () => {
        this.navigateSettingsStep(1);
      });
    }

    // Compact stats toggle
    const compactToggle = document.getElementById('coga-compact-toggle');
    if (compactToggle) {
      compactToggle.addEventListener('click', () => {
        this.toggleCompactStats();
      });
    }

    // Settings form handlers
    this.setupSettingsHandlers();
  }

  /**
   * Setup settings form handlers
   */
  private setupSettingsHandlers(): void {
    // Sensitivity buttons
    ['low', 'medium', 'high'].forEach(sensitivity => {
      const btn = document.getElementById(`coga-settings-sensitivity-${sensitivity}`);
      if (btn) {
        btn.addEventListener('click', () => {
          this.setSensitivity(sensitivity as 'low' | 'medium' | 'high');
        });
      }
    });

    // Intervention limits
    const saveLimitsBtn = document.getElementById('coga-settings-save-limits');
    if (saveLimitsBtn) {
      saveLimitsBtn.addEventListener('click', () => {
        this.saveInterventionLimits();
      });
    }

    const resetLimitsBtn = document.getElementById('coga-settings-reset-limits');
    if (resetLimitsBtn) {
      resetLimitsBtn.addEventListener('click', () => {
        this.resetInterventionLimits();
      });
    }

    // Domains
    const addDomainBtn = document.getElementById('coga-settings-add-domain');
    if (addDomainBtn) {
      addDomainBtn.addEventListener('click', () => {
        this.addSuppressedDomain();
      });
    }

    // Interventions
    const saveInterventionsBtn = document.getElementById('coga-settings-save-interventions');
    if (saveInterventionsBtn) {
      saveInterventionsBtn.addEventListener('click', () => {
        this.saveInterventions();
      });
    }

    const selectAllBtn = document.getElementById('coga-settings-select-all');
    if (selectAllBtn) {
      selectAllBtn.addEventListener('click', () => {
        this.selectAllInterventions();
      });
    }
  }

  /**
   * Check initial state and show appropriate view
   */
  private async checkInitialState(): Promise<void> {
    try {
      if (!this.cogaInstance) return;

      const status = this.cogaInstance.getStatus();
      const baseline = this.cogaInstance.getBaseline();

      if (status && status.calibrating) {
        this.showCalibrationProgress();
        const progress = this.cogaInstance.getCalibrationProgress() || 0;
        this.updateCalibrationProgress(progress, 'Calibration in progress...');
      } else if (!baseline) {
        this.showCalibrationPrompt();
      } else {
        this.showDashboard();
      }
    } catch (error) {
      console.error('[ElectronDashboardView] Error checking initial state:', error);
    }
  }

  /**
   * Start real-time updates
   */
  private startUpdates(): void {
    this.updateInterval = window.setInterval(() => {
      this.updateDisplay();
    }, 1000);
  }

  /**
   * Update display with latest data
   */
  private updateDisplay(): void {
    try {
      if (!this.cogaInstance) return;

      const status = this.cogaInstance.getStatus();
      if (status && status.calibrating) {
        const progress = this.cogaInstance.getCalibrationProgress() || 0;
        this.updateCalibrationProgress(progress, 'Calibration in progress...');
        return;
      }

      const score = this.cogaInstance.getLatestStressScore();
      if (score) {
        this.updatePanelContent(score);
      }

      const metrics = this.cogaInstance.getCurrentMetrics();
      if (metrics) {
        this.updateMetrics(metrics, score);
      } else if (score && (score as any).metrics) {
        // Fallback: use metrics from score if available
        this.updateMetricsFromScore((score as any).metrics);
      }
    } catch (error) {
      console.error('[ElectronDashboardView] Update error:', error);
    }
  }

  /**
   * Update panel content (reused from Widget)
   */
  private updatePanelContent(score: StressScore): void {
    try {
      const valueEl = document.getElementById('coga-stress-value');
      const scoreEl = document.getElementById('coga-stress-score');
      const mouseEl = document.getElementById('coga-mouse-score');
      const keyboardEl = document.getElementById('coga-keyboard-score');
      const progressBar = document.getElementById('coga-stress-progress-bar');
      const progressLabel = document.getElementById('coga-stress-progress-label');

      if (valueEl) {
        valueEl.textContent = this.capitalizeFirst(score.level);
        // Get stress color from stress detector
        if (this.cogaInstance && this.cogaInstance.stressDetector) {
          valueEl.style.color = this.cogaInstance.stressDetector.getStressColor?.(score.level) || '#f1f5f9';
        }
      }

      if (scoreEl) {
        scoreEl.textContent = `${score.combined.toFixed(2)}σ`;
      }

      if (mouseEl) {
        mouseEl.textContent = Math.abs(score.mouse || 0).toFixed(2);
      }

      if (keyboardEl) {
        keyboardEl.textContent = Math.abs(score.keyboard || 0).toFixed(2);
      }

      if (progressBar) {
        const percentage = Math.min(100, Math.max(0, score.percentage || 0));
        progressBar.style.width = `${percentage}%`;
        if (progressLabel) {
          progressLabel.textContent = `${percentage.toFixed(1)}%`;
        }
      }

      // Update dot color (even though hidden)
      const dot = document.getElementById('coga-widget-dot');
      if (dot) {
        dot.setAttribute('data-stress-level', score.level);
      }
    } catch (error) {
      console.error('[ElectronDashboardView] Error updating panel content:', error);
    }
  }

  /**
   * Update metrics display
   */
  private updateMetrics(metrics: any, score: StressScore): void {
    try {
      // Update compact stats (existing)
      this.updateMetricValue('coga-typing-errors', metrics.keyboard?.typingErrorRate, 2);
      this.updateMetricValue('coga-click-frequency', metrics.mouse?.clickFrequencyPerMin, 1);
      this.updateMetricValue('coga-multi-clicks', metrics.mouse?.multiClickRatePerMin, 1);
      this.updateMetricValue('coga-mouse-velocity', metrics.mouse?.movementVelocity, 0);
      this.updateMetricValue('coga-mouse-acceleration', metrics.mouse?.movementAcceleration, 0);
      this.updateMetricValue('coga-scroll-velocity', metrics.scroll?.velocity || metrics.mouse?.scrollVelocity, 0);
      
      // Update main metrics (prominently displayed)
      this.updateMainMetric('coga-main-mouse-velocity', metrics.mouse?.movementVelocity, 'px/s', 0);
      this.updateMainMetric('coga-main-click-frequency', metrics.mouse?.clickFrequencyPerMin, '/min', 1);
      this.updateMainMetric('coga-main-rage-clicks', metrics.mouse?.rageClickDetected ? 'Yes' : 'No', '', 0, true);
      this.updateMainMetric('coga-main-typing-speed', metrics.keyboard?.typingSpeedPerMin, '/min', 0);
      this.updateMainMetric('coga-main-typing-error', metrics.keyboard?.typingErrorRate, '/10', 2);
      this.updateMainMetric('coga-main-avg-pause', metrics.keyboard?.avgPauseDuration, 's', 2);
      this.updateMainMetric('coga-main-scroll-velocity', metrics.scroll?.velocity || metrics.mouse?.scrollVelocity, 'px/s', 0);
    } catch (error) {
      console.error('[ElectronDashboardView] Error updating metrics:', error);
    }
  }

  /**
   * Update metrics from score object (fallback)
   */
  private updateMetricsFromScore(metrics: any): void {
    try {
      if (!metrics) return;
      
      const { mouse, keyboard } = metrics;
      // Update compact stats
      this.updateMetricValue('coga-typing-errors', keyboard?.typingErrorRate, 2);
      this.updateMetricValue('coga-click-frequency', mouse?.clickFrequencyPerMin, 1);
      this.updateMetricValue('coga-multi-clicks', mouse?.multiClickRatePerMin, 1);
      this.updateMetricValue('coga-mouse-velocity', mouse?.movementVelocity, 0);
      this.updateMetricValue('coga-mouse-acceleration', mouse?.movementAcceleration, 0);
      this.updateMetricValue('coga-scroll-velocity', mouse?.scrollVelocity, 0);
      
      // Update main metrics
      this.updateMainMetric('coga-main-mouse-velocity', mouse?.movementVelocity, 'px/s', 0);
      this.updateMainMetric('coga-main-click-frequency', mouse?.clickFrequencyPerMin, '/min', 1);
      this.updateMainMetric('coga-main-rage-clicks', mouse?.rageClickDetected ? 'Yes' : 'No', '', 0, true);
      this.updateMainMetric('coga-main-typing-speed', keyboard?.typingSpeedPerMin, '/min', 0);
      this.updateMainMetric('coga-main-typing-error', keyboard?.typingErrorRate, '/10', 2);
      this.updateMainMetric('coga-main-avg-pause', keyboard?.avgPauseDuration, 's', 2);
      this.updateMainMetric('coga-main-scroll-velocity', mouse?.scrollVelocity, 'px/s', 0);
    } catch (error) {
      console.error('[ElectronDashboardView] Error updating metrics from score:', error);
    }
  }

  /**
   * Update a single metric value
   */
  private updateMetricValue(elementId: string, value: number | undefined, decimals: number): void {
    const el = document.getElementById(elementId);
    if (el && value !== undefined && !isNaN(value)) {
      el.textContent = value.toFixed(decimals);
    }
  }

  /**
   * Update main metric with unit
   */
  private updateMainMetric(elementId: string, value: number | string | undefined | boolean, unit: string, decimals: number, isBoolean: boolean = false): void {
    const el = document.getElementById(elementId);
    if (el) {
      if (isBoolean && typeof value === 'boolean') {
        el.textContent = value ? 'Yes' : 'No';
      } else if (value !== undefined && value !== null && !isNaN(value as number)) {
        if (typeof value === 'number') {
          el.textContent = `${value.toFixed(decimals)} ${unit}`.trim();
        } else {
          el.textContent = `${value} ${unit}`.trim();
        }
      }
    }
  }

  /**
   * Show calibration prompt
   */
  private showCalibrationPrompt(): void {
    const prompt = document.getElementById('coga-calibration-prompt');
    const dashboard = document.getElementById('coga-dashboard');
    const progress = document.getElementById('coga-calibration-progress');
    
    if (prompt) prompt.style.display = 'block';
    if (dashboard) dashboard.style.display = 'none';
    if (progress) progress.style.display = 'none';
  }

  /**
   * Show calibration progress
   */
  private showCalibrationProgress(): void {
    const prompt = document.getElementById('coga-calibration-prompt');
    const dashboard = document.getElementById('coga-dashboard');
    const progress = document.getElementById('coga-calibration-progress');
    
    if (prompt) prompt.style.display = 'none';
    if (dashboard) dashboard.style.display = 'none';
    if (progress) progress.style.display = 'block';
  }

  /**
   * Show dashboard
   */
  private showDashboard(): void {
    const prompt = document.getElementById('coga-calibration-prompt');
    const dashboard = document.getElementById('coga-dashboard');
    const progress = document.getElementById('coga-calibration-progress');
    const settings = document.getElementById('coga-settings-view');
    
    if (prompt) prompt.style.display = 'none';
    if (progress) progress.style.display = 'none';
    if (settings) settings.style.display = 'none';
    if (dashboard) dashboard.style.display = 'block';
  }

  /**
   * Show settings
   */
  private showSettings(): void {
    const dashboard = document.getElementById('coga-dashboard');
    const settings = document.getElementById('coga-settings-view');
    
    if (dashboard) dashboard.style.display = 'none';
    if (settings) settings.style.display = 'block';
    
    // Load current settings
    this.loadSettings();
  }

  /**
   * Update calibration progress
   */
  private updateCalibrationProgress(progress: number, message: string): void {
    const progressBar = document.getElementById('coga-progress-bar');
    const progressPercent = document.getElementById('coga-progress-percent');
    const progressMessage = document.getElementById('coga-calibration-message');

    if (progressBar) {
      progressBar.style.width = `${progress}%`;
    }

    if (progressPercent) {
      progressPercent.textContent = `${progress.toFixed(1)}%`;
    }

    if (progressMessage) {
      progressMessage.textContent = message;
    }
  }

  /**
   * Start calibration
   */
  private startCalibration(): void {
    if (this.cogaInstance) {
      window.dispatchEvent(new CustomEvent('coga:start-calibration'));
    }
  }

  /**
   * Set sensitivity
   */
  private setSensitivity(sensitivity: 'low' | 'medium' | 'high'): void {
    // Update UI
    ['low', 'medium', 'high'].forEach(s => {
      const btn = document.getElementById(`coga-settings-sensitivity-${s}`);
      if (btn) {
        btn.classList.toggle('active', s === sensitivity);
      }
    });

    // Save to COGA
    if (this.cogaInstance && this.cogaInstance.settingsManager) {
      this.cogaInstance.settingsManager.setSensitivity(sensitivity);
    }
  }

  /**
   * Save intervention limits
   */
  private saveInterventionLimits(): void {
    const cooldown = document.getElementById('coga-settings-cooldown-minutes') as HTMLInputElement;
    const maxPerHour = document.getElementById('coga-settings-max-per-hour') as HTMLInputElement;
    const maxPerDay = document.getElementById('coga-settings-max-per-day') as HTMLInputElement;

    if (cooldown && maxPerHour && maxPerDay && this.cogaInstance?.settingsManager) {
      this.cogaInstance.settingsManager.setInterventionLimits({
        cooldownMinutes: parseInt(cooldown.value) || 8,
        maxPerHour: parseInt(maxPerHour.value) || 2,
        maxPerDay: parseInt(maxPerDay.value) || 6,
      });
    }
  }

  /**
   * Reset intervention limits
   */
  private resetInterventionLimits(): void {
    const cooldown = document.getElementById('coga-settings-cooldown-minutes') as HTMLInputElement;
    const maxPerHour = document.getElementById('coga-settings-max-per-hour') as HTMLInputElement;
    const maxPerDay = document.getElementById('coga-settings-max-per-day') as HTMLInputElement;

    if (cooldown) cooldown.value = '8';
    if (maxPerHour) maxPerHour.value = '2';
    if (maxPerDay) maxPerDay.value = '6';
  }

  /**
   * Add suppressed domain
   */
  private addSuppressedDomain(): void {
    const input = document.getElementById('coga-settings-domain-input') as HTMLInputElement;
    const domain = input?.value.trim();
    
    if (domain && this.cogaInstance?.settingsManager) {
      const current = this.cogaInstance.settingsManager.getSettings().suppressedDomains || [];
      this.cogaInstance.settingsManager.setSuppressedDomains([...current, domain]);
      input.value = '';
      this.updateDomainsList();
    }
  }

  /**
   * Update domains list
   */
  private updateDomainsList(): void {
    const list = document.getElementById('coga-settings-domains-list');
    if (!list || !this.cogaInstance?.settingsManager) return;

    const domains = this.cogaInstance.settingsManager.getSettings().suppressedDomains || [];
    
    if (domains.length === 0) {
      list.innerHTML = '<p class="coga-domains-empty">No suppressed domains yet</p>';
    } else {
      list.innerHTML = domains.map(domain => `
        <div class="coga-domain-item">
          <span>${domain}</span>
          <button class="coga-domain-remove" data-domain="${domain}">Remove</button>
        </div>
      `).join('');
    }
  }

  /**
   * Save interventions
   */
  private saveInterventions(): void {
    if (!this.cogaInstance?.settingsManager) return;

    const interventions: Record<string, boolean> = {};
    const interventionKeys = [
      'oneBreathReset',
      'boxBreathing',
      'twentyTwentyGaze',
      'figureEightSmoothPursuit',
      'nearFarFocusShift',
      'microBreak',
    ];

    interventionKeys.forEach(key => {
      const checkbox = document.getElementById(`coga-settings-intervention-${key}`) as HTMLInputElement;
      interventions[key] = checkbox?.checked ?? true;
    });

    this.cogaInstance.settingsManager.setEnabledInterventions(interventions);
  }

  /**
   * Select all interventions
   */
  private selectAllInterventions(): void {
    const interventionKeys = [
      'oneBreathReset',
      'boxBreathing',
      'twentyTwentyGaze',
      'figureEightSmoothPursuit',
      'nearFarFocusShift',
      'microBreak',
    ];

    interventionKeys.forEach(key => {
      const checkbox = document.getElementById(`coga-settings-intervention-${key}`) as HTMLInputElement;
      if (checkbox) checkbox.checked = true;
    });
  }

  /**
   * Load settings into UI
   */
  private loadSettings(): void {
    if (!this.cogaInstance?.settingsManager) return;

    const settings = this.cogaInstance.settingsManager.getSettings();

    // Sensitivity
    const sensitivity = settings.sensitivity || 'medium';
    ['low', 'medium', 'high'].forEach(s => {
      const btn = document.getElementById(`coga-settings-sensitivity-${s}`);
      if (btn) {
        btn.classList.toggle('active', s === sensitivity);
      }
    });

    // Intervention limits
    const limits = settings.interventionLimits || { cooldownMinutes: 8, maxPerHour: 2, maxPerDay: 6 };
    const cooldown = document.getElementById('coga-settings-cooldown-minutes') as HTMLInputElement;
    const maxPerHour = document.getElementById('coga-settings-max-per-hour') as HTMLInputElement;
    const maxPerDay = document.getElementById('coga-settings-max-per-day') as HTMLInputElement;
    
    if (cooldown) cooldown.value = limits.cooldownMinutes.toString();
    if (maxPerHour) maxPerHour.value = limits.maxPerHour.toString();
    if (maxPerDay) maxPerDay.value = limits.maxPerDay.toString();

    // Interventions
    const enabled = settings.enabledInterventions || {};
    Object.keys(enabled).forEach(key => {
      const checkbox = document.getElementById(`coga-settings-intervention-${key}`) as HTMLInputElement;
      if (checkbox) checkbox.checked = enabled[key] ?? true;
    });

    // Domains
    this.updateDomainsList();
  }

  /**
   * Navigate settings steps
   */
  private navigateSettingsStep(direction: number): void {
    // Implementation would track current step and navigate
    // This is a simplified version
    console.log('[ElectronDashboardView] Navigate settings step:', direction);
  }

  /**
   * Toggle compact stats
   */
  private toggleCompactStats(): void {
    const stats = document.getElementById('coga-compact-stats');
    const toggle = document.getElementById('coga-compact-toggle');
    
    if (stats && toggle) {
      const isExpanded = stats.style.display !== 'none';
      stats.style.display = isExpanded ? 'none' : 'block';
      toggle.setAttribute('aria-expanded', (!isExpanded).toString());
    }
  }

  /**
   * Capitalize first letter
   */
  private capitalizeFirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /**
   * Cleanup
   */
  destroy(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }
}

export default ElectronDashboardView;

