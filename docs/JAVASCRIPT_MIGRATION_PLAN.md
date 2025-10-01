# King of Tokyo – JavaScript Migration & Architecture Plan

> Objective: Rebuild the game inside `new/` using a modular, event‑driven, componentized architecture decoupled from legacy DOM coupling, enabling testability, theming alignment, AI extensibility, and future feature evolution.

## 1. Objectives
1. Decouple UI rendering from game/business logic (pure domain + rendering layer separation).
2. Eliminate redundant / overlapping functions through consolidation & clear responsibilities.
3. Introduce an event bus + lightweight state store to avoid ad-hoc cross-calls.
4. Standardize component creation via config-driven factories (schema-first).
5. Establish consistent naming for components, states, and utilities (.cmp-*, .is-*, u-* parity with CSS plan).
6. Modularize AI logic with transparent decision explanations & pluggable strategy layers.
7. Improve maintainability: smaller files, single-purpose functions, test seams.
8. Provide migration path & dual-run compatibility (legacy vs new sandbox) until validated.

## 2. Guiding Principles
- Single Responsibility: Each module exports focused capabilities (no giant god objects).
- Pure First: Domain logic functions avoid DOM APIs; UI is a consumer, not a dependency.
- Config Driven: Components and some gameplay surfaces built from JSON schemas.
- Deterministic Events: All state-changing actions emit canonical events (e.g., `dice/rolled`, `player/enteredTokyo`).
- Explicit State Graph: Central store slice structure documented; no implicit global mutations.
- Progressive Adoption: New code lives only in `new/`; no edits to legacy outside sanctioned mapping.
- Observability: Debug hooks encapsulated (e.g., `Debug.log(namespace, ...args)`).
- AI Transparency: Each decision returns a structured rationale tree (for UI inspection).

## 3. High-Level Architecture
```
new/
  index.html              # Sandbox entry (can be minimal scaffold)
  images/                 # Copied asset subset
  components.config.json  # Declarative definitions of UI components
  src/
    core/                 # Event bus, store, config loader
    domain/               # Game engine: players, dice, cards, tokyo state
    ui/                   # Rendering orchestrators (mount logic)
    components/           # Component factories (pure view model -> DOM)
    services/             # Persistence, RNG seed, logging, analytics hooks
    ai/                   # Strategy engine, evaluation, simulation, scoring
    utils/                # Shared helpers (type guards, formatting, math)
    styles/               # (Mirrors design-system structure; JS references class names)
    bootstrap/            # App initialization (load config, hydrate store, render root)
    tests/                # Test specs (unit + snapshot harness)
```

### 3.1 Core Modules
- `core/eventBus.js`: Minimal pub/sub with typed channel convention (`domain:event` strings).
- `core/store.js`: Immutable-ish reducer-based or signal-style store (small custom or future state lib swap).
- `core/actions.js`: Canonical action creators (e.g., `rollDice()`, `enterTokyo(playerId)`).
- `core/selectors.js`: Pure derived state helpers for UI / AI reuse.

### 3.2 Domain Layer
- `domain/dice.js`: Dice model, roll logic (pure, injectable RNG).
- `domain/player.js`: Player class / factory, energy, health, victory points, power card slots.
- `domain/cards.js`: Power card catalog loader + effects registry.
- `domain/tokyo.js`: Enter/leave Tokyo resolution & slot management.
- `domain/effects.js`: Resolver applying power card triggers / dice outcomes.

### 3.3 UI Layer
- `ui/renderLoop.js`: Batched render scheduler (queue diffs from events).
- `ui/mountRoot.js`: Root mounting & initial component instantiation.
- `ui/stateSubscriptions.js`: Maps store slices to component rerenders.

### 3.4 Components
Each component pair:
- `<name>.component.js`: build()/update()/destroy() with pure inputs.
- `<name>.template.js` (optional): returns HTML string or DOM fragment.
- `<name>.styles.css`: (mirrors tokens naming; imported or injected).
Examples: `playerCard`, `diceTray`, `probabilityPanel`, `logFeed`, `modal`, `tabBar`.

### 3.5 AI Layer
- `ai/strategyRegistry.js`
- `ai/evaluator.js` (scores board states)
- `ai/decisionEngine.js` (composes evaluators + heuristics)
- `ai/simulation.js` (what-if roll simulations)
- `ai/explanations.js` (formats rationale tree)

### 3.6 Services
- `services/storage.js`: Local persistence (settings, last game state snapshot)
- `services/random.js`: RNG abstraction (seeded for deterministic tests)
- `services/logger.js`: Debug + structured event logging

### 3.7 Utilities
- `utils/array.js`, `utils/math.js`, `utils/dom.js`, `utils/assert.js`
- Avoid giant catch-all; group semantically.

### 3.8 Testing Strategy
- Domain: pure unit tests (dice outcomes constraints, card effects).
- AI: deterministic seeds for simulation; snapshot decision trees.
- UI: lightweight DOM harness verifying component diff correctness (build -> update).

### 3.9 Event Flow Example
```
Action: rollDice()
  -> eventBus.emit('dice/rollRequested', payload)
  -> domain/dice.generateRoll() returns new faces
  -> store.apply(action: DICE_ROLLED)
  -> eventBus.emit('dice/rolled', { results })
  -> AI listens (optional) -> updates internal evaluation -> emits 'ai/decisionUpdated'
  -> UI subscription sees store.dice changed -> re-renders DiceTray component.
```

## 4. Naming & Conventions
- Files: kebab-case for modules (`player-card.component.js`).
- Functions: camelCase; factories prefixed `create`, pure builders `build`. Mutators inside domain return new object or patch event → store.
- Events: `namespace/action` lowercase.
- Actions constants (if used): UPPER_SNAKE.
- Classes (rare): Only for stateful domain entities; prefer factories with closures.

## 5. Component Config System (Preview)
Will be formalized in later section (schema & loader). Each config entry defines:
```
{
  "name": "playerCard",
  "selector": ".cmp-player-card",
  "mountPoint": "#players-region",
  "stateKeys": ["players"],
  "build": "playerCard.build",      // reference to exported builder
  "update": "playerCard.update",
  "events": ["player/updated","player/enteredTokyo"],
  "zIndex": 10,
  "assets": ["images/characters/king.png"],
  "initialState": { "collapsed": false }
}
```
A loader resolves these string references to actual functions at runtime.

## 6. Detailed Directory & Module Breakdown

This section deepens the high-level sketch with responsibilities, dependency rules (who may import whom), and anti-pattern guards.

### 6.1 Dependency Direction (Onion Layer)
```
[ UI Components ]
[ UI Orchestrators ]
[ Services / AI ]
[ Domain (pure) ]
[ Core (event bus, store) ]
[ Utilities ] (leaf helpers – imported by any above, no upward imports)
```
Rules:
- Utilities: no imports from any other layer (pure, stateless). If a util needs store/event bus → it's not a util.
- Core: may import utilities only.
- Domain: may import core (for dispatch helpers optionally) + utilities. Avoid importing services or UI.
- Services: may import domain, core, utilities. Must not import UI.
- AI: may import domain, core selectors, utilities. No direct UI or DOM.
- UI Orchestrators: may import core (subscribe), domain selectors, services (read-only), components.
- Components: pure rendering + minimal DOM utilities. No store mutation, no direct domain calls (they receive data / emit events).

Enforcement Strategy:
- Lightweight lint rule via comment tags TODO (future): custom ESLint rule or simple script scanning forbidden patterns.
- Manual review aided by section mapping.

### 6.2 Folder Rationale & Typical Files

#### core/
- `eventBus.js` – Simple pub/sub (subscribe, emit, unsubscribe). Supports wildcard or exact topics.
- `store.js` – Small custom store; holds root state object; exposes `getState()`, `dispatch(action)`, `subscribe(listener)`.
- `actions.js` – Action creator functions returning plain objects `{ type, payload }`.
- `reducers/` – (If we choose reducer split) e.g., `players.reducer.js`, `dice.reducer.js`.
- `selectors.js` – Derived queries (e.g., `selectActivePlayers(state)`).
- `stateShape.js` – Documentation object or JSDoc typedef describing root state for editors.

#### domain/
- Pure logic modules; each exports functions to manipulate domain models (but returns new data; does not mutate UI):
  - `dice.js` – `rollDice(rng, keptFaces)` returns array of face objects.
  - `player.js` – `applyDamage(player, amount)` returns updated player.
  - `cards.js` – Catalog + `resolveCardEffect(effectId, ctx)`.
  - `tokyo.js` – `enterTokyo(state, playerId)` → updated state slice + events to emit.
  - `scoring.js` – Victory point evaluation utilities.
- Optional factories: `createPlayer(name, monsterId)`.

#### ai/
- `strategyRegistry.js` – Register named strategies (aggressive, defensive, random, heuristic).
- `evaluationMetrics.js` – Functions scoring board positions (threat level, energy economy, health risk).
- `decisionEngine.js` – Orchestrates: given `state` returns `DecisionTree` root.
- `simulation.js` – Monte Carlo / enumerated dice reroll sims.
- `explanations.js` – Normalize rationale nodes for UI.

#### services/
- `storage.js` – Persist & load snapshot (localStorage wrapper with namespacing).
- `random.js` – `createRng(seed)` returns function; default uses `crypto.getRandomValues` fallback.
- `logger.js` – Structured log lines; optional memory buffer for dev overlay.
- Future: `analytics.js` (if needed) isolated here.

#### ui/
- `mountRoot.js` – Entry called by bootstrap after store hydration.
- `renderLoop.js` – Debounced frame batching: collects component update requests, flushes via `requestAnimationFrame`.
- `stateSubscriptions.js` – Central mapping from store slices to re-render triggers (minimizes per-component subscriptions).
- `eventsToActions.js` – Translates DOM / component events into store actions (bridge).

#### components/
Subfolders by component. Each folder contains minimal set:
```
components/
  player-card/
    player-card.component.js
    player-card.template.js
    player-card.styles.css (optional reference only)
  dice-tray/
    dice-tray.component.js
    dice-tray.template.js
```
Patterns:
- Component module exports: `create(initialProps)`, `update(nextProps)`, `destroy()`, and optional `getRootElement()`.
- Internal state (if any) is local; global state flows via props.

#### utils/
Split by domain semantics to prevent kitchen-sink:
- `array.js`, `math.js`, `probability.js`, `format.js`, `dom.js`, `assert.js`.
Constraints:
- Must not import from non-utils.
- Should remain small; if file > ~200 lines reassess cohesion.

#### bootstrap/
- `index.js` – Sequence: load config -> init store -> register reducers -> mount root -> initial render -> announce ready.
- `loadConfig.js` – Fetch / import `components.config.json` and validate.
- `wireGlobals.js` – (Optional) Expose debug handles under a guarded namespace (only in dev mode).

#### tests/
Mirrors source structure. Naming: `*.spec.js` or `*.test.js`. Use deterministic seeds for AI/dice.

### 6.3 Import Rules Summary Table
```
Layer        Can Import From            Cannot Import From
-----------  -------------------------  ------------------------------
utils        (none external)            Any other layer
core         utils                      ui, components, services, ai
domain       core, utils                ui, components
services     domain, core, utils        ui, components
ai           domain, core(selectors),utils ui, components, services (side-effect free)
ui/orch      core, domain(selectors), services(read), components, utils  ai (only via events)
components   utils, (config-provided data) core, domain, services, ai, other components (direct)
```

### 6.4 Anti-Patterns to Avoid
- Direct DOM querying inside domain or AI modules.
- Components mutating global state directly (must emit events or call provided callbacks).
- Circular imports (write a script later to detect).
- Action creators performing side-effects (side-effects belong in services or orchestrated handlers).
- Deep prop drilling; prefer subscription mapping.

### 6.5 Potential Future Enhancements (Deferred)
- Code generation for component boilerplate.
- ESLint custom plugin enforcing layering.
- Hot reload boundary for components only.

## 7. Component Configuration Schema

A single source-of-truth JSON file (`components.config.json`) defines UI components to mount. This enables selective enabling, ordering, and future theming toggles without code edits.

### 7.1 Schema Overview
```
ComponentConfigEntry = {
  "name": string,                 // Unique key; used as component id
  "version": string,              // Semver for migrations
  "selector": string,             // Root CSS selector / base class (.cmp-player-card)
  "mountPoint": string,           // CSS selector where root attaches
  "order": number,                // Sibling ordering priority
  "enabled": boolean,             // Feature flag toggle
  "stateKeys": string[],          // Store slices or selector ids this component depends upon
  "build": string,                // Module path ref: "player-card.build"
  "update": string,               // Module path ref: "player-card.update"
  "destroy"?: string,             // Optional cleanup function reference
  "eventsIn"?: string[],          // Event names this component listens to (from event bus)
  "eventsOut"?: string[],         // Events it may emit outward
  "initialState"?: object,        // Component-local initial ephemeral state
  "assets"?: string[],            // Asset paths to preload
  "zIndex"?: number,              // Stacking context guidance
  "accessibility"?: {             // A11y hints to enforce/test
    "role"?: string,
    "aria"?: { [attr: string]: string }
  },
  "telemetry"?: {                 // Optional instrumentation toggles
    "events": boolean
  },
  "features"?: string[],          // Feature tags (e.g., ["ai-insight"]) for conditional injection
  "layoutHints"?: {               // Non-binding hints (grid area, flex order)
    "gridArea"?: string,
    "minWidth"?: string
  },
  "security"?: {                  // Future: gating, permission flags
    "requiresAuth"?: boolean
  }
}
```
`components.config.json` = `ComponentConfigEntry[]`.

### 7.2 Example Entry
```
{
  "name": "diceTray",
  "version": "1.0.0",
  "selector": ".cmp-dice-tray",
  "mountPoint": "#dice-region",
  "order": 10,
  "enabled": true,
  "stateKeys": ["dice", "rerollsRemaining"],
  "build": "dice-tray.build",
  "update": "dice-tray.update",
  "eventsOut": ["ui/dice/keptToggled"],
  "eventsIn": ["dice/rolled"],
  "initialState": { "showProbability": false },
  "assets": ["images/dice/die-face-1.png"],
  "zIndex": 5,
  "accessibility": { "role": "region", "aria": { "label": "Dice Tray" } },
  "features": ["core"],
  "layoutHints": { "gridArea": "dice", "minWidth": "240px" }
}
```

### 7.3 Loader Algorithm (Pseudo-Code)
```
loadComponentsConfig(path) -> entries
  raw = fetchJSON(path)
  validate(raw)
  return normalize(raw)

initializeComponents(entries)
  for entry in entries (sorted by order):
    if !entry.enabled continue
    ensureMountPoint(entry.mountPoint)
    moduleFns = resolveModuleRefs(entry)
    instance = moduleFns.build({
      selector: entry.selector,
      initialState: entry.initialState || {},
      emit: (evt, payload) => eventBus.emit(evt, payload),
      getState: store.getState
    })
    registry[entry.name] = { entry, instance, moduleFns }
    preloadAssets(entry.assets)

onStoreChange(diff)
  for (name, reg) in registry:
    if intersects(diff.changedKeys, reg.entry.stateKeys):
      reg.moduleFns.update({
        state: selectRelevantState(reg.entry.stateKeys),
        emit: (...)
      })
```

### 7.4 Validation Rules
- name: required, unique.
- selector: must start with `.cmp-`.
- mountPoint: valid query; fallback logs warn if missing.
- build/update references: must resolve to existing exported functions.
- stateKeys: optional; if empty, updates only via eventsIn.
- eventsOut names follow `namespace/action` pattern.

### 7.5 Error Handling Strategy
- Non-fatal: missing asset → console warn + continue.
- Fatal: duplicate names, unresolved module ref, JSON parse failure.
- Provide `validateComponentsConfig(entries)` returning `{ valid: boolean, errors: [] }`.

### 7.6 Feature Flag Integration
Future: `features` array cross-checked against an enabled features set (environment injected) to auto-disable components.

### 7.7 Testing the Schema
- Schema JSON validated via runtime validator function (could add a light custom validator; no heavy dependencies initially).
- Unit tests: load minimal config; assert loader calls `build` in correct order; simulate store diff triggers expected updates.

---

## 8. Legacy → New Mapping

This section maps currently identified legacy functions to their future homes & patterns. Goal: eliminate duplication, clarify ownership, and define deprecation tags.

Legend: Action Types
- KEEP (migrate logic, unchanged semantics)
- REWRITE (adjust for purity / separation)
- SPLIT (divide into multiple focused functions)
- DROP (obsolete or superseded)

### 8.1 Legacy File: `dice.js`
| Legacy Function | Action | New Location | Notes |
|-----------------|--------|--------------|-------|
| `createDiceHTML` | REWRITE | component: `dice-tray.build` | Become part of component build; no direct DOM string concatenation in logic layer. |
| `attachDiceEventListeners` | SPLIT | `dice-tray.component` + `eventsToActions.js` | Event wiring occurs in component; translating UI events into bus emissions. |
| `Die.roll` (method) | REWRITE | `domain/dice.rollDiceFace` | Pure function returning new face; aggregated by `rollDice`. |
| `DiceCollection.toggleDiceSelection` | REWRITE | `dice-tray.update` + store action `DICE_TOGGLED_KEEP` | State lives in store slice `dice.kept`. |
| Enable/disable dice UI logic | SPLIT | store-derived props + conditional render class toggles | Driven by `rerollsRemaining` & `phase`. |

### 8.2 Legacy File: `main.js`
| Legacy Function | Action | New Location | Notes |
|-----------------|--------|--------------|-------|
| `_buildPlayerCardElement` | REWRITE | `player-card.build` | Adopt templated component build. |
| `_updateSinglePlayerStats` | REWRITE | `player-card.update` | Props diffing decides minimal DOM changes. |
| `_refreshPlayerDashboardCache` | DROP | N/A | Rely on component instance references. |
| `_refreshDiceElementCache` | DROP | N/A | Same as above. |
| `generateProbabilityAnalysis` | SPLIT | `utils/probability.js` + `ai/evaluationMetrics` | Core math extracted; AI consumes metrics. |
| `formatKeptDice` | KEEP | `utils/format.js` | Pure formatting. |
| `getProbabilityLevel` | REWRITE | `utils/probability.js` | Return numeric + label struct. |
| `formatLogEntry` | REWRITE | `services/logger.js` | Structured log object -> renderer handles styling. |
| `addEmojiToLogMessage` | KEEP | `utils/format.js` | Enhances log message; optional feature flag. |
| Tokyo indicator update logic | REWRITE | `tokyo-status.update` component | Driven by state selectors. |

### 8.3 Legacy File: `game.js`
| Legacy Functionality | Action | New Location | Notes |
|----------------------|--------|--------------|-------|
| Power card purchase logging | REWRITE | `services/logger.js` + event `card/purchased` | Emit canonical event; logger formats. |
| Dice resolution & category logging | SPLIT | `domain/effects.js` + events `dice/resolved`, `damage/applied` | Separate resolution from logging. |
| Phase progression handling | REWRITE | `core/reducers/phase.reducer.js` + actions | Defined enumerated phases (e.g., ROLL, RESOLVE, BUY). |

### 8.4 Legacy File: `monsters.js`
| Legacy Function | Action | New Location | Notes |
|-----------------|--------|--------------|-------|
| `buyCard` | REWRITE | `domain/cards.purchaseCard` + action `CARD_PURCHASED` | Splits validation vs side-effects. |
| Apply card effect inline | SPLIT | `domain/effects.applyEffect` | Pure effect application; returns patch + events. |

### 8.5 Cross-Cutting Behaviors
| Concern | Legacy Style | New Pattern |
|---------|-------------|-------------|
| Logging | Inline `console.log` / formatted strings | Structured events in `services/logger` + UI log component. |
| State Mutation | Direct object property changes | Reducer/action or pure function returning new slice. |
| DOM Caching | Manual element caching arrays | Component instance closures or keyed registry. |
| Probability / Heuristics | Intermixed in UI & main.js | Consolidated in utils + AI metrics modules. |
| Class Toggling | Ad-hoc additions | Declarative props -> `is-*` state classes in components. |

### 8.6 Deprecation Tagging Plan
Introduce inline comments in legacy files (NO edits now—reference only) pattern:
```js
// @deprecated MOVED: see new/domain/dice.js#rollDice
```
We will only add these if/when we create a bridging layer (optional). Currently we keep legacy code untouched and build parallel new system in sandbox.

### 8.7 Migration Strategy for Functions
1. Identify pure logic candidates → move first (least risk).
2. Wrap legacy usage (if dual-run required) with adapter calling new pure function.
3. Replace UI-manipulating legacy code only after new components stable (Phase 3+ in roadmap).

---

## 9. Event & State System Specification

### 9.1 State Shape (Initial Draft)
```
state = {
  players: {
    order: [playerId,...],
    byId: {
      [playerId]: { id, name, monsterId, health, energy, victoryPoints, inTokyo, cards: [cardId], status: { alive: true } }
    }
  },
  dice: {
    faces: [ { value: '1'|'2'|'3'|'claw'|'energy'|'heart', kept: boolean } ],
    rerollsRemaining: number,
    phase: 'idle' | 'rolling' | 'resolved'
  },
  tokyo: {
    occupantId: string|null,
    bayOccupantId?: string|null        // if expansion style slot added later
  },
  cards: {
    deck: string[],
    discard: string[],
    shop: string[]                     // visible purchasable card ids
  },
  phase: 'SETUP' | 'ROLL' | 'RESOLVE' | 'BUY' | 'END_TURN',
  log: { entries: LogEntry[] },
  ui: { modal: { open: boolean, type?: string, data?: any }, flags: { showProbabilities: boolean } },
  ai: { lastDecision?: DecisionSummary },
  meta: { seed: number, turn: number }
}
```

### 9.2 Action Types (Indicative Subset)
```
PLAYER_JOINED
PLAYER_DAMAGE_APPLIED
PLAYER_HEALED
PLAYER_GAINED_ENERGY
PLAYER_SPENT_ENERGY
PLAYER_ENTERED_TOKYO
PLAYER_LEFT_TOKYO
DICE_ROLL_STARTED
DICE_ROLLED
DICE_TOGGLE_KEEP
DICE_REROLL_USED
DICE_PHASE_ADVANCED
CARD_PURCHASED
CARD_EFFECT_APPLIED
PHASE_CHANGED
LOG_APPENDED
UI_FLAG_TOGGLED
MODAL_OPENED
MODAL_CLOSED
AI_DECISION_COMPUTED
```

### 9.3 Event Channels (Pub/Sub outside reducers)
| Event Name | Emitted By | Payload | Purpose |
|------------|-----------|---------|---------|
| `dice/rollRequested` | UI / AI | { kept } | Trigger domain roll workflow. |
| `dice/rolled` | Domain | { faces } | Notify components + AI new dice results. |
| `player/updated` | Store subscriber | { playerId, changes } | Fine-grained UI updates. |
| `tokyo/entered` | Domain | { playerId } | UI highlight focus + potential AI recalculation. |
| `card/purchased` | Domain | { playerId, cardId } | Logging, UI shop refresh. |
| `ai/decisionUpdated` | AI Engine | { decision } | Show reasoning panel updates. |
| `ui/modalOpened` | UI orchestrator | { type } | Other components may suspend animations. |

Events vs Actions:
- Actions mutate state (consumed by reducers). Events are side-channel notifications; some events may correspond 1:1 to actions but decoupled for clarity.

### 9.4 Reducer Strategy
Either single root reducer switching on action.type or slice reducers composed:
- Use small slice reducers for clarity (diceReducer, playersReducer, cardsReducer, phaseReducer, logReducer, uiReducer, aiReducer).
- Each reducer pure: `(slice, action) -> newSlice`.

### 9.5 Store Implementation (Minimal Pseudo-Code)
```
function createStore(rootReducer, initialState) {
  let state = initialState
  const listeners = new Set()
  return {
    getState: () => state,
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn) },
    dispatch(action) {
      const prev = state
      state = rootReducer(state, action)
      if (state !== prev) listeners.forEach(l => l(state, action))
    }
  }
}
```
Enhancements (later): shallow diff detection to derive changed keys for targeted component updates.

### 9.6 Selector Patterns
- Keep selectors pure; no caching first pass; add memoization only if profiling indicates need.
- Example: `selectPlayers(state)`, `selectCurrentPlayer(state)`, `selectKeptDice(state)`.

### 9.7 Event Handling Workflow Example
```
UI: user clicks ROLL → emit 'dice/rollRequested'
Listener (controller) -> dispatch({ type: DICE_ROLL_STARTED })
Domain: rollDice(rng, kept) -> faces
Dispatch({ type: DICE_ROLLED, payload: { faces } })
EventBus.emit('dice/rolled', { faces })
AI subscribed -> recompute -> EventBus.emit('ai/decisionUpdated', { decision })
UI subscription -> dice-tray.update props
```

### 9.8 Error & Edge Handling
- Invalid action type: ignored (optional dev warning).
- State invariants: assert via `utils/assert.js` (e.g., health never < 0, rerollsRemaining >= 0).
- Concurrency: Single-threaded dispatch queue; prevent re-entrancy by guarding dispatch within dispatch (throw or queue).

### 9.9 Persistence Policy
- Snapshot minimal slices: players, meta, cards.shop, dice (only when phase != 'rolling').
- Use debounced persistence (e.g., 500ms) in `services/storage` subscriber.

### 9.10 Performance Considerations
- Avoid full tree re-render; components declare `stateKeys` to filter updates.
- Optional diff map: track last slice references to skip update calls if unchanged.

### 9.11 Testing State & Events
- Reducers: table-driven tests for each action.
- Events: spy on eventBus for expected emission sequences.
- Invariants: test violation triggers assertion error in dev mode.

---

## 10. AI Refactor Strategy

### 10.1 Goals
- Deterministic & testable decision pipeline.
- Pluggable strategies with composable evaluators.
- Transparent rationale: every leaf decision annotated with metrics.
- Clear separation between simulation (what could happen) and evaluation (how good is it).

### 10.2 Layers
| Layer | Responsibility |
|-------|----------------|
| State Snapshot | Frozen game state copy used for evaluation (no mutation). |
| Simulation | Generate outcome trees for dice rerolls or card effects. |
| Evaluation Metrics | Independent scoring functions (health risk, energy gain potential, VP progress). |
| Aggregation & Weighting | Combine metric scores into composite value via strategy weights. |
| Decision Engine | Enumerate options → evaluate → rank → select with tie-break rules. |
| Explanation Builder | Build tree: Option -> metrics -> composite -> chosen flag. |

### 10.3 Core Modules
- `ai/metrics/*.js` (e.g., `survivability.js`, `energyEconomy.js`, `victoryProgress.js`).
- `ai/weights.js` – Default weight sets per strategy (`aggressive`, `balanced`).
- `ai/simulation.js` – `simulateReroll(state, keptIndices)` enumerates or samples possible outcomes (cap with max breadth N).
- `ai/decisionEngine.js` – `computeDecision(state, context)` returns `DecisionTree`.
- `ai/strategyRegistry.js` – registers available strategies & weight maps.
- `ai/explanations.js` – `serializeDecision(decisionTree)` flatten for UI.

### 10.4 Decision Data Structures
```
DecisionTree = {
  actionType: 'ROLL' | 'KEEP' | 'BUY' | 'USE_CARD',
  options: DecisionOption[],
  chosenOptionId: string,
  meta: { strategy: string, turn: number }
}

DecisionOption = {
  id: string,
  description: string,            // human readable
  metrics: { [metricName]: { score: number, detail?: any } },
  compositeScore: number,
  rationale: string[],            // short textual reasons
  children?: DecisionTree         // nested follow-up decision
}
```

### 10.5 Evaluation Flow (Example: Dice Keep Decision)
```
1. Gather current dice faces & rerollsRemaining.
2. Generate candidate keep masks (heuristic limited).
3. For each mask:
   a. Simulate N future roll outcomes (Monte Carlo or exhaustive if small).
   b. For each simulated final set compute metrics (VP potential, damage output, survivability).
   c. Aggregate metric averages → compositeScore = Σ(weight_m * normalized(metric_m)).
4. Rank options -> choose highest composite (apply tie-break: fewer rerolls used, risk tolerance alignment).
5. Build DecisionTree; store under state.ai.lastDecision (action AI_DECISION_COMPUTED).
```

### 10.6 Normalization Strategy
- Each metric module exports `range` (min,max) or dynamic scaling function.
- Composite formula: `Σ(weight * (metricScore - min)/(max-min))` with guard against zero division.

### 10.7 Extensibility
- New strategy: add weight map + optional custom metric weighting overrides.
- New metric: implement module; register in `metrics/index.js`; add default weight (possibly zero until tuned).

### 10.8 Testing
- Seed RNG for simulation to produce reproducible averages (store seed in state.meta.seed).
- Snapshot test: decision tree shape for a known scenario must match expected chosen option id & score ordering.
- Metric unit tests: given controlled state slices outputs stable numeric values.

### 10.9 Performance Controls
- Cap simulation breadth (e.g., `MAX_SIM_PATHS = 200`).
- Early prune dominated options (all metrics <= other option metrics).
- Cache metric evaluations for repeated identical sub-states (memo key from dice faces + player stats slice hash).

### 10.10 Transparency & UI Integration
- Expose `ai/decisionUpdated` event containing summary: `{ actionType, chosen, topAlternatives: [...id], metrics: { aggregated } }`.
- Optional verbose mode attaches full tree for developer tool panel.

### 10.11 Risk Mitigation
- Overfitting: keep balanced default weights; allow runtime override panel for experimentation.
- Performance spikes: measure average ms per decision; warn if > threshold (e.g., 20ms).

---

## 11. Milestone Roadmap & Phased Migration

Milestones designed to deliver incremental value while minimizing risk. Only operate inside `new/` until final switchover decision.

### 11.1 Phase Overview
| Phase | Title | Focus | Exit Criteria |
|-------|-------|-------|---------------|
| 0 | Planning | Complete design docs | Sections 1–11 finalized; approval checkpoint (internal). |
| 1 | Core Foundation | Event bus, store, basic reducers, utilities | Can dispatch sample actions & observe state transitions + tests pass. |
| 2 | Domain Extraction | Pure dice, player, tokyo, cards logic | Legacy logic mapped & unit tests green for core functions. |
| 3 | Component Skeletons | Key components build/update (player-card, dice-tray, log-feed) | Components render dummy data from mock state. |
| 4 | Real Data Wiring | Store + components + actions integrated | User can perform a dice roll cycle in sandbox. |
| 5 | AI Integration v1 | Basic decision engine (dice keep heuristic) | AI emits decisions; reasoning panel shows summary. |
| 6 | Card Effects & Tokyo Rules | Effects resolver + shop interactions | Purchase + apply effect flows executed in sandbox. |
| 7 | Advanced AI & Metrics | Simulation & weighting system | AI decisions stable < 20ms; test coverage for metrics > 80%. |
| 8 | Performance & Polish | Render diff optimization + a11y | Frame updates remain < 16ms under typical interactions. |
| 9 | Validation & Parallel Run | Compare legacy vs new outcomes | 20 sample games produce identical end-state distributions within tolerance. |
| 10 | Switchover Prep | Final checklist & cut strategy | Feature parity confirmed; legacy flagged as deprecated. |

### 11.2 Rollback Strategy
- Each phase deliverable isolated; if a defect emerges, revert to previous milestone branch (Git recommended branching per phase `feature/mX-description`).
- No deletion of legacy during early phases; switchover only after Phase 9 verification.

### 11.3 Metrics & KPIs
| KPI | Target |
|-----|--------|
| Unit Test Coverage (domain + ai) | >= 85% statements |
| Average AI decision time | < 20ms |
| Initial load (sandbox) | < 150KB JS uncompressed (core + first components) |
| Bundle module count (core phases 1–5) | < 60 modules |
| Lint errors | 0 blocking |

### 11.4 Phase Interdependencies
- Phase 2 depends on Phase 1 utilities & store.
- Phase 3 depends on Phase 1 (store) & partial Phase 2 (dice/player minimal models).
- Phase 5 depends on dice logic (Phase 2) & event wiring (Phase 4).

### 11.5 Parallelization Opportunities
- While Phase 2 domain extraction occurs, another track can prototype basic component templates (Phase 3 skeleton) using mock data provider.

### 11.6 Acceptance Review Checklist (Per Phase)
- All tests for changed area passing.
- Lint & formatting clean.
- Plan file updated with any deviations.
- Risk register entry updated if new risks discovered.

## 12. Refactor Playbook & Coding Standards

### 12.1 Extraction Workflow
1. Identify candidate (e.g., dice roll logic) in legacy file.
2. Copy logic into new pure function under `domain/` or `utils/`.
3. Write unit test verifying existing behavior with sample inputs.
4. Optimize / simplify (remove DOM, side-effects) ensuring tests stay green.
5. Integrate into new pipeline (store action / event) without touching legacy.
6. (Optional later) Introduce adapter in legacy to call new function – only after confidence.

### 12.2 Coding Standards
| Concern | Standard |
|---------|----------|
| Module Size | Prefer < 150 lines; split when exceeding. |
| Function Length | < ~30 lines; if longer, extract helpers. |
| Naming | VerbFirst for actions (`applyDamage`), nouns for data structures (`DecisionTree`). |
| Immutability | Avoid in-place mutations in domain; clone shallow or return new objects. |
| Error Handling | Fail fast in dev (assert) → degrade gracefully in prod (warn). |
| Side-Effects | Centralize: services (I/O) or UI orchestrators (DOM scheduling). |
| Logging | Use `services/logger` only; no stray `console.log` in modules. |
| Events | Lowercase with slash; no camelCase topics. |
| CSS Class Sync | Only components add/remove `is-*` classes based on props/state. |

### 12.3 Testing Guidelines
- Domain: no mocks; pure data assertions.
- AI: seeded RNG; test both deterministic (`seed=123`) and variation bounding (score within threshold).
- UI components: mount in ephemeral container; assert DOM subset (query by data attributes, not class names primarily).
- Negative tests: invalid action types do not alter state.

### 12.4 Documentation Expectations
- Each module top JSDoc: purpose + dependencies.
- Complex algorithms (AI simulation) include complexity notes.
- Public functions: param & return tags (JSDoc) for editor intellisense.

### 12.5 Commit Hygiene (Recommended)
- One concern per commit (e.g., "feat(core): add event bus").
- Include tests with feature commits.
- Reference plan sections in commit body for traceability.

### 12.6 Tooling (Future Optional)
- ESLint config restricting forbidden import paths via regex.
- Prettier or minimal formatting configuration.
- NPM init (if bundling later) – but defer until code volume justifies.

### 12.7 Performance Profiling Hooks
- Provide `Debug.time(name, fn)` util (dev only) to measure AI decision & render cycles.
- Maintain simple moving average metrics for AI evaluation times.

### 12.8 Accessibility Standards
- Components with interactive elements must specify role + keyboard interaction notes.
- Ensure focus management for modal open/close cycles.

---

## 13. Quality Gates & Risk Register

### 13.1 Quality Gates
| Gate | Description | Enforcement |
|------|-------------|-------------|
| Lint Clean | No lint errors in `new/` | (Future) ESLint run before commit. |
| Unit Tests Pass | All tests green | Run test harness script. |
| Coverage Threshold | Domain+AI statements >= 85% | Coverage report (NYI). |
| Performance | AI decision < 20ms avg (seeded scenario) | Profiling harness. |
| Bundle Size (Optional) | Core + first components < 150KB raw | Manual measurement initially. |
| Accessibility Checks | Key components have roles/labels | Manual review + checklist. |
| Event Hygiene | No unused events, no orphan listeners | Script listing subscriptions vs emissions (future). |

### 13.2 Risk Register
| Risk | Impact | Likelihood | Mitigation | Trigger | Owner |
|------|--------|-----------|-----------|---------|-------|
| Scope Creep (adding features mid-migration) | Delays & instability | Medium | Freeze feature set until Phase 6 | Request for new feature during Phases 1–4 | Maintainer |
| Architecture Drift | Harder maintenance | Medium | Layer import rules & periodic review | Import from higher layer detected | Reviewer |
| AI Performance Degradation | UI lag | Low-Med | Cap simulation breadth, profiling | Decision > 20ms | AI Dev |
| Test Coverage Erosion | Hidden regressions | Medium | Gate build on coverage | Coverage < 85% | CI Script |
| Event Storm / Over-Emitting | Debug complexity | Low | Consolidate emissions in orchestrators | Many events with no listeners | Core Dev |
| Config Schema Bloat | Complexity & inertia | Medium | Versioned schema, deprecate old fields | Large diff adding many fields | Architect |
| Data Corruption (improper reducers) | Game logic bugs | Low | Invariant asserts & reducer tests | Assertion failure | Core Dev |
| Parallel Legacy Divergence | Hard switchover | Medium | Periodic parity test runs | Different end-state results | QA |

### 13.3 Monitoring & Review Cadence
- Weekly architecture review: verify layer boundaries.
- Performance snapshot each phase boundary.
- Risk table updated with new entries before starting next phase.

## 14. Execution Checklist & Next Actions
- [ ] Add `core/stateShape.js` documenting initial empty state.
- [ ] Add `utils/assert.js`, `utils/math.js` seeds.
### 14.2 Phase 2 Preparation
- [ ] Implement `domain/dice.js` pure roll logic (RNG injectable).
- [ ] Implement `domain/player.js` factory + damage/heal.
- [ ] Add unit tests for dice distribution constraints, health boundaries.

### 14.3 Tooling (Optional Early)
- [ ] Initialize minimal package management if needed (Skip for now unless test runner chosen that needs it).

### 14.4 Definition of Done (Phase 1)
- Event bus works with wildcard OR confirm decision to skip wildcard (documented).
- Store can handle at least one dummy action (`INIT_TEST`).
- Tests exist for: event bus subscription / unsubscription, state mutation.

### 14.5 Deferred Items (Documented)
- ESLint configuration.
- Advanced diff-based render scheduling.
- Custom schema validator generation.
- Performance instrumentation wrapper (Debug.time).

### 14.6 Switchover Pre-Requisites Snapshot
- All milestones 0–8 complete & validated.
- Legacy parity validation harness built & executed (Phase 9).

### 14.7 Closure
Once checklist items for Phase 1 are complete, update this plan marking items done and proceed to Phase 2 domain extraction.

---

(End of current migration plan scope. Implementation begins next within `new/src/`.)

---

### Phase 4 Progress Update (Logging, Phases, Rerolls, Tokyo Placeholder)
Implemented:
- Reducers: phase, log, tokyo.
- Structured logger service & `logFeed` component.
- Dice reroll lifecycle (first roll seeds 2 rerolls, sequence completion detection).
- Automatic phase transition ROLL -> RESOLVE when rerolls depleted.
- Tests covering phase/log/reroll sequence.

Deferred (Phase 4 follow-ups): turn rotation, extended phase chain, Tokyo scoring rules.

### Phase 5 Progress Update (Card Engine Skeleton)
Implemented:
- Card actions & reducer (`cardsReducer`) for deck build, shop fill, purchase, discard.
- Domain catalog & shuffle utilities (`domain/cards.js`).
- Cards service (`services/cardsService.js`) building deck, filling 3-card shop, purchase pipeline (energy spend → ownership → refill).
- Players reducer extended to track acquired cards.
- Selectors for cards & player cards.
- Test `cards.spec.js` validating initialization and purchase flow.
- Bootstrap integration invoking `initCards`.

Deferred / Next Steps:
- Effect resolution (queue & application), discard reshuffle.
- Comprehensive catalog & balancing.
- UI components for shop & card detail, buy/reroll/refresh interactions.
- AI valuation for card purchasing.

Risks / Notes:
- Shop refill reuses deck build action; may introduce a distinct action for clarity (`CARDS_DECK_UPDATED`).
- Tests mutate player energy directly (replace with proper gain action once energy income logic added).

