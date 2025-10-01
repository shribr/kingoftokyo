/** core/determinism.js
 * Deterministic snapshot & divergence telemetry utilities.
 * Emits window.__KOT_TELEMETRY__ events of type 'ai.determinism.diff' when divergence detected.
 */
import { isDeterministicMode } from './rng.js';

// Internal rolling baseline
let __baseline = null;
let __lastDiffId = 0;

function shallowClone(obj){ return JSON.parse(JSON.stringify(obj)); }

export function buildDeterminismSnapshot(store){
  const st = store.getState();
  // Capture only deterministic-critical slices to minimize noise
  return {
    turnCycleId: st.meta?.turnCycleId,
    activePlayerIndex: st.meta?.activePlayerIndex,
    phase: st.phase,
    dice: {
      faces: st.dice.faces.map(f=>({ v:f.value, k:!!f.kept })),
      rollHistory: (st.dice.rollHistory||[]).map(r=>({ seed:r.meta?.seed, rollIndex:r.meta?.rollIndex, faces:r.faces.map(f=>f.value) }))
    },
    players: st.players.order.map(id => ({ id, hp: st.players.byId[id].health, vp: st.players.byId[id].victoryPoints, energy: st.players.byId[id].energy })),
    tokyo: {
      city: st.tokyo?.cityOccupant || null,
      bay: st.tokyo?.bayOccupant || null
    }
  };
}

function diffSnapshots(a,b){
  const diffs = [];
  if (a.turnCycleId !== b.turnCycleId) diffs.push(['turnCycleId', a.turnCycleId, b.turnCycleId]);
  if (a.activePlayerIndex !== b.activePlayerIndex) diffs.push(['activePlayerIndex', a.activePlayerIndex, b.activePlayerIndex]);
  if (a.phase !== b.phase) diffs.push(['phase', a.phase, b.phase]);
  const aPlayers = a.players; const bPlayers = b.players;
  if (aPlayers.length !== bPlayers.length) diffs.push(['players.length', aPlayers.length, bPlayers.length]);
  else {
    for (let i=0;i<aPlayers.length;i++) {
      const ap = aPlayers[i], bp = bPlayers[i];
      if (ap.id !== bp.id) diffs.push([`players[${i}].id`, ap.id, bp.id]);
      if (ap.hp !== bp.hp) diffs.push([`players[${i}].hp`, ap.hp, bp.hp]);
      if (ap.vp !== bp.vp) diffs.push([`players[${i}].vp`, ap.vp, bp.vp]);
      if (ap.energy !== bp.energy) diffs.push([`players[${i}].energy`, ap.energy, bp.energy]);
    }
  }
  // Compare last roll history entry presence & seed chain
  const ah = a.dice.rollHistory.slice(-1)[0];
  const bh = b.dice.rollHistory.slice(-1)[0];
  if (ah?.seed !== bh?.seed) diffs.push(['dice.last.seed', ah?.seed, bh?.seed]);
  if ((ah?.faces||[]).join(',') !== (bh?.faces||[]).join(',')) diffs.push(['dice.last.faces', ah?.faces, bh?.faces]);
  return diffs;
}

export function recordOrCompareDeterminism(store, telemetrySink = null) {
  if (!isDeterministicMode()) return; // Only active in deterministic/test mode
  const snap = buildDeterminismSnapshot(store);
  if (!__baseline) {
    __baseline = shallowClone(snap);
    return { baselineSet: true, diffs: [] };
  }
  const diffs = diffSnapshots(__baseline, snap);
  if (diffs.length) {
    const evt = { id: ++__lastDiffId, type: 'ai.determinism.diff', diffs, at: Date.now(), baseline: __baseline, current: snap };
    try {
      const sink = telemetrySink || (typeof window !== 'undefined' ? (window.__KOT_TELEMETRY__ = window.__KOT_TELEMETRY__||[]) : null);
      if (sink) sink.push(evt);
    } catch(_) {}
    // Update baseline after logging to allow continued detection scope, or keep original?
    // We keep original to amplify persistent drift visibility.
  }
  return { baselineSet: false, diffs };
}

export function resetDeterminismBaseline(){ __baseline = null; }

// Helper: adaptive heuristics should be disabled if deterministic mode active
export function isAdaptiveGuardActive(){ return isDeterministicMode(); }
