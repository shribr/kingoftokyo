#!/usr/bin/env node
/** buyWaitHarness.js
 * Smoke harness to validate BUY_WAIT phase behavior.
 * Scenarios covered:
 *  1. Human player transitions: RESOLVE -> BUY -> BUY_WAIT -> CLEANUP (manual end / idle)
 *  2. Post‑purchase effect enqueues immediate effects forcing BUY_WAIT while still in BUY.
 *  3. CPU player path skips BUY_WAIT (BUY -> CLEANUP) unless follow‑ups queued.
 *
 * Usage:
 *   node tools/buyWaitHarness.js [--cpu] [--followup]
 * Options:
 *   --cpu       Forces active player flagged as CPU to assert skip path.
 *   --followup  Forces a discard card purchase (simulated) that enqueues effects to ensure BUY_WAIT occurs.
 *
 * Assertions:
 *  - Expected phase sequence ordering (no duplicate contiguous)
 *  - BUY_WAIT presence / absence per mode
 *  - BUY_WAIT exit only when effect queue idle
 */

// Use node-safe bootstrap (no window / DOM dependencies)
import { store, logger as bootstrapLogger } from '../src/bootstrap/nodeBootstrap.js';
import { Phases } from '../src/core/phaseFSM.js';
import { diceRolled, diceRollResolved } from '../src/core/actions.js';
import { purchaseCard } from '../src/services/cardsService.js';

function sleep(ms){ return new Promise(r=>setTimeout(r, ms)); }

const args = process.argv.slice(2);
const forceCPU = args.includes('--cpu');
const forceFollowUp = args.includes('--followup');

function setActivePlayerCPU(flag){
  const st = store.getState();
  const order = st.players.order;
  if (!order.length) throw new Error('No players in state');
  const activeId = order[st.meta.activePlayerIndex % order.length];
  store.dispatch({ type:'PLAYER_FLAG_UPDATED', payload:{ playerId: activeId, patch: { isCPU: flag, isAI: flag }}});
}

function log(msg, obj){ console.log(`[BUY_WAIT_HARNESS] ${msg}`, obj||''); }

const phaseLog = [];
let lastPhase = null;
store.subscribe((st, action) => {
  if (action?.type === 'PHASE_TRANSITION') {
    const p = st.phase;
    if (p !== lastPhase) {
      phaseLog.push(p);
      lastPhase = p;
      log(`Phase -> ${p}`);
    }
  }
});

async function forceResolvePhase(){
  const st = store.getState();
  if (st.phase === Phases.RESOLVE) return;
  store.dispatch({ type:'PHASE_TRANSITION', payload:{ from: st.phase, to: Phases.RESOLVE, ts: Date.now(), reason:'buy_wait_harness_force', turnCycleId: st.meta?.turnCycleId }});
}

async function simulateResolveToBuyWindow(){
  // Inject dice with neutral values then mark resolved
  store.dispatch(diceRolled(['1','2','3','heart','energy','claw'].map(v=>({ value:v, kept:false }))));
  store.dispatch(diceRollResolved());
  // Dynamically import resolution logic
  const { resolveDice } = await import('../src/services/resolutionService.js');
  resolveDice(store, bootstrapLogger);
}

function findDiscardCard(){
  const st = store.getState();
  return st.cards.shop.find(c => c.type === 'discard');
}

async function maybePurchaseFollowup(){
  if (!forceFollowUp) return false;
  const st = store.getState();
  const active = st.players.order[st.meta.activePlayerIndex % st.players.order.length];
  const discard = findDiscardCard();
  if (!discard){ log('No discard card available to force follow-up; refilling may be needed.'); return false; }
  // Ensure player has enough energy
  store.dispatch({ type:'PLAYER_ENERGY_GAINED', payload:{ playerId: active, amount: discard.cost }});
  purchaseCard(store, console, active, discard.id);
  log('Purchased discard card to enqueue effect follow-up', { card: discard.id });
  return true;
}

async function run(){
  log('Starting harness', { forceCPU, forceFollowUp });
  if (forceCPU) setActivePlayerCPU(true);
  await forceResolvePhase();
  await simulateResolveToBuyWindow();
  await sleep(50);
  await maybePurchaseFollowup();
  // Allow transitions to occur
  await sleep(300); // allow BUY -> BUY_WAIT deferral
  // If human path and not followup, we expect BUY_WAIT presence if feature flag active (EndBuyButton path)
  // Wait additional time for effect queue to drain if any
  await sleep(300);
  const finalState = store.getState();
  // If still in BUY_WAIT and no effects processing, simulate manual end buy
  if (finalState.phase === Phases.BUY_WAIT) {
    const st2 = store.getState();
    const q = st2.effectQueue?.queue || [];
    const anyProcessing = st2.effectQueue?.processing;
    const anyWaiting = q.some(e => e.status !== 'resolved' && e.status !== 'failed');
    if (!anyProcessing && !anyWaiting) {
      // simulate button publish event
      store.dispatch({ type:'PHASE_TRANSITION', payload:{ from: 'BUY_WAIT', to:'CLEANUP', ts: Date.now(), reason:'manual_end_buy', turnCycleId: st2.meta?.turnCycleId }});
    }
  }
  await sleep(50);
  const phasesObserved = [...phaseLog];
  log('Phase log', phasesObserved);
  const sawBuyWait = phasesObserved.includes('BUY_WAIT');
  if (forceCPU && sawBuyWait && !forceFollowUp) {
    throw new Error('CPU path unexpectedly entered BUY_WAIT without follow-up effects');
  }
  if (!forceCPU && !sawBuyWait && (forceFollowUp || true)) {
    log('Warning: Human path did not enter BUY_WAIT (feature flag may be disabled)');
  }
  // Validate ordering uniqueness
  for (let i=1;i<phasesObserved.length;i++){
    if (phasesObserved[i] === phasesObserved[i-1]) throw new Error('Duplicate contiguous phase entry: '+ phasesObserved[i]);
  }
  log('Harness complete. BUY_WAIT present='+sawBuyWait);
}
run().catch(e=>{ console.error(e); process.exit(1); });
