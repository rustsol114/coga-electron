/**
 * index.ts
 * Main entry point for COGA
 */

import COGA from './COGA';

// Create global COGA instance
let cogaInstance: COGA | null = null;

/**
 * Initialize COGA
 */
async function init(): Promise<COGA> {
  try {
    // Check if already initialized
    if (cogaInstance) {
      console.log('[COGA] Already initialized');
      return cogaInstance;
    }

    // Create instance
    cogaInstance = new COGA();

    // Initialize
    await cogaInstance.init();

    // Attach to window for debugging
    if (typeof window !== 'undefined') {
      (window as any).COGA = cogaInstance;
    }

    return cogaInstance;
  } catch (error) {
    console.error('[COGA] Failed to initialize:', error);
    throw error;
  }
}

// Auto-initialize when loaded
if (typeof window !== 'undefined') {
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      init().catch((error) => {
        console.error('[COGA] Auto-initialization failed:', error);
      });
    });
  } else {
    // DOM already loaded
    init().catch((error) => {
      console.error('[COGA] Auto-initialization failed:', error);
    });
  }
}

// Export for module usage
export default init;
export { COGA };

