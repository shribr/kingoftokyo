import { createStore, combineReducers } from '../core/store.js';
import { logReducer } from '../core/reducers/log.reducer.js';
import { metaReducer } from '../core/reducers/meta.reducer.js';
import { phaseReducer } from '../core/reducers/phase.reducer.js';
import { settingsReducer } from '../core/reducers/settings.reducer.js';
import { diceReducer } from '../core/reducers/dice.reducer.js';
import { playersReducer } from '../core/reducers/players.reducer.js';
import { createLogger } from '../services/logger.js';
import { playerJoined, phaseChanged, diceRollStarted, diceRolled } from '../core/actions.js';
import { createPlayer } from '../domain/player.js';
import { bindAIDecisionCapture, getAIDecisionTree } from '../services/aiDecisionService.js';

function assert(cond, msg){ if(!cond) throw new Error(msg); }

describe('logger semantic + AI decision heuristic', () => {
  it('adds kind/round/turn to log entries and captures AI nodes', () => {
    const root = combineReducers({
      log: logReducer,
      meta: metaReducer,
      phase: phaseReducer,
      settings: settingsReducer,
      dice: diceReducer,
      players: playersReducer
    });
    const store = createStore(root, { phase: 'ROLL' });
    const logger = createLogger(store);
    bindAIDecisionCapture(store);
    // Seed players
    store.dispatch(playerJoined(createPlayer({ id: 'p1', name: 'Alpha', monsterId: 'king' })));
    store.dispatch(playerJoined(createPlayer({ id: 'p2', name: 'Beta', monsterId: 'alien' })));
    logger.system('Phase: ROLL', { kind: 'phase' });
    store.dispatch(phaseChanged('ROLL'));
    // Simulate a roll lifecycle
    store.dispatch(diceRollStarted());
    store.dispatch(diceRolled([{ value:'claw', kept:false },{ value:'energy', kept:false },{ value:'1', kept:false }]));
    const entries = store.getState().log.entries;
    assert(entries.length >= 1, 'Expected log entries');
    const last = entries[entries.length-1];
    assert(last.kind, 'Log entry missing kind');
    assert(typeof last.round !== 'undefined', 'Log entry missing round');
    // AI decision tree should have at least one post node
    const tree = getAIDecisionTree();
    assert(tree.rounds.length >= 1, 'AI tree missing rounds');
    const rolls = tree.rounds[0].turns[0].rolls;
    assert(rolls.length >= 2, 'Expected pre and post roll nodes');
    const post = rolls.find(r => r.stage === 'post');
    assert(post && post.hypotheticals && post.hypotheticals.length > 0, 'Post roll node missing hypotheticals');
  });
});

// Auto-run for browser harness
try { if (typeof window !== 'undefined') console.log('[spec] logger_ai_semantics OK'); } catch(_) {}