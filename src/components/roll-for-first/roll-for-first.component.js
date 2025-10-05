/** roll-for-first.component.js */
import { phaseChanged, metaActivePlayerSet, uiRollForFirstResolved } from '../../core/actions.js';
import { acquire as acquireOverlay, release as releaseOverlay } from '../../services/overlayService.js';
import { eventBus } from '../../core/eventBus.js';

export function build({ selector, dispatch, getState }) {
  const root = document.createElement('div');
  root.className = selector.slice(1) + ' modal-shell rff-modal hidden';
  root.innerHTML = markup();
  // built
  root.addEventListener('click', (e) => {
    const t = e.target;
    if (t.matches('[data-action="roll"]')) {
      const stObj = ensureStateObject(root, getState);
      if (stObj.winnerDecided) return;
      if (!stObj.sequenceStarted) {
        stObj.sequenceStarted = true;
        startSequence(dispatch, getState, root, stObj.currentSubsetIds);
        // If the sequence starts with a human player waiting, roll immediately on first click
        if (stObj.sequenceActive && stObj.waitingForHuman) {
          stObj.waitingForHuman = false;
          rollCurrentPlayer(dispatch, getState, root);
        }
      } else if (stObj.waitingForHuman) {
        stObj.waitingForHuman = false;
        rollCurrentPlayer(dispatch, getState, root);
      }
    }
    if (t.matches('[data-action="skip-rff"]')) {
      skipAndAssign(dispatch, getState, root);
    }
  });
  return { root, update: (ctx) => update(ctx, root, dispatch, getState) };
}

function markup() {
  return `<div class="modal rff-frame" role="dialog" aria-modal="true" aria-label="Roll For First Player">
    <h2 class="rff-title">ROLL FOR FIRST</h2>
    <div class="rff-broadcast" data-commentary>Welcome to the opening roll! Click Roll Dice when you're ready.</div>
    <div class="modal-body rff-body" data-body>
      <div class="rff-results" data-results></div>
    </div>
    <div class="rff-footer" data-rff-footer>
      <button class="rff-btn rff-btn-primary rff-roll-btn" data-action="roll">ROLL DICE</button>
      <a href="#" class="rff-skip" data-action="skip-rff" aria-label="Skip rolling and auto decide first player">Skip & Assign</a>
    </div>
  </div>`;
}

export function update(ctx, root, dispatch, getState) {
  const state = ctx.fullState || ctx.state;
  const rff = state.ui?.rollForFirst;
  const open = rff?.open;
  if (!open) { hide(root); return; }
  show(root);
  if (!root._overlayAcquired) { acquireOverlay('rollForFirst'); root._overlayAcquired = true; }
  const stObj = ensureStateObject(root, getState);
  if (!stObj.tableBuilt) buildInitialTable(root, getState);
  // Auto dev shortcut still supported
  maybeAutoDevRoll(dispatch, getState, root, rff, stObj);
}

// === State helpers ===
function ensureStateObject(root, getState) {
  if (!root._rffState) {
    const st = getState();
    const all = [...st.players.order];
    root._rffState = {
      sequenceStarted: false,
      sequenceActive: false,
      waitingForHuman: true,
      rolls: {},
      currentSubsetIds: all, // shrinks to ties
      tableBuilt: false,
      tieRound: 0,
      orderCache: all,
      currentPlayerIndex: 0
    };
  }
  return root._rffState;
}

function buildInitialTable(root, getState) {
  const st = getState();
  const resultsEl = root.querySelector('[data-results]');
  if (!resultsEl) return;
  const rows = st.players.order.map(pid => {
    const p = st.players.byId[pid];
    const name = p?.name || pid;
    const avatarPath = deriveAvatarPath(name);
    return `<tr data-player-row="${pid}">
      <td class="rff-player"><span class="rff-avatar"><img src="${avatarPath}" alt="${name}" onerror="this.style.display='none'"/></span><span class="rff-name">${name}</span>${p?.isCPU || p?.isAi || p?.type === 'ai' ? ' <span class="rff-cpu-tag">CPU</span>' : ''}</td>
      <td class="rff-dice-cell" data-dice-cell="${pid}"></td>
      <td class="rff-result" data-result-for="${pid}">—</td>
    </tr>`;
  }).join('');
  resultsEl.innerHTML = `<table class="rff-table"><thead><tr><th>Player</th><th>Dice</th><th>Result</th></tr></thead><tbody>${rows}</tbody></table>`;
  const stObj = ensureStateObject(root, getState);
  stObj.tableBuilt = true;
}

// === Sequence Control ===
function startSequence(dispatch, getState, root, subset) {
  const stObj = ensureStateObject(root, getState);
  stObj.sequenceActive = true;
  stObj.currentSubsetIds = subset || stObj.currentSubsetIds;
  stObj.rolls = {}; // reset for this subset
  stObj.currentPlayerIndex = 0;
  const st = getState();
  const commentary = root.querySelector('[data-commentary]');
  const ordered = orderPlayersForSubset(st, stObj.currentSubsetIds);
  stObj.orderedForRound = ordered;
  const firstPlayerId = ordered[0];
  const firstIsHuman = isHuman(st.players.byId[firstPlayerId]);
  stObj.waitingForHuman = firstIsHuman;
  updateRollButtonState(root, stObj);
  const firstName = st.players.byId[firstPlayerId]?.name || firstPlayerId;
  if (commentary) commentary.textContent = stObj.tieRound ? `Tie-break round ${stObj.tieRound}: ${ordered.length} monsters re-rolling. ${firstIsHuman ? firstName + ' rolls first.' : firstName + ' starts the tie-break.'}` : `Determining first player. ${firstIsHuman ? firstName + ' rolls first.' : firstName + ' starts.'}`;
  if (!firstIsHuman) {
    // Slightly longer delay so results breathe before first CPU starts
    setTimeout(()=> rollCurrentPlayer(dispatch, getState, root), 1000);
  }
}

function orderPlayersForSubset(st, subset) {
  const all = subset.slice();
  const humans = all.filter(id => isHuman(st.players.byId[id]));
  const cpus = all.filter(id => !isHuman(st.players.byId[id]));
  // Always put first human (if any) at start, preserve relative order from original players.order
  const baseOrder = [...st.players.order].filter(id => all.includes(id));
  const firstHuman = baseOrder.find(id => humans.includes(id));
  if (!firstHuman) return baseOrder; // all CPU
  // Move firstHuman to front, keep the rest order
  const rest = baseOrder.filter(id => id !== firstHuman);
  return [firstHuman, ...rest];
}

function isHuman(player) { return !(player?.isCPU || player?.isAi || player?.type === 'ai'); }

function updateRollButtonState(root, stObj) {
  const rollBtn = root.querySelector('.rff-roll-btn');
  if (!rollBtn) return;
  if (stObj.sequenceActive && stObj.waitingForHuman) {
    rollBtn.disabled = false;
    rollBtn.textContent = 'ROLL YOUR DICE';
  } else if (stObj.sequenceActive) {
    rollBtn.disabled = true;
    rollBtn.textContent = 'ROLLING...';
  } else if (!stObj.sequenceStarted) {
    rollBtn.disabled = false;
    rollBtn.textContent = 'ROLL DICE';
  } else {
    rollBtn.disabled = true;
  }
}

function rollCurrentPlayer(dispatch, getState, root) {
  const stObj = ensureStateObject(root, getState);
  const st = getState();
  const pid = stObj.orderedForRound[stObj.currentPlayerIndex];
  if (!pid) return;
  const row = root.querySelector(`tr[data-player-row="${pid}"]`);
  // Create dice set on first reveal
  let diceSet = root.querySelector(`.rff-dice-set[data-dice-set="${pid}"]`);
  if (!diceSet) {
    const cell = root.querySelector(`[data-dice-cell="${pid}"]`);
    if (cell) {
      cell.innerHTML = `<div class="rff-dice-set" data-dice-set="${pid}">` + Array.from({length:6}).map((_,i)=>`<div class="mini-die" data-die-index="${i}" data-player-die="${pid}"></div>`).join('') + `</div>`;
      diceSet = root.querySelector(`.rff-dice-set[data-dice-set="${pid}"]`);
  if (diceSet) diceSet.classList.add('initialized');
    }
  }
  // Ensure existing (e.g. from earlier partial creation) is initialized
  if (diceSet && !diceSet.classList.contains('initialized')) diceSet.classList.add('initialized');
  const resultCell = root.querySelector(`.rff-result[data-result-for="${pid}"]`);
  const commentary = root.querySelector('[data-commentary]');
  if (!diceSet || !resultCell) return;
  const dice = Array.from(diceSet.querySelectorAll('.mini-die'));
  // Begin rolling animation: add rolling class & show rapid face changes using symbols (never raw words)
  dice.forEach(d => { 
    d.classList.add('rolling'); 
    // Slightly longer wobble per die for a more deliberate reveal
    const base = 0.85 + Math.random()*0.35; // ~0.85s - 1.20s
    d.style.animationDuration = base.toFixed(2)+'s';
    displayRollingFace(d, randomFaceSymbol());
  });
  resultCell.textContent = '…';
  updateRollButtonState(root, stObj);
  if (row) row.classList.add('rolling-row');
  const duration = 1800; // take a little longer to reveal results of each roll
  const start = performance.now();
  const raf = (now) => {
    const t = now - start;
    if (t < duration) {
      dice.forEach(d => { displayRollingFace(d, randomFaceSymbol()); });
      requestAnimationFrame(raf);
    } else {
      const faces = finalizeDiceFaces();
      const attackCount = faces.filter(f => f === 'claw').length;
      stObj.rolls[pid] = attackCount;
      dice.forEach((d,i) => { d.classList.remove('rolling'); applyFaceToDie(d, faces[i]); });
      if (row) row.classList.remove('rolling-row');
      resultCell.textContent = attackCount;
      if (commentary) commentary.textContent = `${st.players.byId[pid]?.name || pid} rolls ${attackCount} attack${attackCount===1?'':'s'}!`;
      advanceSequence(dispatch, getState, root);
    }
  };
  requestAnimationFrame(raf);
}

function advanceSequence(dispatch, getState, root) {
  const stObj = ensureStateObject(root, getState);
  stObj.currentPlayerIndex++;
  const st = getState();
  if (stObj.currentPlayerIndex < stObj.orderedForRound.length) {
    const nextId = stObj.orderedForRound[stObj.currentPlayerIndex];
    stObj.waitingForHuman = isHuman(st.players.byId[nextId]) && !stObj.rolls[nextId];
    updateRollButtonState(root, stObj);
    if (!stObj.waitingForHuman) {
      // Add a full second pause between players to read the results
      setTimeout(()=> rollCurrentPlayer(dispatch, getState, root), 1000);
    }
    return;
  }
  // Sequence finished for this subset
  stObj.sequenceActive = false;
  stObj.waitingForHuman = false;
  updateRollButtonState(root, stObj);
  evaluateRound(dispatch, getState, root);
}

function evaluateRound(dispatch, getState, root) {
  const stObj = ensureStateObject(root, getState);
  const st = getState();
  const rolls = Object.entries(stObj.rolls).map(([id,val]) => ({ id, val:Number(val) }));
  const commentary = root.querySelector('[data-commentary]');
  const max = Math.max(...rolls.map(r=>r.val));
  const top = rolls.filter(r=>r.val===max);
  // Always clear old winner classes; only re-apply when the final single winner is known
  root.querySelectorAll('tr.winner').forEach(tr=>tr.classList.remove('winner'));
  // actions container removed (buttons now in header)
  if (top.length === 1) {
    // Final resolved winner: apply highlight styling now
    const winnerRow = root.querySelector(`tr[data-player-row="${top[0].id}"]`);
    if (winnerRow) winnerRow.classList.add('winner');
    const winnerId = top[0].id;
    const idx = st.players.order.indexOf(winnerId);
    if (idx >= 0) dispatch(metaActivePlayerSet(idx));
    const winnerName = st.players.byId[winnerId]?.name || winnerId;
    if (commentary) commentary.textContent = `${winnerName} wins the roll and will go first!`;
    const stObj2 = ensureStateObject(root, getState);
    stObj2.winnerDecided = true;
  // No actions container to clear; button will remain but disabled by sequence resolution
    // Place winner banner in commentary area (broadcast) so vertical space was already reserved
    if (commentary) {
      commentary.innerHTML = `<div class="rff-winner-banner" role="status" aria-live="polite">
        <div class="rff-winner-icon">🏆</div>
        <div class="rff-winner-text">${winnerName.toUpperCase()}</div>
        <div class="rff-winner-sub">Will Take The First Turn</div>
      </div>`;
      // Short pause (1s) allowing players to read winner before game start
      setTimeout(() => finalizeAndStartGame(dispatch, getState, root), 1000);
    }
    // Remove all non-winner rows from the table per request
    try {
      const tbody = root.querySelector('.rff-table tbody');
      if (tbody) {
        const winnerIdStr = String(winnerId);
        tbody.querySelectorAll('tr[data-player-row]').forEach(tr => {
          if (tr.getAttribute('data-player-row') !== winnerIdStr) {
            tr.style.transition = 'opacity .25s ease, transform .25s ease';
            tr.style.opacity = '0';
            tr.style.transform = 'translateX(-8px)';
            setTimeout(()=>{ try { tr.remove(); } catch(_) {} }, 260);
          }
        });
      }
    } catch(_) {}
    // Defer closing to the countdown end; also set a gentle fallback just in case
    scheduleAutoClose(dispatch, getState, root);
  } else {
    // Tie -> new subset
    stObj.tieRound++;
    if (commentary) commentary.textContent = `Tie! ${top.map(t=> st.players.byId[t.id]?.name || t.id).join(', ')} re-roll.`;
    // Remove eliminated (non-top) players from the table; keep only tied players
    try {
      const topIds = new Set(top.map(t => String(t.id)));
      const tbody = root.querySelector('.rff-table tbody');
      if (tbody) {
        tbody.querySelectorAll('tr[data-player-row]').forEach(tr => {
          const pid = tr.getAttribute('data-player-row');
          if (!topIds.has(pid)) {
            tr.style.transition = 'opacity .25s ease, transform .25s ease';
            tr.style.opacity = '0';
            tr.style.transform = 'translateX(-8px)';
            setTimeout(()=>{ try { tr.remove(); } catch(_) {} }, 260);
          }
        });
      }
    } catch(_) {}
    // Reset only tied players' dice/result
    top.forEach(t => {
      const resultCell = root.querySelector(`.rff-result[data-result-for="${t.id}"]`);
      if (resultCell) resultCell.textContent = '—';
      const diceSet = root.querySelector(`.rff-dice-set[data-dice-set="${t.id}"]`);
      if (diceSet) diceSet.remove();
    });
    stObj.currentSubsetIds = top.map(t=>t.id);
    stObj.sequenceStarted = true; // remain in sequence mode; pause before next round
    // Disable roll button during the tie pause to prevent accidental clicks
    updateRollButtonState(root, stObj);
    // Wait 3 seconds so the user can read the tie message before re-rolling
    setTimeout(() => {
      startSequence(dispatch, getState, root, stObj.currentSubsetIds);
    }, 3000);
  }
}

function skipAndAssign(dispatch, getState, root) {
  const st = getState();
  const order = [...st.players.order];
  if (!order.length) return;
  const idx = Math.floor(Math.random()*order.length);
  dispatch(metaActivePlayerSet(idx));
  dispatch(uiRollForFirstResolved());
  // Force start: emit intent + direct turnService guard (some environments reported no phase transition firing)
  try {
    if (st.phase === 'SETUP') {
      console.debug('[RFF.skipAndAssign] Emitting gameStart intent');
      eventBus.emit('ui/intent/gameStart');
      // Direct call as belt-and-suspenders
      if (window.__KOT_NEW__?.turnService?.startGameIfNeeded) {
        window.__KOT_NEW__.turnService.startGameIfNeeded();
      }
    }
  } catch(e) { console.warn('[RFF.skipAndAssign] startGameIfNeeded direct call failed', e); }
  // Reset first CPU roll guard so bootstrap subscription can auto-roll if CPU chosen first
  try { delete window.__KOT_FIRST_CPU_ROLL_TRIGGERED; } catch(_) {}
  // Schedule a micro + delayed fallback to ensure phase leaves SETUP; if still SETUP after 300ms, force once more
  setTimeout(() => {
    try {
      const cur = getState();
      if (cur.phase === 'SETUP') {
        console.warn('[RFF.skipAndAssign] Phase still SETUP after 300ms; forcing startGameIfNeeded again');
        window.__KOT_NEW__?.turnService?.startGameIfNeeded?.();
      }
    } catch(_) {}
  }, 300);
  hide(root);
  try { releaseOverlay('rollForFirst'); root._overlayAcquired = false; } catch(_) {}
  // In case start triggers phase advance immediately, ensure overlay fully hidden
  try { if (window.__KOT_NEW__?.store?.getState()?.phase !== 'SETUP') { releaseOverlay('rollForFirst'); } } catch(_) {}
}

// (Removed prior multi-player simultaneous functions in favor of sequential system.)

function show(root) { root.classList.remove('hidden'); root.style.pointerEvents = 'auto'; }
function hide(root) { root.classList.add('hidden'); }

function maybeClearBlackout() { /* replaced by overlayService */ }

// Dev hash flag: #autorollfirst => automatically roll once modal opens, keep re-rolling ties until resolved
function maybeAutoDevRoll(dispatch, getState, root, rff, stObj) {
  if (!location.hash.toLowerCase().includes('autorollfirst')) return;
  if (rff && rff._devAutoRan) return;
  rff._devAutoRan = true;
  const so = stObj || ensureStateObject(root, getState);
  if (!so.sequenceStarted) {
    so.sequenceStarted = true;
    so.waitingForHuman = false; // auto mode: no wait
    startSequence(dispatch, getState, root, so.currentSubsetIds);
  }
  // Force rapid auto progression by hooking into advanceSequence logic (no delays)
  // No function overrides; rely on no waitingForHuman flags.
}

// === Dice Faces ===
// Internal face identifiers; during rolling we map these to transient glyphs (numbers or icons) so raw words never show.
const FACE_SYMBOLS = ['1','2','3','heart','energy','claw'];
function randomFaceSymbol() { return FACE_SYMBOLS[Math.floor(Math.random()*FACE_SYMBOLS.length)]; }
function finalizeDiceFaces() { return Array.from({length:6}, ()=> randomFaceSymbol()); }
function applyFaceToDie(dieEl, face) {
  dieEl.textContent='';
  dieEl.className = dieEl.className.replace(/\b(f-heart|f-energy|f-claw|f-num|attack)\b/g,'').trim();
  if (['1','2','3'].includes(face)) { dieEl.textContent = face; dieEl.classList.add('f-num'); }
  else if (face==='heart') { dieEl.innerHTML = '<span class="rff-face-heart">❤</span>'; dieEl.classList.add('f-heart'); }
  else if (face==='energy') { dieEl.innerHTML = '<span class="rff-face-energy">⚡</span>'; dieEl.classList.add('f-energy'); }
  else if (face==='claw') { dieEl.innerHTML = '<span class="rff-face-claw">⚔</span>'; dieEl.classList.add('f-claw','attack'); }
}

// During the rolling animation we avoid literal words by mapping symbolic faces to interim glyphs
function displayRollingFace(dieEl, face) {
  if (['1','2','3'].includes(face)) { dieEl.textContent = face; return; }
  if (face === 'heart') { dieEl.textContent = '❤'; return; }
  if (face === 'energy') { dieEl.textContent = '⚡'; return; }
  if (face === 'claw') { dieEl.textContent = '⚔'; return; }
  // Fallback (should not hit) – show a dot instead of a word
  dieEl.textContent = '·';
}

// Auto close
function scheduleAutoClose(dispatch, getState, root) { /* No-op (legacy placeholder) */ }

// Ensures RFF is resolved, phase advances, modal hides, and blackout is kept visible for game start modal
function finalizeAndStartGame(dispatch, getState, root) {
  const stObj = ensureStateObject(root, getState);
  if (stObj._closed) return;
  stObj._closed = true;
  try { if (stObj._countdownTimer) { clearInterval(stObj._countdownTimer); stObj._countdownTimer = null; } } catch(_) {}
  dispatch(uiRollForFirstResolved());
  const st = getState();
    if (st.phase === 'SETUP') eventBus.emit('ui/intent/gameStart');
  hide(root);
  try { window.__KOT_BLACKOUT__?.hide(); } catch(_) {}
  // Release overlay if still active
  if (root._overlayAcquired) { try { releaseOverlay('rollForFirst'); root._overlayAcquired = false; } catch(_) {} }
  // Ensure body is marked active immediately to prevent any re-ensure paths from recreating blackout
  // Remove any outside-click listener that may have been set by scheduleAutoClose
  try {
    const handler = stObj._onDocClick;
    if (handler) {
      document.removeEventListener('mousedown', handler, true);
      stObj._onDocClick = null;
    }
  } catch(_) {}
  // Force panels to refresh enabled state immediately
  try {
    const am = document.querySelector('[data-am-root]');
    if (am && am.__cmp && typeof am.__cmp.update === 'function') am.__cmp.update();
  } catch(_) {}
}

function deriveAvatarPath(name) {
  const slug = (name||'').toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'');
  return `images/characters/king_of_tokyo_${slug}.png`;
}