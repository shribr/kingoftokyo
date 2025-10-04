// ui/eventAdapters.js
// Translates raw UI intents into semantic phase events via phaseEventsService
// Avoids components dispatching phaseChanged directly.

import { eventBus } from '../core/eventBus.js';

export function bindUIEventAdapters(store) {
  function phaseService() { return window.__KOT_NEW__?.phaseEventsService; }

  // ROLL phase completion (user presses End Turn while in ROLL)
  eventBus.on('ui/intent/finishRoll', () => {
    phaseService()?.publish('ROLL_COMPLETE');
  });

  // BUY window closed without purchase
  eventBus.on('ui/intent/closeBuy', () => {
    phaseService()?.publish('BUY_WINDOW_CLOSED');
  });

  // Player made yield decision
  eventBus.on('ui/intent/yieldDecisionMade', () => {
    phaseService()?.publish('YIELD_DECISION_MADE');
  });

  // Start game from setup (after roll-for-first or skip intro)
  eventBus.on('ui/intent/gameStart', () => {
    // Primary path: phase events service (phaseMachine) handles GAME_START.
    const svc = phaseService();
    const before = store.getState().phase;
    try { svc?.publish('GAME_START'); } catch(err) { console.warn('[eventAdapters] GAME_START publish failed', err); }
    // Fallback: if still in SETUP next microtask, invoke turnService.startGameIfNeeded directly.
    Promise.resolve().then(()=>{
      const st = store.getState();
      if (st.phase === 'SETUP') {
        try {
          const ts = (typeof window !== 'undefined') ? window.__KOT_NEW__?.turnService : null;
          if (ts && typeof ts.startGameIfNeeded === 'function') {
            console.debug('[eventAdapters] Fallback invoking turnService.startGameIfNeeded (phase still SETUP after GAME_START publish).');
            ts.startGameIfNeeded();
          } else {
            // Absolute last resort: directly dispatch legacy phase change
            console.warn('[eventAdapters] turnService missing; dispatching legacy phaseChanged action fallback');
            store.dispatch({ type:'PHASE_TRANSITION', payload:{ from: before, to: 'ROLL', ts: Date.now(), reason:'fallback_game_start' }});
          }
        } catch(e) {
          console.error('[eventAdapters] Fallback game start failed', e);
        }
      }
      // Ensure body reflects readiness (strict gating handled elsewhere). Add legacy class for compatibility.
      try {
        if (store.getState().phase !== 'SETUP' && !document.body.classList.contains('game-ready')) {
          document.body.classList.add('game-ready');
          if (!document.body.classList.contains('game-active')) document.body.classList.add('game-active');
        }
      } catch(_) {}
    });
  });

  // Begin a new turn after cleanup explicitly (optional external control)
  eventBus.on('ui/intent/turnStart', () => {
    phaseService()?.publish('TURN_START');
  });
}

// Auto-bind if desired later in bootstrap; explicit import currently recommended.