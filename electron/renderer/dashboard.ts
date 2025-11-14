/**
 * ElectronDashboard.ts
 * Full-window dashboard for Electron app displaying real-time stress detection
 * Now uses widget UI components from extension/src/ui
 */

import ElectronDashboardView from './ElectronDashboardView';
import type { StressScore, StressLevel, BehavioralMetrics } from '../../extension/src/types';

class ElectronDashboard {
  private cogaInstance: any;
  private updateInterval: number | null;
  private dashboardView: ElectronDashboardView | null;

  constructor() {
    this.updateInterval = null;
    this.dashboardView = null;
  }

  /**
   * Initialize the dashboard
   */
  async init(): Promise<void> {
    try {
      // Show dashboard immediately (don't wait for COGA)
      this.showDashboard();
      
      // Try to wait for COGA, but don't block dashboard display
      try {
        await this.waitForCOGA();
        console.log('[Dashboard] COGA instance found');
        
        // Initialize dashboard view using widget UI components
        this.dashboardView = new ElectronDashboardView();
        await this.dashboardView.init();
        
      } catch (error) {
        console.warn('[Dashboard] COGA not available yet, will retry:', error);
        // Show error state but keep dashboard visible
        this.updateStatus('Waiting for COGA...', 'normal');
        // Retry in background
        this.retryCOGAConnection();
      }
    } catch (error) {
      console.error('[Dashboard] Initialization error:', error);
      // Still show dashboard even on error
      this.showDashboard();
      this.showError('Failed to initialize dashboard. Please check console for details.');
    }
  }

  /**
   * Retry COGA connection in background
   */
  private retryCOGAConnection(): void {
    let attempts = 0;
    const maxAttempts = 100; // 10 seconds total
    
    const retry = async () => {
      attempts++;
      if ((window as any).COGA) {
        this.cogaInstance = (window as any).COGA;
        console.log('[Dashboard] COGA connection established');
        
        // Initialize dashboard view
        if (!this.dashboardView) {
          this.dashboardView = new ElectronDashboardView();
          await this.dashboardView.init();
        }
        
        this.updateStatus('Monitoring', 'normal');
      } else if (attempts < maxAttempts) {
        setTimeout(retry, 100);
      } else {
        this.updateStatus('COGA not available', 'normal');
        const statusDot = document.querySelector('.status-dot');
        if (statusDot) {
          statusDot.className = 'status-dot error';
        }
        console.error('[Dashboard] COGA connection failed after retries');
      }
    };
    
    setTimeout(retry, 500);
  }

  /**
   * Wait for COGA instance to be available
   */
  private async waitForCOGA(): Promise<void> {
    return new Promise((resolve, reject) => {
      let attempts = 0;
      const maxAttempts = 100; // 10 seconds max wait

      const checkCOGA = () => {
        attempts++;
        if ((window as any).COGA) {
          this.cogaInstance = (window as any).COGA;
          resolve();
        } else if (attempts >= maxAttempts) {
          reject(new Error('COGA instance not found after 10 seconds'));
        } else {
          setTimeout(checkCOGA, 100);
        }
      };

      checkCOGA();
    });
  }

  /**
   * Show dashboard and hide splash
   */
  private showDashboard(): void {
    const splash = document.getElementById('splash-screen');
    const dashboard = document.getElementById('dashboard');

    console.log('[Dashboard] Showing dashboard, hiding splash');
    
    if (splash) {
      splash.style.display = 'none';
      console.log('[Dashboard] Splash hidden');
    } else {
      console.warn('[Dashboard] Splash element not found');
    }
    
    if (dashboard) {
      dashboard.style.display = 'flex';
      console.log('[Dashboard] Dashboard shown');
    } else {
      console.error('[Dashboard] Dashboard element not found!');
    }
  }

  /**
   * Setup event listeners (now handled by ElectronDashboardView)
   */
  private setupEventListeners(): void {
    // Event listeners are now handled by ElectronDashboardView
    // This method is kept for compatibility but does nothing
  }

  /**
   * Check initial state and show appropriate UI (now handled by ElectronDashboardView)
   */
  private async checkInitialState(): Promise<void> {
    // Handled by ElectronDashboardView
  }

  /**
   * Start real-time updates (now handled by ElectronDashboardView)
   */
  private startUpdates(): void {
    // Handled by ElectronDashboardView
  }

  /**
   * Update dashboard with latest data (now handled by ElectronDashboardView)
   */
  private async updateDashboard(): Promise<void> {
    // Handled by ElectronDashboardView
  }

  /**
   * Update stress level display (now handled by ElectronDashboardView)
   */
  private updateStressDisplay(score: StressScore): void {
    // Handled by ElectronDashboardView
  }

  /**
   * Update metrics display (now handled by ElectronDashboardView)
   */
  private updateMetricsDisplay(metrics: BehavioralMetrics): void {
    // Handled by ElectronDashboardView
  }

  /**
   * Update status indicator
   */
  private updateStatus(text: string, level: StressLevel): void {
    const statusText = document.getElementById('status-text');
    const statusDot = document.querySelector('.status-dot');

    if (statusText) {
      statusText.textContent = text;
    }

    if (statusDot) {
      statusDot.className = 'status-dot';
      if (level === 'high' || level === 'very-high') {
        statusDot.classList.add('error');
      } else if (level === 'moderate') {
        statusDot.classList.add('warning');
      }
    }
  }

  /**
   * Show calibration prompt
   */
  private showCalibrationPrompt(): void {
    const prompt = document.getElementById('calibration-prompt');
    const progress = document.getElementById('calibration-progress');
    
    if (prompt) prompt.style.display = 'block';
    if (progress) progress.style.display = 'none';
  }

  /**
   * Show calibration progress
   */
  private showCalibrationProgress(): void {
    const prompt = document.getElementById('calibration-prompt');
    const progress = document.getElementById('calibration-progress');
    
    if (prompt) prompt.style.display = 'none';
    if (progress) progress.style.display = 'block';
  }

  /**
   * Hide calibration views
   */
  private hideCalibrationViews(): void {
    const prompt = document.getElementById('calibration-prompt');
    const progress = document.getElementById('calibration-progress');
    
    if (prompt) prompt.style.display = 'none';
    if (progress) progress.style.display = 'none';
  }

  /**
   * Update calibration progress
   */
  private updateCalibrationProgress(progress: number, message: string): void {
    const progressFill = document.getElementById('calibration-progress-fill');
    const progressPercent = document.getElementById('calibration-percent');
    const progressTime = document.getElementById('calibration-time');
    const progressMessage = document.getElementById('calibration-message');

    if (progressFill) {
      progressFill.style.width = `${progress}%`;
    }

    if (progressPercent) {
      progressPercent.textContent = `${progress.toFixed(1)}%`;
    }

    if (progressMessage) {
      progressMessage.textContent = message;
    }

    // Show progress view
    this.showCalibrationProgress();
  }

  /**
   * Start calibration
   */
  private async startCalibration(): Promise<void> {
    try {
      if (!this.cogaInstance) return;

      // Dispatch calibration start event
      window.dispatchEvent(new CustomEvent('coga:start-calibration'));

      this.showCalibrationProgress();
      this.updateStatus('Calibrating', 'normal');
    } catch (error) {
      console.error('[Dashboard] Error starting calibration:', error);
    }
  }

  /**
   * Show error message
   */
  private showError(message: string): void {
    const statusText = document.getElementById('status-text');
    const statusDot = document.querySelector('.status-dot');
    
    if (statusText) {
      statusText.textContent = message;
    }
    
    if (statusDot) {
      statusDot.className = 'status-dot error';
    }
    
    // Also show error in a visible place
    const dashboard = document.getElementById('dashboard');
    if (dashboard) {
      // Create or update error message in dashboard
      let errorDiv = document.getElementById('dashboard-error');
      if (!errorDiv) {
        errorDiv = document.createElement('div');
        errorDiv.id = 'dashboard-error';
        errorDiv.style.cssText = 'padding: 1rem; margin: 1rem; background: rgba(239, 68, 68, 0.2); border: 1px solid rgba(239, 68, 68, 0.5); border-radius: 8px; color: #ef4444;';
        const content = dashboard.querySelector('.dashboard-content');
        if (content) {
          content.insertBefore(errorDiv, content.firstChild);
        }
      }
      errorDiv.textContent = `Error: ${message}`;
    }
  }

  /**
   * Get keyboard stress level from z-score
   */
  private getKeyboardStressLevel(zScore: number): string {
    if (zScore < 1.0) return 'Normal';
    if (zScore < 2.0) return 'Moderate';
    if (zScore < 3.0) return 'High';
    return 'Very High';
  }

  /**
   * Get CSS class for stress level
   */
  private getStressClass(level: string): string {
    const levelLower = level.toLowerCase();
    if (levelLower.includes('very high') || levelLower.includes('high')) return 'error';
    if (levelLower.includes('moderate')) return 'warning';
    return 'normal';
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
    
    if (this.dashboardView) {
      this.dashboardView.destroy();
      this.dashboardView = null;
    }
  }
}

// Initialize dashboard when DOM is ready
function initializeDashboard() {
  console.log('[Dashboard] Initializing dashboard...');
  console.log('[Dashboard] COGA available:', !!(window as any).COGA);
  console.log('[Dashboard] Document ready state:', document.readyState);
  
  const dashboard = new ElectronDashboard();
  dashboard.init().catch((error) => {
    console.error('[Dashboard] Failed to initialize:', error);
    // Ensure dashboard is shown even on error
    const splash = document.getElementById('splash-screen');
    const dash = document.getElementById('dashboard');
    if (splash) {
      splash.style.display = 'none';
      console.log('[Dashboard] Forced splash hidden on error');
    }
    if (dash) {
      dash.style.display = 'flex';
      console.log('[Dashboard] Forced dashboard shown on error');
    }
  });
  (window as any).electronDashboard = dashboard;
}

// Add a safety timeout to ensure dashboard shows even if something goes wrong
setTimeout(() => {
  const splash = document.getElementById('splash-screen');
  const dash = document.getElementById('dashboard');
  if (splash && splash.style.display !== 'none' && dash && dash.style.display === 'none') {
    console.warn('[Dashboard] Safety timeout: Forcing dashboard display');
    splash.style.display = 'none';
    dash.style.display = 'flex';
    // Try to initialize if not already done
    if (!(window as any).electronDashboard) {
      console.log('[Dashboard] Initializing dashboard from safety timeout');
      initializeDashboard();
    }
  }
}, 2000); // 2 second safety timeout

// Wait a bit for renderer.js to load, then initialize
function waitForRendererAndInit() {
  // Check if renderer.js has loaded (COGA might not be ready yet, but script should be)
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    // Small delay to let renderer.js execute
    setTimeout(initializeDashboard, 100);
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(initializeDashboard, 100);
    });
  }
}

waitForRendererAndInit();

export default ElectronDashboard;

