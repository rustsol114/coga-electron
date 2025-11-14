/**
 * content.js
 * Content script that auto-injects COGA into all pages
 */

(function() {
  'use strict';

  // Avoid double injection - check for existing widget or COGA instance
  if (window.COGA || document.getElementById('coga-widget')) {
    // console.log('[COGA] Widget already exists in this tab, skipping injection');
    return;
  }

  // Check if extension is unlocked before injecting
  chrome.runtime.sendMessage(
    { action: 'checkUnlocked' },
    (response) => {
      if (chrome.runtime.lastError) {
        console.error('[COGA] Extension communication error:', chrome.runtime.lastError);
        return;
      }

      if (!response || !response.unlocked) {
        // Extension is locked, don't inject
        return;
      }

      // Inject COGA script
      const script = document.createElement('script');
      script.src = chrome.runtime.getURL('coga.min.js');
      script.onload = () => {
        // console.log('[COGA] Content script loaded successfully');
        // Script will auto-initialize
      };
      script.onerror = () => {
        console.error('[COGA] Error loading content script');
      };
      
      // Inject script
      if (document.head) {
        document.head.insertBefore(script, document.head.firstChild);
      } else {
        document.documentElement.appendChild(script);
      }
    }
  );

  // Setup message bridge between page context (coga.min.js) and extension context (content script)
  // This allows coga.min.js to access chrome.storage via message passing
  window.addEventListener('message', (event) => {
    // Only accept messages from same origin
    if (event.source !== window) return;
    
    const message = event.data;
    
    if (message && message.type === 'COGA_BRIDGE_PING') {
      window.postMessage(
        {
          type: 'COGA_BRIDGE_PONG',
          requestId: message.requestId,
        },
        '*'
      );
      return;
    }
    
    // Handle COGA storage requests from page context
    if (message && message.type === 'COGA_STORAGE_REQUEST') {
      // console.log('[COGA Bridge] Received storage request:', message.action);
      
      if (message.action === 'get') {
        chrome.storage.local.get(message.keys, (result) => {
          window.postMessage({
            type: 'COGA_STORAGE_RESPONSE',
            requestId: message.requestId,
            success: !chrome.runtime.lastError,
            data: result,
            error: chrome.runtime.lastError?.message
          }, '*');
        });
      } else if (message.action === 'set') {
        chrome.storage.local.set(message.data, () => {
          window.postMessage({
            type: 'COGA_STORAGE_RESPONSE',
            requestId: message.requestId,
            success: !chrome.runtime.lastError,
            error: chrome.runtime.lastError?.message
          }, '*');
        });
      } else if (message.action === 'remove') {
        chrome.storage.local.remove(message.keys, () => {
          window.postMessage({
            type: 'COGA_STORAGE_RESPONSE',
            requestId: message.requestId,
            success: !chrome.runtime.lastError,
            error: chrome.runtime.lastError?.message
          }, '*');
        });
      }
    }
    
    // NEW: Handle runtime messages from page context (for sending events to background)
    if (message && message.type === 'COGA_RUNTIME_MESSAGE') {
      // console.log('[COGA Bridge] Received runtime message:', message.action);
      
      // Forward to background script
      chrome.runtime.sendMessage({
        action: message.action,
        events: message.events,
        metrics: message.metrics
      }, (response) => {
        // Forward response back to page context
        window.postMessage({
          type: 'COGA_RUNTIME_RESPONSE',
          requestId: message.requestId,
          success: !chrome.runtime.lastError,
          data: response,
          error: chrome.runtime.lastError?.message
        }, '*');
      });
    }
  });

  // Forward chrome.storage.onChanged events to page context
  chrome.storage.onChanged.addListener((changes, areaName) => {
    // console.log('[COGA Bridge] Storage changed, forwarding to page context');
    window.postMessage({
      type: 'COGA_STORAGE_CHANGED',
      changes: changes,
      areaName: areaName
    }, '*');
  });

  // Listen for unlock/lock messages from popup
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'unlock' && request.unlocked) {
      // Reload COGA if page is already loaded
      if (window.location.href) {
        // Inject script if not already present
        if (!window.COGA) {
          const script = document.createElement('script');
          script.src = chrome.runtime.getURL('coga.min.js');
          (document.head || document.documentElement).appendChild(script);
        }
      }
      sendResponse({ success: true });
    } else if (request.action === 'lock' && request.locked) {
      // Destroy COGA widget when locked
      if (window.COGA && typeof window.COGA.destroy === 'function') {
        try {
          window.COGA.destroy();
          window.COGA = null;
        } catch (error) {
          console.error('[COGA] Error destroying COGA:', error);
        }
      }
      
      // Remove widget from DOM
      const widget = document.getElementById('coga-widget');
      if (widget) {
        widget.remove();
      }
      
      // Remove widget styles
      const styles = document.getElementById('coga-widget-styles');
      if (styles) {
        styles.remove();
      }
      
      sendResponse({ success: true });
    }
    return true;
  });
})();

