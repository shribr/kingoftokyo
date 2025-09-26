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
  const stacked = state.settings?.stackedPlayerCards !== false; // default true
  root.classList.toggle('is-stacked', stacked);
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
      let slot = document.getElementById('active-player-card-slot');
      if (!slot) {
        slot = document.createElement('div');
        slot.id = 'active-player-card-slot';
        // Try to mount inside game container or body
        const game = document.getElementById('game-container') || document.body;
        game.appendChild(slot);
      }
      // Transition flag for fade/scale in
      activeInst.root.setAttribute('data-transitioning','');
      slot.innerHTML = '';
      slot.appendChild(activeInst.root);
      requestAnimationFrame(() => {
        positionActiveSlot(slot, activeInst.root, active);
        requestAnimationFrame(() => {
          activeInst.root.classList.add('in-place');
          activeInst.root.removeAttribute('data-transitioning');
        });
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
    const candidates = [
      document.querySelector(`[data-arena-player-id="${activePlayer.id}"]`),
      document.querySelector(`[data-player-token="${activePlayer.id}"]`),
      document.querySelector(`#player-token-${activePlayer.id}`),
      document.querySelector('.cmp-arena [data-active-tile="true"]')
    ].filter(Boolean);
    let target = candidates[0];
    if (!target) target = document.querySelector('.cmp-arena');
    if (!target) { // viewport center fallback
      const vw = window.innerWidth, vh = window.innerHeight;
      const w = cardEl.offsetWidth || 260, h = cardEl.offsetHeight || 180;
      slot.style.left = (vw/2 - w/2) + 'px';
      slot.style.top = (vh/2 - h/2) + 'px';
      return;
    }
    const rect = target.getBoundingClientRect();
    const w = cardEl.offsetWidth || 260;
    const h = cardEl.offsetHeight || 180;
    // Place slightly above tile center
    const left = rect.left + rect.width/2 - w/2;
    const top = rect.top - h - 12; // 12px gap above tile
    slot.style.left = Math.max(8, Math.min(left, window.innerWidth - w - 8)) + 'px';
    slot.style.top = Math.max(8, top) + 'px';
  } catch(_) {}
}
