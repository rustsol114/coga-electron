/**
 * storage.ts
 * Storage wrapper with chrome.storage.local support via background script messaging
 * Ensures all tabs/windows share the same data
 */

class StorageManager {
  private static readonly BRIDGE_HANDSHAKE_TIMEOUT_MS = 800;
  private static readonly BRIDGE_REQUEST_TIMEOUT_MS = 3000;
  private static readonly BRIDGE_RETRY_INTERVAL_MS = 5000;
  private static bridgeStatus: 'unknown' | 'available' | 'unavailable' = 'unknown';
  private static bridgeDetectionPromise: Promise<boolean> | null = null;
  private static bridgeLastCheckedAt = 0;

  private prefix: string;
  private isAvailable: boolean;
  private hasDirectChromeAccess: boolean;
  private canAttemptBridge: boolean;

  constructor(prefix: string = 'coga_') {
    this.prefix = prefix;
    this.hasDirectChromeAccess = StorageManager.hasChromeRuntimeAccess();
    this.canAttemptBridge =
      typeof window !== 'undefined' && typeof window.postMessage === 'function';
    this.isAvailable = this.checkAvailability();
  }

  /**
   * Determine if we have direct access to chrome runtime APIs (content script context).
   */
  private static hasChromeRuntimeAccess(): boolean {
    try {
      return (
        typeof chrome !== 'undefined' &&
        !!chrome.runtime &&
        typeof chrome.runtime.id === 'string' &&
        chrome.runtime.id.length > 0
      );
    } catch (error) {
      return false;
    }
  }

  /**
   * Generate unique request ID for message passing
   */
  private static generateRequestId(): string {
    return `coga_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Ensure the content-script bridge is available. Performs a lightweight handshake.
   */
  private static async ensureBridgeReady(): Promise<boolean> {
    if (StorageManager.bridgeStatus === 'available') {
      return true;
    }

    if (StorageManager.bridgeStatus === 'unavailable') {
      const elapsed = Date.now() - StorageManager.bridgeLastCheckedAt;
      if (elapsed < StorageManager.BRIDGE_RETRY_INTERVAL_MS) {
        return false;
      }
      StorageManager.bridgeStatus = 'unknown';
    }

    if (typeof window === 'undefined' || typeof window.postMessage !== 'function') {
      StorageManager.bridgeStatus = 'unavailable';
      StorageManager.bridgeLastCheckedAt = Date.now();
      return false;
    }

    if (!StorageManager.bridgeDetectionPromise) {
      StorageManager.bridgeDetectionPromise = new Promise<boolean>((resolve) => {
        const requestId = StorageManager.generateRequestId();
        let settled = false;
        const cleanup = (result: boolean) => {
          if (settled) {
            return;
          }
          settled = true;
          StorageManager.bridgeStatus = result ? 'available' : 'unavailable';
          StorageManager.bridgeLastCheckedAt = Date.now();
          window.removeEventListener('message', handler);
          window.clearTimeout(timeoutId);
          StorageManager.bridgeDetectionPromise = null;
          resolve(result);
        };

        const handler = (event: MessageEvent) => {
          if (event.source !== window) {
            return;
          }
          if (event.data?.type === 'COGA_BRIDGE_PONG' && event.data.requestId === requestId) {
            cleanup(true);
          }
        };

        window.addEventListener('message', handler);

        const timeoutId = window.setTimeout(() => {
          cleanup(false);
        }, StorageManager.BRIDGE_HANDSHAKE_TIMEOUT_MS);

        try {
          window.postMessage(
            {
              type: 'COGA_BRIDGE_PING',
              requestId,
            },
            '*'
          );
        } catch (error) {
          console.warn('[COGA] Bridge handshake failed:', error);
          cleanup(false);
        }
      });
    }

    return StorageManager.bridgeDetectionPromise;
  }

  /**
   * Send a message to the content-script storage bridge.
   */
  private static async sendBridgeRequest(
    action: 'get' | 'set' | 'remove',
    payload: Record<string, unknown>
  ): Promise<{ success: boolean; data?: Record<string, unknown> | null; error?: unknown }> {
    if (typeof window === 'undefined' || typeof window.postMessage !== 'function') {
      throw new Error('Storage bridge requires a window context');
    }

    const requestId = StorageManager.generateRequestId();
    return new Promise((resolve, reject) => {
      let settled = false;

      const cleanup = () => {
        if (settled) {
          return;
        }
        settled = true;
        window.removeEventListener('message', handler);
        window.clearTimeout(timeoutId);
      };

      const handler = (event: MessageEvent) => {
        if (event.source !== window) {
          return;
        }
        const data = event.data;
        if (data?.type === 'COGA_STORAGE_RESPONSE' && data.requestId === requestId) {
          cleanup();
          resolve({
            success: Boolean(data.success),
            data: data.data ?? null,
            error: data.error,
          });
        }
      };

      const timeoutId = window.setTimeout(() => {
        cleanup();
        reject(new Error('Storage request timeout'));
      }, StorageManager.BRIDGE_REQUEST_TIMEOUT_MS);

      window.addEventListener('message', handler);

      try {
        window.postMessage(
          {
            type: 'COGA_STORAGE_REQUEST',
            action,
            requestId,
            ...payload,
          },
          '*'
        );
      } catch (error) {
        cleanup();
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    });
  }

  /**
   * Check if storage is available
   */
  private checkAvailability(): boolean {
    try {
      if (this.hasDirectChromeAccess || this.canAttemptBridge) {
        return true; // chrome.storage is available or bridge can be attempted
      }
      const test = '__storage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch (error) {
      console.warn('[COGA] Storage not available:', error);
      return false;
    }
  }

  /**
   * Get item from storage (uses window.postMessage bridge to content script)
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      if (!this.isAvailable) return null;

      const fullKey = this.prefix + key;

      const canUseBridge =
        this.canAttemptBridge && (await StorageManager.ensureBridgeReady());

      if (canUseBridge) {
        try {
          const response = await StorageManager.sendBridgeRequest('get', { keys: [fullKey] });
          if (
            response.success &&
            response.data &&
            Object.prototype.hasOwnProperty.call(response.data, fullKey)
          ) {
            const value = response.data[fullKey] as T;
            try {
              localStorage.setItem(fullKey, JSON.stringify(value));
            } catch (localError) {
              console.warn('[COGA] Unable to cache bridge value locally:', localError);
            }
            return value;
          }
        } catch (msgError) {
          console.warn('[COGA] Bridge messaging failed, using localStorage:', msgError);
        }
      }

      // Fallback to localStorage
      const value = localStorage.getItem(fullKey);
      if (value === null) return null;
      return JSON.parse(value) as T;
    } catch (error) {
      console.error('[COGA] Error getting from storage:', error);
      return null;
    }
  }

  /**
   * Set item in storage (uses window.postMessage bridge to content script)
   */
  async set<T>(key: string, value: T): Promise<boolean> {
    try {
      if (!this.isAvailable) return false;

      const fullKey = this.prefix + key;

      // Save to localStorage first (synchronous, immediate)
      try {
        const serialized = JSON.stringify(value);
        localStorage.setItem(fullKey, serialized);
      } catch (localError) {
        console.warn('[COGA] LocalStorage save failed:', localError);
      }

      const canUseBridge =
        this.canAttemptBridge && (await StorageManager.ensureBridgeReady());

      if (canUseBridge) {
        try {
          const response = await StorageManager.sendBridgeRequest('set', {
            data: { [fullKey]: value },
          });

          if (response.success) {
            console.log(
              `[COGA] Saved "${key}" to chrome.storage via bridge (shared across all tabs/domains)`
            );
            return true;
          }

          console.warn(
            `[COGA] Bridge save for "${key}" returned unsuccessful response; using localStorage only`
          );
          return true;
        } catch (msgError) {
          console.warn('[COGA] Bridge messaging failed, using localStorage only:', msgError);
          return true; // Local save already succeeded
        }
      }

      // Fallback to localStorage only
      return true;
    } catch (error) {
      console.error('[COGA] Error setting in storage:', error);

      // Handle quota exceeded
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        console.warn('[COGA] Storage quota exceeded, clearing old data');
        this.clearOldData();
      }

      return false;
    }
  }

  /**
   * Remove item from storage (removes from both chrome.storage and localStorage via background)
   */
  async remove(key: string): Promise<boolean> {
    try {
      if (!this.isAvailable) return false;

      const fullKey = this.prefix + key;

      // Remove from localStorage first
      try {
        localStorage.removeItem(fullKey);
      } catch (localError) {
        console.warn('[COGA] LocalStorage remove failed:', localError);
      }

      const canUseBridge =
        this.canAttemptBridge && (await StorageManager.ensureBridgeReady());

      if (canUseBridge) {
        try {
          const response = await StorageManager.sendBridgeRequest('remove', { keys: [fullKey] });
          if (!response.success) {
            console.warn(
              `[COGA] Bridge remove for "${key}" reported failure, data may persist in chrome.storage`
            );
          }
        } catch (msgError) {
          console.warn('[COGA] Bridge messaging failed during remove operation:', msgError);
        }
      } else if (
        this.hasDirectChromeAccess &&
        typeof chrome !== 'undefined' &&
        chrome.runtime &&
        typeof chrome.runtime.sendMessage === 'function'
      ) {
        try {
          chrome.runtime.sendMessage({ action: 'storageRemove', keys: [fullKey] }, () => {
            if (chrome.runtime.lastError) {
              console.warn(
                '[COGA] Message passing error while removing key:',
                chrome.runtime.lastError.message
              );
            }
          });
        } catch (msgError) {
          console.warn('[COGA] Direct chrome.runtime removal failed:', msgError);
        }
      }

      return true;
    } catch (error) {
      console.error('[COGA] Error removing from storage:', error);
      return false;
    }
  }

  /**
   * Clear all COGA data from storage
   */
  async clear(): Promise<boolean> {
    try {
      if (!this.isAvailable) return false;

      const keys = Object.keys(localStorage);
      keys.forEach((key) => {
        if (key.startsWith(this.prefix)) {
          localStorage.removeItem(key);
        }
      });

      return true;
    } catch (error) {
      console.error('[COGA] Error clearing storage:', error);
      return false;
    }
  }

  /**
   * Clear old data to free up space
   */
  private clearOldData(): void {
    try {
      // Remove event logs older than 7 days
      this.get<any[]>('events').then((events) => {
        if (events && Array.isArray(events)) {
          const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
          const filtered = events.filter(
            (e: any) => e.timestamp > weekAgo
          );
          this.set('events', filtered);
        }
      });
    } catch (error) {
      console.error('[COGA] Error clearing old data:', error);
    }
  }

  /**
   * Get all keys with prefix
   */
  async getAllKeys(): Promise<string[]> {
    try {
      if (!this.isAvailable) return [];

      const keys = Object.keys(localStorage);
      return keys
        .filter((key) => key.startsWith(this.prefix))
        .map((key) => key.replace(this.prefix, ''));
    } catch (error) {
      console.error('[COGA] Error getting all keys:', error);
      return [];
    }
  }

  /**
   * Get storage size in bytes
   */
  getSize(): number {
    try {
      if (!this.isAvailable) return 0;

      let total = 0;
      const keys = Object.keys(localStorage);

      keys.forEach((key) => {
        if (key.startsWith(this.prefix)) {
          const value = localStorage.getItem(key);
          total += key.length + (value ? value.length : 0);
        }
      });

      return total;
    } catch (error) {
      console.error('[COGA] Error calculating storage size:', error);
      return 0;
    }
  }
}

export default StorageManager;


