/**
 * Main landing page script
 */

(function() {
  'use strict';
  
  // Initialize Lucide icons
  document.addEventListener('DOMContentLoaded', function() {
    try {
      if (typeof lucide !== 'undefined') {
        lucide.createIcons();
      }
    } catch (error) {
      console.error('Error initializing icons:', error);
    }
  });
  
  // Check script accessibility for widget route (Electron: COGA is always available)
  function checkServerStatus() {
    try {
      const statusEl = document.getElementById('status');
      
      if (!statusEl) {
        return; // Skip if not in widget route
      }
      
      // In Electron, COGA is loaded via renderer.js
      if (typeof window !== 'undefined' && window.COGA) {
        statusEl.className = 'status';
        statusEl.innerHTML = 'COGA Status: <strong>Loaded</strong>';
      } else {
        // Wait for COGA to load
        let attempts = 0;
        const maxAttempts = 50;
        const checkCOGA = function() {
          attempts++;
          if (window.COGA) {
            statusEl.className = 'status';
            statusEl.innerHTML = 'COGA Status: <strong>Loaded</strong>';
          } else if (attempts < maxAttempts) {
            setTimeout(checkCOGA, 100);
          } else {
            statusEl.className = 'status error';
            statusEl.innerHTML = 'COGA Status: <strong>Not Available</strong>';
          }
        };
        setTimeout(checkCOGA, 100);
      }
    } catch (error) {
      console.error('Error checking COGA status:', error);
    }
  }
  
  // Check status on load
  document.addEventListener('DOMContentLoaded', checkServerStatus);
})();

