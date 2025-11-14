/**
 * Interventions demo script for landing page
 * Handles triggering interventions without counting them in statistics
 */

(function() {
  'use strict';
  
  let cogaLoaded = false;
  let cogaLoading = false;

  /**
   * Get COGA instance
   */
  function getCOGAInstance() {
    try {
      if (window.COGA && typeof window.COGA.getStatus === 'function') {
        return window.COGA;
      }
    } catch (error) {
      console.error('[COGA Interventions] Error retrieving COGA instance:', error);
    }
    return null;
  }

  /**
   * Load COGA script if not already loaded (Electron: COGA is already loaded via renderer.js)
   */
  function loadCOGA() {
    // In Electron, COGA is loaded via renderer.js
    const coga = getCOGAInstance();
    if (coga) {
      cogaLoaded = true;
      return Promise.resolve();
    }
    
    if (cogaLoading) {
      // Already waiting
      return new Promise((resolve) => {
        const checkInterval = setInterval(() => {
          if (getCOGAInstance()) {
            clearInterval(checkInterval);
            cogaLoaded = true;
            cogaLoading = false;
            resolve();
          }
        }, 100);
        
        // Timeout after 10 seconds
        setTimeout(() => {
          clearInterval(checkInterval);
          if (!getCOGAInstance()) {
            cogaLoading = false;
            console.error('[COGA Interventions] COGA not available after waiting');
          }
          resolve();
        }, 10000);
      });
    }
    
    cogaLoading = true;
    return new Promise((resolve) => {
      // Wait for COGA to become available (it's loaded by renderer.js)
      const checkInterval = setInterval(() => {
        if (getCOGAInstance()) {
          clearInterval(checkInterval);
          cogaLoaded = true;
          cogaLoading = false;
          console.log('[COGA Interventions] COGA found');
          resolve();
        }
      }, 100);
      
      // Timeout after 10 seconds
      setTimeout(() => {
        clearInterval(checkInterval);
        cogaLoading = false;
        if (!getCOGAInstance()) {
          console.error('[COGA Interventions] COGA not available after waiting');
        }
        resolve();
      }, 10000);
    });
  }

  /**
   * Trigger an intervention manually (demo mode - doesn't count in statistics)
   */
  async function triggerIntervention(interventionKey) {
    try {
      // Ensure COGA is loaded
      await loadCOGA();
      
      const coga = getCOGAInstance();
      if (!coga) {
        console.error('[COGA Interventions] COGA not available');
        showErrorMessage('COGA is not available. Please try again.');
        return;
      }

      // Check if the intervention trigger method exists
      if (typeof coga.triggerInterventionDemo === 'function') {
        // Use demo method that doesn't count statistics
        await coga.triggerInterventionDemo(interventionKey);
      } else if (typeof coga.triggerIntervention === 'function') {
        // Fallback to regular method if demo method doesn't exist
        await coga.triggerIntervention(interventionKey);
      } else {
        // Dispatch custom event as final fallback
        window.dispatchEvent(new CustomEvent('coga:trigger-intervention-demo', {
          detail: { interventionKey }
        }));
      }
      
      console.log(`[COGA Interventions] Triggered demo: ${interventionKey}`);
    } catch (error) {
      console.error('[COGA Interventions] Error triggering intervention:', error);
      showErrorMessage('Failed to start intervention. Please try again.');
    }
  }

  /**
   * Show error message to user
   */
  function showErrorMessage(message) {
    try {
      const toast = document.createElement('div');
      toast.className = 'intervention-error-toast';
      toast.textContent = message;
      toast.style.cssText = `
        position: fixed;
        bottom: 24px;
        right: 24px;
        background: #fee2e2;
        color: #991b1b;
        padding: 16px 24px;
        border-radius: 12px;
        border: 1px solid #fca5a5;
        font-weight: 600;
        font-size: 14px;
        z-index: 10000;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        animation: slideIn 0.3s ease;
      `;
      
      document.body.appendChild(toast);

      setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
          if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
          }
        }, 300);
      }, 3000);
    } catch (error) {
      console.error('[COGA Interventions] Error showing error message:', error);
    }
  }

  /**
   * Setup intervention cards click handlers
   */
  function setupInterventionCards() {
    try {
      const cards = document.querySelectorAll('.intervention-card');
      
      cards.forEach(card => {
        // Add click handler to the entire card
        card.addEventListener('click', function(event) {
          const interventionKey = card.getAttribute('data-intervention');
          if (interventionKey) {
            triggerIntervention(interventionKey);
          }
        });

        // Also add handler to the button specifically
        const btn = card.querySelector('.intervention-btn');
        if (btn) {
          btn.addEventListener('click', function(event) {
            event.stopPropagation(); // Prevent double trigger
            const interventionKey = card.getAttribute('data-intervention');
            if (interventionKey) {
              triggerIntervention(interventionKey);
            }
          });
        }
      });

      console.log('[COGA Interventions] Setup complete for', cards.length, 'cards');
    } catch (error) {
      console.error('[COGA Interventions] Error setting up cards:', error);
    }
  }

  /**
   * Initialize when interventions route is accessed
   */
  function initInterventions() {
    // Setup card handlers
    setupInterventionCards();

    // Preload COGA if on interventions route
    if (window.location.hash === '#interventions') {
      loadCOGA().catch(error => {
        console.error('[COGA Interventions] Preload error:', error);
      });
    }
  }

  // Initialize on DOM ready
  document.addEventListener('DOMContentLoaded', function() {
    try {
      initInterventions();

      // Listen for hash changes to preload COGA when navigating to interventions
      window.addEventListener('hashchange', function() {
        if (window.location.hash === '#interventions') {
          loadCOGA().catch(error => {
            console.error('[COGA Interventions] Load error:', error);
          });
        }
      });
    } catch (error) {
      console.error('[COGA Interventions] Initialization error:', error);
    }
  });

  // Add CSS animations for toast
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateX(100%);
      }
      to {
        opacity: 1;
        transform: translateX(0);
      }
    }
    
    @keyframes slideOut {
      from {
        opacity: 1;
        transform: translateX(0);
      }
      to {
        opacity: 0;
        transform: translateX(100%);
      }
    }
  `;
  document.head.appendChild(style);
})();

