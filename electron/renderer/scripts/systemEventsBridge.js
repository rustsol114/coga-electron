/**
 * systemEventsBridge.js
 * Bridges system-wide events from Electron main process to COGA
 * This allows COGA to receive click and scroll events from anywhere on the system,
 * not just within the Electron window.
 */

(function() {
  'use strict';

  let systemEventsStarted = false;
  let clickListenerCleanup = null;
  let scrollListenerCleanup = null;
  let mousemoveListenerCleanup = null;
  let keydownListenerCleanup = null;
  let keyupListenerCleanup = null;

  /**
   * Start system events and bridge them to COGA
   */
  async function startSystemEventsBridge() {
    try {
      // Check if electron API is available
      if (!window.electron || !window.electron.systemEvents) {
        console.warn('[SystemEventsBridge] Electron API not available');
        return;
      }

      // Start system event capture in main process
      console.log('[SystemEventsBridge] Starting system events...');
      const result = await window.electron.systemEvents.start();
      if (!result || !result.success) {
        console.error('[SystemEventsBridge] Failed to start system events:', result?.error);
        return;
      }

      console.log('[SystemEventsBridge] ✓ System events started successfully:', result);

      // Wait for COGA to be available
      await waitForCOGA();

      // Set up event listeners
      setupEventListeners();

      systemEventsStarted = true;
    } catch (error) {
      console.error('[SystemEventsBridge] Error starting system events bridge:', error);
    }
  }

  /**
   * Wait for COGA instance to be available
   */
  function waitForCOGA() {
    return new Promise((resolve, reject) => {
      if (window.COGA && typeof window.COGA.getStatus === 'function') {
        resolve();
        return;
      }

      let attempts = 0;
      const maxAttempts = 100; // 10 seconds

      const checkCOGA = () => {
        attempts++;
        if (window.COGA && typeof window.COGA.getStatus === 'function') {
          console.log('[SystemEventsBridge] COGA found');
          resolve();
        } else if (attempts >= maxAttempts) {
          reject(new Error('COGA not available after waiting'));
        } else {
          setTimeout(checkCOGA, 100);
        }
      };

      setTimeout(checkCOGA, 100);
    });
  }

  /**
   * Set up listeners for system events and forward them to COGA
   */
  function setupEventListeners() {
    try {
        // Listen for click events
        if (window.electron && window.electron.systemEvents && window.electron.systemEvents.on) {
          console.log('[SystemEventsBridge] Setting up click listener...');
          clickListenerCleanup = window.electron.systemEvents.on('click', (clickData) => {
            try {
              console.log('[SystemEventsBridge] Received click from IPC:', clickData);
              forwardClickToCOGA(clickData);
            } catch (error) {
              console.error('[SystemEventsBridge] Error handling click event:', error);
            }
          });
          console.log('[SystemEventsBridge] Click listener registered');

          // Listen for scroll events
          console.log('[SystemEventsBridge] Setting up scroll listener...');
          scrollListenerCleanup = window.electron.systemEvents.on('scroll', (scrollData) => {
            try {
              console.log('[SystemEventsBridge] Received scroll from IPC:', scrollData);
              forwardScrollToCOGA(scrollData);
            } catch (error) {
              console.error('[SystemEventsBridge] Error handling scroll event:', error);
            }
          });
          console.log('[SystemEventsBridge] Scroll listener registered');

        // Listen for mousemove events
        mousemoveListenerCleanup = window.electron.systemEvents.on('mousemove', (moveData) => {
          try {
            forwardMouseMoveToCOGA(moveData);
          } catch (error) {
            console.error('[SystemEventsBridge] Error handling mousemove event:', error);
          }
        });

        // Listen for keyboard events
        keydownListenerCleanup = window.electron.systemEvents.on('keydown', (keyData) => {
          try {
            forwardKeyDownToCOGA(keyData);
          } catch (error) {
            console.error('[SystemEventsBridge] Error handling keydown event:', error);
          }
        });

        keyupListenerCleanup = window.electron.systemEvents.on('keyup', (keyData) => {
          try {
            forwardKeyUpToCOGA(keyData);
          } catch (error) {
            console.error('[SystemEventsBridge] Error handling keyup event:', error);
          }
        });

        console.log('[SystemEventsBridge] Event listeners set up');
      }
    } catch (error) {
      console.error('[SystemEventsBridge] Error setting up event listeners:', error);
    }
  }

  /**
   * Convert screen coordinates to window-relative coordinates
   */
  function screenToWindow(screenX, screenY) {
    try {
      const bounds = window.electron?.systemEvents?.getMousePosition?.() || {};
      // If we have window bounds, convert coordinates
      // For now, use screen coordinates directly - COGA might handle this
      return {
        x: screenX,
        y: screenY
      };
    } catch (error) {
      return { x: screenX, y: screenY };
    }
  }

  /**
   * Forward click event to COGA
   * Dispatch to the most likely target where COGA listens
   */
  function forwardClickToCOGA(clickData) {
    if (!window.COGA) {
      console.warn('[SystemEventsBridge] COGA not available, cannot forward click');
      return;
    }

    // Debug: Log COGA methods to see what's available
    if (!window._cogaMethodsLogged) {
      console.log('[SystemEventsBridge] COGA object:', window.COGA);
      console.log('[SystemEventsBridge] COGA methods:', Object.getOwnPropertyNames(window.COGA).filter(name => typeof window.COGA[name] === 'function'));
      console.log('[SystemEventsBridge] COGA prototype methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(window.COGA)).filter(name => typeof window.COGA[name] === 'function'));
      window._cogaMethodsLogged = true;
    }

    try {
      // Try direct method calls first (most efficient, no DOM events)
      if (typeof window.COGA.recordClick === 'function') {
        console.log('[SystemEventsBridge] Calling COGA.recordClick');
        window.COGA.recordClick(clickData);
        return;
      }

      if (typeof window.COGA.handleClick === 'function') {
        console.log('[SystemEventsBridge] Calling COGA.handleClick');
        window.COGA.handleClick(clickData);
        return;
      }

      if (typeof window.COGA.handleSystemEvent === 'function') {
        console.log('[SystemEventsBridge] Calling COGA.handleSystemEvent');
        window.COGA.handleSystemEvent('click', clickData);
        return;
      }

      if (window.COGA.eventTracker && typeof window.COGA.eventTracker.recordClick === 'function') {
        console.log('[SystemEventsBridge] Calling COGA.eventTracker.recordClick');
        window.COGA.eventTracker.recordClick(clickData);
        return;
      }
      
      console.log('[SystemEventsBridge] No direct method found, using DOM event dispatch');

      // Fallback: Dispatch DOM event to all possible targets
      // Note: Programmatically created events are not "trusted" by default
      // Some libraries filter them out, but we'll try anyway
      const coords = screenToWindow(clickData.x, clickData.y);
      
      // Create event with all necessary properties
      const clickEvent = new MouseEvent('mousedown', {
        bubbles: true,
        cancelable: true,
        view: window,
        detail: 1,
        clientX: coords.x,
        clientY: coords.y,
        screenX: clickData.x,
        screenY: clickData.y,
        button: clickData.button || 0,
        buttons: clickData.button === 0 ? 1 : clickData.button === 1 ? 4 : 2,
        which: clickData.button === 0 ? 1 : clickData.button === 1 ? 3 : 2,
        // Add more properties that might be checked
        ctrlKey: false,
        shiftKey: false,
        altKey: false,
        metaKey: false
      });

      // Mark as trusted if possible (some browsers allow this)
      try {
        Object.defineProperty(clickEvent, 'isTrusted', {
          value: true,
          writable: false
        });
      } catch (e) {
        // Can't modify isTrusted in some browsers
      }

      // Try all three targets - COGA might listen on any of them
      console.log('[SystemEventsBridge] Dispatching mousedown event to body, document, window');
      if (document.body) {
        document.body.dispatchEvent(clickEvent);
      }
      document.dispatchEvent(clickEvent);
      window.dispatchEvent(clickEvent);
      
      // Also try dispatching 'click' event (not just mousedown)
      // COGA might listen to 'click' instead of 'mousedown'
      const clickEvent2 = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        view: window,
        detail: 1,
        clientX: coords.x,
        clientY: coords.y,
        screenX: clickData.x,
        screenY: clickData.y,
        button: clickData.button || 0,
        buttons: clickData.button === 0 ? 1 : clickData.button === 1 ? 4 : 2
      });
      
      try {
        Object.defineProperty(clickEvent2, 'isTrusted', {
          value: true,
          writable: false
        });
      } catch (e) {}
      
      console.log('[SystemEventsBridge] Dispatching click event to body, document, window');
      if (document.body) {
        document.body.dispatchEvent(clickEvent2);
      }
      document.dispatchEvent(clickEvent2);
      window.dispatchEvent(clickEvent2);

    } catch (error) {
      console.error('[SystemEventsBridge] Error forwarding click to COGA:', error);
    }
  }

  /**
   * Forward scroll event to COGA
   * Dispatch to the most likely target where COGA listens
   */
  function forwardScrollToCOGA(scrollData) {
    if (!window.COGA) {
      console.warn('[SystemEventsBridge] COGA not available, cannot forward scroll');
      return;
    }

    // Debug: Log scroll data
    console.log('[SystemEventsBridge] Forwarding scroll to COGA:', scrollData);

    try {
      // Try direct method calls first (most efficient, no DOM events)
      if (typeof window.COGA.recordScroll === 'function') {
        console.log('[SystemEventsBridge] Calling COGA.recordScroll');
        window.COGA.recordScroll(scrollData);
        return;
      }

      if (typeof window.COGA.handleScroll === 'function') {
        console.log('[SystemEventsBridge] Calling COGA.handleScroll');
        window.COGA.handleScroll(scrollData);
        return;
      }

      if (typeof window.COGA.handleSystemEvent === 'function') {
        console.log('[SystemEventsBridge] Calling COGA.handleSystemEvent for scroll');
        window.COGA.handleSystemEvent('scroll', scrollData);
        return;
      }

      if (window.COGA.eventTracker && typeof window.COGA.eventTracker.recordScroll === 'function') {
        console.log('[SystemEventsBridge] Calling COGA.eventTracker.recordScroll');
        window.COGA.eventTracker.recordScroll(scrollData);
        return;
      }
      
      console.log('[SystemEventsBridge] No direct method found, using DOM event dispatch for scroll');

      // Fallback: Dispatch DOM wheel event to all possible targets
      const coords = screenToWindow(scrollData.x || 0, scrollData.y || 0);
      
      // Ensure deltaY is properly set (scrollData might have delta instead)
      const deltaY = scrollData.deltaY !== undefined ? scrollData.deltaY : (scrollData.delta || 0);
      
      // Create wheel event (standard DOM event for scrolling)
      const wheelEvent = new WheelEvent('wheel', {
        bubbles: true,
        cancelable: true,
        view: window,
        clientX: coords.x,
        clientY: coords.y,
        screenX: scrollData.x || 0,
        screenY: scrollData.y || 0,
        deltaY: deltaY,
        deltaX: scrollData.deltaX || 0,
        deltaZ: 0,
        deltaMode: 0, // DOM_DELTA_PIXEL
        ctrlKey: false,
        shiftKey: false,
        altKey: false,
        metaKey: false
      });

      // Mark as trusted if possible
      try {
        Object.defineProperty(wheelEvent, 'isTrusted', {
          value: true,
          writable: false
        });
      } catch (e) {
        // Can't modify isTrusted in some browsers
      }

      console.log('[SystemEventsBridge] Dispatching wheel event to body, document, window');
      
      // Try all three targets - COGA might listen on any of them
      if (document.body) {
        document.body.dispatchEvent(wheelEvent);
      }
      document.dispatchEvent(wheelEvent);
      window.dispatchEvent(wheelEvent);
      
      // Also try 'scroll' event (some libraries listen to this)
      const scrollEvent = new Event('scroll', {
        bubbles: true,
        cancelable: true
      });
      
      try {
        Object.defineProperty(scrollEvent, 'isTrusted', {
          value: true,
          writable: false
        });
      } catch (e) {}
      
      console.log('[SystemEventsBridge] Dispatching scroll event to body, document, window');
      
      if (document.body) {
        document.body.dispatchEvent(scrollEvent);
      }
      document.dispatchEvent(scrollEvent);
      window.dispatchEvent(scrollEvent);

    } catch (error) {
      console.error('[SystemEventsBridge] Error forwarding scroll to COGA:', error);
      console.error('[SystemEventsBridge] Error stack:', error.stack);
    }
  }

  /**
   * Forward mouse move event to COGA
   */
  function forwardMouseMoveToCOGA(moveData) {
    if (!window.COGA) {
      return;
    }

    try {
      if (typeof window.COGA.recordMouseMove === 'function') {
        window.COGA.recordMouseMove(moveData);
        return;
      }

      // Simulate mousemove event
      const moveEvent = new MouseEvent('mousemove', {
        bubbles: true,
        cancelable: true,
        clientX: moveData.x,
        clientY: moveData.y,
        timestamp: moveData.timestamp || Date.now()
      });

      document.dispatchEvent(moveEvent);
      window.dispatchEvent(moveEvent);

    } catch (error) {
      console.error('[SystemEventsBridge] Error forwarding mousemove to COGA:', error);
    }
  }

  /**
   * Forward keydown event to COGA
   */
  function forwardKeyDownToCOGA(keyData) {
    if (!window.COGA) {
      return;
    }

    try {
      if (typeof window.COGA.recordKeyDown === 'function') {
        window.COGA.recordKeyDown(keyData);
        return;
      }

      // Simulate keydown event
      const keyEvent = new KeyboardEvent('keydown', {
        bubbles: true,
        cancelable: true,
        key: keyData.key || '',
        code: keyData.code || '',
        timestamp: keyData.timestamp || Date.now()
      });

      document.dispatchEvent(keyEvent);
      window.dispatchEvent(keyEvent);

    } catch (error) {
      console.error('[SystemEventsBridge] Error forwarding keydown to COGA:', error);
    }
  }

  /**
   * Forward keyup event to COGA
   */
  function forwardKeyUpToCOGA(keyData) {
    if (!window.COGA) {
      return;
    }

    try {
      if (typeof window.COGA.recordKeyUp === 'function') {
        window.COGA.recordKeyUp(keyData);
        return;
      }

      // Simulate keyup event
      const keyEvent = new KeyboardEvent('keyup', {
        bubbles: true,
        cancelable: true,
        key: keyData.key || '',
        code: keyData.code || '',
        timestamp: keyData.timestamp || Date.now()
      });

      document.dispatchEvent(keyEvent);
      window.dispatchEvent(keyEvent);

    } catch (error) {
      console.error('[SystemEventsBridge] Error forwarding keyup to COGA:', error);
    }
  }

  /**
   * Stop system events bridge
   */
  function stopSystemEventsBridge() {
    try {
      if (clickListenerCleanup) {
        clickListenerCleanup();
        clickListenerCleanup = null;
      }

      if (scrollListenerCleanup) {
        scrollListenerCleanup();
        scrollListenerCleanup = null;
      }

      if (mousemoveListenerCleanup) {
        mousemoveListenerCleanup();
        mousemoveListenerCleanup = null;
      }

      if (keydownListenerCleanup) {
        keydownListenerCleanup();
        keydownListenerCleanup = null;
      }

      if (keyupListenerCleanup) {
        keyupListenerCleanup();
        keyupListenerCleanup = null;
      }

      if (window.electron && window.electron.systemEvents) {
        window.electron.systemEvents.stop();
      }

      systemEventsStarted = false;
      console.log('[SystemEventsBridge] System events bridge stopped');
    } catch (error) {
      console.error('[SystemEventsBridge] Error stopping system events bridge:', error);
    }
  }

  /**
   * Initialize when DOM is ready
   */
  function init() {
    console.log('[SystemEventsBridge] Initializing system events bridge...');
    console.log('[SystemEventsBridge] Electron API available:', !!(window.electron && window.electron.systemEvents));
    console.log('[SystemEventsBridge] COGA available:', !!(window.COGA));
    console.log('[SystemEventsBridge] Document ready state:', document.readyState);
    
    // Wait a bit for COGA to load, then start the bridge
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        console.log('[SystemEventsBridge] DOM loaded, starting bridge in 500ms...');
        setTimeout(startSystemEventsBridge, 500);
      });
    } else {
      console.log('[SystemEventsBridge] DOM already ready, starting bridge in 500ms...');
      setTimeout(startSystemEventsBridge, 500);
    }

    // Also try when COGA becomes available
    const checkCOGA = setInterval(() => {
      if (window.COGA && !systemEventsStarted) {
        console.log('[SystemEventsBridge] COGA detected, starting bridge...');
        clearInterval(checkCOGA);
        startSystemEventsBridge();
      }
    }, 500);

    // Stop checking after 10 seconds
    setTimeout(() => {
      clearInterval(checkCOGA);
      if (!systemEventsStarted) {
        console.warn('[SystemEventsBridge] Bridge not started after 10 seconds. COGA:', !!window.COGA, 'Electron:', !!(window.electron && window.electron.systemEvents));
      }
    }, 10000);
  }

  // Initialize
  console.log('[SystemEventsBridge] Script loaded');
  init();

  // Expose cleanup function
  window.systemEventsBridge = {
    start: startSystemEventsBridge,
    stop: stopSystemEventsBridge
  };

})();

