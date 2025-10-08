// Mini Deck Component - Vertical power cards text indicator for mobile UI
// Positioned at bottom-left with rotated text like collapsed monsters panel

import { store } from '../../bootstrap/index.js';
import { eventBus } from '../../core/eventBus.js';

export function build({ selector }) {
  const root = document.createElement('div');
  root.className = 'cmp-mini-deck';
  
  function render() {
  function render() {
    const state = store.getState();
    const powerCards = state?.powerCards?.powerCards || [];
    const cardCount = powerCards.length;

    // Create mini stacked deck indicator
    container.innerHTML = `
      <div class="mini-deck-container">
        <div class="mini-deck-text">DECK</div>
        ${cardCount > 0 ? `<div class="mini-deck-count">${cardCount}</div>` : ''}
      </div>
    `;

    // Click handler
    const deckBtn = container.querySelector('.mini-deck-container');
    if (deckBtn) {
      deckBtn.onclick = () => {
        eventBus.emit('ui/modal/showPlayerPowerCards', {
          playerId: state?.currentPlayerId
        });
      };
    }
  }    // Click to open power cards modal
    const container = root.querySelector('.mini-deck-container');
    if (container) {
      container.onclick = () => {
        if (activeId && cardCount > 0) {
          eventBus.emit('ui/modal/showPlayerPowerCards');
        }
      };
    }
  }
  
  store.subscribe(render);
  render();
  
  return { root, update: render };
}

export function update() {
  // Component re-renders on store changes via subscription
}
