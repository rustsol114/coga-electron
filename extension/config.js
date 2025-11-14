/**
 * config.js
 * Centralized configuration for COGA Extension
 * 
 * IMPORTANT: Update PUBLIC_URL here when deploying with a new ngrok URL or custom domain
 * 
 * NOTE: This file is kept for reference. The main config is in extension/src/config.ts
 * Both should have the same PUBLIC_URL value.
 */

const PUBLIC_URL = 'https://recruitable-alesia-nonresponsibly.ngrok-free.dev';

// Export for use in extension
if (typeof window !== 'undefined') {
  window.COGA_PUBLIC_URL = PUBLIC_URL;
}

// For Node.js/CommonJS environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { PUBLIC_URL };
}
