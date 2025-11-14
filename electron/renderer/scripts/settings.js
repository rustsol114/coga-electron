/**
 * settings.js
 * Handles all settings page interactions and updates
 */

(function() {
  'use strict';

  // Wait for COGA to be available
  let cogaInstance = null;
  let settingsManager = null;
  
  // Track original values to detect changes
  let originalSettings = null;
  let originalLimits = null;
  let originalInterventions = null;

  const INTERVENTION_TOGGLE_MAP = {
    oneBreathReset: 'intervention-oneBreathReset',
    boxBreathing: 'intervention-boxBreathing',
    twentyTwentyGaze: 'intervention-twentyTwentyGaze',
    figureEightSmoothPursuit: 'intervention-figureEightSmoothPursuit',
    nearFarFocusShift: 'intervention-nearFarFocusShift',
    microBreak: 'intervention-microBreak',
  };

  // Initialize settings page
  function init() {
    // Wait for COGA to be loaded
    const checkCOGA = setInterval(() => {
      if (window.COGA) {
        clearInterval(checkCOGA);
        cogaInstance = window.COGA;
        settingsManager = cogaInstance.getSettingsManager();
        loadSettings();
        attachEventListeners();
        initializeChangeTracking();
      }
    }, 100);

    // Timeout after 10 seconds (Electron: COGA loads via renderer.js)
    setTimeout(() => {
      if (!cogaInstance) {
        clearInterval(checkCOGA);
        console.warn('[COGA Settings] COGA instance not found. Settings may not work correctly.');
        // Show error message
        showErrorMessage('COGA is not loaded. In Electron, COGA should load automatically. Please check the console for errors.');
      }
    }, 10000);
  }

  /**
   * Load current settings and populate UI
   */
  async function loadSettings() {
    try {
      if (!settingsManager) return;

      const settings = settingsManager.getSettings();
      
      // Store original values for change tracking
      originalSettings = { ...settings };
      originalLimits = { ...settings.interventionLimits };
      originalInterventions = { ...settings.enabledInterventions };

      // Load sensitivity
      const sensitivityButtons = document.querySelectorAll('.sensitivity-btn');
      sensitivityButtons.forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.sensitivity === settings.sensitivity) {
          btn.classList.add('active');
        }
      });

      // Load intervention limits
      const limits = settings.interventionLimits;
      document.getElementById('cooldown-minutes').value = limits.cooldownMinutes;
      document.getElementById('max-per-hour').value = limits.maxPerHour;
      document.getElementById('max-per-day').value = limits.maxPerDay;

      // Load suppressed domains
      updateDomainsList(settings.suppressedDomains);

      // Load enabled interventions
      Object.entries(INTERVENTION_TOGGLE_MAP).forEach(([key, id]) => {
        const checkbox = document.getElementById(id);
        if (checkbox) {
          checkbox.checked = !!settings.enabledInterventions[key];
        }
      });
      
      // Update button states after loading
      updateButtonStates();
    } catch (error) {
      console.error('[COGA Settings] Error loading settings:', error);
      showErrorMessage('Error loading settings. Please refresh the page.');
    }
  }

  /**
   * Initialize change tracking
   */
  function initializeChangeTracking() {
    // Track intervention limits changes
    const limitInputs = ['cooldown-minutes', 'max-per-hour', 'max-per-day'];
    limitInputs.forEach(id => {
      const input = document.getElementById(id);
      if (input) {
        input.addEventListener('input', () => {
          checkLimitsChanges();
          updateButtonStates();
        });
      }
    });

    // Track intervention checkbox changes
    const interventionCheckboxes = Object.values(INTERVENTION_TOGGLE_MAP);
    interventionCheckboxes.forEach(id => {
      const checkbox = document.getElementById(id);
      if (checkbox) {
        checkbox.addEventListener('change', () => {
          checkInterventionsChanges();
          updateButtonStates();
        });
      }
    });

    // Track domain input changes (for Add button state)
    const domainInput = document.getElementById('domain-input');
    if (domainInput) {
      domainInput.addEventListener('input', () => {
        updateButtonStates();
      });
    }
  }

  /**
   * Check if limits have changed
   */
  function checkLimitsChanges() {
    if (!originalLimits) return false;
    
    const cooldown = parseInt(document.getElementById('cooldown-minutes').value) || 0;
    const maxPerHour = parseInt(document.getElementById('max-per-hour').value) || 0;
    const maxPerDay = parseInt(document.getElementById('max-per-day').value) || 0;
    
    return (
      cooldown !== originalLimits.cooldownMinutes ||
      maxPerHour !== originalLimits.maxPerHour ||
      maxPerDay !== originalLimits.maxPerDay
    );
  }

  /**
   * Check if interventions have changed
   */
  function checkInterventionsChanges() {
    if (!originalInterventions) return false;
    
    return Object.entries(INTERVENTION_TOGGLE_MAP).some(([key, id]) => {
      const checkbox = document.getElementById(id);
      if (!checkbox) return false;
      return checkbox.checked !== originalInterventions[key];
    });
  }

  /**
   * Check if domain input has value
   */
  function hasDomainInput() {
    const domainInput = document.getElementById('domain-input');
    return domainInput && domainInput.value.trim().length > 0;
  }

  /**
   * Update button states based on changes
   */
  function updateButtonStates() {
    // Update Save Limits button
    const saveLimitsBtn = document.getElementById('save-limits-btn');
    if (saveLimitsBtn) {
      const hasChanges = checkLimitsChanges();
      saveLimitsBtn.disabled = !hasChanges;
      saveLimitsBtn.style.opacity = hasChanges ? '1' : '0.5';
      saveLimitsBtn.style.cursor = hasChanges ? 'pointer' : 'not-allowed';
    }

    // Update Add Domain button
    const addDomainBtn = document.getElementById('add-domain-btn');
    if (addDomainBtn) {
      const hasInput = hasDomainInput();
      addDomainBtn.disabled = !hasInput;
      addDomainBtn.style.opacity = hasInput ? '1' : '0.5';
      addDomainBtn.style.cursor = hasInput ? 'pointer' : 'not-allowed';
    }

    // Update Save Interventions button
    const saveInterventionsBtn = document.getElementById('save-interventions-btn');
    if (saveInterventionsBtn) {
      const hasChanges = checkInterventionsChanges();
      saveInterventionsBtn.disabled = !hasChanges;
      saveInterventionsBtn.style.opacity = hasChanges ? '1' : '0.5';
      saveInterventionsBtn.style.cursor = hasChanges ? 'pointer' : 'not-allowed';
    }
  }

  /**
   * Attach event listeners
   */
  function attachEventListeners() {
    // Sensitivity buttons
    document.querySelectorAll('.sensitivity-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const sensitivity = btn.dataset.sensitivity;
        await setSensitivity(sensitivity);
        
        // Update UI
        document.querySelectorAll('.sensitivity-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });

    // Save limits button
    const saveLimitsBtn = document.getElementById('save-limits-btn');
    if (saveLimitsBtn) {
      saveLimitsBtn.addEventListener('click', async () => {
        await saveInterventionLimits();
      });
    }

    // Add domain button
    const addDomainBtn = document.getElementById('add-domain-btn');
    const domainInput = document.getElementById('domain-input');
    
    if (addDomainBtn) {
      addDomainBtn.addEventListener('click', async () => {
        await addDomain();
      });
    }

    if (domainInput) {
      domainInput.addEventListener('keypress', async (e) => {
        if (e.key === 'Enter') {
          await addDomain();
        }
      });
    }

    // Save interventions button
    const saveInterventionsBtn = document.getElementById('save-interventions-btn');
    if (saveInterventionsBtn) {
      saveInterventionsBtn.addEventListener('click', async () => {
        await saveEnabledInterventions();
      });
    }
  }

  /**
   * Set sensitivity
   */
  async function setSensitivity(sensitivity) {
    try {
      if (!settingsManager) return;
      
      await settingsManager.setSensitivity(sensitivity);
      
      // Update COGA instance if available - this applies changes in real-time
      if (cogaInstance && cogaInstance.setSensitivity) {
        await cogaInstance.setSensitivity(sensitivity);
      }
      
      // Update original settings
      if (originalSettings) {
        originalSettings.sensitivity = sensitivity;
      }

      // Show success message in sensitivity section
      showSectionMessage('sensitivity', 'Sensitivity updated successfully', 'success');
    } catch (error) {
      console.error('[COGA Settings] Error setting sensitivity:', error);
      showSectionMessage('sensitivity', 'Error updating sensitivity', 'error');
    }
  }

  /**
   * Save intervention limits
   */
  async function saveInterventionLimits() {
    try {
      if (!settingsManager) return;

      const cooldown = parseInt(document.getElementById('cooldown-minutes').value);
      const maxPerHour = parseInt(document.getElementById('max-per-hour').value);
      const maxPerDay = parseInt(document.getElementById('max-per-day').value);

      if (isNaN(cooldown) || cooldown < 1 || cooldown > 60) {
        showSectionMessage('limits', 'Cooldown must be between 1 and 60 minutes', 'error');
        return;
      }

      if (isNaN(maxPerHour) || maxPerHour < 1 || maxPerHour > 10) {
        showSectionMessage('limits', 'Max per hour must be between 1 and 10', 'error');
        return;
      }

      if (isNaN(maxPerDay) || maxPerDay < 1 || maxPerDay > 50) {
        showSectionMessage('limits', 'Max per day must be between 1 and 50', 'error');
        return;
      }

      await settingsManager.setInterventionLimits({
        cooldownMinutes: cooldown,
        maxPerHour: maxPerHour,
        maxPerDay: maxPerDay,
      });

      // Update AnnoyanceRules if available - this applies changes in real-time
      if (cogaInstance && cogaInstance.getAnnoyanceRules) {
        const annoyanceRules = cogaInstance.getAnnoyanceRules();
        if (annoyanceRules && annoyanceRules.updateConfigFromSettings) {
          annoyanceRules.updateConfigFromSettings();
        }
      }

      // Update original values
      originalLimits = {
        cooldownMinutes: cooldown,
        maxPerHour: maxPerHour,
        maxPerDay: maxPerDay,
      };

      // Update button state
      updateButtonStates();

      // Show success message in limits section
      showSectionMessage('limits', 'Intervention limits updated successfully', 'success');
    } catch (error) {
      console.error('[COGA Settings] Error saving limits:', error);
      showSectionMessage('limits', 'Error saving intervention limits', 'error');
    }
  }

  /**
   * Add suppressed domain
   */
  async function addDomain() {
    try {
      if (!settingsManager) return;

      const domainInput = document.getElementById('domain-input');
      const domain = domainInput.value.trim();

      if (!domain) {
        showSectionMessage('domains', 'Please enter a domain', 'error');
        return;
      }

      // Basic validation
      if (!/^[a-zA-Z0-9.-]+$/.test(domain)) {
        showSectionMessage('domains', 'Invalid domain format', 'error');
        return;
      }

      await settingsManager.addSuppressedDomain(domain);
      domainInput.value = '';

      // Reload domains list
      const domains = settingsManager.getSuppressedDomains();
      updateDomainsList(domains);

      // Update button state
      updateButtonStates();

      // Show success message in domains section
      showSectionMessage('domains', 'Domain added successfully', 'success');
      
      // Note: Domain suppression is checked in real-time by COGA.detectStress()
      // The change will take effect on the next detection cycle
    } catch (error) {
      console.error('[COGA Settings] Error adding domain:', error);
      showSectionMessage('domains', 'Error adding domain', 'error');
    }
  }

  /**
   * Remove suppressed domain
   */
  async function removeDomain(domain) {
    try {
      if (!settingsManager) return;

      await settingsManager.removeSuppressedDomain(domain);

      // Reload domains list
      const domainsList = settingsManager.getSuppressedDomains();
      updateDomainsList(domainsList);

      // Show success message in domains section
      showSectionMessage('domains', 'Domain removed successfully', 'success');
      
      // Note: Domain suppression is checked in real-time by COGA.detectStress()
      // The change will take effect on the next detection cycle
    } catch (error) {
      console.error('[COGA Settings] Error removing domain:', error);
      showSectionMessage('domains', 'Error removing domain', 'error');
    }
  }

  /**
   * Update domains list UI
   */
  function updateDomainsList(domains) {
    const domainsListEl = document.getElementById('domains-list');
    if (!domainsListEl) return;

    if (domains.length === 0) {
      domainsListEl.innerHTML = '<p class="domains-empty">No suppressed domains yet</p>';
      return;
    }

    domainsListEl.innerHTML = domains.map(domain => `
      <div class="domain-item">
        <span class="domain-name">${escapeHtml(domain)}</span>
        <button class="domain-remove-btn" data-domain="${escapeHtml(domain)}" title="Remove domain">
          <i data-lucide="x"></i>
        </button>
      </div>
    `).join('');

    // Re-initialize Lucide icons
    if (window.lucide) {
      lucide.createIcons();
    }

    // Attach remove listeners
    domainsListEl.querySelectorAll('.domain-remove-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const domain = btn.dataset.domain;
        removeDomain(domain);
      });
    });
  }

  /**
   * Save enabled interventions
   */
  async function saveEnabledInterventions() {
    try {
      if (!settingsManager) return;

      const updates = Object.entries(INTERVENTION_TOGGLE_MAP).reduce((acc, [key, id]) => {
        const checkbox = document.getElementById(id);
        acc[key] = checkbox ? checkbox.checked : false;
        return acc;
      }, {});

      await Promise.all(
        Object.entries(updates).map(([key, value]) =>
          settingsManager.setInterventionEnabled(key, value)
        )
      );

      // Update original values
      originalInterventions = { ...updates };

      // Update button state
      updateButtonStates();

      // Show success message in interventions section
      showSectionMessage('interventions', 'Enabled interventions updated successfully', 'success');
      
      // Note: Intervention filtering happens in real-time in InterventionManager.selectIntervention()
      // Changes will apply immediately for the next intervention selection
    } catch (error) {
      console.error('[COGA Settings] Error saving interventions:', error);
      showSectionMessage('interventions', 'Error saving enabled interventions', 'error');
    }
  }

  /**
   * Show success message (general)
   */
  function showSuccessMessage(message) {
    showMessage(message, 'success');
  }

  /**
   * Show error message (general)
   */
  function showErrorMessage(message) {
    showMessage(message, 'error');
  }

  /**
   * Show message in specific section
   */
  function showSectionMessage(sectionId, message, type) {
    // Map section IDs to section elements
    const sectionMap = {
      'sensitivity': document.querySelector('.settings-section:nth-of-type(1)'),
      'limits': document.querySelector('.settings-section:nth-of-type(2)'),
      'domains': document.querySelector('.settings-section:nth-of-type(3)'),
      'interventions': document.querySelector('.settings-section:nth-of-type(4)'),
    };

    const section = sectionMap[sectionId];
    if (!section) {
      // Fallback to general message
      showMessage(message, type);
      return;
    }

    // Remove existing message in this section
    const existing = section.querySelector('.section-message');
    if (existing) {
      existing.remove();
    }

    // Create message element
    const messageEl = document.createElement('div');
    messageEl.className = `section-message section-message-${type}`;
    messageEl.textContent = message;

    // Insert after description
    const description = section.querySelector('.settings-section-description');
    if (description && description.nextSibling) {
      section.insertBefore(messageEl, description.nextSibling);
    } else {
      section.appendChild(messageEl);
    }

    // Auto-remove after 3 seconds
    setTimeout(() => {
      if (messageEl.parentNode) {
        messageEl.remove();
      }
    }, 3000);
  }

  /**
   * Show message (general - top of page)
   */
  function showMessage(message, type) {
    // Remove existing messages
    const existing = document.querySelector('.settings-message');
    if (existing) {
      existing.remove();
    }

    const messageEl = document.createElement('div');
    messageEl.className = `settings-message settings-message-${type}`;
    messageEl.textContent = message;

    const settingsSection = document.querySelector('.settings');
    if (settingsSection) {
      settingsSection.insertBefore(messageEl, settingsSection.firstChild);
      
      // Auto-remove after 3 seconds
      setTimeout(() => {
        if (messageEl.parentNode) {
          messageEl.remove();
        }
      }, 3000);
    }
  }

  /**
   * Escape HTML to prevent XSS
   */
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Initialize when route is shown
  function checkRoute() {
    const settingsRoute = document.getElementById('settings-route');
    if (settingsRoute && settingsRoute.classList.contains('active')) {
      init();
    }
  }

  // Check on load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      checkRoute();
      // Also check on hash change
      window.addEventListener('hashchange', checkRoute);
    });
  } else {
    checkRoute();
    window.addEventListener('hashchange', checkRoute);
  }
})();

