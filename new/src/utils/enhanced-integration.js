/**
 * enhanced-integration.js
 * Integration layer connecting unified modals, dialogs, power card market, and themes
 */

// Import all the enhanced systems
import { newModalSystem } from './new-modal-system.js';
import { unifiedDialogs } from './unified-dialogs.js';
import { createPowerCardMarket } from './power-card-market.js';

// Enhanced Game Integration Class
class EnhancedGameIntegration {
  constructor(store) {
    this.store = store;
    this.initialized = false;
  }

  initialize() {
    if (this.initialized) return;
    
    try {
      // Initialize unified systems
      this.setupGlobalEventHandlers();
      this.setupKeyboardShortcuts();
      this.setupThemeWatcher();
      
      this.initialized = true;
      console.log('Enhanced Game Integration initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Enhanced Game Integration:', error);
    }
  }

  setupGlobalEventHandlers() {
    // Listen for game events that should trigger unified dialogs
    if (!window.__KOT_NEW__?.eventBus) {
      console.warn('EventBus not available, skipping global event handlers setup');
      return;
    }
    
    try {
      const eventBus = window.__KOT_NEW__.eventBus;
      
      // Tokyo choice events
      eventBus.on('tokyo-choice-required', (payload) => {
        const { playerId, zone, callback } = payload;
        const player = this.store.getState().players?.find(p => p.id === playerId);
        
        if (player) {
          unifiedDialogs.showTokyoDialog({
            playerName: player.name || player.monster?.name || 'Monster',
            zone: zone || 'Tokyo',
            callback: (choice) => {
              if (callback) callback(choice);
              eventBus.emit('tokyo-choice-made', { playerId, choice, zone });
            }
          });
        }
      });

      // Player death events
      eventBus.on('player-eliminated', (payload) => {
        const { playerId, killerId, cause } = payload;
        const state = this.store.getState();
        const player = state.players?.find(p => p.id === playerId);
        const killer = state.players?.find(p => p.id === killerId);
        
        if (player) {
          unifiedDialogs.showPlayerDeathDialog({
            playerName: player.name || player.monster?.name || 'Monster',
            killerName: killer ? (killer.name || killer.monster?.name || 'Monster') : 'Unknown',
            cause: cause || 'defeated',
            callback: () => {
              eventBus.emit('death-dialog-acknowledged', { playerId });
            }
          });
        }
      });

      // Victory events
      eventBus.on('game-won', (payload) => {
        const { winnerId, winCondition } = payload;
        const state = this.store.getState();
        const winner = state.players?.find(p => p.id === winnerId);
        
        if (winner) {
          unifiedDialogs.showVictoryDialog({
            winnerName: winner.name || winner.monster?.name || 'Monster',
            winCondition: winCondition || 'victory',
            finalStats: {
              victoryPoints: winner.victoryPoints || 0,
              energy: winner.energy || 0,
              health: winner.health || 0,
              powerCards: winner.cards?.length || 0
            },
            callback: (action) => {
              eventBus.emit('victory-dialog-action', { action, winnerId });
            }
          });
        }
      });

      // Card purchase events
      eventBus.on('card-purchase-attempt', (payload) => {
        const { playerId, cardId, success, reason } = payload;
        
        if (success) {
          unifiedDialogs.showNotification({
            title: 'Card Purchased!',
            message: 'Power card added to your collection.',
            type: 'success',
            icon: '🃏'
          });
        } else {
          unifiedDialogs.showNotification({
            title: 'Purchase Failed',
            message: reason || 'Could not purchase card.',
            type: 'warning',
            icon: '⚠️'
          });
        }
      });
    } catch (error) {
      console.error('Failed to setup global event handlers:', error);
    }
  }

  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (event) => {
      // Only handle shortcuts when no modal is open
      if (document.querySelector('.modal-overlay')) return;
      
      switch (event.key) {
        case 'M':
        case 'm':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            createPowerCardMarket();
          }
          break;
          
        case 'Escape':
          // Close any open unified dialogs
          newModalSystem.closeModal();
          break;
      }
    });
  }

  setupThemeWatcher() {
    // Watch for theme changes and apply them system-wide
    if (this.store) {
      let previousTheme = null;
      
      this.store.subscribe(() => {
        const state = this.store.getState();
        const currentTheme = state.settings?.powerCardTheme;
        
        if (currentTheme !== previousTheme) {
          this.applyThemeSystem(currentTheme);
          previousTheme = currentTheme;
        }
        
        // Update dialog system setting
        const dialogSystem = state.settings?.dialogSystem;
        if (dialogSystem !== undefined) {
          document.documentElement.setAttribute('data-dialog-system', dialogSystem);
        }
      });
    }
  }

  applyThemeSystem(theme) {
    // Apply theme to document root for CSS custom properties
    if (theme && theme !== 'original') {
      document.documentElement.setAttribute('data-power-card-theme', theme);
    } else {
      document.documentElement.removeAttribute('data-power-card-theme');
    }
    
    // Notify any listening components via eventBus
    if (window.__KOT_NEW__?.eventBus) {
      window.__KOT_NEW__.eventBus.emit('theme-changed', { theme });
    }
  }

  // Enhanced modal creation with theme support
  createThemedModal(id, title, content, options = {}) {
    const state = this.store?.getState();
    const useUnified = state?.settings?.dialogSystem !== 'legacy';
    
    if (useUnified) {
      return newModalSystem.createModal(id, title, content, {
        ...options,
        className: `${options.className || ''} unified-theme`.trim()
      });
    } else {
      // Fallback to legacy modal system if available
      return newModalSystem.createModal(id, title, content, options);
    }
  }

  // Utility method to show notifications with game context
  showGameNotification(type, title, message, duration = 3000) {
    return unifiedDialogs.showNotification({
      type,
      title,
      message,
      duration,
      icon: this.getNotificationIcon(type)
    });
  }

  getNotificationIcon(type) {
    const icons = {
      info: 'ℹ️',
      success: '✅',
      warning: '⚠️',
      error: '❌',
      energy: '⚡',
      victory: '🏆',
      card: '🃏',
      battle: '⚔️',
      tokyo: '🗼'
    };
    return icons[type] || icons.info;
  }

  // Check if enhanced features are available
  isEnhancedModeEnabled() {
    const state = this.store?.getState();
    return state?.settings?.dialogSystem !== 'legacy';
  }
}

// Global integration instance
let integrationInstance = null;

export function initializeEnhancedIntegration(store) {
  if (!integrationInstance) {
    console.log('Initializing Enhanced Game Integration...');
    integrationInstance = new EnhancedGameIntegration(store);
    integrationInstance.initialize();
    
    // Make available globally for debugging
    if (window.__KOT_NEW__) {
      window.__KOT_NEW__.enhanced = integrationInstance;
      console.log('Enhanced integration available at window.__KOT_NEW__.enhanced');
    }
  }
  return integrationInstance;
}

export function getEnhancedIntegration() {
  return integrationInstance;
}

// Export utilities
export { newModalSystem, unifiedDialogs, createPowerCardMarket };