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
import { createYieldAdvisoryNotification } from '../ui/components/YieldAdvisoryNotification.js';
import { mountEndBuyButton } from '../ui/components/EndBuyButton.js';
import { AIThoughtBubbleComponent } from '../components/ai-thought-bubble/ai-thought-bubble.component.js';
import '../ui/mobileToolbarToggle.js';

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
  
  // Ensure dice tray is always visible on mobile
  const syncDiceTrayVisibility = () => {
    const isMobile = matchMedia('(max-width: 760px), (pointer: coarse)').matches;
    if (isMobile) {
      try {
        const diceTray = document.querySelector('.cmp-dice-tray');
        if (diceTray) {
          diceTray.setAttribute('data-collapsed', 'none');
          diceTray.style.transform = 'translateX(0)';
        }
      } catch(_) {}
    }
  };
  syncDiceTrayVisibility();
  window.addEventListener('resize', syncDiceTrayVisibility); // Re-check on resize
  
  // Initialize AI thought bubble component
  try {
    const thoughtBubble = new AIThoughtBubbleComponent();
    window.__KOT_NEW__.thoughtBubble = thoughtBubble;
    console.log('[bootstrap] AI thought bubble initialized');
  } catch(e) {
    console.warn('[bootstrap] AI thought bubble initialization failed', e);
  }
  
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
        { id: 'alienoid', name: 'Alienoid', image: 'images/characters/king_of_tokyo_alienoid.png', description: 'A mysterious being from the stars.', personality: { aggression:3, strategy:4, risk:2, economic:3 }, color: '#c7d84a' },
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
    // Don't create blackout during skipIntro - we're going straight to game
    try { window.__KOT_BLACKOUT__?.hide(); } catch(_) {}
    // Remove any existing blackout immediately
    try { document.querySelector('.post-splash-blackout')?.remove(); } catch(_) {}
    
    setTimeout(() => {
      try { turnService.startGameIfNeeded(); } catch(e) { console.warn('Skip intro start failed', e); }
      // Immediate UI activation fallback (skipIntro path bypasses RFF finalize hooks)
      try {
        if (!document.body.classList.contains('game-active')) {
          document.body.classList.add('game-active');
        }
        window.__KOT_GAME_STARTED = true;
        
        // Trigger game-ready + notification if gating is effectively bypassed
        if (!document.body.classList.contains('game-ready')) {
          document.body.classList.add('game-ready');
          if (!window.__KOT_GAME_START_TOAST__) {
            const note = document.createElement('div');
            note.className = 'game-start-toast visible';
            note.setAttribute('role','status');
            note.setAttribute('aria-live','polite');
            note.innerHTML = `
              <div class="gst-inner" aria-hidden="true">
                <div class="gst-icon-wrap"><span class="gst-icon">🏙️</span><span class="gst-flare" aria-hidden="true"></span></div>
                <h2 class="gst-title">GAME START</h2>
                <div class="gst-sub">Monsters unleashed in Tokyo!</div>
                <div class="gst-energy-bar" aria-hidden="true"><span class="gst-energy-fill"></span></div>
              </div>`;
            document.body.appendChild(note);
            window.__KOT_GAME_START_TOAST__ = true;
            try { orchestrateGameStartToast(note); } catch(e) { console.warn('orchestrateGameStartToast failed', e); }
          }
        }
      } catch(_) {}
      // Delay scenario application to ensure all player stats are fully initialized first
      // Without this delay, scenario patches may be overwritten by subsequent initialization
      setTimeout(() => {
        try {
          console.log('🎬 [bootstrap:skipIntro] Delayed scenario application starting...');
          // If scenario config present, apply after game started
          const stNow = store.getState();
          const pre = stNow.settings?.scenarioConfig?.assignments;
          if (pre && pre.length) {
            console.log('🎯 [bootstrap:skipIntro] Found scenarios to apply:', pre);
            const appliedList = resolveScenarioDynamicTargets(store, pre);
            applyScenarios(store, { assignments: appliedList });
            showScenarioToast(appliedList);
          } else {
            console.log('⚠️ [bootstrap:skipIntro] No scenarios found in config');
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
      }, 250); // 250ms delay ensures players are fully initialized before scenarios apply
    }, 0);
  }

  store.subscribe(() => {
    const st = store.getState();
    const lastAction = store.getLastAction?.();
    if (lastAction && lastAction.type === SCENARIO_APPLY_REQUEST) {
      try { 
        applyScenarios(store, { assignments: lastAction.payload.assignments }); 
        // Show success notification
        showScenarioAppliedNotification(lastAction.payload.assignments);
      } catch(e) { 
        console.warn('Scenario apply failed', e); 
        showScenarioErrorNotification();
      }
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
        if (!profilesOpen && st.players.order.length >= 2 && !(rff && (rff.open || rff.resolved))) {
          store.dispatch(uiRollForFirstOpen());
          ensurePostSplashBlackout();
        } else if (rff && rff.resolved && st.players.order.length >= 2) {
          // Do not start game here; wait for unified gating below
        }
        // removed diagnostic re-dispatch
      }
    }
    // Unified gating: start game only when >=2 players AND RFF resolved.
    const enoughPlayers = st.players.order.length >= 2;
    if (st.phase === 'SETUP' && enoughPlayers && rff && rff.resolved) {
      turnService.startGameIfNeeded();
    }
    // (Removed) previous subscription-based CPU auto-roll kick; logic centralized in turnService.startTurn
    // no per-tick tracing
    // When phase leaves SETUP (i.e., game actually starts) mark body active and fade out blackout
    if (st.phase !== 'SETUP' && !document.body.classList.contains('game-ready')) {
      // Mark game ready only after gating satisfied (phase advanced)
      document.body.classList.add('game-ready');
      // Apply scenarios immediately after game starts (normal flow)
      // Small delay to ensure all initialization is complete
      setTimeout(() => {
        try {
          console.log('🎬 [bootstrap:normalFlow] Delayed scenario application starting...');
          const settings = window.__KOT_NEW__?.configLoader?.getConfig?.();
          const scenarioConfig = settings?.scenarioConfig || {};
          const assignments = scenarioConfig.assignments || [];
          if (assignments.length > 0) {
            console.log('� [bootstrap:normalFlow] Found scenarios to apply:', assignments);
            const resolvedAssignments = resolveScenarioDynamicTargets(store, assignments);
            console.log('🔧 [bootstrap:normalFlow] Resolved dynamic targets:', resolvedAssignments);
            applyScenarios(store, { assignments: resolvedAssignments });
          } else {
            console.log('⚠️ [bootstrap:normalFlow] No scenarios found in config');
          }
        } catch(e) { console.warn('Scenario post-start application failed (normal flow)', e); }
      }, 250); // 250ms delay ensures players are fully initialized before scenarios apply
      // Remove blackout now (both conditions inherently met because phase advanced via gating logic)
      const blk = document.querySelector('.post-splash-blackout');
      if (blk) { 
        blk.classList.add('is-hidden'); 
        // Also call the controller to ensure inline styles are cleared
        try { window.__KOT_BLACKOUT__?.hide(); } catch(_) {}
        setTimeout(()=>blk.remove(), 520); 
      }
      // Central notification: Game officially underway
      try {
        if (!window.__KOT_GAME_START_TOAST__) {
          const note = document.createElement('div');
          note.className = 'game-start-toast visible';
          note.setAttribute('role','status');
          note.setAttribute('aria-live','polite');
          note.innerHTML = `
            <div class="gst-inner" aria-hidden="true">
              <div class="gst-icon-wrap"><span class="gst-icon">🏙️</span><span class="gst-flare" aria-hidden="true"></span></div>
              <h2 class="gst-title">GAME START</h2>
              <div class="gst-sub">Monsters unleashed in Tokyo!</div>
              <div class="gst-energy-bar" aria-hidden="true"><span class="gst-energy-fill"></span></div>
            </div>`;
          document.body.appendChild(note);
          window.__KOT_GAME_START_TOAST__ = true;
          try { orchestrateGameStartToast(note); } catch(e) { console.warn('orchestrateGameStartToast failed', e); }
        }
        // Force overlay service to clear any lingering references
        try { window.__KOT_OVERLAY__?.forceHide(); } catch(_) {}
      } catch(_) {}
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
      
      // Initialize yield advisory notification (subtle bottom-left bubble)
      if (!window.__KOT_YIELD_ADVISORY__) {
        window.__KOT_YIELD_ADVISORY__ = createYieldAdvisoryNotification(store);
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
  // Game Activation Watchdog (reduced scope: no longer forces premature UI; logs only)
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
  // Only attempt start when >=2 players AND RFF resolved (strict gating)
  const shouldAttemptStart = (st.players?.order?.length || 0) >= 2 && rff && rff.resolved;
        if (runs < 6) {
          try { console.log('[watchdog:pulse]', { run: runs, phase: st.phase, playersReady, selectionOpen, rffState: rff && { open:rff.open, resolved:rff.resolved } }); } catch(_) {}
        }
        if (shouldAttemptStart) {
          if (st.phase === 'SETUP' && !window.__KOT_GAME_STARTED) {
            console.log('[watchdog] Triggering gated startGameIfNeeded');
            try { window.__KOT_NEW__?.turnService?.startGameIfNeeded?.(); } catch(e) { console.warn('[watchdog] startGameIfNeeded error', e); }
          }
          // Cleanup lingering blackout
          try {
            const blk = document.querySelector('.post-splash-blackout');
            if (blk) { blk.classList.add('is-hidden'); setTimeout(()=>{ try { blk.remove(); } catch(_){} }, 400); }
          } catch(_) {}
          if (st.phase !== 'SETUP' && document.body.classList.contains('game-ready')) return; // success -> stop
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
      try {
        // Querystring-driven modal opener (testing convenience)
        const params = new URLSearchParams(window.location.search);
        const modalParam = params.get('modal') || params.get('modals');
        if (modalParam) {
          const tokens = modalParam.split(/[;,]/).map(s=>s.trim().toLowerCase()).filter(Boolean);
          const actions = [];
          const openSplash = tokens.includes('splash');
          const openSelection = tokens.includes('selection') || tokens.includes('monsterselection') || tokens.includes('monster-select');
          const openProfiles = tokens.includes('profiles') || tokens.includes('monsterprofiles') || tokens.includes('profile');
          const openRff = tokens.includes('rff') || tokens.includes('rollforfirst') || tokens.includes('roll-for-first');
          // If skipintro also present, ignore modal param (intro gating bypassed) unless explicit override flag
          const overrideWithIntro = params.get('forceIntro') === '1';
          if (skipIntro && !overrideWithIntro) {
            console.info('[modalQuery] skipIntro active; ignoring modal query parameters');
          } else {
            if (openSplash) {
              try { if (store.getState().ui?.splash?.visible === false) store.dispatch({ type:'UI_SPLASH_SHOW' }); } catch(_) {}
            }
            // Ensure splash hidden if not explicitly requested but selection/rff requested
            if (!openSplash) {
              try { store.dispatch(uiSplashHide()); } catch(_) {}
            }
            if (openSelection) {
              try { store.dispatch({ type:'UI_MONSTER_SELECTION_OPEN' }); ensurePostSplashBlackout(); } catch(e){ console.warn('Failed to open selection via query', e); }
            }
            if (openProfiles) {
              try { store.dispatch({ type:'UI_MONSTER_PROFILES_OPEN', payload:{ source:'query' }}); ensurePostSplashBlackout(); } catch(e){ console.warn('Failed to open profiles via query', e); }
            }
            if (openRff) {
              try { store.dispatch(uiRollForFirstOpen()); ensurePostSplashBlackout(); } catch(e){ console.warn('Failed to open RFF via query', e); }
            }
          }
        }
        // Allow forcing game start toast re-display for testing via ?forceToast=1
        try {
          const forceToast = params.get('forceToast') === '1';
          if (forceToast) {
            // Clear guard flag then (re)emit toast if game already started or becomes ready shortly.
            delete window.__KOT_GAME_START_TOAST__;
            const show = () => {
              if (window.__KOT_GAME_START_TOAST__) return;
              const note = document.createElement('div');
              note.className = 'game-start-toast visible';
              note.setAttribute('role','status');
              note.setAttribute('aria-live','polite');
              note.innerHTML = `\n                <div class="gst-inner" aria-hidden="true">\n                  <div class="gst-icon-wrap"><span class="gst-icon">🏙️</span><span class="gst-flare" aria-hidden="true"></span></div>\n                  <h2 class="gst-title">GAME START</h2>\n                  <div class="gst-sub">Monsters unleashed in Tokyo!</div>\n                  <div class="gst-energy-bar" aria-hidden="true"><span class="gst-energy-fill"></span></div>\n                </div>`;
              document.body.appendChild(note);
              window.__KOT_GAME_START_TOAST__ = true;
              try { orchestrateGameStartToast(note); } catch(e) { console.warn('orchestrateGameStartToast failed', e); }
            };
            // If game already past SETUP or body has game-ready, show immediately; else wait a bit.
            const stNow = store.getState();
            if (stNow.phase !== 'SETUP' || document.body.classList.contains('game-ready')) show();
            else setTimeout(show, 1200);
          }
        } catch(_) {}
      } catch(e) { console.warn('[modalQuery] processing error', e); }
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
  // Do not add blackout once the game is ready (or legacy active class present)
  if (document.body.classList.contains('game-ready') || document.body.classList.contains('game-active')) return;
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

// Show notification when scenarios are applied from settings modal
function showScenarioAppliedNotification(assignments) {
  try {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 20px;
      background: #2d5016;
      color: #90ee90;
      border: 2px solid #4a7c2c;
      border-radius: 6px;
      padding: 12px 20px;
      font-family: 'Nunito', system-ui, sans-serif;
      font-size: 14px;
      font-weight: 600;
      box-shadow: 3px 3px 0 #000, 0 4px 12px rgba(0,0,0,0.5);
      z-index: 400;
      animation: slideIn 0.3s ease, fadeOut 0.3s ease 2.7s;
      pointer-events: none;
    `;
    
    const uniqueScenarios = new Set();
    assignments.forEach(a => (a.scenarioIds||[]).forEach(id => uniqueScenarios.add(id)));
    const count = uniqueScenarios.size;
    
    notification.innerHTML = `✓ Scenarios Applied Successfully <span style="opacity:0.8;font-weight:normal;">(${count} scenario${count !== 1 ? 's' : ''})</span>`;
    
    // Add animation keyframes if not already present
    if (!document.getElementById('notification-animations')) {
      const style = document.createElement('style');
      style.id = 'notification-animations';
      style.textContent = `
        @keyframes slideIn {
          from { transform: translateX(-100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes fadeOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }
      `;
      document.head.appendChild(style);
    }
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.remove();
    }, 3000);
  } catch(e) {
    console.warn('Failed to show scenario notification:', e);
  }
}

// Show error notification if scenario application fails
function showScenarioErrorNotification() {
  try {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 20px;
      background: #5c1616;
      color: #ffb3b3;
      border: 2px solid #8b3a3a;
      border-radius: 6px;
      padding: 12px 20px;
      font-family: 'Nunito', system-ui, sans-serif;
      font-size: 14px;
      font-weight: 600;
      box-shadow: 3px 3px 0 #000, 0 4px 12px rgba(0,0,0,0.5);
      z-index: 400;
      animation: slideIn 0.3s ease, fadeOut 0.3s ease 2.7s;
      pointer-events: none;
    `;
    
    notification.textContent = '✗ Failed to Apply Scenarios';
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.remove();
    }, 3000);
  } catch(_) {}
}


// Persist last scenario snapshot for deeper test loops (optional)
window.addEventListener('beforeunload', () => {
  try {
    const snap = captureScenarioState(store);
    localStorage.setItem('KOT_LAST_SCENARIO_SNAPSHOT', JSON.stringify(snap));
  } catch(_) {}
});

// Orchestrates progressive shake phases and explosion for the game start toast.
// CSS timings: energy fill animation: 2s duration + .25s delay (total 2250ms till 100%).
// Keyframe checkpoints (approx based on @keyframes gstEnergyFill percentages):
// 0%: 0ms, 25%: ~500ms, 55%: ~1100ms, 100%: 2000ms ( + initial 250ms delay).
// We map phases: phase1 after ~350ms, phase2 after ~850ms, phase3 after ~1350ms, phase4 near ~1850ms, explosion at fill completion (~2250ms total).
function orchestrateGameStartToast(note) {
  if (!note) return;
  try {
    const cfg = (window.__KOT_GAME_START_CFG__ ||= {
      enableShake:true,
      enableParticles:true,
      enableSparks:true,
      enableShockwave:true,
      colorBandMode:'pulse', // 'none' | 'pulse'
      timings:{
        energyDelay:250, // ms (CSS must match)
        energyDuration:2000,
        phase1:350,
        phase2:850,
        phase3:1350,
        phase4:1850,
        explosionOffset:2250, // delay+duration
  removalDelay:2600 // after explosion trigger (extended for slower explosion & longer particles)
      }
    });
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) {
      // Respect reduced motion: schedule a simple fade dismiss similar to prior behavior.
      try { note.removeAttribute('data-color-band'); } catch(_){}
      setTimeout(() => { 
        if (!note.isConnected) return;
        // Lower z-index before dismissing 
        note.style.zIndex = '0';
        note.classList.add('dismiss'); 
        setTimeout(()=>{ 
          try { note.remove(); } catch(_){} 
        }, 600); 
      }, 2200);
      return;
    }
    // Progressive phases
    if (cfg.enableShake) {
      const phaseTimings = [cfg.timings.phase1, cfg.timings.phase2, cfg.timings.phase3, cfg.timings.phase4];
      phaseTimings.forEach((t, idx) => {
        setTimeout(() => {
          if (!note.isConnected || note.classList.contains('exploding')) return;
          note.setAttribute('data-shake-phase', String(idx+1));
        }, t + 10);
      });
    }
    if (cfg.colorBandMode && cfg.colorBandMode !== 'none') {
      note.setAttribute('data-color-band', cfg.colorBandMode);
    }
    // Explosion trigger after fill completion (fill delay .25s + 2000ms duration = 2250ms)
    const EXPLOSION_AT = cfg.timings.explosionOffset;
    setTimeout(() => {
      if (!note.isConnected) return;
      note.removeAttribute('data-shake-phase');
      note.classList.add('exploding');
      // Keep high z-index during explosion animation
      try { if (cfg.enableShockwave) spawnGameStartShockwave(note); } catch(e){ console.warn('shockwave spawn failed', e); }
      try { if (cfg.enableParticles) spawnGameStartParticles(note, cfg); } catch(e){ console.warn('spawnGameStartParticles failed', e);}      
      
      // Lower z-index after explosion animation is mostly complete (0.8s animation)
      setTimeout(() => {
        if (!note.isConnected) return;
        note.style.zIndex = '0';
      }, 800); // After explosion animation completes
      
      // Removal after configured additional delay (allows fade tail & particles)
      setTimeout(() => { 
        if (!note.isConnected) return; 
        try { note.remove(); } catch(_){}
      }, cfg.timings.removalDelay);
    }, EXPLOSION_AT);
  } catch(e) {
    console.warn('orchestrateGameStartToast internal error', e);
    // Fallback: prior simple dismiss
    setTimeout(() => { 
      if (!note.isConnected) return;
      // Lower z-index before dismissing
      note.style.zIndex = '0';
      note.classList.add('dismiss'); 
      setTimeout(()=>{ 
        try { note.remove(); } catch(_){}
      }, 600); 
    }, 2500);
  }
}

function spawnGameStartParticles(note, cfg) {
  if (!note) return;
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced) return;
  const CORE_COUNT = cfg?.coreParticleCount || 18;
  for (let i=0;i<CORE_COUNT;i++) {
    const p = document.createElement('span');
    p.className = 'gst-particle';
    const angle = (Math.PI * 2) * (i / CORE_COUNT) + (Math.random()*0.6 - 0.3);
    const radius = 55 + Math.random()*55;
    const dx = Math.cos(angle) * radius;
    const dy = Math.sin(angle) * radius;
    const hue = 34 + Math.floor(Math.random()*18);
    const variant = (Math.random() < 0.25) ? 3 : (Math.random() < 0.55 ? 2 : 1);
    p.style.setProperty('--dx', dx.toFixed(1)+'px');
    p.style.setProperty('--dy', dy.toFixed(1)+'px');
    p.style.setProperty('--h', hue.toString());
    if (variant !== 1) p.setAttribute('data-variant', String(variant));
    const delay = (Math.random()*120)|0;
    p.style.animationDelay = delay + 'ms';
    note.appendChild(p);
    setTimeout(()=>{ try { p.remove(); } catch(_){} }, 1300 + delay);
  }
  // Long-travel sparks (a few that fly further out and fade)
  if (!cfg?.enableSparks) return;
  const SPARKS = cfg.sparkCount || 6;
  for (let s=0;s<SPARKS;s++) {
    const sp = document.createElement('span');
    sp.className = 'gst-particle';
    sp.setAttribute('data-spark','1');
    const angleDeg = (360/SPARKS)*s + (Math.random()*40 - 20);
    const angleRad = angleDeg * Math.PI/180;
    const radiusFar = 140 + Math.random()*110; // further
    const dx2 = Math.cos(angleRad) * radiusFar;
    const dy2 = Math.sin(angleRad) * radiusFar;
    const hue = 30 + Math.floor(Math.random()*25);
    sp.style.setProperty('--dx2', dx2.toFixed(1)+'px');
    sp.style.setProperty('--dy2', dy2.toFixed(1)+'px');
    sp.style.setProperty('--h', hue.toString());
    sp.style.setProperty('--ang', angleDeg.toFixed(1)+'deg');
    const delay = 80 + (Math.random()*160|0);
    sp.style.animationDelay = delay + 'ms';
    note.appendChild(sp);
    setTimeout(()=>{ try { sp.remove(); } catch(_){} }, 1700 + delay);
  }
}

function spawnGameStartShockwave(note) {
  try {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;
    const ring = document.createElement('span');
    ring.className = 'gst-shockwave';
    note.appendChild(ring);
    setTimeout(()=>{ try { ring.remove(); } catch(_){} }, 1600);
  } catch(e) { console.warn('spawnGameStartShockwave failed', e); }
}
