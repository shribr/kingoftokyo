#!/usr/bin/env node
/** yieldFlowHarness.js
 * Lightweight harness to simulate a combat scenario that triggers Tokyo yield prompts.
 * Usage: node tools/yieldFlowHarness.js
 */
import { store } from '../src/bootstrap/index.js';
import { phaseChanged, diceRolled, diceRollResolved } from '../src/core/actions.js';
import { Phases } from '../src/core/phaseFSM.js';

function logPrompts(stage){
  const st = store.getState();
  const prompts = st.yield?.prompts || [];
  console.log(`[HARNESS] ${stage} prompts=`, prompts.map(p=>({d:p.defenderId,dec:p.decision,adv:p.advisory?.suggestion})));
}

function setupPlayers(){
  // Assumes bootstrap created players; adjust HP to force advisory differences
  const st = store.getState();
  const ids = st.players.order;
  if (ids.length < 2) throw new Error('Need at least 2 players for harness');
  // Put first player outside Tokyo, second inside
  const attackerId = ids[0];
  const defenderId = ids[1];
  // Manually mark defender in Tokyo City if not already
  const defender = st.players.byId[defenderId];
  if (!defender.inTokyo){
    store.dispatch({ type:'PLAYER_ENTERED_TOKYO', payload:{ playerId:defenderId }});
    store.dispatch({ type:'TOKYO_OCCUPANT_SET', payload:{ playerId:defenderId, playerCount: ids.length }});
  }
  return { attackerId, defenderId };
}

async function run(){
  console.log('[HARNESS] Starting yield flow harness');
  // Force phase to RESOLVE path
  store.dispatch(phaseChanged(Phases.RESOLVE));
  const { attackerId } = setupPlayers();
  // Inject dice roll with at least one claw to trigger damage
  store.dispatch(diceRolled(['claw','heart','1','2','3','claw'].map(v => ({ value:v, kept:false }))));
  // Mark dice resolved to mimic end of roll phase
  store.dispatch(diceRollResolved());
  // Call resolution logic (dynamic import to avoid circular early load)
  const { resolveDice } = await import('../src/services/resolutionService.js');
  resolveDice(store, console);
  logPrompts('after resolveDice');
  // Wait 100ms to allow any immediate AI auto-yield decisions
  await new Promise(r=>setTimeout(r,120));
  logPrompts('post immediate');
}
run().catch(e=>{ console.error(e); process.exit(1); });
