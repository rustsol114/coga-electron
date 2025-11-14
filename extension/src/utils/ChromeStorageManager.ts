/**
 * ChromeStorageManager.ts
 * Chrome Extension storage wrapper using chrome.storage.local
 * Replaces localStorage for extension context
 */

class ChromeStorageManager {
  /**
   * Get item from storage
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      return new Promise((resolve) => {
        chrome.storage.local.get([key], (result) => {
          if (chrome.runtime.lastError) {
            console.error('[COGA] Error getting from storage:', chrome.runtime.lastError);
            resolve(null);
            return;
          }
          
          const value = result[key];
          if (value === undefined) {
            resolve(null);
            return;
          }
          
          try {
            // If value is already an object, return it directly
            if (typeof value === 'object' && value !== null) {
              resolve(value as T);
            } else {
              // If it's a string, try to parse it
              resolve(JSON.parse(value as string) as T);
            }
          } catch (parseError) {
            // If parsing fails, return the value as-is
            resolve(value as T);
          }
        });
      });
    } catch (error) {
      console.error('[COGA] Error getting from storage:', error);
      return null;
    }
  }

  /**
   * Set item in storage
   */
  async set<T>(key: string, value: T): Promise<boolean> {
    try {
      return new Promise((resolve) => {
        chrome.storage.local.set({ [key]: value }, () => {
          if (chrome.runtime.lastError) {
            console.error('[COGA] Error setting in storage:', chrome.runtime.lastError);
            resolve(false);
            return;
          }
          resolve(true);
        });
      });
    } catch (error) {
      console.error('[COGA] Error setting in storage:', error);
      return false;
    }
  }

  /**
   * Remove item from storage
   */
  async remove(key: string): Promise<boolean> {
    try {
      return new Promise((resolve) => {
        chrome.storage.local.remove([key], () => {
          if (chrome.runtime.lastError) {
            console.error('[COGA] Error removing from storage:', chrome.runtime.lastError);
            resolve(false);
            return;
          }
          resolve(true);
        });
      });
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
      return new Promise((resolve) => {
        chrome.storage.local.get(null, (items) => {
          if (chrome.runtime.lastError) {
            console.error('[COGA] Error clearing storage:', chrome.runtime.lastError);
            resolve(false);
            return;
          }
          
          const keysToRemove = Object.keys(items).filter((key) =>
            key.startsWith('coga_')
          );
          
          if (keysToRemove.length === 0) {
            resolve(true);
            return;
          }
          
          chrome.storage.local.remove(keysToRemove, () => {
            if (chrome.runtime.lastError) {
              console.error('[COGA] Error clearing storage:', chrome.runtime.lastError);
              resolve(false);
              return;
            }
            resolve(true);
          });
        });
      });
    } catch (error) {
      console.error('[COGA] Error clearing storage:', error);
      return false;
    }
  }

  /**
   * Get all keys with prefix
   */
  async getAllKeys(): Promise<string[]> {
    try {
      return new Promise((resolve) => {
        chrome.storage.local.get(null, (items) => {
          if (chrome.runtime.lastError) {
            console.error('[COGA] Error getting all keys:', chrome.runtime.lastError);
            resolve([]);
            return;
          }
          
          const keys = Object.keys(items)
            .filter((key) => key.startsWith('coga_'))
            .map((key) => key.replace('coga_', ''));
          
          resolve(keys);
        });
      });
    } catch (error) {
      console.error('[COGA] Error getting all keys:', error);
      return [];
    }
  }

  /**
   * Get storage size in bytes (approximate)
   */
  getSize(): number {
    // Chrome storage doesn't provide direct size info
    // Return 0 or implement approximation if needed
    return 0;
  }
}

export default ChromeStorageManager;

