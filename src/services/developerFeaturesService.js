/**
 * Developer Features Detection and Management
 * Handles detection of #dev URL hash and manages developer-only features
 */

class DeveloperFeaturesManager {
  constructor() {
    this.isDevMode = false;
    this.checkDevMode();
    this.setupHashChangeListener();
  }

  /**
   * Check if developer mode is enabled via URL hash
   */
  checkDevMode() {
    this.isDevMode = window.location.hash.includes('dev');
    console.log('[DevFeatures] Developer mode:', this.isDevMode ? 'ENABLED' : 'disabled');
    return this.isDevMode;
  }

  /**
   * Listen for hash changes to toggle developer mode dynamically
   */
  setupHashChangeListener() {
    window.addEventListener('hashchange', () => {
      const wasDevMode = this.isDevMode;
      this.checkDevMode();
      
      if (wasDevMode !== this.isDevMode) {
        console.log('[DevFeatures] Developer mode toggled:', this.isDevMode ? 'ENABLED' : 'disabled');
        this.notifyDevModeChange();
      }
    });
  }

  /**
   * Notify components about developer mode changes
   */
  notifyDevModeChange() {
    const event = new CustomEvent('devModeChanged', {
      detail: { isDevMode: this.isDevMode }
    });
    document.dispatchEvent(event);
  }

  /**
   * Get current developer mode status
   */
  isEnabled() {
    return this.isDevMode;
  }

  /**
   * Enable developer mode (adds #dev to URL if not present)
   */
  enable() {
    if (!this.isDevMode) {
      const hash = window.location.hash;
      if (!hash.includes('dev')) {
        window.location.hash = hash ? `${hash}&dev` : '#dev';
      }
    }
  }

  /**
   * Disable developer mode (removes #dev from URL)
   */
  disable() {
    if (this.isDevMode) {
      const hash = window.location.hash;
      const newHash = hash
        .replace('#dev', '')
        .replace('&dev', '')
        .replace('dev&', '')
        .replace('dev', '');
      
      window.location.hash = newHash || '';
    }
  }

  /**
   * Get developer features configuration
   */
  getFeatures() {
    return {
      archiveManager: this.isDevMode,
      analytics: this.isDevMode,
      replayControls: this.isDevMode,
      aidtDebug: this.isDevMode,
      experimentalFeatures: this.isDevMode
    };
  }
}

// Create global instance
const developerFeatures = new DeveloperFeaturesManager();

// Export for use in other modules
export { developerFeatures, DeveloperFeaturesManager };