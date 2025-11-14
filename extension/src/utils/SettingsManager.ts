/**
 * SettingsManager.ts
 * Manages all COGA settings storage and retrieval
 */

import StorageManager from './storage';
import type { InterventionKey, SettingsConfig } from '../types';
import { ANNOYANCE_DEFAULTS } from '../config/annoyance';

class SettingsManager {
  private storage: StorageManager;
  private readonly defaultSettings: SettingsConfig;
  private settings: SettingsConfig;

  constructor() {
    this.storage = new StorageManager('coga_');
    const defaultEnabledInterventions: Record<InterventionKey, boolean> = {
      oneBreathReset: true,
      boxBreathing: true,
      twentyTwentyGaze: true,
      figureEightSmoothPursuit: true,
      nearFarFocusShift: true,
      microBreak: true,
    };

    this.defaultSettings = {
      sensitivity: 'medium',
      interventionLimits: {
        cooldownMinutes: ANNOYANCE_DEFAULTS.cooldownMinutes,
        maxPerHour: ANNOYANCE_DEFAULTS.maxPerHour,
        maxPerDay: ANNOYANCE_DEFAULTS.maxPerDay,
      },
      suppressedDomains: [],
      enabledInterventions: { ...defaultEnabledInterventions },
    };
    this.settings = {
      ...this.defaultSettings,
      enabledInterventions: { ...this.defaultSettings.enabledInterventions },
    };
  }

  /**
   * Initialize settings from storage
   */
  async init(): Promise<void> {
    try {
      // Load settings from storage (StorageManager handles chrome.storage vs localStorage automatically)
      const saved = await this.storage.get<SettingsConfig>('settings');
      if (saved) {
        this.settings = {
          ...this.defaultSettings,
          ...saved,
          enabledInterventions: {
            ...this.defaultSettings.enabledInterventions,
            ...(saved.enabledInterventions || {}),
          },
        };
      } else {
        // First time setup - save defaults
        await this.save();
      }
      
      // Listen for global settings changes (only if chrome.storage is available)
      this.setupGlobalSync();
    } catch (error) {
      console.error('[COGA] Error loading settings:', error);
      // Use defaults on error
      this.settings = { ...this.defaultSettings };
    }
  }

  /**
   * Setup global synchronization listener
   */
  private setupGlobalSync(): void {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
        chrome.storage.onChanged.addListener((changes, areaName) => {
          if (areaName !== 'local') return;
          
          if (changes['coga_settings']) {
            const newSettings = changes['coga_settings'].newValue;
            if (newSettings) {
              this.settings = {
                ...this.defaultSettings,
                ...newSettings,
                enabledInterventions: {
                  ...this.defaultSettings.enabledInterventions,
                  ...(newSettings.enabledInterventions || {}),
                },
              };
            }
          }
        });
      }
    } catch (error) {
      console.error('[COGA] Error setting up settings sync:', error);
    }
  }

  /**
   * Get current settings
   */
  getSettings(): SettingsConfig {
    return { ...this.settings };
  }

  /**
   * Get sensitivity setting
   */
  getSensitivity(): 'low' | 'medium' | 'high' {
    return this.settings.sensitivity;
  }

  /**
   * Set sensitivity
   */
  async setSensitivity(sensitivity: 'low' | 'medium' | 'high'): Promise<void> {
    try {
      this.settings.sensitivity = sensitivity;
      await this.save();
    } catch (error) {
      console.error('[COGA] Error setting sensitivity:', error);
      throw error;
    }
  }

  /**
   * Get intervention limits
   */
  getInterventionLimits() {
    return { ...this.settings.interventionLimits };
  }

  /**
   * Set intervention limits
   */
  async setInterventionLimits(limits: {
    cooldownMinutes?: number;
    maxPerHour?: number;
    maxPerDay?: number;
  }): Promise<void> {
    try {
      if (limits.cooldownMinutes !== undefined) {
        this.settings.interventionLimits.cooldownMinutes = limits.cooldownMinutes;
      }
      if (limits.maxPerHour !== undefined) {
        this.settings.interventionLimits.maxPerHour = limits.maxPerHour;
      }
      if (limits.maxPerDay !== undefined) {
        this.settings.interventionLimits.maxPerDay = limits.maxPerDay;
      }
      await this.save();
    } catch (error) {
      console.error('[COGA] Error setting intervention limits:', error);
      throw error;
    }
  }

  /**
   * Get suppressed domains
   */
  getSuppressedDomains(): string[] {
    return [...this.settings.suppressedDomains];
  }

  /**
   * Add suppressed domain
   */
  async addSuppressedDomain(domain: string): Promise<void> {
    try {
      const normalized = this.normalizeDomain(domain);
      if (!this.settings.suppressedDomains.includes(normalized)) {
        this.settings.suppressedDomains.push(normalized);
        await this.save();
      }
    } catch (error) {
      console.error('[COGA] Error adding suppressed domain:', error);
      throw error;
    }
  }

  /**
   * Remove suppressed domain
   */
  async removeSuppressedDomain(domain: string): Promise<void> {
    try {
      const normalized = this.normalizeDomain(domain);
      this.settings.suppressedDomains = this.settings.suppressedDomains.filter(
        (d) => d !== normalized
      );
      await this.save();
    } catch (error) {
      console.error('[COGA] Error removing suppressed domain:', error);
      throw error;
    }
  }

  /**
   * Check if current domain is suppressed
   */
  isCurrentDomainSuppressed(): boolean {
    try {
      const currentDomain = this.normalizeDomain(window.location.hostname);
      return this.settings.suppressedDomains.includes(currentDomain);
    } catch (error) {
      console.error('[COGA] Error checking suppressed domain:', error);
      return false;
    }
  }

  /**
   * Get enabled interventions
   */
  getEnabledInterventions() {
    return { ...this.settings.enabledInterventions };
  }

  /**
   * Set enabled intervention
   */
  async setInterventionEnabled(
    intervention: InterventionKey,
    enabled: boolean
  ): Promise<void> {
    try {
      this.settings.enabledInterventions[intervention] = enabled;
      await this.save();
    } catch (error) {
      console.error('[COGA] Error setting intervention enabled:', error);
      throw error;
    }
  }

  /**
   * Check if intervention is enabled
   */
  isInterventionEnabled(intervention: InterventionKey): boolean {
    return this.settings.enabledInterventions[intervention];
  }

  /**
   * Normalize domain string
   */
  private normalizeDomain(domain: string): string {
    try {
      // Remove protocol if present
      let normalized = domain.replace(/^https?:\/\//, '');
      
      // Remove www. prefix
      normalized = normalized.replace(/^www\./, '');
      
      // Remove path and query
      normalized = normalized.split('/')[0];
      normalized = normalized.split('?')[0];
      
      // Remove port if present
      normalized = normalized.split(':')[0];
      
      // Convert to lowercase
      normalized = normalized.toLowerCase().trim();
      
      return normalized;
    } catch (error) {
      console.error('[COGA] Error normalizing domain:', error);
      return domain.toLowerCase().trim();
    }
  }

  /**
   * Save settings to storage
   */
  private async save(): Promise<void> {
    try {
      // StorageManager handles chrome.storage vs localStorage automatically
      await this.storage.set('settings', this.settings);
      
      // Also sync to chrome.storage for global access (only if available)
      try {
        const chromeApi = (typeof window !== 'undefined' && (window as any).chrome) || 
                         (typeof global !== 'undefined' && (global as any).chrome) ||
                         null;
        
        if (chromeApi && chromeApi.storage && chromeApi.storage.local) {
          await chromeApi.storage.local.set({ coga_settings: this.settings });
        }
      } catch (syncError) {
        // Ignore sync errors - local storage is the primary storage
        console.log('[COGA] Could not sync settings to chrome.storage (using local storage)');
      }
    } catch (error) {
      console.error('[COGA] Error saving settings:', error);
      throw error;
    }
  }

  /**
   * Reset to default settings
   */
  async reset(): Promise<void> {
    try {
      this.settings = {
        ...this.defaultSettings,
        enabledInterventions: { ...this.defaultSettings.enabledInterventions },
      };
      await this.save();
    } catch (error) {
      console.error('[COGA] Error resetting settings:', error);
      throw error;
    }
  }

  /**
   * Get sensitivity threshold values based on level
   */
  getSensitivityThresholds(sensitivity: 'low' | 'medium' | 'high'): { balanced: number; accurate: number } {
    const thresholds = {
      low: { balanced: 20, accurate: 70 },
      medium: { balanced: 40, accurate: 70 },
      high: { balanced: 70, accurate: 70 },
    };
    return thresholds[sensitivity];
  }
}

export default SettingsManager;

