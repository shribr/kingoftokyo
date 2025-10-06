// Radial Menu Component - Circular touch-friendly action menu for mobile
// Displays in bottom-right corner with radial spread of action buttons

import { eventBus } from '../../core/eventBus.js';
import { store } from '../../bootstrap/index.js';
import { selectActivePlayerId } from '../../core/selectors.js';

export function build({ selector }) {
  const root = document.createElement('div');
  root.id = 'radial-menu-container';
  root.className = 'radial-menu-container';
  let isOpen = false;
  
  // SVG icons for each action - descriptive and clear
  const icons = {
    // Dice icon - two dice showing different faces
    dice: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="2" y="2" width="9" height="9" rx="1.5"/>
      <circle cx="5" cy="5" r="0.8" fill="currentColor"/>
      <circle cx="8" cy="5" r="0.8" fill="currentColor"/>
      <circle cx="5" cy="8" r="0.8" fill="currentColor"/>
      <circle cx="8" cy="8" r="0.8" fill="currentColor"/>
      <rect x="13" y="13" width="9" height="9" rx="1.5"/>
      <circle cx="16.5" cy="16.5" r="0.8" fill="currentColor"/>
      <circle cx="19.5" cy="16.5" r="0.8" fill="currentColor"/>
      <circle cx="16.5" cy="19.5" r="0.8" fill="currentColor"/>
      <circle cx="19.5" cy="19.5" r="0.8" fill="currentColor"/>
      <circle cx="18" cy="18" r="0.8" fill="currentColor"/>
    </svg>`,
    
    // Power cards icon - stack of cards
    cards: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="3" y="7" width="13" height="16" rx="2" transform="rotate(-5 9.5 15)"/>
      <rect x="6" y="5" width="13" height="16" rx="2" transform="rotate(3 12.5 13)"/>
      <rect x="8" y="3" width="13" height="16" rx="2"/>
      <path d="M12 8v6m-3-3h6" stroke-width="1.5"/>
    </svg>`,
    
    // End turn icon - circular arrow (pass turn)
    endTurn: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M22 12A10 10 0 1 1 12 2"/>
      <path d="M22 4v8h-8"/>
      <path d="M12 8v4l3 3"/>
    </svg>`,
    
    settings: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
    
    // Pause icon - pause symbol
    pause: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="6" y="4" width="4" height="16" rx="1"/>
      <rect x="14" y="4" width="4" height="16" rx="1"/>
    </svg>`,
  };

  function toggle() {
    isOpen = !isOpen;
    render();
  }

  function close() {
    if (isOpen) {
      isOpen = false;
      render();
    }
  }

  function handleAction(action) {
    const state = store.getState();
    
    switch (action) {
      case 'dice':
        eventBus.emit('ui/dice/rollRequested');
        break;
      case 'cards':
        const activeId = selectActivePlayerId(state);
        if (activeId) {
          eventBus.emit('ui/modal/showPlayerPowerCards');
        }
        break;
      case 'endTurn':
        eventBus.emit('ui/action/end');
        break;
      case 'settings':
        eventBus.emit('ui/settings/open');
        break;
      case 'pause':
        eventBus.emit('ui/pause/toggle');
        break;
    }
    
    close();
  }

  function render() {
    const state = store.getState();
    const activeId = selectActivePlayerId(state);
    const activePlayer = activeId ? state.players.byId[activeId] : null;
    const isCPU = activePlayer && (activePlayer.isCPU || activePlayer.isAI);
    const phase = state.phase;
    const dicePhase = state.dice?.phase;
    
    // Determine which actions are available
    const canRoll = phase === 'ROLL' && !isCPU && (dicePhase === 'idle' || (dicePhase === 'resolved' && state.dice.rerollsRemaining > 0));
    const canEndTurn = phase === 'ROLL' || phase === 'BUY' || phase === 'CLEANUP';
    const hasCards = activePlayer && activePlayer.cards && activePlayer.cards.length > 0;

    const actions = [
      { id: 'dice', label: 'Roll', icon: icons.dice, enabled: canRoll, angle: 0 },
      { id: 'cards', label: 'Cards', icon: icons.cards, enabled: hasCards, angle: 72 },
      { id: 'endTurn', label: 'End Turn', icon: icons.endTurn, enabled: canEndTurn, angle: 144 },
      { id: 'settings', label: 'Settings', icon: icons.settings, enabled: true, angle: 216 },
      { id: 'pause', label: 'Pause', icon: icons.pause, enabled: true, angle: 288 },
    ];

    root.className = `radial-menu-container ${isOpen ? 'open' : 'closed'}`;
    
    root.innerHTML = `
      <button class="radial-menu-toggle" aria-label="${isOpen ? 'Close menu' : 'Open menu'}" aria-expanded="${isOpen}">
        <svg viewBox="-2 -2 28 28" fill="currentColor" class="toggle-icon ${isOpen ? 'open' : ''}">
          ${isOpen 
            ? '<path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" fill="#333"/>'
            : `<!-- Pie chart with 5 distinct slices - light to dark blue, fills entire circle -->
               <circle cx="12" cy="12" r="12" fill="#87CEEB"/>
               <path d="M 12 12 L 12 0 A 12 12 0 0 1 22.9 7.6 L 12 12 Z" fill="#87CEEB" stroke="#000" stroke-width="0.5"/>
               <path d="M 12 12 L 22.9 7.6 A 12 12 0 0 1 24 16.5 L 12 12 Z" fill="#4682B4" stroke="#000" stroke-width="0.5"/>
               <path d="M 12 12 L 24 16.5 A 12 12 0 0 1 19.6 24 L 12 12 Z" fill="#1E90FF" stroke="#000" stroke-width="0.5"/>
               <path d="M 12 12 L 19.6 24 A 12 12 0 0 1 5.9 21.2 L 12 12 Z" fill="#0066CC" stroke="#000" stroke-width="0.5"/>
               <path d="M 12 12 L 5.9 21.2 A 12 12 0 0 1 12 0 L 12 12 Z" fill="#003366" stroke="#000" stroke-width="0.5"/>`
          }
        </svg>
      </button>
      
      ${isOpen ? `
        <div class="radial-menu-items">
          ${actions.map(action => `
            <button 
              class="radial-menu-item ${action.enabled ? 'enabled' : 'disabled'}" 
              data-action="${action.id}"
              data-angle="${action.angle}"
              aria-label="${action.label}"
              ${!action.enabled ? 'disabled' : ''}
            >
              <div class="action-icon">${action.icon}</div>
              <span class="action-label">${action.label}</span>
            </button>
          `).join('')}
        </div>
      ` : ''}
    `;

    // Event listeners
    const toggleBtn = root.querySelector('.radial-menu-toggle');
    if (toggleBtn) {
      toggleBtn.onclick = toggle;
    }

    if (isOpen) {
      root.querySelectorAll('.radial-menu-item.enabled').forEach(btn => {
        btn.onclick = () => handleAction(btn.dataset.action);
      });
    }
  }

  // Subscribe to state changes
  store.subscribe(render);
  
  // Initial render
  render();

  return { root, update: render };
}

export function update() {
  // Component re-renders via store subscription
}
