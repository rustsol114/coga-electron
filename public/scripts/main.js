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
  
  // Check script accessibility for widget route
  function checkServerStatus() {
    try {
      const publicUrl = '{{PUBLIC_URL}}';
      const statusEl = document.getElementById('status');
      
      if (!statusEl || !publicUrl || publicUrl.includes('{{')) {
        return; // Skip if not in widget route or placeholder not replaced
      }
      
      fetch(`${publicUrl}/coga.min.js`, { method: 'HEAD' })
        .then(function(response) {
          if (!response.ok) {
            throw new Error('Script not found');
          }
        })
        .catch(function(error) {
          if (statusEl) {
            statusEl.className = 'status error';
            statusEl.innerHTML = 'Server Status: <strong>Error</strong>';
          }
        });
    } catch (error) {
      console.error('Error checking server status:', error);
    }
  }
  
  // Check status on load
  document.addEventListener('DOMContentLoaded', checkServerStatus);
})();

