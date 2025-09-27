/** monsters-panel.component.js
 * Composite panel that nests player profile cards + future monster/power card views.
 */
import { store } from '../../bootstrap/index.js';
import { selectPlayerOrder, selectActivePlayer } from '../../core/selectors.js';
import { uiMonsterSelectionOpen } from '../../core/actions.js';
import { build as buildPlayerCard } from '../player-profile-card/player-profile-card.component.js';
import { initSidePanel } from '../side-panel/side-panel.js';

export function build({ selector }) {
  const root = document.createElement('div');
  root.className = selector.slice(1) + ' cmp-monsters-panel cmp-side-panel k-panel';
  root.setAttribute('data-side','right');
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
  return { root, update: () => update(root, instances), destroy: () => destroy(root, instances) };
}

function panelTemplate() {
  return `
  <div class="mp-header k-panel__header" data-toggle role="button" aria-expanded="true" tabindex="0">
    <h2 class="mp-title" data-toggle>Monsters <span class="mp-arrow" data-arrow-dir data-toggle>►</span></h2>
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
  const shouldDock = !!active;
  if (shouldDock) {
    const activeInst = instances.get(active.id);
    if (activeInst && activeInst.root.parentElement === container) {
      // Capture starting rect BEFORE moving DOM
      const startRect = activeInst.root.getBoundingClientRect();
  const slot = ensureActiveDock();
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
      slot.innerHTML = '';
      slot.appendChild(activeInst.root);
      requestAnimationFrame(() => {
  positionActiveSlot(slot, activeInst.root, active);
        const endRect = activeInst.root.getBoundingClientRect();
        // Hide real card until animation completes
        activeInst.root.style.visibility = 'hidden';
        smoothTravelToDock(activeInst.root, startRect, endRect);
      });
    }
  } else {
    // If no active determined, ensure any floating card returns to panel
    const slot = document.getElementById('active-player-card-slot');
    if (slot && slot.firstChild) {
      const card = slot.firstChild;
      container.appendChild(card);
    }
  }
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
      panelRoot.querySelectorAll('.cmp-player-profile-card[data-expanded="true"]').forEach(el => el.removeAttribute('data-expanded'));
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
        if (!openCard.contains(ev.target)) closeAll();
      });
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
        target.style.width = w + 'px';
        target.style.height = h + 'px';
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
      });
    };
    travel.onfinish = finalize;
    setTimeout(()=> { if (cardEl.style.visibility === 'hidden') finalize(); }, 1900);
  } catch(_) { cardEl.style.visibility=''; cardEl.removeAttribute('data-transitioning'); cardEl.classList.add('in-place'); }
}
