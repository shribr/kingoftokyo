import { createStore, combineReducers } from '../core/store.js';
import { phaseReducer } from '../core/reducers/phase.reducer.js';
import { logReducer } from '../core/reducers/log.reducer.js';
import { diceReducer } from '../core/reducers/dice.reducer.js';
import { logAppended, diceRollStarted, diceRolled, diceRerollUsed } from '../core/actions.js';
import { eventBus } from '../core/eventBus.js';
import { createPhaseEventsService } from '../services/phaseEventsService.js';
import { Phases } from '../core/phaseFSM.js';

function assert(condition, msg){ if(!condition) throw new Error(msg); }

export function testPhaseLogReroll() {
  const root = combineReducers({ phase: phaseReducer, log: logReducer, dice: diceReducer });
  const store = createStore(root, { phase: Phases.SETUP, log: { entries: [] }, dice: { faces: [], rerollsRemaining: 0, phase: 'idle' } });
  const svc = createPhaseEventsService(store, { system:()=>{}, debug:()=>{} });
  if (typeof window !== 'undefined') window.__KOT_NEW__ = { phaseEventsService: svc };
  eventBus.emit('ui/intent/gameStart');
  assert(store.getState().phase === Phases.ROLL, 'Phase should change to ROLL via intent');

  // Log append
  store.dispatch(logAppended({ id:1, ts:Date.now(), type:'info', message:'Test', meta:{} }));
  assert(store.getState().log.entries.length === 1, 'Log entry appended');

  // Dice first roll sets rerollsRemaining to 2
  store.dispatch(diceRollStarted());
  store.dispatch(diceRolled([{ face:'1', kept:false }]));
  let diceState = store.getState().dice;
  assert(diceState.rerollsRemaining === 2, 'First roll should initialize rerollsRemaining to 2');

  // Use a reroll
  store.dispatch(diceRollStarted());
  store.dispatch(diceRolled([{ face:'2', kept:false }]));
  store.dispatch(diceRerollUsed());
  diceState = store.getState().dice;
  assert(diceState.rerollsRemaining === 1, 'After one reroll remaining should be 1');

  // Final reroll
  store.dispatch(diceRollStarted());
  store.dispatch(diceRolled([{ face:'3', kept:false }]));
  store.dispatch(diceRerollUsed());
  diceState = store.getState().dice;
  assert(diceState.rerollsRemaining === 0, 'After final reroll remaining should be 0');
  assert(diceState.phase === 'sequence-complete', 'Dice phase should mark sequence complete');

  return 'phase_log_reroll tests passed';
}

// Auto-run when loaded via test harness
try { if (typeof window !== 'undefined') window.__TEST_RESULTS__.push(testPhaseLogReroll()); } catch(e) {}
