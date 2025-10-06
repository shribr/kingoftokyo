/** ui/eventsToActions.js */
import { eventBus } from '../core/eventBus.js';
import { diceRollStarted, diceRolled, diceToggleKeep, diceRerollUsed, diceRollCompleted, phaseChanged, uiPositionsReset } from '../core/actions.js';
import { uiPlayerPowerCardsOpen } from '../core/actions.js';
import { selectActivePlayerId } from '../core/selectors.js';
import { rollDice } from '../domain/dice.js';
import { computeMaxRolls } from '../utils/rolls.js';
import { createPositioningService } from '../services/positioningService.js';

// Bind UI events to store actions after store is created to avoid circular imports
export function bindUIEventBridges(store) {
  function handleRollRequested() {
    // Auto-expand dice tray in mobile if collapsed
    try {
      const isMobile = window.matchMedia('(max-width: 760px)').matches || window.matchMedia('(pointer: coarse)').matches;
      if (isMobile) {
        const diceTray = document.querySelector('.cmp-dice-tray');
        if (diceTray) {
          const isCollapsed = diceTray.getAttribute('data-collapsed') === 'left' || 
                             diceTray.getAttribute('data-collapsed') === 'true' || 
                             diceTray.getAttribute('data-collapsed') === '1';
          if (isCollapsed) {
            // Expand the dice tray
            diceTray.removeAttribute('data-collapsed');
            diceTray.setAttribute('data-expanded', 'true');
            diceTray.classList.add('expanded');
            diceTray.classList.remove('collapsed');
          }
        }
      }
    } catch(e) {
      console.warn('[eventsToActions] Failed to auto-expand dice tray:', e);
    }
    
    // Minimal guard: ensure blackout not blocking UI
    try { window.__KOT_BLACKOUT__?.hide(); document.querySelector('.post-splash-blackout')?.remove(); } catch(_) {}
    const stAll = store.getState();
    
    console.log('🎲 ROLL REQUESTED:', {
      phase: stAll.phase,
      dicePhase: stAll.dice.phase,
      faces: stAll.dice.faces.length,
      rerollsRemaining: stAll.dice.rerollsRemaining,
      accepted: stAll.dice.accepted
    });
    
    // Only allow rolling during the ROLL phase
    if (stAll.phase !== 'ROLL') {
      console.warn('🎲 Roll blocked - not in ROLL phase');
      return;
    }
    const diceState = stAll.dice;
    const isFirstRoll = diceState.faces.length === 0 || diceState.phase === 'idle';
    // Dynamic enforcement: rely on reducer-maintained rerollsRemaining + base/bonus computation
    if (!isFirstRoll) {
      if (!(diceState.phase === 'resolved' && diceState.rerollsRemaining > 0)) {
        console.warn('🎲 Roll blocked - not first roll and invalid state:', {
          dicePhase: diceState.phase,
          rerollsRemaining: diceState.rerollsRemaining,
          condition: `phase=${diceState.phase} resolved=${diceState.phase === 'resolved'} rerolls=${diceState.rerollsRemaining}`
        });
        return;
      }
    }
    // Optional diagnostic (dev only): verify we have not exceeded theoretical max
    try {
      if (process.env.NODE_ENV !== 'production') {
        const stCheck = store.getState();
        const activeId = stCheck.players.order[stCheck.meta.activePlayerIndex % stCheck.players.order.length];
        const max = computeMaxRolls(stCheck, activeId);
        const facesEmpty = diceState.faces.length === 0;
        // rollsUsed = initial (if faces exist) plus (baseRerolls - rerollsRemaining)
        if (!facesEmpty) {
          const baseRerolls = diceState.baseRerolls ?? 2;
          const used = baseRerolls + (stCheck.players.byId[activeId]?.modifiers?.rerollBonus || 0) - diceState.rerollsRemaining + 1;
          if (used > max) {
            console.warn('[rolls] exceeded computed max rolls', { used, max });
          }
        }
      }
    } catch(_) {}
  store.dispatch(diceRollStarted());
    // Determine dice count from active player's modifiers if available
    let count = 6;
    try {
      const st = store.getState();
      const order = st.players.order;
      if (order.length) {
        const activeId = order[st.meta.activePlayerIndex % order.length];
        count = st.players.byId[activeId]?.modifiers?.diceSlots || 6;
      }
    } catch(_){}
    const faces = rollDice({ count, currentFaces: diceState.faces });
    store.dispatch(diceRolled(faces));
    if (!isFirstRoll) {
      // Mark reroll usage and complete to decrement rerollsRemaining
      store.dispatch(diceRerollUsed());
      store.dispatch(diceRollCompleted());
    }
  }

  function handleKeptToggled({ index }) {
    store.dispatch(diceToggleKeep(index));
  }

  function maybeAdvancePhase() {
    const st = store.getState();
    // Auto-evaluate dice AFTER the player's final roll so stats (VP/health/energy) update immediately.
    // Accept button is now optional UX; this ensures player cards reflect gains before End Turn.
    try {
      const dice = st.dice || {};
      // Final roll detected: phase sequence-complete OR (resolved with rerollsRemaining 0) and not yet accepted.
      const finalRoll = (dice.phase === 'sequence-complete' || (dice.phase === 'resolved' && dice.rerollsRemaining === 0));
      
      console.log('🔄 maybeAdvancePhase check:', {
        phase: st.phase,
        dicePhase: dice.phase,
        rerollsRemaining: dice.rerollsRemaining,
        accepted: dice.accepted,
        finalRoll,
        shouldAutoAccept: st.phase === 'ROLL' && finalRoll && !dice.accepted
      });
      
      if (st.phase === 'ROLL' && finalRoll && !dice.accepted) {
        // Guard so we schedule only once per sequence id (first rollHistory snapshot ts heuristically identifies sequence)
        const seqId = dice.rollHistory?.[0]?.ts || st.meta?.turnCycleId || Date.now();
        if (maybeAdvancePhase._scheduledSeqId !== seqId) {
          maybeAdvancePhase._scheduledSeqId = seqId;
          // Defer accept to allow health/energy bar fills + kept toggles to finish applying
          requestAnimationFrame(() => requestAnimationFrame(() => {
            setTimeout(() => {
              try {
                const post = store.getState();
                const d2 = post.dice || {};
                if (post.phase === 'ROLL' && (d2.phase === 'sequence-complete' || (d2.phase === 'resolved' && d2.rerollsRemaining === 0)) && !d2.accepted) {
                  if (typeof window !== 'undefined' && window.__KOT_NEW__?.turnService?.acceptDiceResults) {
                    window.__KOT_NEW__.turnService.acceptDiceResults();
                    maybeAdvancePhase._autoAcceptedTs = Date.now();
                  }
                }
              } catch(_) {}
            }, 40); // slight delay (~2 frames at 60fps)
          }));
        }
      }
    } catch(_) {}
  }

  // Wire events
  eventBus.on('ui/dice/rollRequested', handleRollRequested);
  eventBus.on('ui/dice/keptToggled', handleKeptToggled);
  // Open player power cards modal (mini owned-cards view)
  eventBus.on('ui/modal/showPlayerPowerCards', () => {
    try {
      const st = store.getState();
      const activeId = selectActivePlayerId(st);
      if (activeId) {
        store.dispatch(uiPlayerPowerCardsOpen(activeId));
      }
    } catch(_) {}
  });
  // Subscribe to store to detect dice sequence completion for phase advancement
  store.subscribe(maybeAdvancePhase);
  // Position reset is now handled directly by positioningService
}
