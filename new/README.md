# New Modular Implementation (Sandbox)

This directory hosts the in-progress modular rewrite of King of Tokyo. Legacy code remains untouched outside `new/`.

## Quick Start
Add a module script pointing to `./new/src/bootstrap/index.js` or open the provided test runner for domain logic verification.

```html
<script type="module" src="./new/src/bootstrap/index.js"></script>
```

## Test Runner
Open `new/test-runner.html` in a browser to execute all specs (`src/tests/index.js`). Console logs show individual spec success lines.

## Tests
Current tests cover:
- Store dispatch & event bus basics
- Dice domain logic (length, kept preservation, tally, distribution)
- Player domain logic (damage, heal constraints, energy & VP)

## Structure
Refer to `JAVASCRIPT_MIGRATION_PLAN.md` for architecture, phases, and quality gates.

## Next Phases
Upcoming: component skeletons (`dice-tray`, `player-card`) and wiring roll workflow through actions + event bus.

## Phase 3 Component Demo
Open `index.html` (root) or create a minimal page including:
```html
<div id="app"></div>
<script type="module" src="./new/src/bootstrap/index.js"></script>
```
This will:
1. Initialize store/event bus.
2. Seed two demo players.
3. Fetch `components.config.json` and mount `playerCardList` then `diceTray`.
4. Allow you to press Roll and toggle kept dice.

## Component Development Notes
- `eventsToActions.js` currently hosts dice UI bridge logic; will expand for other UI→action translations.
- Components re-render fully for now; diff optimization deferred to a later phase.
