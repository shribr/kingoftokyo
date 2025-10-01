#!/usr/bin/env node
/** phaseTimingHarness.js
 * Simulates a minimal turn including a purchase that triggers BUY_WAIT to emit phase timing spans.
 * Run: node tools/phaseTimingHarness.js
 */
import { store } from '../src/bootstrap/index.js';
import { diceRolled, diceRollResolved } from '../src/core/actions.js';
import { Phases } from '../src/core/phaseFSM.js';
import { resolveDice } from '../src/services/resolutionService.js';
import { purchaseCard } from '../src/services/cardsService.js';

function logPhase(label){
  console.log(`[HARNESS] Phase=${store.getState().phase} :: ${label}`);
}

async function run(){
  console.log('[HARNESS] Starting phase timing harness');
  // Force start turn state
  try {
    if (typeof window !== 'undefined' && window.__KOT_NEW__?.phaseEventsService) {
      window.__KOT_NEW__.phaseEventsService.publish('GAME_START');
    } else {
      store.dispatch({ type:'PHASE_TRANSITION', payload:{ from: store.getState().phase, to: Phases.ROLL, ts: Date.now(), reason:'harness_force', turnCycleId: store.getState().meta?.turnCycleId } });
    }
  } catch(_) {}
  logPhase('after force ROLL');
  // Provide dice faces to resolve
  store.dispatch(diceRolled(['claw','1','2','3','energy','heart'].map(v=>({ value:v, kept:false }))));
  store.dispatch(diceRollResolved());
  resolveDice(store, console);
  logPhase('post resolveDice');
  // Move to BUY
  try {
    if (typeof window !== 'undefined' && window.__KOT_NEW__?.phaseEventsService) {
      window.__KOT_NEW__.phaseEventsService.publish('RESOLUTION_COMPLETE');
    } else {
      store.dispatch({ type:'PHASE_TRANSITION', payload:{ from: store.getState().phase, to: Phases.BUY, ts: Date.now(), reason:'harness_force', turnCycleId: store.getState().meta?.turnCycleId } });
    }
  } catch(_) {}
  logPhase('enter BUY');
  // Attempt a purchase (first affordable card)
  const st = store.getState();
  const playerId = st.players.order[0];
  const affordable = st.cards.shop.find(c => st.players.byId[playerId].energy >= c.cost);
  if (affordable){
    purchaseCard(store, console, playerId, affordable.id);
    logPhase('after purchase');
  }
  setTimeout(()=>{
    const spans = store.getState().meta?.phaseSpans;
    console.log('[HARNESS] phaseSpans snapshot:', spans);
    process.exit(0);
  }, 200);
}
run().catch(e=>{ console.error(e); process.exit(1); });
