#!/usr/bin/env node
/**
 * deterministicDecisionHarness.js
 * Runs multiple AI decision simulations for the same dice/state under deterministic mode
 * and asserts stable outputs (keepDice, action, seed).
 */
import { AIDecisionEngine } from '../src/ai/engine/AIDecisionEngine.js';
import { isDeterministicMode } from '../src/core/rng.js';
import { eventBus } from '../src/core/eventBus.js';

// Force test mode via env if not already set (Node context)
if (!isDeterministicMode()) {
  process.env.KOT_TEST_MODE = '1';
}

function fakePlayer(id=1){
  return { id, health:8, maxHealth:10, energy:3, victoryPoints:6, isInTokyo:false, monster:{ personality:{ aggression:3, risk:3, strategy:3 } } };
}
function fakeGameState(player){
  return { meta:{ turnCycleId:42 }, players:[ player, { id:2, health:10, maxHealth:10, energy:2, victoryPoints:9, isInTokyo:true, isEliminated:false } ], availablePowerCards:[] };
}

function runTrials(iterations=5){
  const engine=new AIDecisionEngine();
  const diceFaces=['one','one','two','attack','energy','heart'];
  const player=fakePlayer(1);
  const game=fakeGameState(player);
  const rollsRemaining=2;
  const outputs=[];
  for (let i=0;i<iterations;i++){
    const decision=engine.makeRollDecision(diceFaces, rollsRemaining, player, game);
    outputs.push({ action:decision.action, keepDice:decision.keepDice.slice(), seed:decision.deterministic?.seed, trials:decision.deterministic?.trials, decisionIndex:decision.deterministic?.decisionIndex });
  }
  return outputs;
}

function assertStable(out){
  const first=JSON.stringify(out[0]);
  for (let i=1;i<out.length;i++){
    const cur=JSON.stringify(out[i]);
    if (cur!==first){
      console.error('[deterministicDecisionHarness] MISMATCH at run', i, '\nExpected:', first, '\nGot     :', cur);
      try { eventBus.emit('ai.determinism.diff', { runIndex:i, expected:JSON.parse(first), got:JSON.parse(cur) }); } catch(_){}
      process.exitCode=1;
      return;
    }
  }
  console.log('[deterministicDecisionHarness] All', out.length, 'runs stable. Seed:', out[0].seed, 'trials:', out[0].trials);
}

const results=runTrials(8);
assertStable(results);
