/**
 * unified-dialogs.js
 * Modern themed dialog system with multiple UI components
 */

import { newModalSystem } from './new-modal-system.js';

export class UnifiedDialogSystem {
  constructor(store) {
    this.store = store;
    this.activeDialogs = new Map();
  }

  // Check if unified dialogs are enabled
  isUnifiedEnabled() {
    const state = this.store.getState();
    return state.settings?.dialogSystem === 'unified';
  }

  // Tokyo Stay/Leave Dialog
  showTokyoDialog(options = {}) {
    if (!this.isUnifiedEnabled()) return false; // Use legacy

    const { playerName = 'Monster', zone = 'Tokyo', damage = 0, callback } = options;
    
    const content = document.createElement('div');
    content.innerHTML = `
      <div class="unified-dialog tokyo-dialog">
        <div class="dialog-hero" style="background: linear-gradient(135deg, #ff6b6b, #ee5a24); padding: 20px; border-radius: 8px 8px 0 0; text-align: center; color: white; position: relative; overflow: hidden;">
          <div class="hero-bg" style="position: absolute; inset: 0; background-image: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse"><path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="1"/></pattern></defs><rect width="100" height="100" fill="url(%23grid)"/></svg>'); opacity: 0.3;"></div>
          <div style="position: relative; z-index: 1;">
            <h2 style="margin: 0 0 8px; font-family: 'Bangers', cursive; font-size: 28px; text-shadow: 2px 2px 0 rgba(0,0,0,0.3);">
              🏙️ ${zone} Under Attack!
            </h2>
            <p style="margin: 0; font-size: 16px; opacity: 0.9;">
              ${playerName} took ${damage} damage from other monsters!
            </p>
          </div>
        </div>
        
        <div class="dialog-content" style="padding: 24px; background: #2a2a2a; color: #e4e4e4;">
          <div class="choice-prompt" style="text-align: center; margin-bottom: 24px;">
            <p style="font-size: 18px; margin: 0 0 8px; font-weight: 600;">What will you do?</p>
            <p style="font-size: 14px; margin: 0; opacity: 0.8;">Choose your fate in the heart of Tokyo!</p>
          </div>
          
          <div class="choice-options" style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
            <div class="choice-card stay-card" data-choice="stay" style="background: linear-gradient(135deg, #00b894, #00a085); padding: 20px; border-radius: 8px; cursor: pointer; text-align: center; color: white; transition: all 0.3s; border: 2px solid transparent; position: relative; overflow: hidden;">
              <div class="card-glow" style="position: absolute; inset: -2px; background: linear-gradient(135deg, #00b894, #00a085); border-radius: 10px; z-index: -1; opacity: 0; transition: opacity 0.3s;"></div>
              <div style="position: relative; z-index: 1;">
                <div style="font-size: 32px; margin-bottom: 8px;">🏆</div>
                <h3 style="margin: 0 0 8px; font-family: 'Bangers', cursive; font-size: 20px;">Stay in ${zone}</h3>
                <p style="margin: 0; font-size: 13px; opacity: 0.9; line-height: 1.4;">Keep earning victory points but remain vulnerable to attacks</p>
              </div>
            </div>
            
            <div class="choice-card leave-card" data-choice="leave" style="background: linear-gradient(135deg, #6c5ce7, #5f3dc4); padding: 20px; border-radius: 8px; cursor: pointer; text-align: center; color: white; transition: all 0.3s; border: 2px solid transparent; position: relative; overflow: hidden;">
              <div class="card-glow" style="position: absolute; inset: -2px; background: linear-gradient(135deg, #6c5ce7, #5f3dc4); border-radius: 10px; z-index: -1; opacity: 0; transition: opacity 0.3s;"></div>
              <div style="position: relative; z-index: 1;">
                <div style="font-size: 32px; margin-bottom: 8px;">🏃</div>
                <h3 style="margin: 0 0 8px; font-family: 'Bangers', cursive; font-size: 20px;">Leave ${zone}</h3>
                <p style="margin: 0; font-size: 13px; opacity: 0.9; line-height: 1.4;">Escape to safety and be able to heal your wounds</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    // Add hover effects
    const choiceCards = content.querySelectorAll('.choice-card');
    choiceCards.forEach(card => {
      card.addEventListener('mouseenter', () => {
        card.style.transform = 'translateY(-4px)';
        card.style.boxShadow = '0 8px 25px rgba(0,0,0,0.3)';
        card.querySelector('.card-glow').style.opacity = '0.2';
      });
      
      card.addEventListener('mouseleave', () => {
        card.style.transform = 'translateY(0)';
        card.style.boxShadow = 'none';
        card.querySelector('.card-glow').style.opacity = '0';
      });
      
      card.addEventListener('click', () => {
        const choice = card.getAttribute('data-choice');
        newModalSystem.closeModal('tokyoChoice');
        if (callback) callback(choice);
      });
    });

    newModalSystem.createModal('tokyoChoice', '', content, { 
      width: '500px',
      showHeader: false,
      escapeToClose: false 
    });
    newModalSystem.showModal('tokyoChoice');
    return true;
  }

  // Player Death Dialog
  showPlayerDeathDialog(options = {}) {
    if (!this.isUnifiedEnabled()) return false;
    
    const { playerName = 'Monster', killerName = 'Unknown', cause = 'defeated', callback } = options;
    
    const content = document.createElement('div');
    content.innerHTML = `
      <div class="unified-dialog death-dialog">
        <div class="dialog-hero" style="background: linear-gradient(135deg, #2d3436, #636e72); padding: 24px; border-radius: 8px 8px 0 0; text-align: center; color: white; position: relative; overflow: hidden;">
          <div class="hero-bg" style="position: absolute; inset: 0; background-image: radial-gradient(circle at 50% 50%, rgba(255,255,255,0.1) 1px, transparent 1px); background-size: 20px 20px; opacity: 0.3;"></div>
          <div style="position: relative; z-index: 1;">
            <div style="font-size: 48px; margin-bottom: 12px; opacity: 0.8;">💀</div>
            <h2 style="margin: 0 0 8px; font-family: 'Bangers', cursive; font-size: 32px; text-shadow: 2px 2px 0 rgba(0,0,0,0.5);">
              ${playerName} Eliminated!
            </h2>
            <p style="margin: 0; font-size: 16px; opacity: 0.9;">
              ${cause} by ${killerName}
            </p>
          </div>
        </div>
        
        <div class="dialog-content" style="padding: 24px; background: #2a2a2a; color: #e4e4e4; text-align: center;">
          <div class="elimination-stats" style="background: #1a1a1a; padding: 16px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #444;">
            <h4 style="margin: 0 0 12px; color: #ff7675; font-family: 'Bangers', cursive;">Final Stats</h4>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 12px; font-size: 14px;">
              <div><strong>Victory Points:</strong> <span id="final-vp">0</span></div>
              <div><strong>Power Cards:</strong> <span id="final-cards">0</span></div>
              <div><strong>Energy:</strong> <span id="final-energy">0</span></div>
            </div>
          </div>
          
          <p style="font-style: italic; opacity: 0.8; margin-bottom: 20px;">
            "Even the mightiest monsters must fall..."
          </p>
          
          <button class="btn btn-primary continue-btn" style="background: #74b9ff; border-color: #0984e3; padding: 12px 24px;">
            <span>⚰️</span> Continue Game
          </button>
        </div>
      </div>
    `;

    content.querySelector('.continue-btn').addEventListener('click', () => {
      newModalSystem.closeModal('playerDeath');
      if (callback) callback();
    });

    newModalSystem.createModal('playerDeath', '', content, { 
      width: '450px',
      showHeader: false,
      escapeToClose: false 
    });
    newModalSystem.showModal('playerDeath');
    return true;
  }

  // Victory Dialog
  showVictoryDialog(options = {}) {
    if (!this.isUnifiedEnabled()) return false;
    
    const { playerName = 'Monster', winCondition = 'Victory Points', finalStats = {}, callback } = options;
    
    const content = document.createElement('div');
    content.innerHTML = `
      <div class="unified-dialog victory-dialog">
        <div class="dialog-hero" style="background: linear-gradient(135deg, #ffeaa7, #fdcb6e); padding: 24px; border-radius: 8px 8px 0 0; text-align: center; color: #2d3436; position: relative; overflow: hidden;">
          <div class="hero-bg" style="position: absolute; inset: 0; background-image: radial-gradient(circle at 20% 30%, rgba(255,255,255,0.3) 2px, transparent 2px), radial-gradient(circle at 80% 70%, rgba(255,255,255,0.2) 1px, transparent 1px); background-size: 30px 30px, 20px 20px; animation: victorySparkle 3s ease-in-out infinite;"></div>
          <div style="position: relative; z-index: 1;">
            <div style="font-size: 56px; margin-bottom: 16px; animation: victoryBounce 2s ease-in-out infinite;">👑</div>
            <h2 style="margin: 0 0 8px; font-family: 'Bangers', cursive; font-size: 36px; text-shadow: 2px 2px 0 rgba(0,0,0,0.2);">
              ${playerName} Wins!
            </h2>
            <p style="margin: 0; font-size: 18px; font-weight: 600;">
              Victory by ${winCondition}
            </p>
          </div>
        </div>
        
        <div class="dialog-content" style="padding: 24px; background: #2a2a2a; color: #e4e4e4; text-align: center;">
          <div class="victory-stats" style="background: linear-gradient(135deg, #ffeaa7, #fdcb6e); color: #2d3436; padding: 16px; border-radius: 8px; margin-bottom: 20px;">
            <h4 style="margin: 0 0 12px; font-family: 'Bangers', cursive; font-size: 20px;">Champion Stats</h4>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 12px; font-size: 14px; font-weight: 600;">
              <div>🏆 <strong>${finalStats.vp || 0}</strong> Victory Points</div>
              <div>⚡ <strong>${finalStats.energy || 0}</strong> Energy</div>
              <div>🃏 <strong>${finalStats.cards || 0}</strong> Power Cards</div>
              <div>❤️ <strong>${finalStats.health || 0}</strong> Health</div>
            </div>
          </div>
          
          <div class="victory-message" style="margin-bottom: 24px;">
            <p style="font-size: 18px; margin: 0 0 8px; color: #ffeaa7;">
              🎉 Congratulations! 🎉
            </p>
            <p style="font-style: italic; opacity: 0.9; margin: 0;">
              "Long live the King of Tokyo!"
            </p>
          </div>
          
          <div style="display: flex; gap: 12px; justify-content: center;">
            <button class="btn btn-success new-game-btn" style="background: #00b894; border-color: #00a085;">
              <span>🎮</span> New Game
            </button>
            <button class="btn btn-secondary stats-btn" style="background: #636e72; border-color: #2d3436;">
              <span>📊</span> View Stats
            </button>
          </div>
        </div>
      </div>
    `;

    // Add animations
    const style = document.createElement('style');
    style.textContent = `
      @keyframes victorySparkle {
        0%, 100% { opacity: 0.8; transform: scale(1); }
        50% { opacity: 1; transform: scale(1.05); }
      }
      @keyframes victoryBounce {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-8px); }
      }
    `;
    document.head.appendChild(style);

    content.querySelector('.new-game-btn').addEventListener('click', () => {
      newModalSystem.closeModal('victory');
      if (callback) callback('newGame');
    });
    
    content.querySelector('.stats-btn').addEventListener('click', () => {
      newModalSystem.closeModal('victory');
      if (callback) callback('stats');
    });

    newModalSystem.createModal('victory', '', content, { 
      width: '500px',
      showHeader: false,
      escapeToClose: false 
    });
    newModalSystem.showModal('victory');
    return true;
  }

  // Power Card Detail Dialog
  showCardDetailDialog(options = {}) {
    if (!this.isUnifiedEnabled()) return false;
    
    const { card, context = 'shop', canBuy = false, callback } = options;
    
    const content = document.createElement('div');
    content.innerHTML = `
      <div class="unified-dialog card-detail-dialog">
        <div class="card-detail-hero" style="background: linear-gradient(135deg, #6c5ce7, #a29bfe); padding: 20px; border-radius: 8px 8px 0 0; color: white; position: relative;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <div style="flex: 1;">
              <h2 style="margin: 0 0 8px; font-family: 'Bangers', cursive; font-size: 24px;">${card.name}</h2>
              <div style="display: flex; align-items: center; gap: 12px; font-size: 14px;">
                <span class="rarity-badge" style="background: rgba(255,255,255,0.2); padding: 4px 8px; border-radius: 12px; text-transform: uppercase; font-size: 11px; font-weight: 600;">${card.rarity || 'common'}</span>
                ${card.type ? `<span style="opacity: 0.8;">${card.type}</span>` : ''}
              </div>
            </div>
            <div class="cost-display" style="background: rgba(0,0,0,0.3); padding: 8px 12px; border-radius: 16px; font-family: 'Bangers', cursive; font-size: 18px;">
              ⚡ ${card.cost || 0}
            </div>
          </div>
        </div>
        
        <div class="card-detail-content" style="padding: 24px; background: #2a2a2a; color: #e4e4e4;">
          <div class="card-description" style="background: #1a1a1a; padding: 16px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #6c5ce7;">
            <p style="margin: 0; line-height: 1.5; font-size: 15px;">${card.description || 'A powerful ability card.'}</p>
          </div>
          
          ${card.effects ? `
            <div class="card-effects" style="margin-bottom: 20px;">
              <h4 style="margin: 0 0 12px; color: #a29bfe; font-family: 'Bangers', cursive;">Effects:</h4>
              <ul style="margin: 0; padding-left: 20px; list-style-type: none;">
                ${card.effects.map(effect => `
                  <li style="margin-bottom: 8px; position: relative;">
                    <span style="position: absolute; left: -20px; color: #6c5ce7;">⚡</span>
                    ${effect.description || effect}
                  </li>
                `).join('')}
              </ul>
            </div>
          ` : ''}
          
          <div class="card-actions" style="display: flex; gap: 12px; justify-content: center;">
            ${canBuy ? `
              <button class="btn btn-primary buy-btn" style="background: #00b894; border-color: #00a085;">
                <span>💰</span> Buy for ${card.cost}⚡
              </button>
            ` : ''}
            <button class="btn btn-secondary close-btn">
              <span>✕</span> Close
            </button>
          </div>
        </div>
      </div>
    `;

    if (canBuy) {
      content.querySelector('.buy-btn').addEventListener('click', () => {
        newModalSystem.closeModal('cardDetail');
        if (callback) callback('buy', card);
      });
    }
    
    content.querySelector('.close-btn').addEventListener('click', () => {
      newModalSystem.closeModal('cardDetail');
      if (callback) callback('close');
    });

    newModalSystem.createModal('cardDetail', '', content, { 
      width: '450px',
      showHeader: false 
    });
    newModalSystem.showModal('cardDetail');
    return true;
  }

  // Generic Notification Dialog
  showNotification(options = {}) {
    if (!this.isUnifiedEnabled()) return false;
    
    const { 
      title = 'Notification', 
      message = '', 
      type = 'info', // info, success, warning, error
      icon = 'ℹ️',
      duration = 4000,
      callback 
    } = options;
    
    const typeStyles = {
      info: { bg: 'linear-gradient(135deg, #74b9ff, #0984e3)', color: 'white' },
      success: { bg: 'linear-gradient(135deg, #00b894, #00a085)', color: 'white' },
      warning: { bg: 'linear-gradient(135deg, #fdcb6e, #f39c12)', color: '#2d3436' },
      error: { bg: 'linear-gradient(135deg, #ff7675, #e84393)', color: 'white' }
    };
    
    const style = typeStyles[type] || typeStyles.info;
    
    const content = document.createElement('div');
    content.innerHTML = `
      <div class="unified-dialog notification-dialog">
        <div class="notification-hero" style="background: ${style.bg}; padding: 20px; border-radius: 8px; text-align: center; color: ${style.color};">
          <div style="font-size: 32px; margin-bottom: 8px;">${icon}</div>
          <h3 style="margin: 0 0 8px; font-family: 'Bangers', cursive; font-size: 22px;">${title}</h3>
          <p style="margin: 0; opacity: 0.9;">${message}</p>
        </div>
      </div>
    `;

    newModalSystem.createModal('notification', '', content, { 
      width: '350px',
      showHeader: false,
      escapeToClose: true
    });
    newModalSystem.showModal('notification');
    
    if (duration > 0) {
      setTimeout(() => {
        newModalSystem.closeModal('notification');
        if (callback) callback();
      }, duration);
    }
    
    return true;
  }
}

// Export singleton instance
export const unifiedDialogs = new Proxy({}, {
  get(target, prop) {
    if (!target._instance && window.__KOT_NEW__?.store) {
      target._instance = new UnifiedDialogSystem(window.__KOT_NEW__.store);
    }
    return target._instance?.[prop];
  }
});