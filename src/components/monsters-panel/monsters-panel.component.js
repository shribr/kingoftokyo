/** monsters-panel.component.js
 * Composite panel that nests player profile cards + future monster/power card views.
 */
import { store } from '../../bootstrap/index.js';
import { selectPlayerOrder, selectActivePlayer, selectPlayerById, selectMonsterById } from '../../core/selectors.js';
import { uiMonsterSelectionOpen } from '../../core/actions.js';
import { build as buildPlayerCard } from '../player-profile-card/player-profile-card.component.js';
import { initSidePanel } from '../side-panel/side-panel.js';

export function build({ selector, emit }) {
  const root = document.createElement('div');
  root.id = 'monsters-panel';
  root.className = 'cmp-monsters-panel';
  root.setAttribute('data-draggable','true');
  root.innerHTML = panelTemplate();
  const instances = new Map();
  // Remove ensureActiveDock() call - cards position directly now
  // Arrow logic: When expanded we want a glyph pointing toward the collapse direction (to the RIGHT edge -> ◄).
  // When collapsed (tab at right edge) we want arrow pointing back into viewport (►) to indicate expand.
  // Reverted arrow configuration (step back):
  // Expanded: ► (points toward collapse direction -> right edge)
  // Collapsed: ▲ (requested up arrow variant)
  initSidePanel(root, {
    side:'right',
    expandedArrow:'►',
    collapsedArrow:'▲',
    bodyClassExpanded:'panels-expanded-right'
  });
  
  // Set default view based on device type and handle responsive changes
  function setDefaultView() {
    const isMobile = (typeof window !== 'undefined' && typeof matchMedia === 'function') ? matchMedia('(max-width: 760px), (pointer: coarse)').matches : false;
    const currentView = root.getAttribute('data-view');
    // Hide view toggle button on mobile (list-only)
    try {
      const toggle = root.querySelector('[data-view-toggle]');
      if (toggle) {
        if (isMobile) {
          toggle.style.display = 'none';
          toggle.setAttribute('aria-hidden','true');
        } else {
          toggle.style.display = '';
          toggle.removeAttribute('aria-hidden');
        }
      }
    } catch(_) {}
    // Only set default if no view is currently set
    if (!currentView) {
      if (isMobile) {
        root.setAttribute('data-view', 'list');
        root.classList.remove('is-stacked', 'is-tiled');
      } else {
        root.setAttribute('data-view', 'stacked');
        root.classList.add('is-stacked');
        root.classList.remove('is-tiled');
      }
    }
  }
  
  setDefaultView();
  
  // Listen for viewport changes
  try {
    const mobileQuery = matchMedia('(max-width: 760px), (pointer: coarse)');
    mobileQuery.addEventListener('change', setDefaultView);
  } catch(_) {}
  
  // Add view toggle event handler - cycles through list → tiled → stacked
  const toggleBtn = root.querySelector('[data-view-toggle]');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const currentView = root.getAttribute('data-view') || 'list';
      
      // Cycle through: list → tiled → stacked → list
      if (currentView === 'list') {
        root.classList.remove('is-stacked');
        root.classList.add('is-tiled');
        root.setAttribute('data-view', 'tiled');
      } else if (currentView === 'tiled') {
        root.classList.remove('is-tiled');
        root.classList.add('is-stacked');
        root.setAttribute('data-view', 'stacked');
      } else {
        root.classList.remove('is-stacked');
        root.setAttribute('data-view', 'list');
      }
    });
  }
  
  return { root, update: () => update(root, instances), destroy: () => destroy(root, instances) };
}

function panelTemplate() {
  return `
  <div class="mp-header k-panel__header" data-toggle role="button" aria-expanded="true" tabindex="0">
    <h2 class="mp-title" data-toggle>Monsters <span class="mp-arrow" data-arrow-dir data-toggle>►</span></h2>
    <button class="mp-view-toggle" data-view-toggle title="Toggle View Mode" aria-label="Toggle between list, tiled, and stacked view">
      <span class="view-icon list-icon">☰</span>
      <span class="view-icon tiled-icon">▦</span>
      <span class="view-icon stack-icon">⊞</span>
    </button>
  </div>
  <div class="mp-body k-panel__body" data-panel-body>
    <div class="mp-player-cards" data-player-cards></div>
    <div class="mp-owned-cards" data-owned-cards-panel hidden></div>
  </div>`;
}

function destroy(root, instances) {
  instances.forEach(inst => inst.root.remove());
  instances.clear();
  root.remove();
}

export function update(root, instances) {
  const state = store.getState();
  const order = selectPlayerOrder(state);
  const active = selectActivePlayer(state);
  // Determine if currently in mobile mode (unified breakpoint logic)
  const isMobile = matchMedia('(max-width: 760px), (pointer: coarse)').matches;
  
  // Cache expensive operations - only recalculate when relevant state changes
  const layoutCacheKey = JSON.stringify({
    activeId: active?.id,
    tokyoCity: state.tokyo?.city,
    tokyoBay: state.tokyo?.bay,
    orderLength: order.length
  });
  
  if (root._lastLayoutCacheKey === layoutCacheKey && root._hasInitialLayout) {
    // Skip expensive layout recalculations if nothing relevant changed
    return;
  }
  root._lastLayoutCacheKey = layoutCacheKey;
  // Determine layout mode (stacked | condensed | list) - FORCE list on mobile
  let mode = state.settings?.playerCardLayoutMode || (state.settings?.stackedPlayerCards === false ? 'list' : 'stacked');
  if (isMobile && mode !== 'list') {
    // Override to list view on mobile for usability (single column scroll)
    mode = 'list';
  }
  root.dataset.cardLayout = mode;
  const stacked = mode === 'stacked' || mode === 'condensed';
  root.classList.toggle('is-stacked', stacked); // retain legacy selector support
  root.removeAttribute('data-player-count');
  const container = root.querySelector('[data-player-cards]');
  if (!container) return;
  // If no players yet, show lightweight placeholder (prevents panel looking broken for dev skipintro without seeding)
  if (!order || order.length === 0) {
    // Empty state (should not normally appear if auto seeding works) – clickable to open setup
  container.innerHTML = '<button type="button" class="mp-no-players pc-hint" data-empty data-open-setup>No players selected. Click <span class="mp-link-accent">here</span> to select.</button>';
    const btn = container.querySelector('[data-open-setup]');
    if (btn) {
      btn.addEventListener('click', () => {
  try { store.dispatch(uiMonsterSelectionOpen()); } catch(e) { console.warn('Failed to open monster selection from empty players state', e); }
      });
    }
    // Clear any previous instances if they existed (edge dev case)
    instances.forEach(inst => inst.root.remove());
    instances.clear();
    return;
  }
  // Remove stale
  [...instances.keys()].forEach(id => { if (!order.includes(id)) { instances.get(id).root.remove(); instances.delete(id); } });
  // Ensure + order
  order.forEach((id, idx) => {
    let inst = instances.get(id);
    if (!inst) {
      // Check if the card might be in the active dock before creating a new one
      const activeDock = document.getElementById('active-player-card-slot');
      const existingCard = activeDock?.querySelector(`[data-player-id="${id}"]`);
      if (existingCard) {
        // Card exists in active dock, don't create duplicate
        return;
      }
      inst = buildPlayerCard({ selector: '.cmp-player-profile-card', playerId: id });
      instances.set(id, inst);
      container.appendChild(inst.root);
      // Mobile expand/collapse interaction
      wireMobileSlideBehavior(inst.root, root);
    }
    // Ensure the card is in the right position in the container (unless it's in active dock)
    const isInActiveDock = inst.root.parentElement?.id === 'active-player-card-slot';
    const isInTokyoSlot = inst.root.hasAttribute('data-in-tokyo-slot');
    const isAnimatingPortal = inst.root.hasAttribute('data-animating-portal');
    // If the card is currently occupying a Tokyo slot, we do NOT yank it back into the panel stack.
    if (!isInActiveDock && !isInTokyoSlot && !isAnimatingPortal && container.children[idx] !== inst.root) {
      container.insertBefore(inst.root, container.children[idx] || null);
    }
    inst.update({ playerId: id });
  });
  
  // Debug: Log when stats should update
  try {
    const vpFlash = state.ui?.vpFlash;
    const energyFlash = state.ui?.energyFlash;
    if ((vpFlash && vpFlash.ts > (root._lastVPFlash || 0)) || 
        (energyFlash && energyFlash.ts > (root._lastEnergyFlash || 0))) {
      console.log('🔄 Monsters Panel: Stats updates detected', { vpFlash, energyFlash });
      root._lastVPFlash = vpFlash?.ts || 0;
      root._lastEnergyFlash = energyFlash?.ts || 0;
    }
  } catch(_) {}
  
  // Relocate active card outside panel (placeholder anchor) if present (all viewports; scales via CSS)
  // Also: when active player changes, return the previous active card to the panel stack in-order
  const shouldDock = !!active;
  if (shouldDock) {
    const activeInst = instances.get(active.id);
    if (activeInst) {
      const cardEl = activeInst.root;
      const isInTokyoSlot = cardEl.hasAttribute('data-in-tokyo-slot');
      if (isInTokyoSlot) {
        // Card is in Tokyo; keep it physically in the Tokyo slot but still mark as active (no active dock relocation)
        cardEl.setAttribute('data-active-player', 'true');
        cardEl.removeAttribute('data-in-active-dock');
      } else {
        // Normal docking behavior
        const arenaDock = document.querySelector('.cmp-arena [data-active-player-dock]');
        if (arenaDock) {
          if (cardEl.parentElement !== arenaDock) {
            const existingDocked = arenaDock.querySelector('.cmp-player-profile-card');
            if (existingDocked && existingDocked !== cardEl) {
              container.appendChild(existingDocked);
              existingDocked.removeAttribute('data-in-active-dock');
              existingDocked.removeAttribute('data-active-player');
            }
            arenaDock.innerHTML = '';
            arenaDock.appendChild(cardEl);
            cardEl.setAttribute('data-active-player', 'true');
            cardEl.setAttribute('data-in-active-dock', 'true');
            try {
              cardEl.classList.remove('active-dock-reflow');
              void cardEl.offsetWidth;
              cardEl.classList.add('active-dock-reflow');
            } catch(_) {}
          }
        }
      }
    }
  } else {
    // If no active determined, ensure any active card returns to normal state
    const activeCards = document.querySelectorAll('.cmp-player-profile-card[data-active-player="true"]');
    activeCards.forEach(card => {
      const playerId = card.getAttribute('data-player-id');
      // Clean up active player styling
      try {
        card.removeAttribute('data-active-player');
        card.removeAttribute('data-in-active-dock');
        card.classList.remove('active-glow', 'dock-glow', 'turn-pulse', 'attack-pulse', 'in-place');
        card.removeAttribute('data-transitioning');
        
        // Restore previous draggable state if it was persisted
        if (card._prevDraggableState) {
          card.setAttribute('data-draggable', card._prevDraggableState);
          if (card._prevDraggableState === 'true') {
            // Re-init draggable if positioning service exists and wasn't already applied
            try { positioning.makeDraggable && positioning.makeDraggable(card, `playerCard_${playerId}`); } catch(_){ }
          }
          delete card._prevDraggableState;
        }
      } catch(_) {}
      
      // Ensure the instance is properly tracked
      if (playerId && instances.has(playerId)) {
        const inst = instances.get(playerId);
        instances.set(playerId, inst);
      }
    });
  }
  
  // Mark that initial layout is complete
  root._hasInitialLayout = true;
}

function wireMobileSlideBehavior(cardEl, panelRoot) {
  try {
    const isMobile = () => matchMedia('(max-width:760px), (pointer: coarse)').matches;
    let backdrop = document.querySelector('.mp-mobile-backdrop');
    const ensureBackdrop = () => {
      if (!backdrop) {
        backdrop = document.createElement('div');
        backdrop.className = 'mp-mobile-backdrop';
        document.body.appendChild(backdrop);
      }
      return backdrop;
    };
    const closeAll = () => {
      const expandedCards = panelRoot.querySelectorAll('.cmp-player-profile-card[data-expanded="true"]');
      if (expandedCards.length === 0) return; // No work needed if nothing is expanded
      expandedCards.forEach(el => el.removeAttribute('data-expanded'));
      if (backdrop) backdrop.classList.remove('visible');
    };
  // Highlight on hover/touchstart
  cardEl.addEventListener('mouseenter', () => { if (isMobile()) cardEl.classList.add('is-highlighted'); });
  cardEl.addEventListener('mouseleave', () => cardEl.classList.remove('is-highlighted'));
  cardEl.addEventListener('touchstart', () => { if (isMobile()) { cardEl.classList.add('is-highlighted'); setTimeout(()=>cardEl.classList.remove('is-highlighted'), 250); } }, { passive:true });
    // Toggle expand on click
    cardEl.addEventListener('click', (e) => {
      if (!isMobile()) return; // desktop uses normal layout
      // Ignore clicks on controls if added later
      if (e.target.closest('button,a,[data-ignore-flip]')) return;
      const already = cardEl.getAttribute('data-expanded') === 'true';
      closeAll();
      if (!already) {
        cardEl.setAttribute('data-expanded','true');
        ensureBackdrop().classList.add('visible');
      }
      e.stopPropagation();
      e.preventDefault();
    });
    if (!panelRoot.hasAttribute('data-mobile-slide-wired')) {
      panelRoot.setAttribute('data-mobile-slide-wired','true');
      // Outside click closes
      document.addEventListener('click', (ev) => {
        if (!isMobile()) return;
        const openCard = panelRoot.querySelector('.cmp-player-profile-card[data-expanded="true"]');
        if (!openCard) return;
        if (!openCard.contains(ev.target) && !panelRoot.contains(ev.target)) {
          closeAll();
        }
      }, { passive: true });
      // Backdrop close
      ensureBackdrop().addEventListener('click', closeAll);
      // Resize guard: when leaving mobile, ensure states reset
      const mql = matchMedia('(max-width:760px), (pointer: coarse)');
      const onChange = () => { if (!mql.matches) closeAll(); };
      mql.addEventListener('change', onChange);
    }
  } catch(_) {}
}

function positionActiveSlot(slot, cardEl, activePlayer) {
  try {
    // On mobile we suppress full-card docking; avatar bubble handles representation
    const mobile = matchMedia('(max-width:760px), (pointer: coarse)').matches;
    if (mobile) {
      if (cardEl) {
        cardEl.removeAttribute('data-active-player');
        cardEl.removeAttribute('data-in-active-dock');
      }
      return;
    }

    // NEW APPROACH: Mark the card as active and let CSS handle the animation
    if (cardEl) {
      // Remove from any previous active state
      document.querySelectorAll('.cmp-player-profile-card[data-active-player]').forEach(card => {
        if (card !== cardEl) {
          card.removeAttribute('data-active-player');
          card.classList.remove('active-glow');
        }
      });

      // Mark this card as the active player
      cardEl.setAttribute('data-active-player', 'true');
      cardEl.setAttribute('data-in-active-dock', 'true');
      
      // Disable dragging while active
      if (!cardEl._prevDraggableState) {
        cardEl._prevDraggableState = cardEl.getAttribute('data-draggable') || '';
      }
      cardEl.setAttribute('data-draggable', 'false');

      // Add glow effect after animation completes
      setTimeout(() => {
        cardEl.classList.add('active-glow');
        // Remove glow after 2 seconds
        setTimeout(() => {
          cardEl.classList.remove('active-glow');
        }, 2000);
      }, 600); // Match the CSS transition duration
    }

  } catch(_) {}
}

// ensureActiveDock function removed - cards position directly with CSS

let lastActiveCardId = null;
// smoothTravelToDock removed to eliminate flicker caused by visibility hiding; instant docking now used.
