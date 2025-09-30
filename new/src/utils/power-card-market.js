/**
 * power-card-market.js
 * Enhanced power card buying interface with unified theming
 */

import { newModalSystem } from './new-modal-system.js';
import { store } from '../bootstrap/index.js';
import { uiCardDetailOpen } from '../core/actions.js';

export function createPowerCardMarket() {
  const content = document.createElement('div');
  content.innerHTML = `
    <div class="unified-modal-form">
      <!-- Market Header -->
      <div class="market-header" style="background: linear-gradient(135deg, #6c5ce7, #a29bfe); padding: 20px; margin: -20px -20px 20px; border-radius: 8px; color: white; text-align: center;">
        <h2 style="margin: 0 0 8px; font-family: 'Bangers', cursive; font-size: 28px; text-shadow: 2px 2px 0 rgba(0,0,0,0.3);">
          🏪 Power Card Market
        </h2>
        <p style="margin: 0; opacity: 0.9; font-size: 14px;">
          Purchase powerful abilities to dominate Tokyo!
        </p>
      </div>

      <!-- Player Resources -->
      <div class="player-resources" style="background: #1a1a1a; padding: 16px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #444;">
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 12px; text-align: center;">
          <div class="resource-item">
            <div style="font-size: 24px; margin-bottom: 4px;">⚡</div>
            <div style="font-size: 18px; font-weight: 600; color: #ffd700;" id="player-energy">0</div>
            <div style="font-size: 12px; opacity: 0.7;">Energy</div>
          </div>
          <div class="resource-item">
            <div style="font-size: 24px; margin-bottom: 4px;">🏆</div>
            <div style="font-size: 18px; font-weight: 600; color: #4CAF50;" id="player-vp">0</div>
            <div style="font-size: 12px; opacity: 0.7;">Victory Points</div>
          </div>
          <div class="resource-item">
            <div style="font-size: 24px; margin-bottom: 4px;">🃏</div>
            <div style="font-size: 18px; font-weight: 600; color: #9C27B0;" id="player-cards">0</div>
            <div style="font-size: 12px; opacity: 0.7;">Power Cards</div>
          </div>
        </div>
      </div>

      <!-- Market Controls -->
      <div class="market-controls" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding: 12px; background: #2a2a2a; border-radius: 6px;">
        <div class="market-info">
          <span style="font-size: 14px; opacity: 0.8;">Available Cards: <strong id="cards-available">3</strong></span>
        </div>
        <div class="market-actions">
          <button class="btn btn-secondary refresh-market-btn" style="padding: 6px 12px; font-size: 12px;">
            <span>🔄</span> Refresh Market (2⚡)
          </button>
        </div>
      </div>

      <!-- Market Cards Grid -->
      <div class="market-cards-grid" id="market-cards" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px; margin-bottom: 20px;">
        <!-- Cards will be populated here -->
      </div>

      <!-- Deck Information -->
      <div class="deck-info" style="background: #1a1a1a; padding: 12px; border-radius: 6px; border: 1px solid #444; text-align: center; margin-bottom: 20px;">
        <div style="font-size: 14px; opacity: 0.8;">
          <strong id="deck-count">20</strong> cards remaining in deck
        </div>
        <button class="btn btn-secondary peek-deck-btn" style="margin-top: 8px; padding: 6px 12px; font-size: 12px;" disabled>
          <span>👁️</span> Peek at Deck (3⚡)
        </button>
      </div>
    </div>
    
    <div class="modal-actions">
      <button type="button" class="btn btn-secondary close-btn">
        <span>✕</span> Close Market
      </button>
    </div>
  `;

  // Load market data and set up interactions
  const updateMarketDisplay = () => {
    if (!window.__KOT_NEW__?.store) return;
    
    const state = window.__KOT_NEW__.store.getState();
    const activePlayer = state.players?.find(p => p.id === state.activePlayerId);
    const shopCards = state.cards?.shop || [];
    const deckCount = state.cards?.deck?.length || 0;
    
    // Update player resources
    if (activePlayer) {
      content.querySelector('#player-energy').textContent = activePlayer.energy || 0;
      content.querySelector('#player-vp').textContent = activePlayer.victoryPoints || 0;
      content.querySelector('#player-cards').textContent = activePlayer.cards?.length || 0;
    }
    
    // Update market info
    content.querySelector('#cards-available').textContent = shopCards.length;
    content.querySelector('#deck-count').textContent = deckCount;
    
    // Update market cards
    const marketGrid = content.querySelector('#market-cards');
    marketGrid.innerHTML = shopCards.length === 0 
      ? '<div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #999; font-style: italic;">No cards available in market</div>'
      : shopCards.map(card => createMarketCardHTML(card, activePlayer)).join('');
    
    // Add card click handlers
    marketGrid.querySelectorAll('.market-card').forEach(cardEl => {
      const cardId = cardEl.getAttribute('data-card-id');
      const card = shopCards.find(c => c.id === cardId);
      if (!card) return;
      
      cardEl.addEventListener('click', () => {
        try { store.dispatch(uiCardDetailOpen(card.id, 'shop')); } catch(e) { console.warn('Failed to open card detail from market', e); }
      });
    });
  };

  // Market refresh
  content.querySelector('.refresh-market-btn').addEventListener('click', async () => {
    if (!window.__KOT_NEW__?.store) return;
    
    const state = window.__KOT_NEW__.store.getState();
    const activePlayer = state.players?.find(p => p.id === state.activePlayerId);
    
    if (activePlayer && activePlayer.energy >= 2) {
      try {
        const cardsService = await import('../services/cardsService.js');
        cardsService.flushShop();
        updateMarketDisplay();
        unifiedDialogs.showNotification({
          title: 'Market Refreshed!',
          message: 'New cards are now available for purchase.',
          type: 'success',
          icon: '🔄'
        });
      } catch (e) {
        console.error('Failed to refresh market:', e);
      }
    } else {
      unifiedDialogs.showNotification({
        title: 'Insufficient Energy',
        message: 'You need 2⚡ to refresh the market.',
        type: 'warning',
        icon: '⚠️'
      });
    }
  });

  // Close button
  content.querySelector('.close-btn').addEventListener('click', () => {
    newModalSystem.closeModal('powerCardMarket');
  });

  // Initial load
  updateMarketDisplay();

  return newModalSystem.createModal('powerCardMarket', '', content, { 
    width: '800px',
    showHeader: false 
  });
}

function createMarketCardHTML(card, activePlayer) {
  const canAfford = activePlayer && activePlayer.energy >= (card.cost || 0);
  const rarity = card.rarity || 'common';
  
  const rarityColors = {
    common: '#74b9ff',
    rare: '#fd79a8',
    epic: '#fdcb6e',
    legendary: '#e17055'
  };
  
  const rarityColor = rarityColors[rarity] || rarityColors.common;
  
  return `
    <div class="market-card" data-card-id="${card.id}" style="
      background: linear-gradient(135deg, #2d3436 0%, #1b1f20 78%);
      border: 2px solid ${rarityColor};
      border-radius: 8px;
      padding: 16px;
      cursor: pointer;
      transition: all 0.3s;
      position: relative;
      ${canAfford ? '' : 'opacity: 0.6; filter: grayscale(0.3);'}
    ">
      <div class="card-header" style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
        <div style="flex: 1;">
          <h3 style="margin: 0 0 4px; font-family: 'Bangers', cursive; font-size: 16px; color: ${rarityColor}; line-height: 1.2;">
            ${card.name}
          </h3>
          <div class="rarity-badge" style="
            background: ${rarityColor}; 
            color: white; 
            padding: 2px 6px; 
            border-radius: 8px; 
            font-size: 10px; 
            text-transform: uppercase; 
            font-weight: 600;
            display: inline-block;
          ">
            ${rarity}
          </div>
        </div>
        <div class="cost-badge" style="
          background: ${canAfford ? '#00b894' : '#ff7675'};
          color: white;
          padding: 4px 8px;
          border-radius: 12px;
          font-family: 'Bangers', cursive;
          font-size: 14px;
          min-width: 36px;
          text-align: center;
        ">
          ${card.cost || 0}⚡
        </div>
      </div>
      
      <div class="card-description" style="
        font-size: 12px;
        line-height: 1.4;
        color: #e4e4e4;
        margin-bottom: 12px;
        min-height: 40px;
      ">
        ${card.description || 'A powerful ability card.'}
      </div>
      
      <div class="card-footer" style="display: flex; justify-content: center;">
        <div class="buy-hint" style="
          font-size: 11px;
          opacity: 0.7;
          text-align: center;
          ${canAfford ? 'color: #00b894;' : 'color: #ff7675;'}
        ">
          ${canAfford ? 'Click to buy' : 'Need more energy'}
        </div>
      </div>
      
      ${!canAfford ? `
        <div class="insufficient-overlay" style="
          position: absolute;
          inset: 0;
          background: rgba(0,0,0,0.3);
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #ff7675;
          font-weight: 600;
          font-size: 12px;
        ">
          <div style="
            background: rgba(255, 118, 117, 0.2);
            padding: 4px 8px;
            border-radius: 4px;
            border: 1px solid #ff7675;
          ">
            Need ${(card.cost || 0) - (activePlayer?.energy || 0)} more ⚡
          </div>
        </div>
      ` : ''}
    </div>
  `;
}