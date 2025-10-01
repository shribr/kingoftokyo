/** tools/diceRollEventHarness.js
 * Purpose: Validate single dispatch of DICE_ROLL_RESOLVED with metadata and ordering vs AI decisions.
 * Usage: import and invoke runDiceRollEventHarness(storeFactory) in a dev console or test context.
 */
import { createStore, combineReducers } from '../src/core/store.js';
import { diceReducer } from '../src/core/reducers/dice.reducer.js';
import { playersReducer } from '../src/core/reducers/players.reducer.js';
import { metaReducer } from '../src/core/reducers/meta.reducer.js';
import { logReducer } from '../src/core/reducers/log.reducer.js';
import { yieldDecisionReducer } from '../src/core/reducers/yieldDecision.reducer.js';
import { settingsReducer } from '../src/core/reducers/settings.reducer.js';
import { phaseReducer } from '../src/core/reducers/phase.reducer.js';
import { createTurnService } from '../src/services/turnService.js';
import { bindAIDecisionCapture } from '../src/services/aiDecisionService.js';
import { DICE_ROLL_RESOLVED } from '../src/core/actions.js';

export async function runDiceRollEventHarness(opts = {}) {
  const root = combineReducers({
    dice: diceReducer,
    players: playersReducer,
    meta: metaReducer,
    log: logReducer,
    yield: yieldDecisionReducer,
    settings: settingsReducer,
    phase: phaseReducer
  });
  const initial = {
    phase: 'SETUP',
    players: { order: ['p1'], byId: { p1: { id: 'p1', name: 'CPU-1', isCPU: true, status: { alive: true }, energy:0, health:10, victoryPoints:0, modifiers:{} } } },
    meta: { activePlayerIndex: 0, turnCycleId: 1 },
    dice: { faces: [], rerollsRemaining: 0, baseRerolls: 2, phase: 'idle', accepted: false },
    settings: { cpuTurnMode: 'controller', cpuSpeed: 'fast' },
    yield: { prompts: [] }
  };
  const store = createStore(root, initial);
  store.getState()._store = store; // allow aiDecisionService log dispatch fallback
  bindAIDecisionCapture(store);
  const logger = { system: (...a)=> console.log('[SYS]',...a), info:(...a)=>console.log('[INFO]',...a), warn:(...a)=>console.warn('[WARN]',...a) };
  const turn = createTurnService(store, logger);
  const resolvedEvents = [];
  store.subscribe((state, action) => {
    if (action.type === DICE_ROLL_RESOLVED) {
      resolvedEvents.push(action);
    }
  });
  turn.startTurn();
  // Allow CPU controller to run: wait ~5s maximum
  await new Promise(res => setTimeout(res, opts.timeoutMs || 5500));
  const finalState = store.getState();
  console.log('--- Dice Roll Event Harness Results ---');
  console.log('Resolved Event Count:', resolvedEvents.length);
  if (resolvedEvents[0]) {
    console.log('First Event Payload:', resolvedEvents[0].payload);
  }
  console.log('Dice Last Resolution Meta:', finalState.dice.lastResolution);
  if (resolvedEvents.length !== 1) {
    console.warn('Expected exactly 1 DICE_ROLL_RESOLVED event.');
  }
  return { resolvedEvents, lastResolution: finalState.dice.lastResolution };
}

if (typeof window !== 'undefined') {
  window.runDiceRollEventHarness = runDiceRollEventHarness;
}
