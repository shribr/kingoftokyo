/** setup.component.js */
import { selectMonsters } from '../../core/selectors.js';
import { uiSetupClose, uiMonsterProfilesOpen } from '../../core/actions.js';

export function build({ selector, dispatch, getState }) {
  const root = document.createElement('div');
  root.className = selector.slice(1) + ' setup-modal hidden'; // remains hidden until ui.setup.open flips true
  root.innerHTML = frame();

  const inst = { root, dispatch, getState, _local: { selected: new Set(), slots: [], playerCount: 4, _initialized: false } };

  // Event delegation
  root.addEventListener('click', (e) => {
    const t = e.target;
    // Close (Start) button when enabled
    if (t.matches('[data-action="start"]')) {
      const btn = t;
      if (btn.hasAttribute('disabled')) return;
      dispatch(uiSetupClose());
      return;
    }
    // Explicit close (X) button
    if (t.closest('[data-action="close"]')) {
      dispatch(uiSetupClose());
      return;
    }
    // Monster Profiles
    if (t.closest('[data-action="profiles"]')) {
      dispatch(uiMonsterProfilesOpen());
      dispatch(uiSetupClose());
      // immediate visual hide to prevent overlaying the profiles modal
      inst.root.classList.add('hidden');
      return;
    }
    // Random fill
    if (t.closest('[data-action="random"]')) {
      randomFill(inst);
      render(inst);
      return;
    }
    // Reset selections: clear all slots and selection, re-render
    if (t.closest('[data-action="reset"]')) {
      inst._local.slots = new Array(inst._local.playerCount).fill(null);
      inst._local.selected.clear();
      render(inst);
      return;
    }
    // Player count dropdown
    if (t.closest('[data-action="toggle-dropdown"]')) {
      root.querySelector('[data-dropdown]')?.classList.toggle('open');
      return;
    }
    if (t.closest('[data-player-count]')) {
      const li = t.closest('[data-player-count]');
      const n = parseInt(li.getAttribute('data-player-count'), 10);
      if (!Number.isNaN(n)) inst._local.playerCount = n;
      // Trim selection if needed
      while (inst._local.selected.size > n) {
        const last = Array.from(inst._local.selected).pop();
        inst._local.selected.delete(last);
      }
      root.querySelector('[data-dropdown]')?.classList.remove('open');
      render(inst);
      return;
    }
    // Grid card click: assign to first empty slot or deselect if already assigned
    const card = t.closest('[data-monster-card]');
    if (card) {
      const id = card.getAttribute('data-id');
      const idx = inst._local.slots.indexOf(id);
      if (idx >= 0) {
        inst._local.slots[idx] = null;
      } else {
        const empty = inst._local.slots.findIndex(s => !s);
        if (empty >= 0) inst._local.slots[empty] = id;
      }
      syncSelectedFromSlots(inst);
      render(inst);
      return;
    }
    // Sidebar mini-card click: clear that slot
    const slotEl = t.closest('[data-slot-index]');
    if (slotEl && slotEl.hasAttribute('data-has-monster')) {
      const si = parseInt(slotEl.getAttribute('data-slot-index'), 10);
      if (!Number.isNaN(si)) {
        inst._local.slots[si] = null;
        syncSelectedFromSlots(inst);
        render(inst);
        return;
      }
    }
  });

  // Drag and drop handlers
  root.addEventListener('dragstart', (e) => {
    const card = e.target.closest('[data-monster-card]');
    const slot = e.target.closest('[data-slot-index]');
    if (card) {
      const id = card.getAttribute('data-id');
      if (!id) return;
      e.dataTransfer.setData('text/plain', id);
      e.dataTransfer.setData('application/x-monster-id', id);
      e.dataTransfer.effectAllowed = 'move';
    } else if (slot && slot.hasAttribute('data-has-monster')) {
      const si = parseInt(slot.getAttribute('data-slot-index'), 10);
      const id = inst._local.slots[si];
      if (!id) return;
      e.dataTransfer.setData('text/plain', id);
      e.dataTransfer.setData('application/x-monster-id', id);
      e.dataTransfer.setData('application/x-from-slot', String(si));
      e.dataTransfer.effectAllowed = 'move';
    }
  });
  root.addEventListener('dragover', (e) => {
    const slot = e.target.closest('[data-slot-index]');
    if (slot) { e.preventDefault(); slot.classList.add('drag-over'); }
  });
  root.addEventListener('dragleave', (e) => {
    const slot = e.target.closest('[data-slot-index]');
    if (slot) { slot.classList.remove('drag-over'); }
  });
  root.addEventListener('drop', (e) => {
    const slot = e.target.closest('[data-slot-index]');
    if (!slot) return;
    e.preventDefault();
    slot.classList.remove('drag-over');
    const id = e.dataTransfer.getData('application/x-monster-id') || e.dataTransfer.getData('text/plain');
    if (!id) return;
    const si = parseInt(slot.getAttribute('data-slot-index'), 10);
    if (Number.isNaN(si)) return;
    // If dragged from another slot, clear it
    const fromSlot = e.dataTransfer.getData('application/x-from-slot');
    if (fromSlot) {
      const fIdx = parseInt(fromSlot, 10);
      if (!Number.isNaN(fIdx) && fIdx !== si) inst._local.slots[fIdx] = null;
    }
    // If this monster is already assigned elsewhere, move it
    const currentIdx = inst._local.slots.indexOf(id);
    if (currentIdx >= 0 && currentIdx !== si) inst._local.slots[currentIdx] = null;
    // Assign to target slot
    inst._local.slots[si] = id;
    syncSelectedFromSlots(inst);
    render(inst);
  });

  return inst;
}

export function update(ctx) {
  const root = ctx.inst?.root || ctx.root || ctx;
  const st = ctx.fullState || ctx.state;
  const open = st?.ui?.setup?.open;
  const inst = ctx.inst || { root, _local: { selected: new Set(), slots: [], playerCount: 4, _initialized: false } };
  if (typeof window !== 'undefined' && window.__KOT_NEW__) {
    console.debug('[Setup.update] open=%s, splashVisible=%s', open, st?.ui?.splash?.visible, root.classList.contains('hidden') ? '(hidden class present)' : '(visible class)');
  }
  if (!open) {
    root.classList.add('hidden');
    inst._local._initialized = false;
    return;
  }
  root.classList.remove('hidden');
  // Initialize on open: no pre-assignments, empty slots, default to 4 players
  if (!inst._local._initialized) {
    inst._local.playerCount = 4;
    inst._local.slots = new Array(inst._local.playerCount).fill(null);
    inst._local.selected = new Set();
    inst._local._initialized = true;
    inst._local.prevMonsterCount = 0;
  }
  // Always render on update; internal logic will diff monster count for re-population.
  render(inst, st);
}

function frame() {
  return `
    <div class="setup-frame" role="dialog" aria-modal="true" aria-label="Monster Selection">
      <button type="button" class="setup-close" data-action="close" aria-label="Close">✕</button>
      <div class="setup-title">MONSTER SELECTION</div>
      <div class="setup-controls">
        <button class="pill-btn" data-action="profiles">Monster Profiles</button>
        <div class="player-count dropdown" data-dropdown>
          <button class="pill-btn dropdown-toggle gold" data-action="toggle-dropdown"><span data-player-count-label>4 PLAYERS</span><span class="chev">▾</span></button>
          <ul class="dropdown-menu">
            ${[2,3,4,5,6].map(n => `<li data-player-count="${n}">${n} Players</li>`).join('')}
          </ul>
        </div>
        <button class="pill-btn" data-action="random">Random Monster Selection</button>
      </div>
      <div class="setup-body">
        <div class="cards-grid" data-setup-grid></div>
        <div class="selection-sidebar" data-sidebar></div>
      </div>
      <div class="setup-footer">
        <button class="reset-link" data-action="reset">⟲ Reset Monsters</button>
        <button class="start-btn" data-action="start" disabled>ASSIGN 2 MORE MONSTERS</button>
      </div>
    </div>`;
}

function render(inst, fullState) {
  const root = inst.root;
  const st = fullState || inst.getState?.();
  const monsters = selectMonsters(st);
  // Safety: re-render grid if monster count changed after initial mount (race with async config load)
  const prevCount = inst._local.prevMonsterCount || 0;
  if (monsters.length !== prevCount) {
    inst._local.prevMonsterCount = monsters.length;
  }
  // Warn if monsters loaded but any image missing
  if (monsters.length && monsters.some(m => !m.image)) {
    // Only log once
    if (!inst._local._warnedMissingImages) {
      console.warn('[setup.component] Some monsters missing image paths:', monsters.filter(m => !m.image).map(m => m.id));
      inst._local._warnedMissingImages = true;
    }
  }
  // Ensure slots reflect playerCount
  if (!Array.isArray(inst._local.slots) || inst._local.slots.length !== inst._local.playerCount) {
    const old = inst._local.slots || [];
    const next = new Array(inst._local.playerCount).fill(null);
    for (let i = 0; i < next.length; i++) next[i] = old[i] || null;
    inst._local.slots = next;
    syncSelectedFromSlots(inst);
  }
  // Grid
  const grid = root.querySelector('[data-setup-grid]');
  if (grid) {
    grid.innerHTML = monsters.map(m => card(m, inst._local.selected.has(m.id))).join('');
    // Disable dragging for already-selected monsters in grid (optional UX)
    grid.querySelectorAll('[data-monster-card]').forEach(el => {
      const id = el.getAttribute('data-id');
      const selected = inst._local.selected.has(id);
      el.setAttribute('draggable', String(!selected));
      if (selected) el.classList.add('is-unavailable'); else el.classList.remove('is-unavailable');
    });
  }
  // Sidebar selections and CPU placeholders
  const sidebar = root.querySelector('[data-sidebar]');
  if (sidebar) {
    const slotHTML = inst._local.slots.map((id, i) => {
      if (id) {
        const m = monsters.find(mm => mm.id === id);
        return miniCard(m, i, i === 0);
      }
      // First slot: dedicated human placeholder
      if (i === 0) return humanPlaceholderCard(i);
      return cpuCard(i);
    }).join('');
    sidebar.innerHTML = `<div class="mini-list">${slotHTML}</div>`;
    // apply tint per monster card by slot index
    inst._local.slots.forEach((id, i) => {
      if (!id) return;
      const m = monsters.find(mm => mm.id === id);
      const el = sidebar.querySelector(`[data-slot-index="${i}"]`);
      if (el && m && m.color) el.style.setProperty('--mini-bg', m.color + '22');
    });
  }
  // Player count label
  const label = root.querySelector('[data-player-count-label]');
  if (label) label.textContent = `${inst._local.playerCount} PLAYERS`;
  // Footer start button state
  const remaining = Math.max(0, inst._local.playerCount - inst._local.selected.size);
  const startBtn = root.querySelector('[data-action="start"]');
  if (startBtn) {
    startBtn.textContent = remaining > 0 ? `ASSIGN ${remaining} MORE MONSTER${remaining>1?'S':''}` : 'START GAME';
    if (remaining > 0) startBtn.setAttribute('disabled', ''); else startBtn.removeAttribute('disabled');
  }
}

function card(m, selected) {
  const cls = selected ? 'monster-card selected' : 'monster-card empty';
  return `<div class="${cls}" data-monster-card data-id="${m.id}">
    <div class="stack">
      <div class="polaroid">
        <div class="photo"><img src="${m.image}" alt="${m.name}"></div>
      </div>
    </div>
  </div>`;
}

function miniCard(m, slotIndex, isHumanSlot=false) {
  return `<div class="mini-card human vertical droppable" data-slot-index="${slotIndex}" data-has-monster draggable="true" data-human="${isHumanSlot}">
    <div class="mini-photo"><img src="${m.image}" alt="${m.name}"></div>
    <div class="mini-name">${m.name}</div>
  </div>`;
}

function humanPlaceholderCard(slotIndex) {
  return `<div class="mini-card human-placeholder vertical droppable" data-slot-index="${slotIndex}">
    <div class="mini-photo placeholder">?</div>
    <div class="mini-name">HUMAN PLAYER</div>
  </div>`;
}

function cpuCard(slotIndex) {
  return `<div class="mini-card cpu droppable" data-slot-index="${slotIndex}"><div class="cpu-label">CPU</div><div class="cpu-sub">CPU PLAYER</div></div>`;
}

function randomFill(inst) {
  const st = inst.getState?.();
  const mons = selectMonsters(st);
  const pool = mons.map(m => m.id).filter(id => !inst._local.selected.has(id));
  while (inst._local.slots.some(s => !s) && pool.length) {
    const i = Math.floor(Math.random() * pool.length);
    const id = pool.splice(i, 1)[0];
    const empty = inst._local.slots.findIndex(s => !s);
    if (empty >= 0) inst._local.slots[empty] = id;
  }
  syncSelectedFromSlots(inst);
}

function syncSelectedFromSlots(inst) {
  inst._local.selected = new Set((inst._local.slots || []).filter(Boolean));
}
