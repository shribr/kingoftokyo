#!/usr/bin/env node
/** deterministicYieldHarness.js
 * Validates deterministic AI yield decisions and single resolution emission for all-AI scenarios.
 * Preconditions: Unified yield backend active; deterministic mode flag optional for reproducibility.
 */
import { store } from '../src/bootstrap/index.js';
import { diceRolled, diceRollResolved } from '../src/core/actions.js';
import { resolveDice } from '../src/services/resolutionService.js';
import { eventBus } from '../src/core/eventBus.js';

if (!process.env.KOT_TEST_MODE) process.env.KOT_TEST_MODE = '1';

function forceTokyoOccupant(secondId){
  const st = store.getState();
  const p = st.players.byId[secondId];
  if (!p.inTokyo){
    store.dispatch({ type:'PLAYER_ENTERED_TOKYO', payload:{ playerId:secondId }});
    store.dispatch({ type:'TOKYO_OCCUPANT_SET', payload:{ playerId:secondId, playerCount: st.players.order.length }});
  }
}

async function runTrial(trial){
  const st = store.getState();
  const ids = st.players.order.slice();
  if (ids.length < 2) throw new Error('Need at least 2 players');
  const attackerId = ids[0];
  const defenderId = ids[1];
  forceTokyoOccupant(defenderId);

  const decisions=[]; const flows=[]; let allResolved=0; let promptsCreated=0;
  eventBus.on('yield.prompts.created', p=>{ promptsCreated++; flows.push({ type:'created', p }); });
  eventBus.on('ai.yield.decision', d=>{ decisions.push(d); });
  eventBus.on('yield.flow.complete', d=>{ allResolved++; flows.push({ type:'complete', d }); });

  // Inject dice with claws to trigger damage → yield
  store.dispatch(diceRolled(['claw','heart','1','2','3','claw'].map(v=>({ value:v, kept:false }))));
  store.dispatch(diceRollResolved());
  resolveDice(store, console);
  // Small async buffer (though AI path should be synchronous now)
  await new Promise(r=>setTimeout(r,30));

  return { trial, promptsCreated, decisions, allResolved, flows };
}

async function main(){
  const results=[];
  for (let i=0;i<5;i++) results.push(await runTrial(i));
  // Assert reproducibility of AI decisions (same count + same decision ordering)
  const signature = r => r.decisions.map(d=>`${d.defenderId}:${d.slot}:${d.decision}:${d.seed}`).join('|');
  const sig0 = signature(results[0]);
  for (let i=1;i<results.length;i++){
    if (signature(results[i]) !== sig0){
      console.error('[HARNESS] Deterministic yield decision mismatch', { expected:sig0, got: signature(results[i]), trial:i });
      process.exit(1);
    }
  }
  // Assert single complete flow per trial in all-AI scenario
  const invalid = results.find(r => r.allResolved !== 1);
  if (invalid){
    console.error('[HARNESS] Invalid flow resolution count', invalid);
    process.exit(1);
  }
  console.log('[HARNESS] Deterministic Yield Harness PASS', { signature: sig0, trials: results.length });
}
main().catch(e=>{ console.error(e); process.exit(1); });
