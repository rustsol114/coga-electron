/**
 * Dashboard integration script
 */

(function() {
  'use strict';
  
  let cogaLoaded = false;
  let cogaLoading = false;
  let statsRequestInProgress = false;
  let lastStressSnapshot = null;
  let lastInterventionStats = null;

  function normalizeNumber(value, fallback = 0) {
    const num = Number(value);
    return Number.isFinite(num) ? num : fallback;
  }

  function formatDecimal(value, decimals = 2) {
    return normalizeNumber(value).toFixed(decimals);
  }

  function formatInteger(value) {
    return Math.round(normalizeNumber(value)).toString();
  }

  function formatBooleanFlag(value) {
    return value ? 'Yes' : 'No';
  }

  function formatZScore(value) {
    return formatDecimal(Math.abs(normalizeNumber(value)), 2);
  }

  const DEFAULT_BASELINE_SECONDS = 60;

  function getBaselineDurationSeconds() {
    try {
      if (typeof window !== 'undefined') {
        const globalSeconds = Number(window.COGA_BASELINE_SECONDS);
        if (Number.isFinite(globalSeconds) && globalSeconds > 0) {
          return Math.round(globalSeconds);
        }
      }
    } catch (error) {
      // Ignore and fallback
    }
    return DEFAULT_BASELINE_SECONDS;
  }

  function formatDurationText(seconds) {
    const totalSeconds = Math.max(1, Math.round(seconds));

    if (totalSeconds < 60) {
      return `${totalSeconds} second${totalSeconds !== 1 ? 's' : ''}`;
    }

    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const remainingSeconds = totalSeconds % 60;
    const parts = [];

    if (hours > 0) {
      parts.push(`${hours} hour${hours !== 1 ? 's' : ''}`);
    }

    if (minutes > 0) {
      parts.push(`${minutes} minute${minutes !== 1 ? 's' : ''}`);
    }

    if (remainingSeconds > 0 && hours === 0) {
      parts.push(`${remainingSeconds} second${remainingSeconds !== 1 ? 's' : ''}`);
    }

    if (parts.length === 0) {
      const totalMinutes = totalSeconds / 60;
      return `${totalMinutes.toFixed(1)} minutes`;
    }

    return parts.join(' ');
  }

  function formatClockDuration(seconds) {
    const totalSeconds = Math.max(0, Math.round(seconds));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const remainderSeconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${remainderSeconds
        .toString()
        .padStart(2, '0')}`;
    }

    return `${minutes}:${remainderSeconds.toString().padStart(2, '0')}`;
  }

  function updateLandingCalibrationCopy() {
    try {
      const totalSeconds = getBaselineDurationSeconds();
      const durationText = formatDurationText(totalSeconds);

      document
        .querySelectorAll('[data-calibration-duration]')
        .forEach(function(element) {
          element.textContent = durationText;
        });

      const progressTime = document.getElementById('dashboard-progress-time');
      if (progressTime) {
        progressTime.textContent = `0:00 / ${formatClockDuration(totalSeconds)}`;
      }
    } catch (error) {
      console.error('[COGA] Error updating calibration copy:', error);
    }
  }

  const QUICK_DEMO_STORAGE_KEY = 'coga_quick_demo_state';
  const QUICK_DEMO_DURATION_MS = 10 * 60 * 1000;
  let quickDemoTimerId = null;
  let quickDemoOverlay = null;
  let quickDemoCountdownEl = null;
  let activeQuickDemoState = null;

  function readQuickDemoStateFromStorage() {
    try {
      const raw = localStorage.getItem(QUICK_DEMO_STORAGE_KEY);
      if (!raw) {
        return null;
      }
      const parsed = JSON.parse(raw);
      return sanitizeQuickDemoState(parsed);
    } catch (error) {
      console.error('[COGA] Error reading quick demo state:', error);
      return null;
    }
  }

  function sanitizeQuickDemoState(state) {
    if (!state || typeof state !== 'object') {
      return null;
    }

    const isActive = Boolean(state.isActive);
    const startedAt = Number(state.startedAt);
    const endsAt = Number(state.endsAt);
    const durationMs = Number(state.durationMs);

    if (!isActive || !Number.isFinite(startedAt) || !Number.isFinite(endsAt)) {
      return null;
    }

    if (endsAt <= Date.now()) {
      return null;
    }

    const normalizedDuration = Number.isFinite(durationMs) && durationMs > 0
      ? durationMs
      : QUICK_DEMO_DURATION_MS;

    return {
      isActive: true,
      startedAt,
      endsAt,
      durationMs: normalizedDuration,
    };
  }

  function ensureQuickDemoOverlay() {
    if (quickDemoOverlay) {
      return;
    }

    const overlay = document.createElement('div');
    overlay.className = 'coga-quick-demo-overlay';

    const label = document.createElement('strong');
    label.textContent = 'Quick Demo';

    const countdown = document.createElement('span');
    countdown.className = 'coga-quick-demo-countdown';
    countdown.textContent = '00:00';

    overlay.appendChild(label);
    overlay.appendChild(countdown);
    document.body.appendChild(overlay);

    quickDemoOverlay = overlay;
    quickDemoCountdownEl = countdown;
  }

  function removeQuickDemoOverlay() {
    if (quickDemoOverlay && quickDemoOverlay.parentNode) {
      quickDemoOverlay.parentNode.removeChild(quickDemoOverlay);
    }
    quickDemoOverlay = null;
    quickDemoCountdownEl = null;
  }

  function updateQuickDemoNote(state) {
    const noteEl = document.getElementById('dashboard-quick-demo-note');
    if (!noteEl) {
      return;
    }

    if (!state) {
      noteEl.style.display = 'none';
      noteEl.textContent = '';
      return;
    }

    const remainingSeconds = Math.max(0, Math.round((state.endsAt - Date.now()) / 1000));
    noteEl.style.display = 'block';
    noteEl.textContent = `Quick demo active — ${formatClockDuration(remainingSeconds)} remaining before calibration is required.`;
  }

  function showQuickDemoToast(message) {
    try {
      const toast = document.createElement('div');
      toast.className = 'coga-quick-demo-toast';
      toast.textContent = message;
      document.body.appendChild(toast);

      window.setTimeout(() => {
        toast.classList.add('coga-quick-demo-toast-hide');
        window.setTimeout(() => {
          if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
          }
        }, 300);
      }, 3500);
    } catch (error) {
      console.error('[COGA] Error showing quick demo toast:', error);
    }
  }

  function startQuickDemoCountdown(state) {
    activeQuickDemoState = state;
    ensureQuickDemoOverlay();
    updateQuickDemoCountdown();
    updateQuickDemoNote(state);

    const skipBtn = document.getElementById('dashboard-skip-demo');
    if (skipBtn) {
      skipBtn.disabled = true;
      skipBtn.textContent = 'Quick demo running…';
    }

    if (quickDemoTimerId) {
      window.clearInterval(quickDemoTimerId);
    }
    quickDemoTimerId = window.setInterval(() => {
      updateQuickDemoCountdown();
    }, 1000);
  }

  function stopQuickDemoCountdown(reason) {
    if (quickDemoTimerId) {
      window.clearInterval(quickDemoTimerId);
      quickDemoTimerId = null;
    }
    activeQuickDemoState = null;
    removeQuickDemoOverlay();
    updateQuickDemoNote(null);

    const skipBtn = document.getElementById('dashboard-skip-demo');
    if (skipBtn) {
      skipBtn.disabled = false;
      skipBtn.textContent = 'Skip calibration (10-min demo)';
    }

    if (reason === 'expired') {
      showQuickDemoToast('Quick demo ended — calibration is now required.');
    }
  }

  function updateQuickDemoCountdown() {
    if (!activeQuickDemoState) {
      return;
    }

    const remainingMs = Math.max(0, activeQuickDemoState.endsAt - Date.now());
    const remainingSeconds = Math.round(remainingMs / 1000);

    if (quickDemoCountdownEl) {
      quickDemoCountdownEl.textContent = formatClockDuration(remainingSeconds);
    }

    updateQuickDemoNote(activeQuickDemoState);

    if (remainingMs <= 0) {
      stopQuickDemoCountdown('expired');
    }
  }

  function applyQuickDemoState(state) {
    if (state && state.isActive) {
      startQuickDemoCountdown(state);
    } else {
      stopQuickDemoCountdown();
    }
  }

  async function startQuickDemoFlow(triggerBtn) {
    try {
      if (triggerBtn) {
        triggerBtn.disabled = true;
        triggerBtn.textContent = 'Starting quick demo…';
      }

      const preset = window.COGA_BASELINE_PRESET;
      if (!preset) {
        showQuickDemoToast('Default baseline preset not available.');
        if (triggerBtn) {
          triggerBtn.disabled = false;
          triggerBtn.textContent = 'Skip calibration (10-min demo)';
        }
        return;
      }

      const coga = getCOGAInstance();

      if (coga && typeof coga.startQuickDemo === 'function') {
        await coga.startQuickDemo(QUICK_DEMO_DURATION_MS, preset);
      } else {
        window.dispatchEvent(
          new CustomEvent('coga:start-quick-demo', {
            detail: { durationMs: QUICK_DEMO_DURATION_MS, preset },
          })
        );
      }

      setTimeout(() => {
        const stored = readQuickDemoStateFromStorage();
        if (stored) {
          applyQuickDemoState(stored);
        }
      }, 250);
    } catch (error) {
      console.error('[COGA] Error starting quick demo:', error);
      showQuickDemoToast('Unable to start quick demo. Please try again.');
      stopQuickDemoCountdown();
    } finally {
      if (!activeQuickDemoState && triggerBtn) {
        triggerBtn.disabled = false;
        triggerBtn.textContent = 'Skip calibration (10-min demo)';
      }
    }
  }


  function getCOGAInstance() {
    try {
      if (window.COGA && typeof window.COGA.getStatus === 'function') {
        return window.COGA;
      }
    } catch (error) {
      console.error('[COGA] Error retrieving COGA instance:', error);
    }
    return null;
  }

  window.addEventListener('coga:stress-updated', (event) => {
    try {
      const snapshot = event && event.detail ? event.detail : null;
      if (!snapshot) {
        return;
      }
      applyStressSnapshot(snapshot);
      updateInteractiveMetrics(snapshot.metrics || null);
    } catch (error) {
      console.error('[COGA] Error handling stress update event:', error);
    }
  });

  window.addEventListener('coga:intervention-history-updated', (event) => {
    try {
      const stats = event && event.detail ? event.detail : null;
      if (!stats) {
        return;
      }
      lastInterventionStats = stats;
      renderInterventionStats(stats);
    } catch (error) {
      console.error('[COGA] Error handling intervention update event:', error);
    }
  });

  window.addEventListener('coga:quick-demo-start', (event) => {
    try {
      const state = sanitizeQuickDemoState(event && event.detail);
      if (state) {
        applyQuickDemoState(state);
      }
    } catch (error) {
      console.error('[COGA] Error handling quick demo start event:', error);
    }
  });

  window.addEventListener('coga:quick-demo-update', (event) => {
    try {
      const state = sanitizeQuickDemoState(event && event.detail);
      if (state) {
        applyQuickDemoState(state);
      }
    } catch (error) {
      console.error('[COGA] Error handling quick demo update event:', error);
    }
  });

  window.addEventListener('coga:quick-demo-end', (event) => {
    try {
      const detail = event && event.detail;
      const reason = detail && typeof detail.reason === 'string' ? detail.reason : undefined;
      stopQuickDemoCountdown(reason);
    } catch (error) {
      console.error('[COGA] Error handling quick demo end event:', error);
    }
  });

  function toMilliseconds(seconds) {
    if (!Number.isFinite(seconds)) {
      return 0;
    }
    return seconds * 1000;
  }
  
  function applyStressSnapshot(snapshot) {
    try {
      if (!snapshot) {
        return;
      }

      lastStressSnapshot = snapshot;

      const level = typeof snapshot.level === 'string' ? snapshot.level : 'normal';
      const combined = normalizeNumber(snapshot.combined);
      const mouseScore = normalizeNumber(snapshot.mouse);
      const keyboardScore = normalizeNumber(snapshot.keyboard);

      const stressEl = document.getElementById('dashboard-stress');
      if (stressEl) {
        stressEl.textContent = capitalizeFirst(level);
      }

      const stressScoreEl = document.getElementById('dashboard-stress-score');
      if (stressScoreEl) {
        stressScoreEl.textContent = formatDecimal(combined, 2);
      }

      const mouseScoreEl = document.getElementById('dashboard-mouse-score');
      if (mouseScoreEl) {
        mouseScoreEl.textContent = formatZScore(mouseScore);
      }

      const keyboardScoreEl = document.getElementById('dashboard-keyboard-score');
      if (keyboardScoreEl) {
        keyboardScoreEl.textContent = formatZScore(keyboardScore);
      }
    } catch (error) {
      console.error('[COGA] Error applying stress snapshot:', error);
    }
  }

  function getLatestStressSnapshot() {
    try {
      const coga = getCOGAInstance();
      if (!coga) {
        return null;
      }

      if (typeof coga.getLatestStressScore === 'function') {
        const latest = coga.getLatestStressScore();
        if (latest) {
          return latest;
        }
      }

      if (typeof coga.getHistory === 'function') {
        const history = coga.getHistory();
        if (Array.isArray(history) && history.length > 0) {
          return history[history.length - 1];
        }
      }

      return null;
    } catch (error) {
      console.error('[COGA] Error obtaining latest stress snapshot:', error);
      return null;
    }
  }

  function renderInterventionStats(stats) {
    try {
      const interventionsEl = document.getElementById('dashboard-interventions');
      if (!interventionsEl) {
        return;
      }
      const total = stats && typeof stats.total !== 'undefined' ? stats.total : 0;
      interventionsEl.textContent = formatInteger(total);
    } catch (error) {
      console.error('[COGA] Error rendering intervention stats:', error);
    }
  }

  // Load COGA when on dashboard route
  function loadCOGA() {
    if (cogaLoaded || cogaLoading || getCOGAInstance()) {
      return;
    }
    
    try {
      const script = document.createElement('script');
      script.src = '{{PUBLIC_URL}}/coga.min.js';
      script.onload = function() {
        cogaLoaded = true;
        cogaLoading = false;
        console.log('[COGA] Dashboard: Successfully loaded');
        
        // Wait for COGA to initialize then setup
        setTimeout(setupDashboard, 500);
      };
      script.onerror = function() {
        cogaLoading = false;
        console.error('[COGA] Dashboard: Failed to load');
      };
      cogaLoading = true;
      document.head.appendChild(script);
    } catch (error) {
      console.error('[COGA] Error loading dashboard:', error);
    }
  }
  
  // Setup dashboard integration
  function setupDashboard() {
    try {
      const coga = getCOGAInstance();
      if (!coga) {
        console.log('[COGA] Dashboard: Waiting for COGA...');
        setTimeout(setupDashboard, 500);
        return;
      }
      
      // Update dashboard UI immediately
      updateDashboardState();
      
      // Listen for calibration start events
      window.addEventListener('coga:start-calibration', function() {
        updateDashboardState();
      });
      
      // Listen for calibration completion events
      window.addEventListener('coga:calibration-complete', function() {
        console.log('[COGA] Dashboard: Calibration complete, updating state...');
        // Small delay to ensure baseline is saved
        setTimeout(function() {
          updateDashboardState();
          updateBaselineResults();
          updateDashboardMetrics();
        }, 100);
      });
      
      // Start update loop that updates both state and metrics
      setInterval(function() {
        if (window.location.hash === '#dashboard') {
          updateDashboardState();
          updateBaselineResults();
          updateDashboardMetrics();
          
          const status = window.COGA.getStatus ? window.COGA.getStatus() : null;
          
          // Update calibration progress and metrics in real-time during calibration
          if (status && status.calibrating) {
            const progress = window.COGA.getCalibrationProgress ? window.COGA.getCalibrationProgress() : 0;
            updateCalibrationProgress(progress);
            updateCalibrationMetrics();
            updateKeyStatistics(true); // true = calibration mode
            updateMouseZones(true); // true = calibration mode
          } else if (status && status.baselineExists) {
            // Update interactive content metrics after calibration
            updateInteractiveMetrics();
            updateKeyStatistics(false); // false = dashboard mode
            updateMouseZones(false); // false = dashboard mode
          }
        }
      }, 1000);
      
    } catch (error) {
      console.error('[COGA] Error setting up dashboard:', error);
    }
  }
  
  // Update calibration metrics in real-time
  function updateCalibrationMetrics() {
    try {
      if (!window.COGA || typeof window.COGA.getCurrentMetrics !== 'function') {
        return;
      }

      const currentMetrics = window.COGA.getCurrentMetrics();
      if (!currentMetrics) {
        return;
      }

      const mouseMetrics = currentMetrics.mouse || {};
      const keyboardMetrics = currentMetrics.keyboard || {};
      const scrollMetrics = currentMetrics.scroll || {};

      const mouseVelocityEl = document.getElementById('cal-mouse-velocity');
      if (mouseVelocityEl) {
        mouseVelocityEl.textContent = formatDecimal(mouseMetrics.movementVelocity, 2);
      }
      
      const mouseClicksEl = document.getElementById('cal-mouse-clicks');
      if (mouseClicksEl) {
        mouseClicksEl.textContent = formatDecimal(mouseMetrics.clickFrequencyPerMin, 2);
      }
      
      const keyboardSpeedEl = document.getElementById('cal-keyboard-speed');
      if (keyboardSpeedEl) {
        keyboardSpeedEl.textContent = formatDecimal(keyboardMetrics.typingSpeedPerMin, 2);
      }
      
      const keyboardErrorEl = document.getElementById('cal-keyboard-error');
      if (keyboardErrorEl) {
        keyboardErrorEl.textContent = formatDecimal(keyboardMetrics.typingErrorRate, 2);
      }
      
      const scrollVelocityEl = document.getElementById('cal-scroll-velocity');
      if (scrollVelocityEl) {
        scrollVelocityEl.textContent = formatDecimal(scrollMetrics.velocity, 2);
      }
    } catch (error) {
      console.error('[COGA] Error updating calibration metrics:', error);
    }
  }
  
  // Update interactive metrics in dashboard (after calibration)
  function updateInteractiveMetrics(forcedMetrics) {
    try {
      let resolvedMetrics = forcedMetrics || null;

      if (!resolvedMetrics && lastStressSnapshot && lastStressSnapshot.metrics) {
        resolvedMetrics = lastStressSnapshot.metrics;
      }

      if (!resolvedMetrics) {
        if (!window.COGA || typeof window.COGA.getCurrentMetrics !== 'function') {
          return;
        }
        resolvedMetrics = window.COGA.getCurrentMetrics();
      }

      if (!resolvedMetrics) {
        return;
      }

      const mouseMetrics = resolvedMetrics.mouse || {};
      const keyboardMetrics = resolvedMetrics.keyboard || {};
      const scrollMetrics = resolvedMetrics.scroll || {};

      const mouseVelocityEl = document.getElementById('dashboard-mouse-velocity');
      if (mouseVelocityEl) {
        mouseVelocityEl.textContent = formatDecimal(mouseMetrics.movementVelocity, 2);
      }
      
      const mouseClicksEl = document.getElementById('dashboard-mouse-clicks');
      if (mouseClicksEl) {
        mouseClicksEl.textContent = formatDecimal(mouseMetrics.clickFrequencyPerMin, 2);
      }
      
      const mouseRageEl = document.getElementById('dashboard-mouse-rage');
      if (mouseRageEl) {
        mouseRageEl.textContent = formatBooleanFlag(Boolean(mouseMetrics.rageClickDetected));
      }
      
      const keyboardSpeedEl = document.getElementById('dashboard-keyboard-speed');
      if (keyboardSpeedEl) {
        keyboardSpeedEl.textContent = formatDecimal(keyboardMetrics.typingSpeedPerMin, 2);
      }
      
      const keyboardErrorEl = document.getElementById('dashboard-keyboard-error');
      if (keyboardErrorEl) {
        keyboardErrorEl.textContent = formatDecimal(keyboardMetrics.typingErrorRate, 2);
      }
      
      const keyboardPauseEl = document.getElementById('dashboard-keyboard-pause');
      if (keyboardPauseEl) {
        const pauseMs = toMilliseconds(keyboardMetrics.avgPauseDuration);
        keyboardPauseEl.textContent = formatInteger(pauseMs);
      }
      
      const scrollVelocityEl = document.getElementById('dashboard-scroll-velocity');
      if (scrollVelocityEl) {
        scrollVelocityEl.textContent = formatDecimal(scrollMetrics.velocity, 2);
      }
    } catch (error) {
      console.error('[COGA] Error updating interactive metrics:', error);
    }
  }
  
  // Update key statistics
  function updateKeyStatistics(isCalibration) {
    try {
      if (!window.COGA) return;
      
      const keyStats = window.COGA.getKeyStatistics ? window.COGA.getKeyStatistics() : [];
      const keysListEl = document.getElementById(isCalibration ? 'calibration-keys-list' : 'dashboard-keys-list');
      
      if (!keysListEl) return;
      
      if (keyStats.length === 0) {
        keysListEl.innerHTML = '<div class="calibration-keys-empty">Start typing to see statistics...</div>';
        return;
      }
      
      // Sort by count and take top 10
      const topKeys = keyStats.slice(0, 10);
      
      keysListEl.innerHTML = topKeys.map(stat => {
        const keyDisplay = stat.key === ' ' ? 'Space' : stat.key.length === 1 ? stat.key.toUpperCase() : stat.key;
        return `
          <div class="calibration-key-item">
            <span class="calibration-key-name">${keyDisplay}</span>
            <div class="calibration-key-stats">
              <span>Count: ${stat.count}</span>
              <span>Freq: ${stat.frequency.toFixed(1)}/min</span>
            </div>
          </div>
        `;
      }).join('');
    } catch (error) {
      console.error('[COGA] Error updating key statistics:', error);
    }
  }
  
  // Update mouse zones visualization
  function updateMouseZones(isCalibration) {
    try {
      if (!window.COGA) return;
      
      const zoneStats = window.COGA.getMouseZoneStatistics ? window.COGA.getMouseZoneStatistics() : [];
      const zonesGridEl = document.getElementById(isCalibration ? 'calibration-zones-grid' : 'dashboard-zones-grid');
      
      if (!zonesGridEl) return;
      
      // Zone labels
      const zoneLabels = [
        'TL', 'TC', 'TR',
        'ML', 'MC', 'MR',
        'BL', 'BC', 'BR'
      ];
      
      // Find max percentage for highlighting
      const maxPercentage = Math.max(...zoneStats.map(z => z.percentage), 0);
      const prefix = isCalibration ? 'cal' : 'dashboard';
      
      // Create zones if not already created
      if (zonesGridEl.children.length === 0) {
        for (let i = 0; i < 9; i++) {
          const cell = document.createElement('div');
          cell.className = 'calibration-zone-cell';
          cell.id = `${prefix}-zone-${i}`;
          cell.innerHTML = `
            <span class="calibration-zone-label">${zoneLabels[i]}</span>
            <span class="calibration-zone-value" id="${prefix}-zone-value-${i}">0%</span>
          `;
          zonesGridEl.appendChild(cell);
        }
      }
      
      // Update zone values
      zoneStats.forEach((zone, index) => {
        const valueEl = document.getElementById(`${prefix}-zone-value-${index}`);
        const cellEl = document.getElementById(`${prefix}-zone-${index}`);
        
        if (valueEl) {
          valueEl.textContent = zone.percentage.toFixed(1) + '%';
        }
        
        if (cellEl) {
          if (zone.percentage > 0 && zone.percentage === maxPercentage) {
            cellEl.classList.add('active');
          } else {
            cellEl.classList.remove('active');
          }
        }
      });
    } catch (error) {
      console.error('[COGA] Error updating mouse zones:', error);
    }
  }
  
  // Update dashboard state
  function updateDashboardState() {
    try {
      const coga = getCOGAInstance();
      if (!coga) {
        // If COGA is not loaded yet, show calibration prompt
        const calibrationPrompt = document.getElementById('dashboard-calibration-prompt');
        const dashboardContent = document.getElementById('dashboard-content');
        const calibrationProgress = document.getElementById('dashboard-calibration-progress');
        
        if (calibrationPrompt) calibrationPrompt.style.display = 'block';
        if (dashboardContent) dashboardContent.style.display = 'none';
        if (calibrationProgress) calibrationProgress.style.display = 'none';
        return;
      }
      
      let status = null;
      try {
        status = coga.getStatus();
      } catch (statusError) {
        console.error('[COGA] Error retrieving dashboard status:', statusError);
        return;
      }
      
      if (!status || typeof status !== 'object') {
        console.warn('[COGA] Dashboard status is unavailable');
        return;
      }
      
      const calibrationPrompt = document.getElementById('dashboard-calibration-prompt');
      const dashboardContent = document.getElementById('dashboard-content');
      const calibrationProgress = document.getElementById('dashboard-calibration-progress');
      
      // Hide all
      if (calibrationPrompt) calibrationPrompt.style.display = 'none';
      if (dashboardContent) dashboardContent.style.display = 'none';
      if (calibrationProgress) calibrationProgress.style.display = 'none';
      
      // Show appropriate section
      if (status.calibrating) {
        if (calibrationProgress) calibrationProgress.style.display = 'block';
      } else if (status.baselineExists) {
        if (dashboardContent) dashboardContent.style.display = 'block';
      } else {
        if (calibrationPrompt) calibrationPrompt.style.display = 'block';
      }
    } catch (error) {
      console.error('[COGA] Error updating dashboard state:', error);
    }
  }
  
  // Update dashboard metrics
  function updateDashboardMetrics() {
    try {
      const coga = getCOGAInstance();
      if (!coga) {
        return;
      }

      const snapshot = getLatestStressSnapshot();
      if (snapshot) {
        applyStressSnapshot(snapshot);
        updateInteractiveMetrics(snapshot.metrics || null);
      }

      if (lastInterventionStats) {
        renderInterventionStats(lastInterventionStats);
      }

      if (!statsRequestInProgress && typeof coga.getStatistics === 'function') {
        statsRequestInProgress = true;
        Promise.resolve(coga.getStatistics())
          .then((stats) => {
            if (!stats) {
              return;
            }
            if (stats.interventions) {
              lastInterventionStats = stats.interventions;
              renderInterventionStats(stats.interventions);
            }
          })
          .catch((error) => {
            console.error('[COGA] Error fetching statistics:', error);
            renderInterventionStats({ total: 0 });
          })
          .finally(() => {
            statsRequestInProgress = false;
          });
      }
      
      const status = typeof coga.getStatus === 'function' ? coga.getStatus() : null;
      if (status && status.calibrating) {
        const progress = typeof coga.getCalibrationProgress === 'function'
          ? coga.getCalibrationProgress()
          : 0;
        updateCalibrationProgress(progress);
      }
    } catch (error) {
      console.error('[COGA] Error updating metrics:', error);
    }
  }
  
  // Update baseline results
  function updateBaselineResults() {
    try {
      const coga = getCOGAInstance();
      if (!coga) {
        return;
      }
      
      const baseline = typeof coga.getBaseline === 'function' ? coga.getBaseline() : null;
      const baselineResultsEl = document.getElementById('dashboard-baseline-results');
      
      if (baseline && baselineResultsEl) {
        // Show baseline results section
        baselineResultsEl.style.display = 'block';
        
        // Update mouse baseline
        if (baseline.mouse) {
          const mouseVelocityEl = document.getElementById('baseline-mouse-velocity');
          const mouseVelocityMadEl = document.getElementById('baseline-mouse-velocity-mad');
          const mouseClicksEl = document.getElementById('baseline-mouse-clicks');
          const mouseClicksMadEl = document.getElementById('baseline-mouse-clicks-mad');
          
          if (mouseVelocityEl) {
            mouseVelocityEl.textContent = formatDecimal(baseline.mouse.movementVelocity, 4);
          }
          if (mouseVelocityMadEl) {
            mouseVelocityMadEl.textContent = 'MAD: ' + formatDecimal(baseline.mouse.movementVelocityMAD, 4);
          }
          if (mouseClicksEl) {
            mouseClicksEl.textContent = formatDecimal(baseline.mouse.clickFrequencyPerMin, 2);
          }
          if (mouseClicksMadEl) {
            mouseClicksMadEl.textContent = 'MAD: ' + formatDecimal(baseline.mouse.clickFrequencyPerMinMAD, 2);
          }
        }
        
        // Update keyboard baseline
        if (baseline.keyboard) {
          const keyboardSpeedEl = document.getElementById('baseline-keyboard-speed');
          const keyboardSpeedMadEl = document.getElementById('baseline-keyboard-speed-mad');
          const keyboardErrorEl = document.getElementById('baseline-keyboard-error');
          const keyboardErrorMadEl = document.getElementById('baseline-keyboard-error-mad');
          const keyboardPauseEl = document.getElementById('baseline-keyboard-pause');
          const keyboardPauseMadEl = document.getElementById('baseline-keyboard-pause-mad');
          
          if (keyboardSpeedEl) {
            keyboardSpeedEl.textContent = formatDecimal(baseline.keyboard.typingSpeedPerMin, 2);
          }
          if (keyboardSpeedMadEl) {
            keyboardSpeedMadEl.textContent = 'MAD: ' + formatDecimal(baseline.keyboard.typingSpeedPerMinMAD, 2);
          }
          if (keyboardErrorEl) {
            keyboardErrorEl.textContent = formatDecimal(baseline.keyboard.typingErrorRate, 2);
          }
          if (keyboardErrorMadEl) {
            keyboardErrorMadEl.textContent = 'MAD: ' + formatDecimal(baseline.keyboard.typingErrorRateMAD, 2);
          }
          if (keyboardPauseEl) {
            const pauseMs = toMilliseconds(baseline.keyboard.avgPauseDuration);
            keyboardPauseEl.textContent = formatInteger(pauseMs);
          }
          if (keyboardPauseMadEl) {
            const pauseMadMs = toMilliseconds(baseline.keyboard.avgPauseDurationMAD);
            keyboardPauseMadEl.textContent = 'MAD: ' + formatInteger(pauseMadMs);
          }
        }
        
        // Update scroll baseline
        if (baseline.scroll) {
          const scrollVelocityEl = document.getElementById('baseline-scroll-velocity');
          const scrollVelocityMadEl = document.getElementById('baseline-scroll-velocity-mad');
          
          if (scrollVelocityEl) {
            scrollVelocityEl.textContent = formatDecimal(baseline.scroll.velocity, 4);
          }
          if (scrollVelocityMadEl) {
            scrollVelocityMadEl.textContent = 'MAD: ' + formatDecimal(baseline.scroll.velocityMAD, 4);
          }
        }
      } else if (baselineResultsEl) {
        // Hide if no baseline
        baselineResultsEl.style.display = 'none';
      }
    } catch (error) {
      console.error('[COGA] Error updating baseline results:', error);
    }
  }
  
  // Update calibration progress
  function updateCalibrationProgress(progress) {
    try {
      const progressBar = document.getElementById('dashboard-progress-bar');
      if (progressBar) {
        progressBar.style.width = progress + '%';
      }
      
      const progressPercent = document.getElementById('dashboard-progress-percent');
      if (progressPercent) {
        progressPercent.textContent = progress + '%';
      }
      
      const progressTime = document.getElementById('dashboard-progress-time');
      if (progressTime) {
        const totalSeconds = getBaselineDurationSeconds();
        const elapsed = Math.min(
          totalSeconds,
          Math.max(0, Math.round((progress / 100) * totalSeconds))
        );
        const remaining = Math.max(0, totalSeconds - elapsed);

        progressTime.textContent = `${formatClockDuration(remaining)} / ${formatClockDuration(totalSeconds)}`;
      }
    } catch (error) {
      console.error('[COGA] Error updating calibration progress:', error);
    }
  }
  
  // Helper
  function capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
  
  // Check if on dashboard route and load COGA
  document.addEventListener('DOMContentLoaded', function() {
    try {
      updateLandingCalibrationCopy();
      // Re-apply once more in case runtime scripts load after initial DOM ready
      setTimeout(updateLandingCalibrationCopy, 1000);

      // Add event listeners for calibration buttons
      const startBtn = document.getElementById('dashboard-start-calibration');
      const recalibrateBtn = document.getElementById('dashboard-recalibrate');
      const skipBtn = document.getElementById('dashboard-skip-demo');
      
      if (startBtn) {
        startBtn.addEventListener('click', function() {
          const coga = getCOGAInstance();
          if (coga && typeof coga.startCalibration === 'function') {
            coga.startCalibration();
          } else {
            window.dispatchEvent(new CustomEvent('coga:start-calibration'));
          }
        });
      }
      
      if (recalibrateBtn) {
        recalibrateBtn.addEventListener('click', function() {
          const coga = getCOGAInstance();
          if (coga && typeof coga.reset === 'function') {
            coga.reset().then(function() {
              const refreshed = getCOGAInstance();
              if (refreshed && typeof refreshed.startCalibration === 'function') {
                refreshed.startCalibration();
              } else {
                window.dispatchEvent(new CustomEvent('coga:start-calibration'));
              }
            });
          } else {
            window.dispatchEvent(new CustomEvent('coga:start-calibration'));
          }
        });
      }

      if (skipBtn) {
        skipBtn.addEventListener('click', function() {
          startQuickDemoFlow(skipBtn);
        });
      }

      const initialQuickDemoState = readQuickDemoStateFromStorage();
      if (initialQuickDemoState) {
        applyQuickDemoState(initialQuickDemoState);
      }
      setTimeout(() => {
        const delayedState = readQuickDemoStateFromStorage();
        if (delayedState) {
          applyQuickDemoState(delayedState);
        }
      }, 500);
      
      // Load COGA on dashboard route
      if (window.location.hash === '#dashboard' || window.location.hash === '') {
        loadCOGA();
      }
      
      // Listen for route changes
      window.addEventListener('hashchange', function() {
        if (window.location.hash === '#dashboard') {
          loadCOGA();
        }
      });
    } catch (error) {
      console.error('[COGA] Dashboard error:', error);
    }
  });
})();

