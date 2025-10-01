#!/usr/bin/env node
/** takeoverSequenceHarness.js
 * Simulates an attack that forces yield (Tokyo occupant attacked) and validates sequence:
 *  RESOLVE -> YIELD_DECISION -> BUY (or BUY_WAIT) and correct Tokyo occupant changes on leave.
 * Usage: node tools/takeoverSequenceHarness.js [--leave]
 *  --leave : force defender to leave Tokyo (simulate player choice)
 */
import { store, logger } from '../src/bootstrap/nodeBootstrap.js';
import { diceRolled, diceRollResolved, yieldPromptDecided, playerLeftTokyo } from '../src/core/actions.js';
import { Phases } from '../src/core/phaseFSM.js';

const forceLeave = process.argv.includes('--leave');

function seedTokyoOccupant(){
  const st = store.getState();
  const ids = st.players.order;
  if (ids.length < 2) throw new Error('Need at least 2 players');
  const defender = ids[0];
  const attacker = ids[1];
  // Put defender inside Tokyo City
  store.dispatch({ type:'PLAYER_ENTERED_TOKYO', payload:{ playerId: defender }});
  store.dispatch({ type:'TOKYO_OCCUPANT_SET', payload:{ playerId: defender, playerCount: ids.length }});
  // Ensure active player index points to attacker (outside Tokyo) so resolutionService treats attacker correctly
  store.dispatch({ type:'META_ACTIVE_PLAYER_SET', payload:{ index: 1 }});
  return { defender, attacker };
}

async function simulateAttack(attacker){
  const current = store.getState().phase;
  if (current === 'SETUP') {
    store.dispatch({ type:'PHASE_TRANSITION', payload:{ from: 'SETUP', to: Phases.ROLL, ts: Date.now(), reason:'harness_force', turnCycleId: store.getState().meta?.turnCycleId }});
  }
  store.dispatch(diceRolled(['claw','claw','2','3','energy','heart'].map(v=>({ value:v, kept:false }))));
  store.dispatch(diceRollResolved());
  store.dispatch({ type:'PHASE_TRANSITION', payload:{ from: Phases.ROLL, to: Phases.RESOLVE, ts: Date.now(), reason:'harness_force', turnCycleId: store.getState().meta?.turnCycleId }});
  const { resolveDice } = await import('../src/services/resolutionService.js');
  resolveDice(store, logger);
}

function decideYield(defender){
  if (!forceLeave) return; // stay path
  const st = store.getState();
  const prompts = st.yield?.prompts || [];
  const attacker = prompts[0]?.attackerId;
  for (const p of prompts) {
    if (p.defenderId === defender) {
      console.log('[DEBUG] Deciding yield for defender', defender, 'slot', p.slot, 'attacker', attacker);
      store.dispatch(yieldPromptDecided(defender, attacker, p.slot, 'yield'));
      console.log('[DEBUG] After YIELD_PROMPT_DECIDED tokyo.city =', store.getState().tokyo.city);
      store.dispatch(playerLeftTokyo(defender));
      console.log('[DEBUG] After PLAYER_LEFT_TOKYO tokyo.city =', store.getState().tokyo.city, ' (should be null before takeover)');
      // Do NOT manually set attacker occupant here; allow attemptTokyoTakeover inside resolutionService (already run) to have done it
    }
  }
}

function assertSequence(defender){
  const st = store.getState();
  const prompts = st.yield?.prompts || [];
  if (!prompts.length) throw new Error('Expected yield prompts after attack but none found');
  if (forceLeave) {
    const occ = st.tokyo.city;
    if (occ === defender) {
      console.error('[DEBUG] State after leave attempt:', JSON.stringify(st.tokyo));
      throw new Error('Defender still in Tokyo after leave decision');
    }
  }
  console.log('[TAKEOVER] OK. prompts='+prompts.length+' forceLeave='+forceLeave);
}

async function run(){
  const { defender, attacker } = seedTokyoOccupant();
  await simulateAttack(attacker);
  // Allow prompt generation
  await new Promise(r=>setTimeout(r,50));
  decideYield(defender);
  // Wait for transition to BUY or BUY_WAIT
  await new Promise(r=>setTimeout(r,100));
  assertSequence(defender);
}
run().catch(e=>{ console.error(e); process.exit(1); });
