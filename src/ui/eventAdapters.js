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
    phaseService()?.publish('GAME_START');
  });

  // Begin a new turn after cleanup explicitly (optional external control)
  eventBus.on('ui/intent/turnStart', () => {
    phaseService()?.publish('TURN_START');
  });
}

// Auto-bind if desired later in bootstrap; explicit import currently recommended.