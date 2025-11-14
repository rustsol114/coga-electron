/**
 * background.js
 * Service worker for Chrome Extension
 * NOW ACTS AS CENTRAL STRESS DETECTOR
 * Handles unlock state, domain suppression, and GLOBAL stress detection
 */

// Public URL from centralized config
// This should match the PUBLIC_URL in extension/src/config.ts
const PUBLIC_URL = 'https://recruitable-alesia-nonresponsibly.ngrok-free.dev';

// ==================== GLOBAL STATE ====================
// This is the SINGLE SOURCE OF TRUTH for stress detection
let globalEventBuffer = [];
let globalBaseline = null;
const tabMetricsMap = new Map();
let globalStressData = {
  level: 'normal',
  combined: 0,
  mouse: 0,
  keyboard: 0,
  percentage: 0,
  timestamp: Date.now(),
  metrics: getEmptyMetrics()
};
let detectionIntervalId = null;
const DETECTION_INTERVAL = 1000; // 1 second for near real-time updates
// IMPROVED: Fine-tuned thresholds to reduce false positives
const SENSITIVITY_THRESHOLDS = {
  low: 3.3,    // Least sensitive (fewer interventions)
  medium: 2.6, // Balanced (default)
  high: 2.2    // Most sensitive (more interventions)
};
let currentSensitivity = 'medium';
const METRIC_ENTRY_TTL = 15000; // 15 seconds

// Initialize extension state
chrome.runtime.onInstalled.addListener(() => {
  console.log('[COGA Background] Extension installed - initializing global state');
  
  // Set default unlock state to false (locked)
  chrome.storage.local.get(['coga_unlocked', 'coga_password_hash', 'coga_public_url', 'coga_baseline', 'coga_settings'], (result) => {
    if (!result.coga_unlocked && !result.coga_password_hash) {
      // First install - set locked
      chrome.storage.local.set({ coga_unlocked: false });
    }
    
    // Set default public URL if not set (use centralized config)
    if (!result.coga_public_url) {
      chrome.storage.local.set({ coga_public_url: PUBLIC_URL });
    }
    
    // Load baseline if exists
    if (result.coga_baseline) {
      console.log('[COGA Background] Loading existing baseline');
      globalBaseline = result.coga_baseline;
      startGlobalStressDetection();
    } else {
      console.log('[COGA Background] No baseline found - awaiting calibration');
    }
    
    // Load sensitivity from settings
    if (result.coga_settings && result.coga_settings.sensitivity) {
      currentSensitivity = result.coga_settings.sensitivity;
      console.log('[COGA Background] Sensitivity set to:', currentSensitivity);
    }
  });
});

// ==================== STRESS DETECTION FUNCTIONS ====================

/**
 * Start global stress detection interval
 * This runs independently of any tab and maintains global stress state
 */
function startGlobalStressDetection() {
  if (detectionIntervalId) {
    console.log('[COGA Background] Detection already running');
    return;
  }
  
  console.log('[COGA Background] Starting global stress detection');
  detectionIntervalId = setInterval(() => {
    try {
      if (!globalBaseline) {
        console.log('[COGA Background] No baseline, skipping detection');
        return;
      }

      const aggregatedMetrics = aggregateGlobalMetrics();

      if (!aggregatedMetrics) {
        console.log('[COGA Background] No recent metrics to analyze');
        return;
      }

      const stressData = calculateStress(aggregatedMetrics, globalBaseline);

      if (stressData && isValidStressData(stressData)) {
        globalStressData = stressData;

        chrome.storage.local.set({ coga_stress_data: stressData }, () => {
          if (chrome.runtime.lastError) {
            console.error('[COGA Background] Error saving stress data:', chrome.runtime.lastError);
          } else {
            console.log('[COGA Background] ⚡ Stress updated globally:', stressData.level, stressData.combined.toFixed(2), 'mouse:', stressData.mouse.toFixed(2), 'keyboard:', stressData.keyboard.toFixed(2));
          }
        });
      } else {
        console.warn('[COGA Background] Invalid stress data calculated, not saving:', stressData);
      }
    } catch (error) {
      console.error('[COGA Background] Error during stress detection cycle:', error);
    } finally {
      // Clear buffered events after processing to avoid growth
      globalEventBuffer = [];
    }
  }, DETECTION_INTERVAL);
}

/**
 * Stop global stress detection
 */
function stopGlobalStressDetection() {
  if (detectionIntervalId) {
    clearInterval(detectionIntervalId);
    detectionIntervalId = null;
    console.log('[COGA Background] Stopped global stress detection');
  }
}

/**
 * Calculate stress from aggregated metrics using baseline
 */
function calculateStress(metrics, baseline) {
  try {
    if (!metrics || !baseline || !baseline.mouse || !baseline.keyboard) {
      console.log(
        '[COGA Background] Baseline or metrics missing — emitting neutral stress payload'
      );
      return {
        level: 'normal',
        combined: 0,
        mouse: 0,
        keyboard: 0,
        percentage: 0,
        timestamp: Date.now(),
        metrics: metrics || getEmptyMetrics()
      };
    }

    const mouseScore = calculateMouseScore(metrics, baseline);
    const keyboardScore = calculateKeyboardScore(metrics, baseline);

    const combined = Number.isFinite(mouseScore) && Number.isFinite(keyboardScore)
      ? (mouseScore * 0.7) + (keyboardScore * 0.3)
      : 0;

    const level = determineStressLevel(combined);
    const percentage = calculateStressPercentage(combined);
  console.log(
    `[COGA Background] Combined Z-score formula: (mouse ${mouseScore.toFixed(
      4
    )} * 0.70) + (keyboard ${keyboardScore.toFixed(4)} * 0.30) = ${combined.toFixed(4)}`
  );
  console.log(
    `[COGA Background] Stress percentage mapping: score=${combined.toFixed(
      4
    )} → ${percentage.toFixed(2)}%`
  );

    const stressSnapshot = {
      level,
      combined,
      mouse: mouseScore,
      keyboard: keyboardScore,
      percentage,
      timestamp: Date.now(),
      metrics
    };

    console.log('[COGA Background] Calculated stress:', {
      combined: formatNumber(combined),
      level,
      mouseScore: formatNumber(mouseScore),
      keyboardScore: formatNumber(keyboardScore),
      percentage: formatNumber(percentage)
    });

    return stressSnapshot;
  } catch (error) {
    console.error('[COGA Background] Error calculating stress:', error);
    return {
      level: 'normal',
      combined: 0,
      mouse: 0,
      keyboard: 0,
      percentage: 0,
      timestamp: Date.now(),
      metrics: getEmptyMetrics()
    };
  }
}

/**
 * Determine stress level based on combined z-score
 */
function determineStressLevel(combinedScore) {
  try {
    const highThreshold = SENSITIVITY_THRESHOLDS[currentSensitivity] || 2.0;
    const moderateThreshold = Math.max(0.8, highThreshold * 0.5);

    if (!Number.isFinite(combinedScore)) {
      return 'normal';
    }

    let resolved;
    if (combinedScore >= highThreshold) {
      resolved = 'high';
    } else if (combinedScore >= moderateThreshold) {
      resolved = 'moderate';
    } else {
      resolved = 'normal';
    }

    console.log(
      `[COGA Background] Level classification: combined=${combinedScore.toFixed(
        4
      )}, moderate>=${moderateThreshold.toFixed(4)}, high>=${highThreshold.toFixed(
        4
      )} ⇒ level=${resolved}`
    );

    return resolved;
  } catch (error) {
    console.error('[COGA Background] Error determining stress level:', error);
    return 'normal';
  }
}

function calculateStressPercentage(score) {
  const clampedScore = Math.max(0, score);
  const highThreshold = SENSITIVITY_THRESHOLDS[currentSensitivity] || 2.0;
  const moderateThreshold = Math.max(0.8, highThreshold * 0.5);
  const maxReference = highThreshold * 1.5;

  if (moderateThreshold <= 0) {
    console.log(
      '[COGA Background] Percentage mapping aborted: moderate threshold <= 0'
    );
    return 0;
  }

  if (clampedScore <= moderateThreshold) {
    const ratio = clampedScore / moderateThreshold;
    const percentage = Math.min(50, Math.max(0, ratio * 50));
    console.log(
      `[COGA Background] Percentage (normal range): (${clampedScore.toFixed(
        4
      )} / ${moderateThreshold.toFixed(4)}) * 50 = ${percentage.toFixed(2)}%`
    );
    return percentage;
  }

  if (clampedScore >= highThreshold) {
    const cappedScore = Math.min(maxReference, clampedScore);
    const extra = cappedScore - highThreshold;
    const range = Math.max(0.001, maxReference - highThreshold);
    const percentage = Math.min(100, 80 + (extra / range) * 20);
    console.log(
      `[COGA Background] Percentage (high range): capped=${cappedScore.toFixed(
        4
      )}, extra=${extra.toFixed(4)}, range=${range.toFixed(4)} ⇒ percentage=${percentage.toFixed(
        2
      )}%`
    );
    return percentage;
  }

  const ratio = (clampedScore - moderateThreshold) / Math.max(0.001, highThreshold - moderateThreshold);
  const percentage = Math.min(80, 50 + ratio * 30);
  console.log(
    `[COGA Background] Percentage (moderate range): ((score ${clampedScore.toFixed(
      4
    )} - ${moderateThreshold.toFixed(4)}) / (${highThreshold.toFixed(
      4
    )} - ${moderateThreshold.toFixed(4)})) * 30 + 50 = ${percentage.toFixed(2)}%`
  );
  return percentage;
}

/**
 * Aggregate metrics across active tabs/windows
 */
function aggregateGlobalMetrics() {
  try {
    const now = Date.now();
    const activeEntries = [];

    tabMetricsMap.forEach((entry, key) => {
      if (!entry || typeof entry !== 'object') {
        tabMetricsMap.delete(key);
        return;
      }

      if (!entry.metrics || now - entry.timestamp > METRIC_ENTRY_TTL) {
        tabMetricsMap.delete(key);
        return;
      }

      activeEntries.push(entry.metrics);
    });

    if (activeEntries.length === 0) {
      return null;
    }

    const aggregate = initializeAggregateMetrics();

    activeEntries.forEach((metrics) => {
      accumulateMetrics(aggregate, metrics);
    });

    finalizeAggregateMetrics(aggregate, activeEntries.length);
    aggregate.timestamp = now;

    return aggregate;
  } catch (error) {
    console.error('[COGA Background] Error aggregating metrics:', error);
    return null;
  }
}

function initializeAggregateMetrics() {
  return {
    mouse: {
      movementVelocity: 0,
      movementAcceleration: 0,
      mouseJitter: 0,
      clickFrequencyPerMin: 0,
      multiClickRatePerMin: 0,
      pathEfficiency: 0,
      pauseRatio: 0,
      scrollVelocity: 0
    },
    keyboard: {
      typingErrorRate: 0,
      typingSpeedPerMin: 0,
      pauseRegularity: 0,
      avgPauseDuration: 0,
    },
    scroll: {
      velocity: 0
    },
    timestamp: Date.now()
  };
}

function accumulateMetrics(target, metrics) {
  if (!metrics) {
    return;
  }

  const mouseFields = [
    'movementVelocity',
    'movementAcceleration',
    'mouseJitter',
    'clickFrequencyPerMin',
    'multiClickRatePerMin',
    'pathEfficiency',
    'pauseRatio',
    'scrollVelocity'
  ];

  mouseFields.forEach((field) => {
    target.mouse[field] += toNumber(metrics.mouse?.[field]);
  });

  const keyboardFields = [
    'typingErrorRate',
    'typingSpeedPerMin',
    'pauseRegularity',
    'avgPauseDuration'
  ];

  keyboardFields.forEach((field) => {
    target.keyboard[field] += toNumber(metrics.keyboard?.[field]);
  });

  target.scroll.velocity += toNumber(metrics.scroll?.velocity);
}

function finalizeAggregateMetrics(aggregate, count) {
  if (count <= 0) {
    return;
  }

  const divideFields = (obj, fields) => {
    fields.forEach((field) => {
      obj[field] = Number.isFinite(obj[field]) ? obj[field] / count : 0;
    });
  };

  divideFields(aggregate.mouse, [
    'movementVelocity',
    'movementAcceleration',
    'mouseJitter',
    'clickFrequencyPerMin',
    'multiClickRatePerMin',
    'pathEfficiency',
    'pauseRatio',
    'scrollVelocity'
  ]);

  divideFields(aggregate.keyboard, [
    'typingErrorRate',
    'typingSpeedPerMin',
    'pauseRegularity',
    'avgPauseDuration',
  ]);

  divideFields(aggregate.scroll, ['velocity']);
}

function toNumber(value) {
  return typeof value === 'number' && isFinite(value) ? value : 0;
}

function formatNumber(value) {
  if (!Number.isFinite(value)) {
    return '0.00';
  }
  return value.toFixed(2);
}

function cloneMetrics(metrics) {
  try {
    return JSON.parse(JSON.stringify(metrics));
  } catch (error) {
    console.warn('[COGA Background] Failed to clone metrics, using shallow copy:', error);
    return metrics;
  }
}

/**
 * Validate stress data structure before persisting
 */
function isValidStressData(stressData) {
  if (!stressData || typeof stressData !== 'object') {
    return false;
  }

  return (
    typeof stressData.level === 'string' &&
    typeof stressData.combined === 'number' &&
    Number.isFinite(stressData.combined) &&
    typeof stressData.mouse === 'number' &&
    Number.isFinite(stressData.mouse) &&
    typeof stressData.keyboard === 'number' &&
    Number.isFinite(stressData.keyboard) &&
    typeof stressData.percentage === 'number' &&
    Number.isFinite(stressData.percentage) &&
    stressData.metrics !== undefined
  );
}

function calculateMouseScore(metrics, baseline) {
  try {
    if (!metrics.mouse || !baseline.mouse) {
      return 0;
    }

    const weights = [
      {
        z: computeDirectionalZ(
          metrics.mouse.clickFrequencyPerMin,
          baseline.mouse.clickFrequencyPerMin,
          baseline.mouse.clickFrequencyPerMinMAD,
          'higher',
          0.2
        ),
        weight: 0.15
      },
      {
        z: computeDirectionalZ(
          metrics.mouse.multiClickRatePerMin,
          baseline.mouse.multiClickRatePerMin,
          baseline.mouse.multiClickRatePerMinMAD,
          'higher',
          0.2
        ),
        weight: 0.15
      },
      {
        z: computeDirectionalZ(
          metrics.mouse.movementVelocity,
          baseline.mouse.movementVelocity,
          baseline.mouse.movementVelocityMAD,
          'higher',
          0.1
        ),
        weight: 0.1
      },
      {
        z: computeDirectionalZ(
          metrics.mouse.movementAcceleration,
          baseline.mouse.movementAcceleration,
          baseline.mouse.movementAccelerationMAD,
          'higher',
          0.1
        ),
        weight: 0.1
      },
      {
        z: computeDirectionalZ(
          metrics.mouse.mouseJitter,
          baseline.mouse.mouseJitter,
          baseline.mouse.mouseJitterMAD,
          'higher',
          0.15
        ),
        weight: 0.1
      },
      {
        z: computeDirectionalZ(
          metrics.mouse.scrollVelocity,
          baseline.mouse.scrollVelocity,
          baseline.mouse.scrollVelocityMAD,
          'higher',
          0.1
        ),
        weight: 0.1
      }
    ];

    const weightSum = weights.reduce((acc, item) => acc + item.weight, 0);
    if (weightSum === 0) {
      return 0;
    }

    const scoreSum = weights.reduce((acc, item) => {
      if (!Number.isFinite(item.z) || item.z <= 0) {
        return acc;
      }
      return acc + item.z * item.weight;
    }, 0);

    let score = scoreSum / weightSum;

    if (metrics.mouse.pathEfficiency < baseline.mouse.pathEfficiency) {
      const efficiencyDelta = baseline.mouse.pathEfficiency - metrics.mouse.pathEfficiency;
      const efficiencyPenalty = Math.min(1, efficiencyDelta * 2);
      score += efficiencyPenalty * 0.1;
    console.log(
      `[COGA Background] Mouse path-efficiency penalty: baseline=${baseline.mouse.pathEfficiency.toFixed(
        4
      )}, current=${metrics.mouse.pathEfficiency.toFixed(
        4
      )}, Δ=${efficiencyDelta.toFixed(4)}, penalty=${(efficiencyPenalty * 0.1).toFixed(4)}`
    );
    }

    if (metrics.mouse.pauseRatio > baseline.mouse.pauseRatio) {
      const pauseDelta = metrics.mouse.pauseRatio - baseline.mouse.pauseRatio;
    const pausePenalty = Math.min(0.5, pauseDelta * 2);
    score += pausePenalty;
    console.log(
      `[COGA Background] Mouse pause-ratio penalty: baseline=${baseline.mouse.pauseRatio.toFixed(
        4
      )}, current=${metrics.mouse.pauseRatio.toFixed(
        4
      )}, Δ=${pauseDelta.toFixed(4)}, penalty=${pausePenalty.toFixed(4)}`
    );
    }

  const mouseFormula = weights
    .map(
      (item) =>
        `(${item.z.toFixed(4)} * ${item.weight.toFixed(2)})`
    )
    .join(' + ');
  console.log(
    `[COGA Background] Mouse weighted sum: ${mouseFormula} = ${scoreSum.toFixed(
      4
    )}; divisor=${weightSum.toFixed(2)} ⇒ mouseScore=${score.toFixed(4)}`
  );

    return score;
  } catch (error) {
    console.error('[COGA Background] Error calculating mouse score:', error);
    return 0;
  }
}

function calculateKeyboardScore(metrics, baseline) {
  try {
    if (!metrics.keyboard || !baseline.keyboard) {
      return 0;
    }

    const weights = [
      // Typing errors (high weight - strong stress indicator)
      {
        z: computeDirectionalZ(
          metrics.keyboard.typingErrorRate,
          baseline.keyboard.typingErrorRate,
          baseline.keyboard.typingErrorRateMAD,
          'higher',
          0.2
        ),
        weight: 0.50 // Reduced from 0.75 to accommodate typing speed
      },
      // FIXED: Typing speed (elevated speed indicates stress)
      {
        z: computeDirectionalZ(
          metrics.keyboard.typingSpeedPerMin,
          baseline.keyboard.typingSpeedPerMin,
          baseline.keyboard.typingSpeedPerMinMAD,
          'higher',
          0.15 // Only count if significantly above baseline
        ),
        weight: 0.25 // NEW: Significant weight for typing speed
      },
      // Pause irregularity (erratic pausing indicates stress)
      {
        z: computeDirectionalZ(
          metrics.keyboard.pauseRegularity,
          baseline.keyboard.pauseRegularity,
          baseline.keyboard.pauseRegularityMAD,
          'higher',
          0.1
        ),
        weight: 0.15
      },
      // Average pause duration (longer pauses may indicate confusion/stress)
      {
        z: computeDirectionalZ(
          metrics.keyboard.avgPauseDuration,
          baseline.keyboard.avgPauseDuration,
          baseline.keyboard.avgPauseDurationMAD,
          'higher',
          0.1
        ),
        weight: 0.1
      }
    ];

    const weightSum = weights.reduce((acc, item) => acc + item.weight, 0);
    if (weightSum === 0) {
      return 0;
    }

    const scoreSum = weights.reduce((acc, item) => {
      if (!Number.isFinite(item.z) || item.z <= 0) {
        return acc;
      }
      return acc + item.z * item.weight;
    }, 0);

  const score = scoreSum / weightSum;
  const keyboardFormula = weights
    .map(
      (item) =>
        `(${item.z.toFixed(4)} * ${item.weight.toFixed(2)})`
    )
    .join(' + ');
  console.log(
    `[COGA Background] Keyboard weighted sum: ${keyboardFormula} = ${scoreSum.toFixed(
      4
    )}; divisor=${weightSum.toFixed(2)} ⇒ keyboardScore=${score.toFixed(4)}`
  );
  return score;
  } catch (error) {
    console.error('[COGA Background] Error calculating keyboard score:', error);
    return 0;
  }
}

function computeDirectionalZ(value, baselineValue, baselineMad, direction, minimumThreshold = 0) {
  try {
    if (!Number.isFinite(value) || !Number.isFinite(baselineValue)) {
      return 0;
    }

    // IMPROVED: Higher MAD floor to prevent hypersensitivity (25% of baseline or 0.1 minimum)
    const safeMad =
      Number.isFinite(baselineMad) && baselineMad > 0
        ? baselineMad
        : Math.max(Math.abs(baselineValue) * 0.25, 0.1);

    const difference =
      direction === 'higher' ? value - baselineValue : baselineValue - value;

    if (difference <= 0) {
      return 0;
    }

    const zScore = difference / safeMad;
    
    // IMPROVED: Cap at 4σ instead of 6σ to reduce extreme scores
    const capped = Math.min(zScore, 4);

    if (capped <= minimumThreshold) {
      return 0;
    }

    const finalScore = capped - minimumThreshold;
    return finalScore;
  } catch (error) {
    console.error('[COGA Background] Error computing directional z-score:', error);
    return 0;
  }
}

function getEmptyMetrics() {
  return {
    mouse: {
      movementVelocity: 0,
      movementAcceleration: 0,
      mouseJitter: 0,
      clickFrequencyPerMin: 0,
      multiClickRatePerMin: 0,
      pathEfficiency: 1,
      pauseRatio: 0,
      scrollVelocity: 0
    },
    keyboard: {
      typingErrorRate: 0,
      typingSpeedPerMin: 0,
      pauseRegularity: 0,
      avgPauseDuration: 0,
    },
    scroll: {
      velocity: 0
    },
    timestamp: Date.now()
  };
}

// ==================== MESSAGE HANDLERS ====================

// Handle messages from content scripts and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // ========== NEW: Event capturing from content scripts ==========
  if (request.action === 'addEvents') {
    // Content scripts send events here instead of processing locally
    if (request.events && Array.isArray(request.events)) {
      globalEventBuffer.push(...request.events);
      console.log('[COGA Background] Received', request.events.length, 'events from tab', sender.tab?.id || 'unknown');
    }

    if (request.metrics && typeof request.metrics === 'object') {
      const tabId =
        Number.isFinite(sender.tab?.id) ? sender.tab.id : request.tabId ?? `unknown_${Date.now()}`;

      tabMetricsMap.set(tabId, {
        metrics: cloneMetrics(request.metrics),
        timestamp: Date.now()
      });
    }

    sendResponse({ success: true });
    return true;
  }
  
  // ========== NEW: Baseline updated from any tab ==========
  if (request.action === 'baselineUpdated') {
    chrome.storage.local.get(['coga_baseline'], (result) => {
      if (result.coga_baseline) {
        globalBaseline = result.coga_baseline;
        console.log('[COGA Background] Baseline updated, restarting detection');
        stopGlobalStressDetection();
        startGlobalStressDetection();
      }
      sendResponse({ success: true });
    });
    return true;
  }
  
  // ========== NEW: Get current global stress data ==========
  if (request.action === 'getStressData') {
    sendResponse({ success: true, data: globalStressData });
    return true;
  }

  if (request.action === 'checkUnlocked') {
    chrome.storage.local.get(['coga_unlocked'], (result) => {
      sendResponse({ unlocked: result.coga_unlocked === true });
    });
    return true; // Keep channel open for async response
  }

  if (request.action === 'unlock') {
    chrome.storage.local.set({ coga_unlocked: true }, () => {
      // Notify all tabs to reload COGA
      chrome.tabs.query({}, (tabs) => {
        tabs.forEach((tab) => {
          chrome.tabs.sendMessage(tab.id, { action: 'unlock', unlocked: true }).catch(() => {
            // Ignore errors for tabs that can't receive messages
          });
        });
      });
      sendResponse({ success: true });
    });
    return true;
  }

  if (request.action === 'lock') {
    chrome.storage.local.set({ coga_unlocked: false }, () => {
      // Stop global detection when locked
      stopGlobalStressDetection();
      
      // Notify all tabs to close widgets
      chrome.tabs.query({}, (tabs) => {
        tabs.forEach((tab) => {
          chrome.tabs.sendMessage(tab.id, { action: 'lock', locked: true }).catch(() => {
            // Ignore errors for tabs that can't receive messages
          });
        });
      });
      sendResponse({ success: true });
    });
    return true;
  }

  if (request.action === 'setPublicUrl') {
    chrome.storage.local.set({ coga_public_url: request.url }, () => {
      sendResponse({ success: true });
    });
    return true;
  }

  // Storage operations forwarding (for cross-domain sync)
  if (request.action === 'storageGet') {
    chrome.storage.local.get(request.keys, (result) => {
      if (chrome.runtime.lastError) {
        sendResponse({ error: chrome.runtime.lastError.message });
      } else {
        sendResponse({ success: true, data: result });
      }
    });
    return true;
  }

  if (request.action === 'storageSet') {
    chrome.storage.local.set(request.data, () => {
      if (chrome.runtime.lastError) {
        sendResponse({ error: chrome.runtime.lastError.message });
      } else {
        sendResponse({ success: true });
      }
    });
    return true;
  }

  if (request.action === 'storageRemove') {
    chrome.storage.local.remove(request.keys, () => {
      if (chrome.runtime.lastError) {
        sendResponse({ error: chrome.runtime.lastError.message });
      } else {
        sendResponse({ success: true });
      }
    });
    return true;
  }

  return false;
});

// Listen for tab updates to check domain suppression
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    // Check if domain is suppressed
    checkDomainSuppression(tab.url);
  }
});

function checkDomainSuppression(url) {
  try {
    const domain = extractDomain(url);
    chrome.storage.local.get(['coga_settings'], (result) => {
      if (result.coga_settings && result.coga_settings.suppressedDomains) {
        const suppressed = result.coga_settings.suppressedDomains;
        const isSuppressed = suppressed.includes(domain);
        
        if (isSuppressed) {
          console.log(`[COGA] Domain ${domain} is suppressed`);
        }
      }
    });
  } catch (error) {
    console.error('[COGA] Error checking domain suppression:', error);
  }
}

function extractDomain(url) {
  try {
    const urlObj = new URL(url);
    let domain = urlObj.hostname;
    domain = domain.replace(/^www\./, '');
    return domain.toLowerCase();
  } catch (error) {
    return '';
  }
}

