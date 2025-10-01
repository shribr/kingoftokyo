#!/usr/bin/env node
/*
 * Deterministic smoke test
 * Verifies dice + AI decision reproducibility across two fresh game initializations.
 * This is a lightweight harness; it simulates just enough state to call the AI engine.
 */

import { AIDecisionEngine } from '../src/ai/engine/AIDecisionEngine.js';
import { combineSeed, createSeededRNG } from '../src/core/rng.js';

if (!process.env.KOT_TEST_MODE && !global.window?.__KOT_TEST_MODE__) {
  console.log('Enabling deterministic mode for smoke via env flag.');
  process.env.KOT_TEST_MODE = '1';
}

function mockGameState(turnCycleId){
  return {
    meta:{ turnCycleId },
    turnCycleId, // fallback
    players:[
      { id:1, victoryPoints:5, health:8, maxHealth:10, energy:2, isEliminated:false, isInTokyo:false, monster:{ personality:{ aggression:3, risk:3, strategy:3 } }, powerCards:[] },
      { id:2, victoryPoints:4, health:9, maxHealth:10, energy:3, isEliminated:false, isInTokyo:true, monster:{ personality:{ aggression:3, risk:3, strategy:3 } }, powerCards:[] }
    ],
    availablePowerCards:[]
  };
}

function simulateDice(turnCycleId, playerId){
  // Mirror dice seed derivation from turn service
  const seed = combineSeed('KOT_DICE', turnCycleId, 0, playerId);
  const rng = createSeededRNG(seed);
  const faces = ['one','two','three','attack','energy','heart'];
  const dice = [];
  for (let i=0;i<6;i++) dice.push(faces[Math.floor(rng()*faces.length)]);
  return { dice, seed };
}

function runSession(){
  const engine = new AIDecisionEngine();
  const turnCycleId = 101;
  const gs = mockGameState(turnCycleId);
  const { dice } = simulateDice(turnCycleId, 1);
  const decision = engine.makeRollDecision(dice, 2, gs.players[0], gs);
  return { dice, decision };
}

function stableJson(obj){
  return JSON.stringify(obj, Object.keys(obj).sort());
}

const a = runSession();
const b = runSession();

const diceMatch = stableJson(a.dice) === stableJson(b.dice);
const decisionMatch = stableJson(a.decision) === stableJson(b.decision);

console.log('Deterministic Smoke Results');
console.log('Dice A:', a.dice.join(','));
console.log('Dice B:', b.dice.join(','));
console.log('Decision A deterministic meta:', a.decision.deterministic);
console.log('Decision B deterministic meta:', b.decision.deterministic);
console.log('Dice match:', diceMatch);
console.log('Decision match:', decisionMatch);

if (!diceMatch || !decisionMatch){
  console.error('\n❌ Deterministic smoke test FAILED');
  process.exit(1);
} else {
  console.log('\n✅ Deterministic smoke test passed');
}
