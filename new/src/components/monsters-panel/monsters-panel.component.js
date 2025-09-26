/** monsters-panel.component.js
 * Composite panel that nests player profile cards + future monster/power card views.
 */
import { store } from '../../bootstrap/index.js';
import { selectPlayerOrder, selectActivePlayer } from '../../core/selectors.js';
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
  // Remove stale
  [...instances.keys()].forEach(id => { if (!order.includes(id)) { instances.get(id).root.remove(); instances.delete(id); } });
  // Ensure + order
  order.forEach((id, idx) => {
    let inst = instances.get(id);
    if (!inst) {
      inst = buildPlayerCard({ selector: '.cmp-player-profile-card', playerId: id });
      instances.set(id, inst);
      container.appendChild(inst.root);
    }
    if (container.children[idx] !== inst.root) {
      container.insertBefore(inst.root, container.children[idx] || null);
    }
    inst.update({ playerId: id });
  });
  // Relocate active card outside panel (placeholder anchor) if present
  if (active) {
    const activeInst = instances.get(active.id);
    if (activeInst && activeInst.root.parentElement === container) {
      // Capture starting rect BEFORE moving DOM
      const startRect = activeInst.root.getBoundingClientRect();
      const slot = document.getElementById('active-player-card-slot') || ensureActiveDock();
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

function positionActiveSlot(slot, cardEl, activePlayer) {
  try {
    // New docking target: absolute top-right corner inside arena.
    const arena = document.querySelector('.cmp-arena');
    if (!arena) return;
    const arenaRect = arena.getBoundingClientRect();
    const dockW = 200; const dockH = 140;
    slot.setAttribute('data-mini','true');
    // Use right/top offsets for simplicity and responsiveness.
    slot.style.left = 'auto';
    slot.style.right = '12px';
    slot.style.top = '8px';
    slot.style.bottom = 'auto';
  } catch(_) {}
}

function ensureActiveDock() {
  let dock = document.getElementById('active-player-card-slot');
  if (dock) return dock;
  dock = document.createElement('div');
  dock.id = 'active-player-card-slot';
  dock.setAttribute('data-active-card-dock','true');
  // Place a dedicated docking zone overlayed near center-top of arena as fallback
  const arena = document.querySelector('.cmp-arena') || document.getElementById('game-container') || document.body;
  arena.appendChild(dock);
  return dock;
}

let lastActiveCardId = null;
function smoothTravelToDock(cardEl, startRect, endRect) {
  try {
    const pid = cardEl.getAttribute('data-player-id');
    if (pid === lastActiveCardId) { cardEl.style.visibility=''; return; }
    lastActiveCardId = pid;
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const targetScale = 0.74;
    if (prefersReduced) {
      cardEl.style.visibility='';
      cardEl.removeAttribute('data-transitioning');
      cardEl.classList.add('in-place');
      requestAnimationFrame(()=> {
        cardEl.classList.add('dock-glow');
        setTimeout(()=>cardEl.classList.remove('dock-glow'), 900);
      });
      return;
    }
    const ghost = cardEl.cloneNode(true);
    ghost.style.position='fixed';
    ghost.style.left = startRect.left + 'px';
    ghost.style.top = startRect.top + 'px';
    ghost.style.margin='0';
    ghost.style.zIndex='5000';
    ghost.style.pointerEvents='none';
    document.body.appendChild(ghost);
    // Compute deltas
    const dx = endRect.left - startRect.left + 8; // slight inset
    const dy = endRect.top - startRect.top + 8;
    // Midpoints for gentle arc (simulate depth by earlier scale change)
    const mid1 = { x: dx*0.35, y: dy*0.15 };
    const mid2 = { x: dx*0.70, y: dy*0.65 };
    const kf = [
      { offset:0,   transform:'translate(0px,0px) scale(1)', filter:'brightness(1)' },
      { offset:.25, transform:`translate(${mid1.x}px, ${mid1.y}px) scale(.93)`, filter:'brightness(1.05)' },
      { offset:.55, transform:`translate(${mid2.x}px, ${mid2.y}px) scale(.83)`, filter:'brightness(.98)' },
      { offset:1,   transform:`translate(${dx}px, ${dy}px) scale(${targetScale})`, filter:'brightness(1)' }
    ];
    const travel = ghost.animate(kf, { duration:820, easing:'cubic-bezier(.42,.15,.21,1.03)', fill:'forwards' });
    const finalize = () => {
      try { ghost.remove(); } catch(_) {}
      cardEl.style.visibility='';
      cardEl.removeAttribute('data-transitioning');
      cardEl.classList.add('in-place');
      requestAnimationFrame(()=> {
        cardEl.classList.add('dock-glow');
        const settle = cardEl.animate([
          { transform:`scale(${targetScale}) rotate(var(--tokyo-bay-rot))` },
          { transform:`scale(${targetScale*1.035}) rotate(var(--tokyo-bay-rot))` },
          { transform:`scale(${targetScale}) rotate(var(--tokyo-bay-rot))` }
        ], { duration:420, easing:'ease-out' });
        settle.onfinish = () => setTimeout(()=>cardEl.classList.remove('dock-glow'), 900);
      });
    };
    travel.onfinish = finalize;
    setTimeout(()=> { if (cardEl.style.visibility === 'hidden') finalize(); }, 1200);
  } catch(_) { cardEl.style.visibility=''; cardEl.removeAttribute('data-transitioning'); cardEl.classList.add('in-place'); }
}
