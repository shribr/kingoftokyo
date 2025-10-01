import { createStore, combineReducers } from '../core/store.js';
import { phaseReducer } from '../core/reducers/phase.reducer.js';
import { Phases } from '../core/phaseFSM.js';
import { createPhaseEventsService } from '../services/phaseEventsService.js';
import { bindUIEventAdapters } from '../ui/eventAdapters.js';
import { eventBus } from '../core/eventBus.js';
import { phaseChanged } from '../core/actions.js';

function assert(cond, msg){ if(!cond) throw new Error(msg); }

export function testEventAdapters(){
  const root = combineReducers({ phase: phaseReducer });
  const store = createStore(root, { phase: Phases.SETUP });
  // Patch a lightweight phaseEventsService onto window mock
  const logger = { system:()=>{}, debug:()=>{} };
  const svc = createPhaseEventsService(store, logger);
  if (typeof window !== 'undefined') {
    window.__KOT_NEW__ = { phaseEventsService: svc };
  }
  bindUIEventAdapters(store);
  // 1. GAME_START from SETUP -> ROLL
  eventBus.emit('ui/intent/gameStart');
  assert(store.getState().phase === Phases.ROLL, 'GAME_START should transition to ROLL');
  // Force to RESOLVE from ROLL via ROLL_COMPLETE
  eventBus.emit('ui/intent/finishRoll');
  assert(store.getState().phase === Phases.RESOLVE, 'finishRoll should transition ROLL->RESOLVE');
  // Simulate NEEDS_YIELD_DECISION event path by direct phaseChanged then adapter event
  store.dispatch(phaseChanged(Phases.YIELD_DECISION));
  eventBus.emit('ui/intent/yieldDecisionMade');
  assert(store.getState().phase === Phases.BUY, 'yieldDecisionMade should transition YIELD_DECISION->BUY');
  return 'event_adapters tests passed';
}

try { if (typeof window !== 'undefined') window.__TEST_RESULTS__.push(testEventAdapters()); } catch(e) {}
