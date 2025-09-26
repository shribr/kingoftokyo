/** monster-selection.component.js
 * Monster Selection Modal
 * Responsibilities:
 *  - Allow choosing N monsters (1 human + CPUs)
 *  - Seed players into state before first-player roll
 *  - Provide random fill & count selection
 */
import { selectMonsters } from '../../core/selectors.js';
import { uiMonsterSelectionClose, uiMonsterProfilesOpen, playerJoined } from '../../core/actions.js';
import { createPlayer } from '../../domain/player.js';

export function build({ selector, dispatch, getState }) {
  const root = document.createElement('div');
  // Renamed: was 'setup-modal' during migration; now canonical 'monster-selection-modal'
  root.className = selector.slice(1) + ' monster-selection-modal hidden';
  root.innerHTML = frame();
  // Build confirmed; removed temporary debug log.
  console.debug('[monster-selection][build] initializing component');
  const inst = { root, dispatch, getState, _local: { selected: new Set(), slots: [], playerCount: 4, _initialized: false, page: 0, pageSize: 6 } };

  root.addEventListener('click', (e) => {
    const t = e.target;
    if (t.matches('[data-action="start"]')) {
      const btn = t; if (btn.hasAttribute('disabled')) return;
      const st = getState();
      const monsters = selectMonsters(st);
      const chosen = inst._local.slots.filter(Boolean);
      if (!st.players.order.length) {
        chosen.forEach((monsterId, idx) => {
          const mon = monsters.find(m => m.id === monsterId);
          const name = mon ? mon.name : `Player ${idx+1}`;
          const isCPU = idx !== 0;
          const player = createPlayer({ id: 'p'+(idx+1), name, monsterId });
          if (isCPU) player.isCPU = true;
          dispatch(playerJoined(player));
        });
      }
      dispatch(uiMonsterSelectionClose());
      return;
    }
    if (t.closest('[data-action="close"]')) { dispatch(uiMonsterSelectionClose()); return; }
  if (t.closest('[data-action="profiles"]')) { dispatch(uiMonsterProfilesOpen('selection')); dispatch(uiMonsterSelectionClose()); return; }
  if (t.closest('[data-action="random"]')) { randomFill(inst); render(inst); return; }
  if (t.closest('[data-action="page-prev"]')) { if (inst._local.page > 0) { inst._local.page--; render(inst); } return; }
  if (t.closest('[data-action="page-next"]')) { const stNow = getState(); const total = selectMonsters(stNow).length; const pages = Math.max(1, Math.ceil(total / inst._local.pageSize)); if (inst._local.page < pages - 1) { inst._local.page++; render(inst, stNow); } return; }
    if (t.closest('[data-action="reset"]')) { inst._local.slots = new Array(inst._local.playerCount).fill(null); inst._local.selected.clear(); render(inst); return; }
    if (t.closest('[data-action="toggle-dropdown"]')) { root.querySelector('[data-dropdown]')?.classList.toggle('open'); return; }
    if (t.closest('[data-player-count]')) {
      const li = t.closest('[data-player-count]');
      const n = parseInt(li.getAttribute('data-player-count'), 10);
      if (!Number.isNaN(n)) inst._local.playerCount = n;
      while (inst._local.selected.size > n) { const last = Array.from(inst._local.selected).pop(); inst._local.selected.delete(last); }
      root.querySelector('[data-dropdown]')?.classList.remove('open');
      render(inst); return;
    }
    const card = t.closest('[data-monster-card]');
    if (card) {
      const id = card.getAttribute('data-id');
      const idx = inst._local.slots.indexOf(id);
      if (idx >= 0) inst._local.slots[idx] = null; else {
        const empty = inst._local.slots.findIndex(s => !s);
        if (empty >= 0) inst._local.slots[empty] = id;
      }
      syncSelectedFromSlots(inst); render(inst); return;
    }
    const slotEl = t.closest('[data-slot-index]');
    if (slotEl && slotEl.hasAttribute('data-has-monster')) {
      const si = parseInt(slotEl.getAttribute('data-slot-index'), 10);
      if (!Number.isNaN(si)) { inst._local.slots[si] = null; syncSelectedFromSlots(inst); render(inst); return; }
    }
  });

  // Drag + Drop
  root.addEventListener('dragstart', (e) => {
    const card = e.target.closest('[data-monster-card]');
    const slot = e.target.closest('[data-slot-index]');
    if (card) {
      const id = card.getAttribute('data-id'); if (!id) return;
      e.dataTransfer.setData('text/plain', id);
      e.dataTransfer.setData('application/x-monster-id', id);
      e.dataTransfer.effectAllowed = 'move';
    } else if (slot && slot.hasAttribute('data-has-monster')) {
      const si = parseInt(slot.getAttribute('data-slot-index'), 10);
      const id = inst._local.slots[si]; if (!id) return;
      e.dataTransfer.setData('text/plain', id);
      e.dataTransfer.setData('application/x-monster-id', id);
      e.dataTransfer.setData('application/x-from-slot', String(si));
      e.dataTransfer.effectAllowed = 'move';
    }
  });
  root.addEventListener('dragover', (e) => { const slot = e.target.closest('[data-slot-index]'); if (slot) { e.preventDefault(); slot.classList.add('drag-over'); } });
  root.addEventListener('dragleave', (e) => { const slot = e.target.closest('[data-slot-index]'); if (slot) slot.classList.remove('drag-over'); });
  root.addEventListener('drop', (e) => {
    const slot = e.target.closest('[data-slot-index]'); if (!slot) return; e.preventDefault(); slot.classList.remove('drag-over');
    const id = e.dataTransfer.getData('application/x-monster-id') || e.dataTransfer.getData('text/plain'); if (!id) return;
    const si = parseInt(slot.getAttribute('data-slot-index'), 10); if (Number.isNaN(si)) return;
    const fromSlot = e.dataTransfer.getData('application/x-from-slot');
    if (fromSlot) { const fIdx = parseInt(fromSlot, 10); if (!Number.isNaN(fIdx) && fIdx !== si) inst._local.slots[fIdx] = null; }
    const currentIdx = inst._local.slots.indexOf(id); if (currentIdx >= 0 && currentIdx !== si) inst._local.slots[currentIdx] = null;
    inst._local.slots[si] = id; syncSelectedFromSlots(inst); render(inst);
  });

  return inst;
}

export function update(ctx) {
  const root = ctx.inst?.root || ctx.root || ctx; const st = ctx.fullState || ctx.state;
  const open = st?.ui?.monsterSelection?.open;
  const inst = ctx.inst || { root, _local: { selected: new Set(), slots: [], playerCount: 4, _initialized: false } };
  // Trimmed verbose debug; retain show/hide logs below.
  if (!st || !st.ui || !st.ui.monsterSelection) {
    if (!root._warnedMissingSlice) {
      console.warn('[monster-selection][update] state slice missing', st?.ui?.monsterSelection);
      root._warnedMissingSlice = true;
    }
  } else {
    root._warnedMissingSlice = false;
  }
  const openFlag = st?.ui?.monsterSelection?.open;
  console.debug('[monster-selection][update] invoked. open=', openFlag, 'hasHiddenClass=', root.classList.contains('hidden'));
  if (!open) { if (!root.classList.contains('hidden')) console.debug('[monster-selection.update] hiding (open flag false)'); root.classList.add('hidden'); inst._local._initialized = false; return; }
  if (root.classList.contains('hidden')) console.debug('[monster-selection.update] showing (open flag true)');
  root.classList.remove('hidden');
  if (!inst._local._initialized) {
    inst._local.playerCount = 4; inst._local.slots = new Array(inst._local.playerCount).fill(null);
    inst._local.selected = new Set(); inst._local._initialized = true; inst._local.prevMonsterCount = 0;
  }
  // Watchdog: if state says open but element somehow still hidden via inline style or visibility, force show
  if (openFlag) {
    const cs = getComputedStyle(root);
    if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') {
      console.warn('[monster-selection][watchdog] forcing visible (state open but computed style hidden)', { display: cs.display, visibility: cs.visibility, opacity: cs.opacity });
      root.style.display = 'block';
      root.style.visibility = 'visible';
      root.style.opacity = '1';
      root.classList.remove('hidden');
    }
  }
  try { render(inst, st); } catch(e) { console.error('[monster-selection][render] failed', e); }
}

function frame() {
  // Pager positioned beneath grid inside cards-col (prevents layout jump vs. top placement)
  return `\n    <div class="setup-frame" role="dialog" aria-modal="true" aria-label="Monster Selection">\n      <button type="button" class="setup-close" data-action="close" aria-label="Close">✕</button>\n      <div class="setup-title">MONSTER SELECTION</div>\n      <div class="setup-controls">\n        <button class="pill-btn" data-action="profiles">Monster Profiles</button>\n        <div class="player-count dropdown" data-dropdown>\n          <button class="pill-btn dropdown-toggle gold" data-action="toggle-dropdown"><span data-player-count-label>4 PLAYERS</span><span class="chev">▾</span></button>\n          <ul class="dropdown-menu">\n            ${[2,3,4,5,6].map(n => `<li data-player-count="${n}">${n} Players</li>`).join('')}\n          </ul>\n        </div>\n        <button class="pill-btn" data-action="random">Random Monster Selection</button>\n      </div>\n      <div class="setup-body">\n        <div class="cards-col">\n          <div class="cards-grid" data-setup-grid></div>\n          <div class="monster-pager" data-pager></div>\n        </div>\n        <div class="selection-sidebar" data-sidebar></div>\n      </div>\n      <div class="setup-footer">\n        <button class="reset-link" data-action="reset">⟲ Reset Monsters</button>\n        <button class="start-btn" data-action="start" disabled>ASSIGN 2 MORE MONSTERS</button>\n      </div>\n    </div>`;
}
function render(inst, fullState) {
  const root = inst.root; const st = fullState || inst.getState?.();
  const monsters = selectMonsters(st); const prevCount = inst._local.prevMonsterCount || 0;
  if (monsters.length !== prevCount) inst._local.prevMonsterCount = monsters.length;
  if (monsters.length && monsters.some(m => !m.image)) {
    if (!inst._local._warnedMissingImages) {
      console.warn('[monster-selection.component] Some monsters missing image paths:', monsters.filter(m => !m.image).map(m => m.id));
      inst._local._warnedMissingImages = true;
    }
  }
  if (!Array.isArray(inst._local.slots) || inst._local.slots.length !== inst._local.playerCount) {
    const old = inst._local.slots || []; const next = new Array(inst._local.playerCount).fill(null);
    for (let i=0;i<next.length;i++) next[i] = old[i] || null; inst._local.slots = next; syncSelectedFromSlots(inst);
  }
  const grid = root.querySelector('[data-setup-grid]');
  if (grid) {
    const pageSize = inst._local.pageSize || 6;
    const total = monsters.length;
    const pages = Math.max(1, Math.ceil(total / pageSize));
    if (inst._local.page >= pages) inst._local.page = pages - 1; // clamp if data shrank
    const startIdx = inst._local.page * pageSize;
    const slice = monsters.slice(startIdx, startIdx + pageSize);
    grid.innerHTML = slice.map(m => card(m, inst._local.selected.has(m.id))).join('');
    grid.querySelectorAll('[data-monster-card]').forEach(el => {
      const id = el.getAttribute('data-id'); const selected = inst._local.selected.has(id);
      el.setAttribute('draggable', String(!selected));
      el.classList.toggle('is-unavailable', selected);
    });
    const pagerEl = root.querySelector('[data-pager]');
    if (pagerEl) {
      if (total <= pageSize) {
        pagerEl.innerHTML = '';
      } else {
        const current = inst._local.page + 1;
        pagerEl.innerHTML = `<button class="pager-btn" data-action="page-prev" ${current===1?'disabled':''} aria-label="Previous Page">◀</button>
          <span class="pager-status">Page ${current} / ${pages}</span>
          <button class="pager-btn" data-action="page-next" ${current===pages?'disabled':''} aria-label="Next Page">▶</button>`;
      }
    }
  }
  const sidebar = root.querySelector('[data-sidebar]');
  if (sidebar) {
    const slotHTML = inst._local.slots.map((id,i)=>{
      if (id) { const m = monsters.find(mm=>mm.id===id); return miniCard(m,i,i===0); }
      if (i===0) return humanPlaceholderCard(i);
      return cpuCard(i);
    }).join('');
    sidebar.innerHTML = `<div class="mini-list">${slotHTML}</div>`;
    inst._local.slots.forEach((id,i)=>{ if(!id) return; const m = monsters.find(mm=>mm.id===id); const el = sidebar.querySelector(`[data-slot-index="${i}"]`); if (el && m && m.color) el.style.setProperty('--mini-bg', m.color+'22'); });
  }
  const label = root.querySelector('[data-player-count-label]'); if (label) label.textContent = `${inst._local.playerCount} PLAYERS`;
  const remaining = Math.max(0, inst._local.playerCount - inst._local.selected.size);
  const startBtn = root.querySelector('[data-action="start"]');
  if (startBtn) {
    startBtn.textContent = remaining > 0 ? `ASSIGN ${remaining} MORE MONSTER${remaining>1?'S':''}` : 'START GAME';
    if (remaining > 0) startBtn.setAttribute('disabled',''); else startBtn.removeAttribute('disabled');
  }
}

function card(m, selected) { const cls = selected ? 'monster-card selected' : 'monster-card empty'; return `<div class="${cls}" data-monster-card data-id="${m.id}">\n    <div class="stack">\n      <div class="polaroid">\n        <div class="photo"><img src="${m.image}" alt="${m.name}"></div>\n      </div>\n    </div>\n  </div>`; }
function miniCard(m, slotIndex, isHumanSlot=false) { return `<div class="mini-card human vertical droppable" data-slot-index="${slotIndex}" data-has-monster draggable="true" data-human="${isHumanSlot}">\n    <div class="mini-photo"><img src="${m.image}" alt="${m.name}"></div>\n    <div class="mini-name">${m.name}</div>\n  </div>`; }
function humanPlaceholderCard(slotIndex) { return `<div class="mini-card human-placeholder vertical droppable" data-slot-index="${slotIndex}">\n    <div class="mini-photo placeholder">?</div>\n    <div class="mini-name">HUMAN PLAYER</div>\n  </div>`; }
function cpuCard(slotIndex) { return `<div class="mini-card cpu droppable" data-slot-index="${slotIndex}"><div class="cpu-label">CPU</div><div class="cpu-sub">CPU PLAYER</div></div>`; }
function randomFill(inst) { const st = inst.getState?.(); const mons = selectMonsters(st); const pool = mons.map(m=>m.id).filter(id=>!inst._local.selected.has(id)); while (inst._local.slots.some(s=>!s) && pool.length) { const i = Math.random()*pool.length|0; const id = pool.splice(i,1)[0]; const empty = inst._local.slots.findIndex(s=>!s); if (empty>=0) inst._local.slots[empty]=id; } syncSelectedFromSlots(inst); }
function syncSelectedFromSlots(inst) { inst._local.selected = new Set((inst._local.slots||[]).filter(Boolean)); }
