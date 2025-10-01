#!/usr/bin/env node
/** deterministicSnapshotHarness.js
 * Verifies deterministic mode stability across multiple runs.
 * Runs a fixed number of turns, collecting:
 *  - Dice roll seeds + faces per roll (rollHistory)
 *  - AI decision deterministic metadata (if AI acts)
 * Repeats the scenario for R runs (default 2) and asserts identical snapshots.
 * Usage:
 *   KOT_TEST_MODE=1 node tools/deterministicSnapshotHarness.js --turns=3 --runs=2
 */
import { store, turnService } from '../src/bootstrap/nodeBootstrap.js';
import { diceRollStarted, diceRollResolved, diceResultsAccepted } from '../src/core/actions.js';
import { isDeterministicMode } from '../src/core/rng.js';

const turnsArg = process.argv.find(a=>a.startsWith('--turns='));
const runsArg = process.argv.find(a=>a.startsWith('--runs='));
const TURNS = turnsArg ? parseInt(turnsArg.split('=')[1],10) : 2;
const RUNS = runsArg ? parseInt(runsArg.split('=')[1],10) : 2;

if (!isDeterministicMode()) {
  console.warn('[DETERMINISM] KOT_TEST_MODE not enabled; set env var for meaningful checks.');
}

function clone(obj){ return JSON.parse(JSON.stringify(obj)); }

function captureSnapshot(label){
  const st = store.getState();
  return {
    label,
    turnCycleId: st.meta.turnCycleId,
    activeIndex: st.meta.activePlayerIndex,
    diceHistory: clone(st.dice.rollHistory||[]).map(r=>({ seed:r.meta?.seed, faces:r.faces.map(f=>f.value) })),
    players: st.players.order.map(id=>({ id, hp: st.players.byId[id].health, energy: st.players.byId[id].energy, vp: st.players.byId[id].victoryPoints })),
    tokyo: clone(st.tokyo)
  };
}

async function simulateTurn(){
  // Minimal: perform up to two rolls then resolve early for speed
  store.dispatch(diceRollStarted()); // triggers diceReducer state init
  // Force accept immediately (turnService performRoll internal not exposed; simulate direct faces via deterministic harness approach not implemented here)
  // Rely on AI / other logic for further actions if needed.
  store.dispatch(diceRollResolved());
  store.dispatch(diceResultsAccepted());
}

async function runOneScenario(runIndex){
  const snaps = [];
  for (let t=0;t<TURNS;t++) {
    await simulateTurn();
    snaps.push(captureSnapshot(`run${runIndex}-turn${t}`));
    // Advance turn manually
    store.dispatch({ type:'NEXT_TURN', payload:{} });
  }
  return snaps;
}

async function main(){
  const allRuns = [];
  for (let r=0;r<RUNS;r++) {
    allRuns.push(await runOneScenario(r));
  }
  // Compare run 0 vs others
  const baseline = allRuns[0];
  let diffs = 0;
  for (let r=1;r<allRuns.length;r++) {
    const cur = allRuns[r];
    for (let i=0;i<baseline.length;i++) {
      const a = baseline[i];
      const b = cur[i];
      if (JSON.stringify(a.diceHistory) !== JSON.stringify(b.diceHistory)) {
        console.error('[DETERMINISM_DIFF] diceHistory mismatch turn', i, 'run', r);
        diffs++;
      }
      if (JSON.stringify(a.players) !== JSON.stringify(b.players)) {
        console.error('[DETERMINISM_DIFF] players mismatch turn', i, 'run', r);
        diffs++;
      }
      if (JSON.stringify(a.tokyo) !== JSON.stringify(b.tokyo)) {
        console.error('[DETERMINISM_DIFF] tokyo mismatch turn', i, 'run', r);
        diffs++;
      }
    }
  }
  if (diffs>0) {
    console.error(`[DETERMINISTIC_SNAPSHOT] FAILED with ${diffs} diffs across ${RUNS} runs.`);
    process.exit(1);
  }
  console.log(`[DETERMINISTIC_SNAPSHOT] PASS. ${RUNS} runs, ${TURNS} turns each, no diffs.`);
}
main().catch(e=>{ console.error(e); process.exit(1); });
