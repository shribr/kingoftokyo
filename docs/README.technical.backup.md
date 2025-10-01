# Technical README (Backup)

This file preserves the previous root `README.md` technical content prior to the executive summary replacement.

---

# Original Content

(See below)

---

# Modular Implementation (Former `new/` Promotion)

This root now contains the previously in-progress modular rewrite (formerly under `new/`). All prior references to `new/` in historical docs are legacy and refer to this directory.

## Quick Start
Add a module script pointing to `./src/bootstrap/index.js` or open the provided test runner for domain logic verification.

```html
<script type="module" src="./src/bootstrap/index.js"></script>
```

## Test Runner
Open `test-runner.html` in a browser to execute all specs (`src/tests/index.js`). Console logs show individual spec success lines.

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
<script type="module" src="./src/bootstrap/index.js"></script>
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
import('./tools/uiAudit.js').then(m => m.runUIAudit());
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
import('./tools/uiAudit.js').then(m => m.saveBaseline());
```

Subsequent diff after a change:
```js
import('./tools/uiAudit.js').then(m => m.diffCurrentAgainstBaseline());
```

Export the baseline to commit (creates a download):
```js
UI_AUDIT.exportBaselineFile();
```
Then add the downloaded `ui-baseline.json` to version control under `tools/baselines/` (create folder if needed).

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

### Component Development Notes
- `eventsToActions.js` currently hosts dice UI bridge logic; will expand for other UI→action translations.
- Components re-render fully for now; diff optimization deferred to a later phase.

## Phase Progress Tracker (1–11)
The initial architectural roadmap spans 11 macro phases. Earlier README updates stopped around Phase 5; phases 6–9 work is now documented here.

| Phase | Focus | Status | Key Deliverables |
|-------|-------|--------|------------------|
| 1 | Core store, event bus, initial state shape | COMPLETE | `store.js`, `eventBus.js`, base reducers, state factory |
| 2 | Dice domain + tray + reroll loop seed | COMPLETE | Dice slice, `dice-tray` scaffold |
| 3 | Player management & turn skeleton | COMPLETE | Players slice, meta turn index |
| 4 | Phase machine & logging | COMPLETE | `phaseReducer`, logger, `logFeed` |
| 5 | Card catalog & shop skeleton | COMPLETE | `cardsService`, deck/shop actions |
| 6 | Player profile cards & positioning | COMPLETE | Profile card + multi manager, drag persistence service |
| 7 | Effect engine & passive modifiers | COMPLETE | `effectQueue` reducer, `effectEngine`, modifier recalculation |
| 8 | Modal parity batch 1 | COMPLETE | Card detail, owned cards, monster profiles, splash adjustments |
| 9 | Modal parity batch 2 | COMPLETE | Settings modal + persistence, hierarchical game log (semantic kinds + collapse persistence), AI decision heuristic w/ hypotheticals, unified modal CSS |
| 10 | AI transparency & enriched logs | IN PROGRESS | Thought bubble, log kind filters, AI node linking groundwork |
| 11 | Test hardening & theming (dark hooks) | PENDING | Coverage expansion, accessibility, token override & dark edition scaffolds |

### Recent Work (Phases 7–9)
1. Added effect queue & processing statuses; integrated card purchase flow to enqueue immediate effects.
2. Player modifiers (diceSlots, rerollBonus) dynamically alter dice capacity & reroll allowances.
3. Settings slice with persistence (`cpuSpeed`, `showThoughtBubbles`, `autoActivateMonsters`).
4. Hierarchical game log (round → turn) with collapsible UI; round tracking added to meta.
5. AI decision tree placeholder capturing mock roll rationale (will evolve into true scoring engine).
6. Unified modal styling layer (`components.modals.css`) using design tokens.
7. Forward Dark Edition hooks: `meta.gameMode`, deck init option, dark token override, planning doc.

### Phase 9 Closure Summary
Implemented:
- CPU pacing via `settings.cpuSpeed` (slow/normal/fast) affecting AI roll delays.
- AI decision heuristic replacing mock (scores claws, energy, healing need, triples + potentials) with hypothetical reroll projections.
- Semantic log enrichment (uniform fields: `kind`, `round`, `turn`, `phase`) and automatic phase change logging.
- Persistent hierarchical log collapse state (round & turn) stored in `localStorage`.
- Added tests for logger semantics & AI decision capture.

Deferred to Phase 10+:
- Thought bubble visualization for AI rationale (`showThoughtBubbles`).
- Filtering UI for log kinds.
- Cross-linking log lines to specific AI decision node IDs.

### Phase 10 (Planned Outline)
Current progress:
- Thought bubble component showing latest roll rationale + top hypotheticals (respects `showThoughtBubbles`).
- Log kind filtering UI with persistence (round/turn collapse + kind selections stored).
- AI node id attached to roll-related logs (available via `aiNodeId`).

Remaining:
- Deep reroll branch tree evaluation & comparative scoring.
- Card purchase heuristic integration.
- Full accessibility sweep (focus traps, aria-live regions).

### Phase 11 (Planned Outline)
- Unit & integration test expansion (effect engine edge cases, settings influences, modal lifecycle).
- Performance instrumentation (timed effect resolution & AI evaluation stats).
- Theme consolidation + dark edition bootstrap path (apply `.theme-dark-edition` at start for dark mode runs).

## Dark Edition Preparation (Summary)
Refer to `DARK_EDITION_PLANNING.md` for a full blueprint. Current code includes inert scaffolds only; gameplay unchanged in classic mode.
