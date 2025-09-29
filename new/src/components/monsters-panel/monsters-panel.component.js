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
  ensureActiveDock();
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
    const isMobile = matchMedia('(max-width: 760px), (pointer: coarse)').matches;
    const currentView = root.getAttribute('data-view');
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
  const mobileQuery = matchMedia('(max-width: 760px), (pointer: coarse)');
  mobileQuery.addEventListener('change', setDefaultView);
  
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
  // Determine layout mode (stacked | condensed | list)
  const mode = state.settings?.playerCardLayoutMode || (state.settings?.stackedPlayerCards === false ? 'list' : 'stacked');
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
      inst = buildPlayerCard({ selector: '.cmp-player-profile-card', playerId: id });
      instances.set(id, inst);
      container.appendChild(inst.root);
      // Mobile expand/collapse interaction
      wireMobileSlideBehavior(inst.root, root);
    }
    if (container.children[idx] !== inst.root) {
      container.insertBefore(inst.root, container.children[idx] || null);
    }
    inst.update({ playerId: id });
  });
  // Relocate active card outside panel (placeholder anchor) if present (all viewports; scales via CSS)
  // Also: when active player changes, return the previous active card to the panel stack in-order
  const shouldDock = !!active;
  if (shouldDock) {
    const activeInst = instances.get(active.id);
    if (activeInst) {
      const slot = ensureActiveDock();
      // If a different player's card currently occupies the slot, move it back to the stack before docking the new one
      try {
        const prev = slot.firstElementChild;
        if (prev && prev !== activeInst.root) {
          // Identify which player this card belongs to
          const prevId = prev.getAttribute('data-player-id');
          // Ensure any dock-only styles are cleared so it renders normally back in the stack
          const cleanupFromDock = (el) => {
            try {
              el.style.visibility = '';
              el.style.transition = '';
              el.classList.remove('dock-glow','turn-pulse','attack-pulse','in-place');
              el.removeAttribute('data-transitioning');
              el.removeAttribute('data-in-active-dock');
            } catch(_) {}
          };
          if (prevId && instances.has(prevId)) {
            const prevInst = instances.get(prevId);
            cleanupFromDock(prevInst.root);
            // Insert the previous card back into the container at its canonical order position
            const idx = order.indexOf(prevId);
            if (idx >= 0) {
              if (container.children[idx] !== prevInst.root) {
                container.insertBefore(prevInst.root, container.children[idx] || null);
              }
            } else {
              container.appendChild(prevInst.root);
            }
          } else {
            // Fallback: append unknown node at end (should not happen)
            cleanupFromDock(prev);
            container.appendChild(prev);
          }
        }
      } catch(_) {}
      // If the active card is still in the list container, move it into the slot with travel animation
      if (activeInst.root.parentElement === container) {
        // Capture starting rect BEFORE moving DOM
        const startRect = activeInst.root.getBoundingClientRect();
        // Strip any existing animations/decorations immediately upon becoming active
        try {
          activeInst.root.classList.remove('dock-glow','attack-pulse','turn-pulse','in-place');
          activeInst.root.style.animation = 'none';
          // force reflow to clear animations
          void activeInst.root.offsetWidth;
        } catch(_) {}
        // Create a transient fade placeholder at original location to smooth visual removal
        try {
          const ph = document.createElement('div');
          ph.className = 'ppc-fade-placeholder';
          ph.style.left = startRect.left + 'px';
          ph.style.top = startRect.top + 'px';
          ph.style.width = startRect.width + 'px';
          ph.style.height = startRect.height + 'px';
          document.body.appendChild(ph);
          setTimeout(()=>ph.remove(), 520);
        } catch(_){/* ignore */}
        activeInst.root.setAttribute('data-transitioning','');
  // Ensure slot is empty (previous occupant already returned to stack above)
  slot.innerHTML = '';
        slot.appendChild(activeInst.root);
        requestAnimationFrame(() => {
          positionActiveSlot(slot, activeInst.root, active);
          const endRect = activeInst.root.getBoundingClientRect();
          // Hide real card until animation completes
          activeInst.root.style.visibility = 'hidden';
          smoothTravelToDock(activeInst.root, startRect, endRect);
        });
      } else {
        // Already docked: only re-assert positioning when something material changed to avoid flicker
        try {
          const st = store.getState();
          const isCity = st.tokyo?.city === active.id;
          const isBay = st.tokyo?.bay === active.id;
          const target = document.querySelector('[data-active-player-slot]') || document.querySelector('[data-city-slot]') || document.querySelector('[data-bay-slot]');
          const tRect = target ? target.getBoundingClientRect() : null;
          const sig = JSON.stringify({ a: active.id, c: !!isCity, b: !!isBay, w: tRect?.width|0, h: tRect?.height|0, vw: window.innerWidth, vh: window.innerHeight });
          if (root._lastDockSig !== sig) {
            positionActiveSlot(slot, activeInst.root, active);
            root._lastDockSig = sig;
          }
        } catch(_) {}
      }
    }
  } else {
    // If no active determined, ensure any floating card returns to panel
    const slot = document.getElementById('active-player-card-slot');
    if (slot && slot.firstChild) {
      const card = slot.firstChild;
      container.appendChild(card);
    }
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
    // Dock into the appropriate arena tile (city or bay) based on current occupants
    const arena = document.querySelector('.cmp-arena');
    if (!arena) return;
    const st = store.getState();
  const isCity = st.tokyo?.city === activePlayer.id;
  const isBay = st.tokyo?.bay === activePlayer.id;
  // Always snap active player card to the dedicated Active Player tile to the right of Tokyo
  const target = document.querySelector('[data-active-player-slot]') || document.querySelector('[data-city-slot]') || document.querySelector('[data-bay-slot]') || arena;
    if (!target) return;
    slot.removeAttribute('data-mini');
    slot.style.position = 'relative';
    slot.style.left = 'auto';
    slot.style.right = 'auto';
    slot.style.top = 'auto';
    slot.style.bottom = 'auto';
    // Ensure slot exists then append near the monster slot (overlay on top)
    if (!slot.parentElement || slot.parentElement !== target.parentElement) {
      target.parentElement.appendChild(slot);
    }
    // Position over the monster slot (relative to the section container)
    slot.style.position = 'absolute';
    const tRect = target.getBoundingClientRect();
    const pRect = target.parentElement ? target.parentElement.getBoundingClientRect() : arena.getBoundingClientRect();
    // If docking into the dedicated active player slot, center the card within the slot
    if (target.hasAttribute('data-active-player-slot')) {
      // Append slot directly into the dotted area and center it precisely
      target.appendChild(slot);
      slot.style.position = 'absolute';
      slot.style.left = '50%';
      slot.style.top = '50%';
      // Center without extra nudge; scale is applied here from CSS var --active-scale
      slot.style.transform = 'translate(-50%, -50%) scale(var(--active-scale))';
      // Adjust the active slot footprint to match the scaled card size + 2px padding per side
      try {
        // Use untransformed layout metrics to avoid double-scaling in calculations
        const baseW = cardEl.offsetWidth || cardEl.getBoundingClientRect().width;
        const baseH = cardEl.offsetHeight || cardEl.getBoundingClientRect().height;
        const cs = getComputedStyle(slot);
        const s = parseFloat(cs.getPropertyValue('--active-scale')) || 1;
        const pad = 4; // 2px per side
        const ts = getComputedStyle(target);
        const bl = parseFloat(ts.borderLeftWidth) || 0;
        const br = parseFloat(ts.borderRightWidth) || 0;
        const bt = parseFloat(ts.borderTopWidth) || 0;
        const bb = parseFloat(ts.borderBottomWidth) || 0;
        const shadowAllowance = 10; // account for outer shadows/glow so the card never overflows
        const w = Math.ceil(baseW * s) + pad + Math.ceil(bl + br) + shadowAllowance;
        const h = Math.ceil(baseH * s) + pad + Math.ceil(bt + bb) + shadowAllowance;
        // Only apply when values actually change to prevent layout thrash/flicker
        const prevW = parseFloat(target.getAttribute('data-last-w') || '0');
        const prevH = parseFloat(target.getAttribute('data-last-h') || '0');
        if (Math.abs(w - prevW) > 0.5) { target.style.width = w + 'px'; target.setAttribute('data-last-w', String(w)); }
        if (Math.abs(h - prevH) > 0.5) { target.style.height = h + 'px'; target.setAttribute('data-last-h', String(h)); }
        target.style.boxSizing = 'border-box';
        target.setAttribute('data-occupied','true');
      } catch(_) {}
    } else {
      const left = (tRect.left - pRect.left) + 6;
      const top = (tRect.top - pRect.top) + 6;
      slot.style.left = left + 'px';
      slot.style.top = top + 'px';
      slot.style.transform = '';
    }
    slot.style.zIndex = 6610;
    // Mark card for active dock scale when placed here
    try { if (cardEl) cardEl.setAttribute('data-in-active-dock','true'); } catch(_){ }
  } catch(_) {}
}

function ensureActiveDock() {
  let dock = document.getElementById('active-player-card-slot');
  if (dock) return dock;
  dock = document.createElement('div');
  dock.id = 'active-player-card-slot';
  dock.setAttribute('data-active-card-dock','true');
  // Attach to header active slot on mobile
  const headerSlot = document.querySelector('[data-active-header]');
  if (headerSlot) headerSlot.appendChild(dock); else (document.body.appendChild(dock));
  return dock;
}

let lastActiveCardId = null;
function smoothTravelToDock(cardEl, startRect, endRect) {
  try {
    const pid = cardEl.getAttribute('data-player-id');
    if (pid === lastActiveCardId) { cardEl.style.visibility=''; return; }
    lastActiveCardId = pid;
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // Read CSS variable --active-scale to keep JS animation scale in sync with CSS across breakpoints
    let targetScale = 0.74;
    try {
      const slot = document.getElementById('active-player-card-slot');
      if (slot) {
        const cs = getComputedStyle(slot);
        const v = parseFloat(cs.getPropertyValue('--active-scale'));
        if (!Number.isNaN(v) && v > 0) targetScale = v;
      }
    } catch(_) {}
    if (prefersReduced) {
      cardEl.style.visibility='';
      cardEl.removeAttribute('data-transitioning');
      cardEl.classList.add('in-place');
      // Minimal delay so glow reads as "on arrival" even without motion
      setTimeout(()=>{
        cardEl.classList.add('dock-glow');
        setTimeout(()=>cardEl.classList.remove('dock-glow'), 900);
          // Also show the brief start-of-turn toast in reduced motion mode
          try {
            const st = store.getState();
            const player = selectPlayerById(st, pid);
            const monster = player ? selectMonsterById(st, player.monsterId) : null;
            const label = monster?.name || player?.name || 'Player';
            const slotEl = cardEl.parentElement;
            const targetRect = (slotEl?.parentElement || slotEl || cardEl).getBoundingClientRect();
            const toast = document.createElement('div');
            toast.className = 'active-start-toast';
            toast.textContent = `${label} starts!`;
            toast.style.left = (targetRect.left + (targetRect.width/2)) + 'px';
            toast.style.top = (targetRect.bottom + 8) + 'px';
            document.body.appendChild(toast);
            requestAnimationFrame(()=>{
              toast.classList.add('show');
              setTimeout(()=>{ toast.classList.remove('show'); setTimeout(()=>{ try { toast.remove(); } catch(_) {} }, 300); }, 1400);
            });
          } catch(_) {}
      }, 180);
      return;
    }
    // Remove any transitions to prevent pre-move flickers
    const prevTransition = cardEl.style.transition;
    cardEl.style.transition = 'none';
    const ghost = cardEl.cloneNode(true);
    ghost.style.position='fixed';
    ghost.style.left = startRect.left + 'px';
    ghost.style.top = startRect.top + 'px';
    ghost.style.margin='0';
    ghost.style.zIndex='5000';
    ghost.style.pointerEvents='none';
  ghost.style.transformOrigin = 'top left';
    ghost.style.animation = 'none';
    document.body.appendChild(ghost);
    // Compute deltas
  const dx = (endRect.left - startRect.left);
  const dy = (endRect.top - startRect.top);
    // Midpoints for gentle arc (simulate depth by earlier scale change)
    const mid1 = { x: dx*0.35, y: dy*0.15 };
    const mid2 = { x: dx*0.70, y: dy*0.65 };
    const kf = [
      { offset:0,   transform:'translate(0px,0px) scale(1)', filter:'brightness(1)' },
      { offset:.25, transform:`translate(${mid1.x}px, ${mid1.y}px) scale(.93)`, filter:'brightness(1.05)' },
      { offset:.55, transform:`translate(${mid2.x}px, ${mid2.y}px) scale(.83)`, filter:'brightness(.98)' },
      { offset:1,   transform:`translate(${dx}px, ${dy}px) scale(${targetScale})`, filter:'brightness(1)' }
    ];
    const travel = ghost.animate(kf, { duration:1650, easing:'cubic-bezier(.22,.61,.36,1)', fill:'forwards' });
    const finalize = () => {
      try { ghost.remove(); } catch(_) {}
      cardEl.style.visibility='';
      cardEl.removeAttribute('data-transitioning');
      cardEl.classList.add('in-place');
  cardEl.style.transition = prevTransition || '';
      // clear any inline animation disable so future animations work as expected
      try { cardEl.style.animation = ''; } catch(_) {}
      requestAnimationFrame(()=> {
        // Arrival glow (brief white outline) once the card is in place
        cardEl.classList.add('dock-glow');
        // Subtle settle scale on the SLOT so we don't override the card's centering transform
        const slotEl = cardEl.parentElement;
        if (slotEl) {
          const settle = slotEl.animate([
            { transform:`translate(-50%, -50%) scale(${targetScale})` },
            { transform:`translate(-50%, -50%) scale(${(targetScale*1.06).toFixed(3)})` },
            { transform:`translate(-50%, -50%) scale(${targetScale})` }
          ], { duration:620, easing:'cubic-bezier(.22,.61,.36,1)' });
          settle.onfinish = () => setTimeout(()=>cardEl.classList.remove('dock-glow'), 900);
        } else {
          setTimeout(()=>cardEl.classList.remove('dock-glow'), 900);
        }
        // Brief start-of-turn toast under the active card
        try {
          const st = store.getState();
          const player = selectPlayerById(st, pid);
          const monster = player ? selectMonsterById(st, player.monsterId) : null;
          const label = monster?.name || player?.name || 'Player';
          const targetRect = (slotEl?.parentElement || slotEl || cardEl).getBoundingClientRect();
          const toast = document.createElement('div');
          toast.className = 'active-start-toast';
          toast.textContent = `${label} starts!`;
          // Position fixed so it ignores transforms; center under the dock area
          toast.style.left = (targetRect.left + (targetRect.width/2)) + 'px';
          toast.style.top = (targetRect.bottom + 8) + 'px';
          document.body.appendChild(toast);
          // Animate in, then out and remove
          requestAnimationFrame(()=>{
            toast.classList.add('show');
            setTimeout(()=>{
              toast.classList.remove('show');
              setTimeout(()=>{ try { toast.remove(); } catch(_) {} }, 300);
            }, 1400);
          });
        } catch(_) {}
      });
    };
    travel.onfinish = finalize;
    setTimeout(()=> { if (cardEl.style.visibility === 'hidden') finalize(); }, 1900);
  } catch(_) { cardEl.style.visibility=''; cardEl.removeAttribute('data-transitioning'); cardEl.classList.add('in-place'); }
}
