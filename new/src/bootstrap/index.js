/** bootstrap/index.js */
import { createInitialState } from '../core/stateShape.js';
import { createStore, combineReducers } from '../core/store.js';
import { eventBus } from '../core/eventBus.js';
import { diceReducer } from '../core/reducers/dice.reducer.js';
import { playersReducer } from '../core/reducers/players.reducer.js';
import { mountRoot } from '../ui/mountRoot.js';
import { bindUIEventBridges } from '../ui/eventsToActions.js';
import { playerJoined, phaseChanged, uiSplashHide, uiMonsterSelectionClose, monstersLoaded, uiRollForFirstOpen } from '../core/actions.js';
import { phaseReducer } from '../core/reducers/phase.reducer.js';
import { logReducer } from '../core/reducers/log.reducer.js';
import { tokyoReducer } from '../core/reducers/tokyo.reducer.js';
import { cardsReducer } from '../core/reducers/cards.reducer.js';
import { uiReducer } from '../core/reducers/ui.reducer.js';
import { monstersReducer } from '../core/reducers/monsters.reducer.js';
import { effectQueueReducer } from '../core/reducers/effectQueue.reducer.js';
import { yieldDecisionReducer } from '../core/reducers/yieldDecision.reducer.js';
import { targetSelectionReducer } from '../core/reducers/targetSelection.reducer.js';
import { createPlayer } from '../domain/player.js';
import { createLogger } from '../services/logger.js';
import { initCards } from '../services/cardsService.js';
import { settingsReducer } from '../core/reducers/settings.reducer.js';
import { metaReducer } from '../core/reducers/meta.reducer.js';
import { createTurnService } from '../services/turnService.js';
import { createEffectEngine } from '../services/effectEngine.js';
import '../ui/devPanel.js';
import { bindA11yOverlays } from '../ui/a11yOverlays.js';
import { loadSettings, bindSettingsPersistence, loadLogCollapse } from '../services/settingsService.js';
import { bindAIDecisionCapture } from '../services/aiDecisionService.js';

// Placeholder reducers until implemented
function placeholderReducer(state = {}, _action) { return state; }

const baseReducer = combineReducers({
  players: playersReducer,
  dice: diceReducer,
  tokyo: tokyoReducer,
  cards: cardsReducer,
  phase: phaseReducer,
  log: logReducer,
  ui: uiReducer,
  ai: (s = {}) => s,
  meta: metaReducer,
  monsters: monstersReducer
  , effectQueue: effectQueueReducer
  , settings: settingsReducer
  , yield: yieldDecisionReducer
  , targetSelection: targetSelectionReducer
});

function rootReducer(state, action) {
  if (action.type === 'GAME_STATE_IMPORTED') {
    const snapshot = action.payload.snapshot;
    const current = state || createInitialState();
    // Replace only provided slices; keep others (like ui) untouched
    const merged = { ...current };
    Object.assign(merged, snapshot.slices || {});
    return baseReducer(merged, { type: '@@PERSIST/HYDRATED' });
  }
  return baseReducer(state, action);
}

export const store = createStore(rootReducer, createInitialState());
export const logger = createLogger(store);

// Example diagnostic wiring
if (typeof window !== 'undefined') {
  const turnService = createTurnService(store, logger);
  const effectEngine = createEffectEngine(store, logger);
  window.__KOT_NEW__ = { store, eventBus, logger, turnService, effectEngine };
  // Provide logger reference for AI utilities lacking direct injection
  store._logger = logger;
  eventBus.emit('bootstrap/ready', {});
  // Load persisted settings before UI mounts
  loadSettings(store);
  loadLogCollapse(store);
  bindSettingsPersistence(store);
  bindAIDecisionCapture(store);
  bindUIEventBridges(store);
  bindA11yOverlays(store);
  // Determine skipIntro first so we know whether to auto-seed dev players.
  const skipIntro = (() => {
    try {
      const w = window.location;
      return w.hash.includes('skipintro') || w.search.includes('skipintro=1') || localStorage.getItem('KOT_SKIP_INTRO') === '1';
    } catch(_) { return false; }
  })();

  // Load monsters first; only seed random players if skipIntro (dev convenience). Otherwise rely on actual setup selections.
  fetch('./config.json').then(r => r.json()).then(cfg => {
    const monsters = Object.values(cfg.monsters || {}).map(m => ({ id: m.id, name: m.name, image: m.image, description: m.description, personality: m.personality || {}, color: m.color }));
    store.dispatch(monstersLoaded(monsters));
    if (skipIntro) {
      const st = store.getState();
      if (st.settings?.autoStartInTest) {
        if (!st.players.order.length) {
          seedRandomPlayers(store, monsters, logger);
        }
        const seeded = store.getState().players.order.length;
        if (!seeded) console.warn('[bootstrap] skipIntro active but players failed to seed (monsters likely empty or images missing).');
      } else {
        logger.system('Skip intro detected but autoStartInTest=false: UI only mode. (No players will auto-seed)');
      }
    }
  }).catch(() => {
    const fallback = [
      { id: 'king', name: 'The King', image: '', description: 'A mighty ape', personality: { aggression: 5, strategy: 2, risk: 3, economic: 2 }, color: '#444' },
      { id: 'alien', name: 'Alienoid', image: '', description: 'A mysterious alien', personality: { aggression: 3, strategy: 4, risk: 2, economic: 3 }, color: '#2aa' },
      { id: 'kraken', name: 'Kraken', image: '', description: 'Sea terror', personality: { aggression: 4, strategy: 3, risk: 3, economic: 2 }, color: '#2277aa' }
    ];
    store.dispatch(monstersLoaded(fallback));
    if (skipIntro) {
      const st = store.getState();
      if (st.settings?.autoStartInTest) {
        if (!st.players.order.length) seedRandomPlayers(store, fallback, logger);
        const seeded = store.getState().players.order.length;
        if (!seeded) console.warn('[bootstrap] skipIntro active (fallback) but players failed to seed.');
      } else {
        logger.system('Skip intro detected (fallback monsters) but autoStartInTest=false: UI only mode. (No players will auto-seed)');
      }
    }
  });
  initCards(store, logger);
  // Revised start logic: Do NOT auto-start when splash hides.
  // Start only after setup screen has been opened at least once and then closed.
  let prevSetupOpen = store.getState().ui?.setup?.open;
  let setupWasOpened = false;

  // Dev convenience: skipping intro will auto-seed players (logic moved earlier).

  if (skipIntro) {
    // Mark setup as having been opened (bypasses normal open->close detection) and hide splash immediately.
    const st = store.getState();
    if (st.settings?.autoStartInTest) {
      setupWasOpened = true;
      store.dispatch(uiSplashHide());
  store.dispatch(uiMonsterSelectionClose());
      setTimeout(() => {
        try { turnService.startGameIfNeeded(); } catch(e) { console.warn('Skip intro start failed', e); }
      }, 0);
    } else {
      // Just hide splash and keep setup considered NOT opened so game won't auto start.
      store.dispatch(uiSplashHide());
    }
  }

  store.subscribe(() => {
    const st = store.getState();
    const setupOpen = !!st.ui?.setup?.open;
    if (setupOpen && !setupWasOpened) setupWasOpened = true;
    const splashGone = st.ui?.splash?.visible === false;
    const rff = st.ui?.rollForFirst;
    // Debug traces for gating states
    if (typeof window !== 'undefined' && window.__KOT_DEBUG_RFF !== false) {
      if (!setupOpen && prevSetupOpen) {
        console.debug('[bootstrap] Setup just closed. setupWasOpened=%s splashGone=%s players=%d rff=%o phase=%s', setupWasOpened, splashGone, st.players.order.length, rff, st.phase);
      }
    }
    // When setup transitions from open -> closed after having been opened, and splash is gone, open Roll For First (once) if players exist and not resolved
    if (!setupOpen && prevSetupOpen && setupWasOpened && splashGone) {
      if (st.players.order.length > 0 && !(rff && (rff.open || rff.resolved))) {
        store.dispatch(uiRollForFirstOpen());
        ensurePostSplashBlackout();
      } else if (rff && rff.resolved) {
        // If already resolved (e.g., dev skip), then we can start game if still in SETUP
        if (st.phase === 'SETUP') turnService.startGameIfNeeded();
      }
    }
    // If roll-for-first just resolved (open false, resolved true) and phase still SETUP, start game.
    if (rff && rff.resolved && st.phase === 'SETUP') {
      turnService.startGameIfNeeded();
    }
    // When phase leaves SETUP (i.e., game actually starts) mark body active and fade out blackout
    if (st.phase !== 'SETUP' && !document.body.classList.contains('game-active')) {
      document.body.classList.add('game-active');
      const blk = document.querySelector('.post-splash-blackout');
      if (blk) { blk.classList.add('is-hidden'); setTimeout(()=>blk.remove(), 520); }
    }
    prevSetupOpen = setupOpen;
  });
  // Lightweight animation tagging for profile cards (Tokyo entry & resource gains)
  let prevPlayers = store.getState().players.byId;
  store.subscribe(()=>{
    const stNow = store.getState();
    const cur = stNow.players.byId;
    for (const id in cur) {
      const prev = prevPlayers[id];
      const now = cur[id];
      if (!now) continue;
      const cardEl = document.querySelector(`.cmp-player-profile-card[data-player-id="${id}"]`);
      if (!cardEl) continue;
      if (prev && !prev.inTokyo && now.inTokyo) {
        cardEl.setAttribute('data-entered-tokyo','1');
        setTimeout(()=>cardEl.removeAttribute('data-entered-tokyo'),1400);
      }
      if (prev) {
        if (now.vp > prev.vp) {
          cardEl.setAttribute('data-vp-gain','1');
          setTimeout(()=>cardEl.removeAttribute('data-vp-gain'),1000);
        }
        if (now.energy > prev.energy) {
          cardEl.setAttribute('data-energy-gain','1');
          setTimeout(()=>cardEl.removeAttribute('data-energy-gain'),1000);
        }
        if (now.health > prev.health) {
          cardEl.setAttribute('data-health-gain','1');
          setTimeout(()=>cardEl.removeAttribute('data-health-gain'),1000);
        }
      }
    }
    prevPlayers = cur;
  });
  // Load component config dynamically
  fetch('./components.config.json')
    .then(r => r.json())
    .then(cfg => mountRoot(cfg, store));
}

function seedRandomPlayers(store, monsters, logger) {
  try {
    if (!Array.isArray(monsters) || monsters.length === 0) return;
  // We want 6 sample players in skipIntro mode (full deck visibility request).
  const TARGET = 6;
    const pool = monsters.slice();
    const pick = () => {
      if (pool.length) return pool.splice(Math.floor(Math.random()*pool.length),1)[0];
      // If fewer than 4 monsters exist, allow reuse
      return monsters[Math.floor(Math.random()*monsters.length)];
    };
    const picked = [];
    for (let i=1;i<=TARGET;i++) {
      const m = pick();
      picked.push(m);
      store.dispatch(playerJoined(createPlayer({ id: 'p'+i, name: m.name, monsterId: m.id })));
    }
    logger.system(`Players seeded (skipIntro) with monsters: ${picked.map(p=>p.id).join(', ')}`);
  } catch(e) {
    logger.warn('Random player seeding failed, falling back to static set', e);
    const fallback = ['king','alien','kraken','meka'];
    fallback.forEach((monId, idx) => {
      store.dispatch(playerJoined(createPlayer({ id: 'p'+(idx+1), name: monId, monsterId: monId })));
    });
  }
}

function ensurePostSplashBlackout() {
  if (document.querySelector('.post-splash-blackout')) return;
  const div = document.createElement('div');
  div.className = 'post-splash-blackout';
  document.body.appendChild(div);
}
