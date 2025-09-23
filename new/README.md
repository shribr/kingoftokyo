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

## Phase 4 Additions (Current)
Implemented in this phase:
- Global phase management via `phaseReducer` (`SETUP -> ROLL -> RESOLVE` so far) with automatic advance to `RESOLVE` when rerolls are exhausted.
- Structured logging (`services/logger.js`) and `logFeed` component displaying last 50 entries.
- Tokyo occupancy placeholder reducer (`tokyoReducer`) with set/clear actions (no automatic triggers yet).
- Dice reroll lifecycle: first roll sets `rerollsRemaining = 2`; each subsequent roll during the same sequence decrements; after final reroll dice slice marks `phase: 'sequence-complete'` prompting phase transition.

## Smoke Test (Manual Validation)
Use the steps below to validate Phase 4 behavior manually:
1. Open root `index.html` in a modern browser.
2. Open DevTools console.
3. In the UI, click Roll (first roll) – confirm dice appear and `__KOT_NEW__.store.getState().dice.rerollsRemaining === 2`.
4. Click Roll again (reroll) – `rerollsRemaining` should decrement to 1.
5. Click Roll a third time – `rerollsRemaining` becomes 0 and `dice.phase` becomes `sequence-complete`.
6. Observe that global `phase` changes from `ROLL` to `RESOLVE` automatically (check `__KOT_NEW__.store.getState().phase`).
7. Inspect log feed component for initial system log. (At present no automatic phase-change log is appended; can be added later.)

Optional console helpers:
```js
// Watch phase changes
const unsub = __KOT_NEW__.store.subscribe(()=>{
	const st = __KOT_NEW__.store.getState();
	if (st.phase !== window._lastPhase) {
		console.log('[phase]', window._lastPhase, '->', st.phase);
		window._lastPhase = st.phase;
	}
});
```
Run `unsub()` later to stop observing.

## Planned Next (Phase 4 Wrap / Phase 5 Prep)
- Explicit UI indicator for current phase & rerolls remaining (augment dice tray).
- Automatic Tokyo entry/exit triggers and VP adjustments.
- Phase progression beyond `RESOLVE` (BUY, CLEANUP, next turn) with turn increment (`meta.turn`).
- Derived logging (auto log on phase change, Tokyo occupation changes).
- Card engine skeleton kickoff (effects registry & basic resolution) starting Phase 5.

## Phase 5 Additions (Card Engine Skeleton)
Implemented:
- Card catalog & shuffle (`domain/cards.js`), deck build & shop fill on bootstrap.
- Cards reducer & actions (deck build, shop fill, purchase, player gains card).
- Service `cardsService.js` orchestrating shop refill and purchase flow.
- Players reducer now tracks acquired cards; selectors for shop/deck/player cards added.
- Basic test `cards.spec.js` covering initialization and purchase mutation.

Deferred (future phases):
- Effect resolution & triggered abilities.
- Shop refresh (pay energy to discard & refill) and discard reshuffle when deck empty.
- Full card set & balancing; visual shop component.
- AI card valuation & purchase decisions.

## UI Parity Pipeline (Initiated)
See `UI_PARITY_TODO.md` for detailed task list.
Initial assets added:

How to run style audit (in browser console after app loads):
```js
import('./new/tools/uiAudit.js').then(m => m.runUIAudit());
```
Extend `DEFAULT_SELECTORS` in the script or call `runUIAudit(['.your-selector'])` for custom targets.

### Card Detail & Player Cards Modals (Scaffolding)
Initial scaffolding for power card inspection (`cardDetail` component) and owned cards list (`playerCardsModal`) has been added. Styling currently minimal & token adoption partial (uses brand gold + science category placeholder). Future steps:
1. Map each card category to semantic token background.
2. Add entrance/exit animations (scale/slide) via motion tokens.
3. Integrate accessibility: focus trap + ESC key close.

### Token Usage & Migration Policy
`css/tokens.css` now contains extracted color, spacing, shadow, and typography tokens derived from legacy CSS (headers, dice area, cards, panels). Migration will proceed incrementally:
1. New or refactored components must reference tokens instead of hard-coded values.
2. When touching a legacy style block, replace only the values you interact with using tokens (avoid mass churn).
3. For gradients/patterns, wrap composite values in semantic custom properties where reuse emerges (`--grad-header`, etc.).
4. Introduce new tokens ONLY after confirming at least two distinct call sites.

Example replacement (before → after):
```css
.dice-area { background: #f8f9fa; }
/* becomes */
.dice-area { background: var(--color-text-primary); color: var(--color-text-inverse); }
```

### Style Baseline & Diff Workflow
The audit tool now supports baselining and diffs using `localStorage`.

Initial baseline capture (once UI mounts):
```js
import('./new/tools/uiAudit.js').then(m => m.saveBaseline());
```

Subsequent diff after a change:
```js
import('./new/tools/uiAudit.js').then(m => m.diffCurrentAgainstBaseline());
```

Export the baseline to commit (creates a download):
```js
UI_AUDIT.exportBaselineFile();
```
Then add the downloaded `ui-baseline.json` to version control under `new/tools/baselines/` (create folder if needed).

To import a stored baseline (e.g., after clearing browser cache):
```js
// Provide a File object (from input[type=file])
UI_AUDIT.importBaselineFile(file);
```

Selectors list lives in `DEFAULT_SELECTORS`; expand as new components are stabilized.

### Planned Enhancements
- Node/CLI based screenshot + pixel diff harness (Playwright + pixelmatch) referencing tokens.
- Automated regression gate (fail build if unintended drift detected in baseline JSON or screenshots).
- Token linter (detect hard-coded color/spacing values) – script stub to be added in a future phase.

## Component Development Notes
- `eventsToActions.js` currently hosts dice UI bridge logic; will expand for other UI→action translations.
- Components re-render fully for now; diff optimization deferred to a later phase.
