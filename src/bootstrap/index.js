/** bootstrap/index.js */
import { createInitialState } from '../core/stateShape.js';
import { createStore, combineReducers } from '../core/store.js';
import { eventBus } from '../core/eventBus.js';
import { diceReducer } from '../core/reducers/dice.reducer.js';
import { playersReducer } from '../core/reducers/players.reducer.js';
import { mountRoot } from '../ui/mountRoot.js';
import { bindUIEventBridges } from '../ui/eventsToActions.js';
import { bindUIEventAdapters } from '../ui/eventAdapters.js';
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
import { gameReducer } from '../core/reducers/game.reducer.js';
import { createPlayer } from '../domain/player.js';
import { createLogger } from '../services/logger.js';
import { initCards, refillShop } from '../services/cardsService.js';
import { settingsReducer } from '../core/reducers/settings.reducer.js';
import { metaReducer } from '../core/reducers/meta.reducer.js';
import { createTurnService } from '../services/turnService.js';
import { createPhaseEventsService } from '../services/phaseEventsService.js';
import { createEffectEngine } from '../services/effectEngine.js';
import '../ui/devPanel.js';
import { bindA11yOverlays } from '../ui/a11yOverlays.js';
import { loadSettings, bindSettingsPersistence, loadLogCollapse } from '../services/settingsService.js';
import { bindAIDecisionCapture } from '../services/aiDecisionService.js';
import { initializeEnhancedIntegration } from '../utils/enhanced-integration.js';
import '../ui/metricsPanel.js';
import '../ui/components/buyWaitStatus.js';
import { applyScenarios, captureScenarioState } from '../services/scenarioService.js';
import { getScenario } from '../scenarios/catalog.js';
import { SCENARIO_APPLY_REQUEST } from '../core/actions.js';
import { bindTokyoEntryAnimation } from '../services/tokyoEntryAnimationService.js';
import { createYieldModal } from '../ui/components/YieldModal.js';
import { mountEndBuyButton } from '../ui/components/EndBuyButton.js';

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
  , game: gameReducer
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
  try { console.log('[bootstrap] initialization begin'); } catch(_) {}
  // Global diagnostics for silent errors halting execution before gating dispatches
  window.addEventListener('error', (e)=>{ try { console.error('[global-error]', e.message, e.filename, e.lineno+':'+e.colno); } catch(_) {} });
  window.addEventListener('unhandledrejection', (e)=>{ try { console.error('[global-unhandled-rejection]', e.reason); } catch(_) {} });
  const turnService = createTurnService(store, logger);
  const effectEngine = createEffectEngine(store, logger);
  const phaseEventsService = createPhaseEventsService(store, logger);
  window.__KOT_NEW__ = { store, eventBus, logger, turnService, effectEngine, phaseEventsService };
  // Provide logger reference for AI utilities lacking direct injection
  store._logger = logger;
  eventBus.emit('bootstrap/ready', {});
  // Hard failsafe timers (3s & 6s) to guarantee game start in pathological stalls
  try {
    setTimeout(()=>{
      try {
        const st = store.getState();
        if (st.phase === 'SETUP') {
          console.warn('[failsafe] 3s elapsed in SETUP; forcing startGameIfNeeded');
          window.__KOT_NEW__?.turnService?.startGameIfNeeded?.();
        }
      } catch(e) { console.warn('[failsafe] 3s handler error', e); }
    }, 3000);
    setTimeout(()=>{
      try {
        const st = store.getState();
        if (st.phase === 'SETUP') {
          console.warn('[failsafe] 6s elapsed still in SETUP; forcing PHASE_TRANSITION and manual startTurn');
          store.dispatch({ type:'PHASE_TRANSITION', payload:{ from:'SETUP', to:'ROLL', reason:'failsafe_6s', ts: Date.now() }});
          const ts = window.__KOT_NEW__?.turnService;
          if (ts && typeof ts.startTurn === 'function') {
            try { ts.startTurn(); } catch(e2){ console.error('[failsafe] direct startTurn error', e2); }
          } else {
            console.error('[failsafe] turnService.startTurn missing');
          }
        }
      } catch(e) { console.warn('[failsafe] 6s handler error', e); }
    }, 6000);
  } catch(_) {}
  // Load persisted settings before UI mounts
  loadSettings(store);
  loadLogCollapse(store);
  bindSettingsPersistence(store);
  bindAIDecisionCapture(store);
  bindUIEventBridges(store);
  bindUIEventAdapters(store);
  bindA11yOverlays(store);
  // Tokyo entry animation binding (visual only)
  try { bindTokyoEntryAnimation(store, logger); } catch(e) { console.warn('tokyoEntryAnimation bind failed', e); }
  
  // Initialize enhanced UI integration (unified modals, dialogs, themes)
  initializeEnhancedIntegration(store);
  // Responsive: force side panels to overlay and auto-collapse on small screens/touch to avoid wrapping
  try {
    const applyOverlayMode = () => {
      const isTouch = matchMedia('(pointer: coarse)').matches;
      const narrow = window.innerWidth <= 1100; // matches CSS breakpoint
      const enable = isTouch || narrow;
      document.body.toggleAttribute('data-panels-force-overlay', enable);
      // Auto-collapse both panels when enabling overlay; keep user state otherwise
      const left = document.querySelector('.cmp-side-panel[data-side="left"]');
      const right = document.querySelector('.cmp-side-panel[data-side="right"]');
      if (enable) {
        if (left && left.getAttribute('data-collapsed') !== 'true') left.setAttribute('data-collapsed','true');
        if (right && right.getAttribute('data-collapsed') !== 'true') right.setAttribute('data-collapsed','true');
      }
    };
    applyOverlayMode();
    window.addEventListener('resize', applyOverlayMode);
  } catch(_) {}
  // Determine skipIntro first so we know whether to auto-seed dev players.
  const skipIntro = (() => {
    try {
      const w = window.location;
      return w.hash.includes('skipintro') || w.search.includes('skipintro=1') || localStorage.getItem('KOT_SKIP_INTRO') === '1';
    } catch(_) { return false; }
  })();

  // Load monsters first; if skipIntro, unconditionally auto-seed players and bypass selection/RFF.
  fetch('./config/config.json').then(r => r.json()).then(cfg => {
    let monsters = Object.values(cfg.monsters || {}).map(m => ({ id: m.id, name: m.name, image: m.image, description: m.description, personality: m.personality || {}, color: m.color }));
    if (!monsters.length) {
      console.warn('[bootstrap] config.json contained no monsters; using internal default set.');
      monsters = [
        { id: 'the_king', name: 'The King', image: 'images/characters/king_of_tokyo_the_king.png', description: 'A mighty ape unleashing chaos.', personality: { aggression:5, strategy:2, risk:3, economic:2 }, color: '#c49b3a' },
        { id: 'alienoid', name: 'Alienoid', image: 'images/characters/king_of_tokyo_alienoid.png', description: 'A mysterious being from the stars.', personality: { aggression:3, strategy:4, risk:2, economic:3 }, color: '#6ac2d8' },
        { id: 'kraken', name: 'Kraken', image: 'images/characters/king_of_tokyo_kraken.png', description: 'Terror from the deep seas.', personality: { aggression:4, strategy:3, risk:3, economic:2 }, color: '#2e8cba' }
      ];
    }
    store.dispatch(monstersLoaded(monsters));
    if (skipIntro) {
      const st = store.getState();
      if (!st.players.order.length) {
        seedRandomPlayers(store, monsters, logger);
        try { window.__KOT_BOOT_READY = true; } catch(_) {}
        // Immediate start attempt post-seed
        try { window.__KOT_NEW__?.turnService?.startGameIfNeeded?.(); } catch(e) { console.warn('[post-seed] startGameIfNeeded error', e); }
      }
      const seeded = store.getState().players.order.length;
      if (!seeded) console.warn('[bootstrap] skipIntro active but players failed to seed (monsters likely empty or images missing).');
      // Ensure power card shop populated (user report: empty shop when skipping intro)
      try {
        const afterSeed = store.getState();
        if (afterSeed.cards && Array.isArray(afterSeed.cards.shop) && afterSeed.cards.shop.length === 0) {
          refillShop(store, logger);
          logger.system('Refilled empty power card shop post skipIntro seeding.');
        }
      } catch(e) { console.warn('Shop refill guard failed', e); }
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
      if (!st.players.order.length) seedRandomPlayers(store, fallback, logger);
      try { window.__KOT_BOOT_READY = true; } catch(_) {}
  try { window.__KOT_NEW__?.turnService?.startGameIfNeeded?.(); } catch(e) { console.warn('[post-seed-fallback] startGameIfNeeded error', e); }
      const seeded = store.getState().players.order.length;
      if (!seeded) console.warn('[bootstrap] skipIntro active (fallback) but players failed to seed.');
      // Fallback path: also ensure shop populated
      try {
        const afterSeed = store.getState();
        if (afterSeed.cards && Array.isArray(afterSeed.cards.shop) && afterSeed.cards.shop.length === 0) {
          refillShop(store, logger);
          logger.system('Refilled empty power card shop post skipIntro fallback seeding.');
        }
      } catch(e) { console.warn('Shop refill guard (fallback) failed', e); }
    }
  });
  initCards(store, logger);
  // Start only after setup screen has been opened at least once and then closed.
  // Monster selection gating
  let prevSelectionOpen = store.getState().ui?.monsterSelection?.open;
  let selectionWasOpened = false;

  // Dev convenience: skipping intro will auto-seed players (logic moved earlier).

  if (skipIntro) {
    // Hide splash and bypass selection/RFF entirely; start game ASAP.
    selectionWasOpened = true;
    store.dispatch(uiSplashHide());
    store.dispatch(uiMonsterSelectionClose());
    // Ensure blackout added then removed when phase transitions
    ensurePostSplashBlackout();
    setTimeout(() => {
      try { turnService.startGameIfNeeded(); } catch(e) { console.warn('Skip intro start failed', e); }
      // Immediate UI activation fallback (skipIntro path bypasses RFF finalize hooks)
      try {
        if (!document.body.classList.contains('game-active')) {
          document.body.classList.add('game-active');
        }
        window.__KOT_GAME_STARTED = true;
        const blk = document.querySelector('.post-splash-blackout');
        if (blk) { blk.classList.add('is-hidden'); setTimeout(()=>{ try { blk.remove(); } catch(_){} }, 320); }
      } catch(_) {}
      try {
        // If scenario config present, apply after game started
        const stNow = store.getState();
        const pre = stNow.settings?.scenarioConfig?.assignments;
        if (pre && pre.length) {
          const appliedList = resolveScenarioDynamicTargets(store, pre);
          applyScenarios(store, { assignments: appliedList });
          showScenarioToast(appliedList);
        }
        // If this boot was triggered by the scenario generator, clear its transient flags so future reloads are clean
        try {
          if (localStorage.getItem('KOT_SCENARIO_GENERATOR') === '1') {
            localStorage.removeItem('KOT_SCENARIO_GENERATOR');
            // Remove skip intro only if it was not explicitly present in URL (so user param wins)
            const w = window.location;
            const explicit = w.hash.includes('skipintro') || w.search.includes('skipintro=1');
            if (!explicit) localStorage.removeItem('KOT_SKIP_INTRO');
          }
        } catch(_) {}
      } catch(e) { console.warn('Scenario pre-application failed', e); }
    }, 0);
  }

  store.subscribe(() => {
    const st = store.getState();
    const lastAction = store.getLastAction?.();
    if (lastAction && lastAction.type === SCENARIO_APPLY_REQUEST) {
      try { applyScenarios(store, { assignments: lastAction.payload.assignments }); } catch(e) { console.warn('Scenario apply failed', e); }
    }
  const selectionOpen = !!st.ui?.monsterSelection?.open;
    if (selectionOpen && !selectionWasOpened) selectionWasOpened = true;
    const splashGone = st.ui?.splash?.visible === false;
    const rff = st.ui?.rollForFirst;
    // trace removed
    // When selection transitions from open -> closed after having been opened, and splash is gone, open Roll For First (once) if players exist and not resolved
    if (!selectionOpen && prevSelectionOpen && selectionWasOpened && splashGone) {
      const profilesOpen = !!st.ui?.monsterProfiles?.open;
      if (skipIntro) {
        // Direct start path: don't open RFF when skipping intro
        if (st.phase === 'SETUP') turnService.startGameIfNeeded();
      } else {
        if (!profilesOpen && st.players.order.length > 0 && !(rff && (rff.open || rff.resolved))) {
          store.dispatch(uiRollForFirstOpen());
          ensurePostSplashBlackout();
        } else if (rff && rff.resolved) {
          if (st.phase === 'SETUP') turnService.startGameIfNeeded();
        }
        // removed diagnostic re-dispatch
      }
    }
    // If roll-for-first just resolved (open false, resolved true) and phase still SETUP, start game.
    if (rff && rff.resolved && st.phase === 'SETUP') {
      turnService.startGameIfNeeded();
    }
    // (Removed) previous subscription-based CPU auto-roll kick; logic centralized in turnService.startTurn
    // no per-tick tracing
    // When phase leaves SETUP (i.e., game actually starts) mark body active and fade out blackout
    if (st.phase !== 'SETUP' && !document.body.classList.contains('game-active')) {
      document.body.classList.add('game-active');
      const blk = document.querySelector('.post-splash-blackout');
      if (blk) { blk.classList.add('is-hidden'); setTimeout(()=>blk.remove(), 520); }
    }
    prevSelectionOpen = selectionOpen;

    // Lazy mount YieldModal if any pending human yield prompts exist
    try {
      const prompts = st.yield?.prompts || [];
      const hasHumanPending = prompts.some(p => p.decision == null && !st.players.byId[p.defenderId].isCPU && !st.players.byId[p.defenderId].isAI);
      if (hasHumanPending && !window.__KOT_YIELD_MODAL__) {
        window.__KOT_YIELD_MODAL__ = createYieldModal(store);
      }
      if (!hasHumanPending && window.__KOT_YIELD_MODAL__) {
        // Allow component to self-close; keep instance for reuse
      }
    } catch(_) {}

    // BUY_WAIT EndBuyButton (feature-flagged)
    try {
      const flags = (typeof window !== 'undefined') ? (window.__KOT_FLAGS__ || {}) : {};
      const enableBuyWait = !!flags.USE_BUY_WAIT; // default off until stabilized
      if (enableBuyWait) {
        if (st.phase === 'BUY_WAIT') {
          if (!window.__KOT_ENDBUY_BTN__) {
            window.__KOT_ENDBUY_BTN__ = mountEndBuyButton(store);
          }
        } else if (window.__KOT_ENDBUY_BTN__) {
          // Keep mounted but hide via component logic; no destroy needed yet
        }
      }
    } catch(_) {}

    // removed selection visibility watchdog
  });
  // Game Activation Watchdog (ensures play area appears even if phase start races occur)
  if (!window.__KOT_GAME_ACTIVATION_WATCHDOG__) {
    window.__KOT_GAME_ACTIVATION_WATCHDOG__ = true;
    let runs = 0;
    const MAX_RUNS = 40; // ~20s at 500ms
    const pulse = () => {
      try {
        const st = store.getState();
        const playersReady = (st.players?.order?.length || 0) > 0;
        const selectionOpen = !!st.ui?.monsterSelection?.open;
        const rff = st.ui?.rollForFirst;
        // Further relaxed: as soon as players exist, attempt start (ignore selection state entirely)
        const shouldAttemptStart = playersReady;
        if (runs < 6) {
          try { console.log('[watchdog:pulse]', { run: runs, phase: st.phase, playersReady, selectionOpen, rffState: rff && { open:rff.open, resolved:rff.resolved } }); } catch(_) {}
        }
        if (shouldAttemptStart) {
          if (st.phase === 'SETUP' && !window.__KOT_GAME_STARTED) {
            console.log('[watchdog] Triggering startGameIfNeeded (playersReady, selectionClosed, phase SETUP)');
            try { window.__KOT_NEW__?.turnService?.startGameIfNeeded?.(); } catch(e) { console.warn('[watchdog] startGameIfNeeded error', e); }
          }
          if (st.phase === 'SETUP') {
            // Attempt normal path first
            try { window.__KOT_NEW__?.turnService?.startGameIfNeeded?.(); } catch(e) { console.warn('[watchdog] startGameIfNeeded error (second attempt)', e); }
            // Force fallback if still stuck next tick
          }
          // Ensure UI visibility
          if (st.phase !== 'SETUP' && !document.body.classList.contains('game-active')) {
            console.log('[watchdog] Forcing game-active class (UI still hidden).');
            try { document.body.classList.add('game-active'); } catch(_) {}
          }
          // Cleanup lingering blackout
          try {
            const blk = document.querySelector('.post-splash-blackout');
            if (blk) { blk.classList.add('is-hidden'); setTimeout(()=>{ try { blk.remove(); } catch(_){} }, 400); }
          } catch(_) {}
          if (st.phase !== 'SETUP' && document.body.classList.contains('game-active')) return; // success -> stop
        }
      } catch(_) {}
      runs++;
      if (runs < MAX_RUNS) setTimeout(pulse, 500);
    };
    setTimeout(pulse, 600);
  }
  // Lightweight animation tagging for profile cards (Tokyo entry & resource gains)
  let prevPlayers = store.getState().players.byId;
  store.subscribe(()=>{
    const stNow = store.getState();
    const cur = stNow.players.byId;
    Object.keys(cur).forEach(id => {
      const now = cur[id];
      const prev = prevPlayers[id];
      if (!now) return;
      const cardEl = document.querySelector(`.cmp-player-profile-card[data-player-id="${id}"]`);
      if (!cardEl) return;
      // Tokyo animation handled by player-profile-card component itself
      // if (prev && !prev.inTokyo && now.inTokyo) {
      //   cardEl.setAttribute('data-entered-tokyo','1');
      //   setTimeout(()=>cardEl.removeAttribute('data-entered-tokyo'),1400);
      // }
      // VP, energy, and health gain animations handled by player-profile-card component itself
      // if (prev) {
      //   if (now.vp > prev.vp) {
      //     cardEl.setAttribute('data-vp-gain','1');
      //     setTimeout(()=>cardEl.removeAttribute('data-vp-gain'),1000);
      //   }
      //   if (now.energy > prev.energy) {
      //     cardEl.setAttribute('data-energy-gain','1');
      //     setTimeout(()=>cardEl.removeAttribute('data-energy-gain'),1000);
      //   }
      //   if (now.health > prev.health) {
      //     cardEl.setAttribute('data-health-gain','1');
      //     setTimeout(()=>cardEl.removeAttribute('data-health-gain'),1000);
      //   }
      // }
    });
    prevPlayers = cur;
  });
  // Load component config dynamically
  const cfgUrl = './config/components.config.json?ts=' + Date.now();
  fetch(cfgUrl)
    .then(r => r.json())
    .then(cfg => {
      // proceed even if selection entry missing
      return mountRoot(cfg, store).then(()=>cfg);
    })
    .then(cfg => {
      // no manual fallback mount for selection
    })
    .catch(e => {
      console.error('[bootstrap] Failed to load components.config.json', e);
    });
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
      const p = createPlayer({ id: 'p'+i, name: m.name, monsterId: m.id });
      if (i > 1) p.isCPU = true;
      store.dispatch(playerJoined(p));
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
  // Do not add blackout once the game is active
  if (document.body.classList.contains('game-active')) return;
  if (document.querySelector('.post-splash-blackout')) return;
  const div = document.createElement('div');
  div.className = 'post-splash-blackout';
  document.body.appendChild(div);
}

function resolveScenarioDynamicTargets(store, assignments) {
  const st = store.getState();
  const order = st.players.order;
  const byId = st.players.byId;
  const human = order.find(pid => !byId[pid].isCPU);
  const cpus = order.filter(pid => byId[pid].isCPU);
  const expanded = [];
  assignments.forEach(a => {
    // Support new shape: { mode, cpuCount, scenarioIds }
    if (a.mode) {
      const count = Math.min(a.cpuCount || 0, cpus.length);
      if (a.mode === 'HUMAN' && human) expanded.push({ playerId: human, scenarioIds: a.scenarioIds, paramsByScenario: a.paramsByScenario });
      else if (a.mode === 'CPUS') cpus.slice(0,count).forEach(id => expanded.push({ playerId: id, scenarioIds: a.scenarioIds, paramsByScenario: a.paramsByScenario }));
      else if (a.mode === 'BOTH') {
        if (human) expanded.push({ playerId: human, scenarioIds: a.scenarioIds, paramsByScenario: a.paramsByScenario });
        cpus.slice(0,count).forEach(id => expanded.push({ playerId: id, scenarioIds: a.scenarioIds, paramsByScenario: a.paramsByScenario }));
      }
    } else if (a.target || a.targets) {
      // Legacy fallback
      if (a.target === '__HUMAN__' && human) expanded.push({ playerId: human, scenarioIds: a.scenarioIds });
      else if (a.target === '__CPUS__') cpus.forEach(id => expanded.push({ playerId: id, scenarioIds: a.scenarioIds }));
    }
  });
  // Merge duplicates (playerId)
  const map = new Map();
  expanded.forEach(e => {
    if (!map.has(e.playerId)) map.set(e.playerId, { playerId: e.playerId, scenarioIds: [], paramsByScenario: {} });
    const slot = map.get(e.playerId);
    e.scenarioIds.forEach(id => { if (!slot.scenarioIds.includes(id)) slot.scenarioIds.push(id); });
    if (e.paramsByScenario) Object.assign(slot.paramsByScenario, e.paramsByScenario);
  });
  return [...map.values()];
}

function showScenarioToast(appliedList){
  try {
    if (!appliedList || !appliedList.length) return;
    const div = document.createElement('div');
    div.className = 'scenario-toast';
    div.style.cssText = 'position:fixed;top:10px;left:50%;transform:translateX(-50%);background:#142a18;color:#cfe9d2;padding:8px 14px;font-size:12px;border:1px solid #265c34;border-radius:6px;z-index:9999;box-shadow:0 2px 6px rgba(0,0,0,.4);display:flex;align-items:center;gap:8px;';
    const uniqueScenarios = new Set();
    appliedList.forEach(a => (a.scenarioIds||[]).forEach(id => uniqueScenarios.add(id)));
    const names = [...uniqueScenarios].map(id => { const s = getScenario(id); return s ? s.label : id; });
    div.textContent = `Scenarios applied: ${names.join(', ')}`;
    const close = document.createElement('button');
    close.textContent = '×';
    close.style.cssText = 'background:transparent;color:#cfe9d2;border:none;font-size:14px;cursor:pointer;';
    close.onclick = ()=>div.remove();
    div.appendChild(close);
    document.body.appendChild(div);
    setTimeout(()=>{ div.classList.add('fade'); div.style.transition='opacity .6s'; div.style.opacity='0'; setTimeout(()=>div.remove(), 700); }, 4000);
  } catch(_) {}
}

// Persist last scenario snapshot for deeper test loops (optional)
window.addEventListener('beforeunload', () => {
  try {
    const snap = captureScenarioState(store);
    localStorage.setItem('KOT_LAST_SCENARIO_SNAPSHOT', JSON.stringify(snap));
  } catch(_) {}
});
