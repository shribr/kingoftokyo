# Phase Finite State Machine & Concurrency Guard

Date: 2025-10-01  
Status: Baseline implemented; adoption in progress.

## Goals
1. Enforce legal game phase progression.
2. Centralize transition logging & validation.
3. Provide a lightweight guard (`turnCycleId`) against stale async side-effects.
4. Support event-driven semantics (higher level than raw actions).

## Phase Definitions
| Phase | Purpose | Key Exit Conditions |
|-------|---------|---------------------|
| SETUP | Pre-game initialization | GAME_START event -> ROLL |
| ROLL | Active player rolling & rerolling dice | ROLL_COMPLETE (all rerolls done) -> RESOLVE |
| RESOLVE | Apply dice results, damage, yields prompts created | NEEDS_YIELD_DECISION -> YIELD_DECISION; RESOLUTION_COMPLETE -> BUY; GAME_OVER -> GAME_OVER |
| YIELD_DECISION | Awaiting defenders' stay/leave choices | YIELD_DECISION_MADE -> BUY; REENTER_RESOLUTION -> RESOLVE |
| BUY | Player may purchase cards | PURCHASE_WITH_FOLLOWUP -> BUY_WAIT; BUY_COMPLETE -> CLEANUP |
| BUY_WAIT | Waiting for post-purchase effect queue | POST_PURCHASE_RESOLVED -> CLEANUP |
| CLEANUP | End-of-turn wrap; prepare next turn | TURN_READY -> ROLL |
| GAME_OVER | Terminal state | (no exits) |

## Transition Enforcement
`phaseFSM.js` encodes allowed edges. `phaseController.to(next)` validates `current -> next` using `validateTransition` and logs structured metadata `{ from, to, reason }`.

Invalid transitions in development emit warnings but are ignored (state remains unchanged). This de-risks incremental adoption.

## Event Mapping
`phaseController.event(name)` defers to `nextForEvent(current, name)`; if a mapping exists it internally calls `to()` with reason `event:<name>`.

Key events: `ROLL_COMPLETE`, `NEEDS_YIELD_DECISION`, `RESOLUTION_COMPLETE`, `PURCHASE_WITH_FOLLOWUP`, `POST_PURCHASE_RESOLVED`, `YIELD_DECISION_MADE`, `BUY_COMPLETE`, `PLAYER_WON`, `TURN_READY`.

## Concurrency Guard (`turnCycleId`)
`meta.turnCycleId` increments on `NEXT_TURN`. Long-running async workflows snapshot the value at start, then verify `store.getState().meta.turnCycleId === snapshot` before mutating state.

Helper APIs (in `phaseController.js`):
- guardTurn() returns a closure you can call to test freshness.
- isStale(startId) quick boolean test.

Use this for: CPU reroll loops, delayed effect application, UI pacing timers, yield prompt auto-decisions.

## Adoption Progress
Integrated:
- turnService (core resolution path & safeguards)
- cardsService (BUY -> BUY_WAIT follow-up)
- resolutionService (RESOLVE -> YIELD_DECISION)
- phaseEventsService now delegates to phaseController.

Pending:
- Replace remaining direct phaseChanged dispatches (search grep: `phaseChanged(`) where safe.
- Wrap yield auto-timeouts and watchdog timers with guard closures.
- Extend guard into effect queue resolution pipeline.

## Invariants
1. No skipped mandatory phases (ROLL must precede RESOLVE in same turn cycle).
2. A single linear chain ROLL → (RESOLVE → YIELD_DECISION?) → BUY (→ BUY_WAIT?) → CLEANUP per turnCycleId.
3. No state mutation from stale async after turnCycleId change.
4. GAME_OVER is absorbing (no exits).

## Debugging Tips
Open DevTools console and inspect window.__KOT_PHASE_CTRL__ or window.__KOT_PHASE_EVENTS__ for manual event injection in development.

Run a grep for illegal patterns:
`grep -R "store.dispatch(phaseChanged" -n src` – gradually eliminate as controller adoption completes.

## Future Enhancements
- Metrics: Count invalid attempts & expose histogram.
- Deterministic Mode Integration: Attach RNG seed + phase span info.
- Effect Queue Awareness: Pre-validate transitions against pending effect mutations.

---
Maintained as part of Flow Parity (Phase Alpha) initiative.
