# King of Tokyo - Implementation TODO List
*Original Baseline: December 30, 2024*  
*Revised & Reprioritized: September 29, 2025 (Parity Audit)*

This revision: (1) Marks items completed since baseline, (2) Introduces flow/timing parity tasks, (3) Re-sequences roadmap around Phase FSM, unified yield, AI depth, and persistence.

## ✅ Completed Since Baseline (Dec 2024 → Sept 2025)
- [x] Tokyo dual-slot support (City + Bay) + start-of-turn VP logic
- [x] Shop flush mechanic (2⚡) – functional (logging/tests pending)
- [x] Peek (clairvoyance) card + transient modal
- [x] Dynamic dice slot rendering & expansion animation
- [x] Attack pulse visual feedback layer
- [x] Pause / resume slice & overlay
- [x] Yield prompt scaffold (CPU timeout + heuristic) – to be unified

## 🚨 **CRITICAL FEATURES - MUST IMPLEMENT (Revised)**

### Power Cards System (HIGH PRIORITY – Breadth & Engine)
- [ ] **Expand card catalog** - Currently ~10 cards, need 50+ base game cards
- [ ] **Complex effect engine** - Only basic effects work (VP gain, energy gain)
- [ ] **Card interaction system** - Cards that modify other cards
- [ ] **Effect timing and stacking** - When multiple cards interact
- [ ] **Discard vs Keep mechanics** - Full implementation of both types
- [ ] **Targeted effects** - Cards that target specific players
- [ ] **Conditional effects** - Cards with "if" conditions

### AI Decision System (HIGH PRIORITY – Strategic Depth)  
- [ ] **Strategic decision making** - Multi-turn planning
- [ ] **Personality-based behavior** - Different monster personalities
- [ ] **Card purchase intelligence** - Smart card buying decisions
- [ ] **Risk assessment** - Tokyo stay/leave decisions
- [ ] **Dice keep strategy** - Optimal dice keeping logic
- [ ] **Win condition awareness** - Adapting strategy based on game state

#### AI Infrastructure Unification (NEW – Precedes Depth Expansion)
- [ ] Deprecate duplicate enhanced AI file (`new/js/ai-decisions.js`) – enforce single engine import.
- [ ] Remove scheduled auto-keep timer path from `aiDecisionService.js` (controller becomes sole actuator).
- [ ] Introduce perception layer (`buildAIState(storeState, activePlayerId)`) – pure extract; eliminate reducer global peeks.
- [ ] Deterministic engine mode (seed + fixed Monte Carlo trial count) under `TEST_MODE` flag.
- [ ] Replace purchase heuristic with portfolio optimizer advisory wrapper.
- [ ] Integrate yield advisory via engine projection (single rationale channel).
- [ ] Effect queue virtual state adapter (pending heals/damage influence risk posture).
- [ ] Decision node labeling (`source`, `factors[]`, `confidence`).
- [ ] Telemetry schema unification (`ai.decision`, `ai.yield`, `ai.purchasePlan`).

### Game Flow & Timing Integrity (ELEVATED TO HIGH)
- [ ] Phase finite state machine (legal transition table)
- [ ] `turnCycleId` concurrency guard (invalidate stale async tasks) (PARTIAL – effect engine + dice resolution guarded; FSM pending)
- [x] Event-based dice completion (`DICE_ROLL_RESOLVED`) – removed polling loops & enriched metadata payload
- [ ] Guarded timer rollout (wrap remaining pacing & animation timeouts) (NEW)
	- [x] Phase machine prototype (feature-flag `window.__KOT_FLAGS__.USE_PHASE_MACHINE`) with guarded transitions & invalid transition telemetry (Oct 1 2025)
- [ ] Minimum phase duration enforcement (ROLL / RESOLVE / BUY_WAIT)
- [ ] Unified yield decision modal (human) + deterministic AI decision promise
- [ ] BUY_WAIT explicit phase (user ends or timeout)
- [ ] Timing span instrumentation + dev overlay (phase durations, reroll latency)
- [ ] Structured takeover sequence tests (attacks → yield → takeover)
- [ ] **Animation system** - Smooth transitions and feedback
- [ ] **Sound effects** - Audio feedback for actions
- [ ] **Error handling** - Graceful error recovery
- [ ] **Edge case handling** - Unusual game state management
- [ ] **Performance optimization** - Smooth gameplay
- [ ] **Mobile responsiveness** - Touch-friendly interface

## 🔧 **TECHNICAL DEBT - FOUNDATION (Updated)**

### Testing & Quality (HIGH PRIORITY – Expanded)
- [ ] Phase FSM transition tests
- [ ] Yield pipeline end-to-end tests (multi-occupant scenarios)
- [ ] Shop flush test (cost & uniqueness)
- [ ] Peek duration / secrecy test (hidden from non-active)
- [ ] Start-of-turn VP dual-slot snapshot test
- [ ] Elimination cleanup (Tokyo slot vacated) tests
- [ ] Dice slot stacking & max cap (8) test
- [ ] AI decision rationale node presence test
- [ ] Timing span integrity (no overlap/negative) test
- [ ] Core legacy parity regression harness (subset)
- [ ] **Unit tests for game logic** - Core rules testing
- [ ] **Integration tests** - Full game flow testing  
- [ ] **Component tests** - UI component behavior
- [ ] **AI decision tests** - AI behavior validation
- [ ] Deterministic snapshot tests (multi-pair reroll, attack cluster low HP, extra die + reroll bonus).
- [ ] Duplicate decision invocation guard test (ensure single actuation per roll).
- [ ] Purchase advisory regression tests (stable ordering with unchanged energy/state).
- [ ] **Performance tests** - Load and stress testing
- [ ] **Accessibility tests** - Screen reader compatibility

### Data & Persistence (PROMOTED TO HIGH)
- [ ] Store snapshot serializer (versioned) – core slices: players, dice, tokyo, cards, meta
- [ ] Snapshot hydrator with validation & migration
- [ ] Autosave cadence (turn end) with debounce
- [ ] Manual export/import UI
- [ ] Corruption detection (state hash) logging
- [ ] **Complete save/load system** - Full game state persistence
- [ ] **Game statistics tracking** - Win rates, preferences
- [ ] **Settings persistence** - User preference storage
- [ ] **Migration system** - Handle data format changes
- [ ] **Export/import games** - Share game states
- [ ] **Cloud save support** - Optional cloud storage

### Developer Experience (LOW PRIORITY)
- [ ] **Development tools** - Debug panels and helpers
- [ ] **Hot reload support** - Faster development cycles
- [ ] **Build optimization** - Faster build times
- [ ] **Code documentation** - Comprehensive API docs
- [ ] **Style guide** - Consistent coding standards

## 🎮 **GAMEPLAY FEATURES - ENHANCEMENT (Adjusted)**

### Advanced Features (MEDIUM PRIORITY)
- [ ] **Game variants** - Dark Edition support
- [ ] **Custom rules** - House rules implementation
- [ ] **Tournament mode** - Multi-game tournaments
- [ ] **Player statistics** - Individual player tracking
- [ ] **Achievement system** - Unlock system
- [ ] **Replay system** - Watch previous games

### User Experience (MEDIUM PRIORITY)
- [ ] **Tutorial system** - New player onboarding
- [ ] **Help system** - In-game help and tips
- [ ] **Accessibility features** - Full WCAG compliance
- [ ] **Internationalization** - Multi-language support
- [ ] **Themes & customization** - Visual customization
- [ ] **Keyboard shortcuts** - Power user features

## 🎨 **UI/UX IMPROVEMENTS (Augmented)**
- [ ] Yield modal parity (legacy styling cues + clarity copy)
- [ ] BUY_WAIT phase visual timer / hint
- [ ] AI turn pacing indicator (“Thinking…”) with adaptive duration
- [ ] Timing diagnostics panel (dev only) toggle

### Visual Polish (MEDIUM PRIORITY)
- [ ] **Complete theming system** - Consistent visual design
- [ ] **Advanced animations** - Smooth, engaging transitions
- [ ] **Visual feedback** - Clear action confirmation
- [ ] **Loading states** - Better user feedback
- [ ] **Empty states** - Helpful empty state designs
- [ ] **Icon system** - Consistent iconography

### Interaction Design (LOW PRIORITY)
- [ ] **Drag and drop** - Intuitive card/dice interaction
- [ ] **Gesture support** - Touch gestures on mobile
- [ ] **Contextual menus** - Right-click functionality
- [ ] **Hover states** - Desktop interaction feedback
- [ ] **Focus management** - Keyboard navigation
- [ ] **Screen reader support** - Full accessibility

## 📱 **PLATFORM SUPPORT**

### Mobile & Responsive (MEDIUM PRIORITY)
- [ ] **Touch optimization** - Mobile-first interactions
- [ ] **Responsive layouts** - All screen sizes
- [ ] **Performance on mobile** - Smooth mobile experience
- [ ] **PWA features** - App-like mobile experience
- [ ] **Offline support** - Play without internet
- [ ] **App store deployment** - Native app versions

### Browser Support (LOW PRIORITY)
- [ ] **Cross-browser testing** - All major browsers
- [ ] **Polyfill management** - Older browser support
- [ ] **Performance optimization** - Fast loading
- [ ] **Memory management** - Efficient resource use
- [ ] **Error tracking** - Production error monitoring

## 🔍 **IMPLEMENTATION PRIORITIES (New Sequencing)**
Status Update (Oct 1, 2025): Phase Alpha Steps 1 & 3 complete – AI actuation unified (timer removed), perception layer (`buildAIState`) added, dice roll event migration done (metadata + polling removal). Step 2 partially complete (turnCycleId guard in effect engine & dice flow; FSM still pending).

### Phase Alpha (Flow Parity)
1. AI actuation unification (remove timer auto-keep) + perception layer
2. FSM + `turnCycleId` (PARTIAL – guards in place, FSM pending)
3. Dice roll resolved event (no polling) & CPU loop refactor (DONE)
4. Deterministic mode (seeded; fixed trials) + snapshot harness
	- [ ] RNG adapter module (`rngFactory(seed)`) with Mulberry32 implementation
	- [ ] Seed derivation: `{ turnCycleId, finalRollIndex, playerId }` → 32-bit seed hash
	- [ ] Inject RNG into AI decision pipeline (eliminate implicit Math.random)
	- [ ] Fixed Monte Carlo trial count constant (`AI_TRIALS_TEST_MODE`)
	- [ ] Decision metadata enrichment: `meta.seed`, `meta.trials`, `meta.durationMs`
	- [ ] Snapshot harness: multi-run identical output assertion (dice keep sets, yield advisory)
	- [ ] Divergence logger (on mismatch dump state + seed chain)
	- [ ] Telemetry counter: `ai.determinism.diff` (target 0)
	- [ ] Guard ensures TEST_MODE disables adaptive early-exit heuristics
5. Unified yield & takeover sequence (yield advisory integration)
6. BUY_WAIT phase + timing spans + takeover ordering asserts

### Phase Beta (Strategic Depth & Persistence)
1. Enhanced AI heuristic modules (survival risk, VP race delta, resource economy, Tokyo risk)
2. Snapshot persistence + export/import UI
3. Expanded card catalog (+10–15 cards)
4. Effect processor MVP (sequential resolution + failure handling)

### Phase Gamma (UX & Observability)
1. Timing diagnostics overlay (phase spans, decision latency)
2. Rationale tree enrichment (factor weights + branch scores table)
3. Yield & buy UX polish (copy, accessibility, countdown)
4. Effect queue sidebar & correlation with decisions
5. Accessibility pass (landmarks, live regions, focus loops)

### Phase Delta (Polish & Extension)
1. Advanced card interactions (conditional triggers, steals)
2. Multi-target selection finalized
3. AI personality weighting layer
4. Performance profiling & micro-optimizations
 5. Purchase planning multi-turn projection (energy accumulation horizon)

## 📊 **SUCCESS METRICS (Expanded)**

- [ ] **Feature Parity**: 90%+ of legacy features implemented
- [ ] **Performance**: <2s initial load, <100ms interactions
- [ ] **Accessibility**: WCAG AA compliance
- [ ] **Testing**: 80%+ code coverage
- [ ] **User Experience**: Smooth, responsive gameplay
- [ ] **Stability**: <1% error rate in production
- [ ] **Turn Timing Consistency**: CPU turn σ/μ < 0.25 (100-turn sample)
- [ ] **Yield Decision Latency**: <300ms AI, immediate modal human
- [ ] **Phase Transition Violations**: 0 in automated suite
- [ ] **Stale Async Actions**: 0 after FSM integration
- [ ] **Guarded Timer Coverage**: ≥95% of async timeouts wrapped by guard utilities
- [ ] **AI Rationale Coverage**: >85% major actions annotated with factor weights
- [ ] **Deterministic Stability**: 0 decision diffs across 10 seeded runs per scenario
- [ ] **Duplicate Invocation Count**: 0 `ai.decision.duplicate` events / 500-turn simulation
- [ ] **Effect-Aware Decisions**: ≥90% when queue pending modifications

---
## Deterministic Mode (NEW SECTION)
**Purpose**: Ensure reproducible AI decision outcomes for CI & regression analysis.

**Activation**: `window.__KOT_TEST_MODE__ = true` (or ENV flag at build time)

**Behavior Changes**:
1. Monte Carlo trial count fixed (e.g., 80 trials) instead of adaptive.
2. Seeded RNG (Mulberry32 or similar) keyed by `turnCycleId` + roll number.
3. Decision output includes `meta: { seed, trials }` for audit.
4. Performance profiling disabled (avoids adaptive feedback loops).

**Test Harness Expectations**:
- Snapshot tests assert identical `keepIndices`, `stopEarly`, `confidence`, and `factors` arrays across N runs.
- Divergence triggers diagnostic dump (state view + RNG seed).

---

## Concurrency Guard Pattern (NEW SECTION)
**Purpose**: Prevent stale asynchronous callbacks (effects, timers, delayed UI pacing) from mutating state after a new turn begins.

**Core Mechanism**:
1. A monotonically increasing `turnCycleId` increments on each `NEXT_TURN` (or equivalent state transition).
2. Async producers capture a snapshot (`const cycle = getTurnCycleId()`) when scheduling work.
3. Before executing, guarded callbacks compare current `turnCycleId` to the captured snapshot; if mismatched, they abort silently.
4. Utilities supplied in `turnGuards.js`:
	- `makeTurnGuard(getCycleFn)` → returns `{ isStale(snapshot), snapshot() }` helpers.
	- `guardedTimeout(store, fn, ms, label?)` → wraps `setTimeout`, executing only if cycle unchanged.

**Design Goals**:
- Eliminate race conditions from overlapping phase transitions.
- Ensure effect queue cannot apply outdated effects post-yield / elimination.
- Provide low-friction migration path (drop-in replacement for `setTimeout`).
- Maintain deterministic test mode stability (aborted callbacks do not perturb RNG sequence).

**Current Coverage (Oct 1, 2025)**:
- Effect engine processing loop (stale cycle abort)
- Dice roll resolution path (event driven; no lingering polling)
- Selection polling inside effect engine (converted to `guardedTimeout`)

**Pending Coverage**:
- Animation pacing timers (enter/leave Tokyo visuals)
- Yield modal auto-dismiss / CPU pacing timers
- Card purchase debounce / advisory timers
- Any residual legacy `setTimeout` usages (audit pass required)

**Migration Checklist** (for each `setTimeout` found):
1. Replace with `guardedTimeout(store, () => { /* original body */ }, delay, 'label')`.
2. If callback chains further async work, ensure each link re-validates or uses guarded wrappers.
3. Add optional dev log on stale abort when `TEST_MODE` to surface unexpected drops.

**Instrumentation Roadmap**:
- Introduce optional dev overlay panel row: Guard Drops (count per turn).
- Emit telemetry event `guard.abort` with `{ label, scheduledAt, executedAt? }` (executedAt absent when aborted).

**Acceptance Criteria**:
- No state mutations observed from callbacks whose scheduling turn != execution turn in 500-turn simulation.
- Guarded Timer Coverage metric ≥95%.
- Zero phase FSM violations attributable to stale async side-effects.

**Next Actions**:
1. Audit remaining timeouts → produce coverage report.
2. Wrap high-frequency pacing timers first (yield decision, animation sequences).
3. Add harness to simulate rapid consecutive `NEXT_TURN` events and verify zero stale mutations.

---
## Phase Finite State Machine (NEW SECTION)
**Status**: Prototype integrated (`phaseMachine.js`) behind feature flag `window.__KOT_FLAGS__.USE_PHASE_MACHINE`.

**Phases**: SETUP → ROLL → RESOLVE → (YIELD_DECISION | BUY | GAME_OVER) → BUY → (BUY_WAIT) → CLEANUP → ROLL …

**Transition Guard Hooks** (context-driven):
- diceSequenceComplete: dice sub-phase reached resolved/sequence-complete
- yieldRequired: yield prompts exist (Tokyo attack)
- resolutionComplete: dice accepted, no unresolved yield prompts, effect queue idle (strengthened Oct 1 2025)
- victoryConditionMet: winner flagged in meta slice
- yieldDecisionsResolved: all yield prompts decided
- postPurchaseFollowupsPending: effect queue has pending follow-ups
- postPurchaseDone: queue drained & idle
- buyWindowClosed: pacing window elapsed or user confirmed
- turnAdvanceReady: cleanup complete / safe to advance

**Actions/Events**: PHASE_TRANSITION (meta logged), PHASE_TRANSITION_INVALID (telemetry)

**Reducer**: `phaseTransitionReducer` holds current, previous, history (cap 100).

**Invalid Transition Telemetry**: increments `window.__KOT_PHASE_WARN__` and appends event to optional `window.__KOT_TELEMETRY__`.

**Adoption Plan**:
1. Run with flag off (default) & compare logs for parity (ROLL/RESOLVE/BUY/CLEANUP sequence) – harness supports.
2. Enable flag in dev to detect illegal legacy direct dispatches (search for `phaseChanged(` occurrences to replace).
3. Expand guards (e.g., forbid RESOLVE→BUY unless dice.accepted=true and effectQueue pending=0 unless buy path).
4. Integrate min-duration enforcement (DONE prototype: ROLL≥300ms, RESOLVE≥180ms, BUY≥350ms) – transition defers if not elapsed.

**Next Enhancements**:
- Replace direct phaseChanged dispatch calls globally (lint rule or runtime warn).
- Add explicit reason codes enumeration to avoid free-form strings.
- Integrate with deterministic mode snapshots for phase history diffs.
- Add assertion harness: ensure no duplicate PHASE_TRANSITION with identical from/to consecutively.
- Adaptive min durations based on CPU speed setting (e.g., fast lowers thresholds but never 0).

**Acceptance Criteria (FSM)**:
- 0 invalid transitions across 500 simulated turns (test harness) with phase machine enabled.
- Phase history aligns with legacy baseline trace for equivalent scenarios.
- Telemetry includes reason + turnCycleId for each PHASE_TRANSITION entry.


---
**Note**: Revisions incorporate parity audit findings (Sept 29, 2025) and Oct 1 progress addendum. Legacy remains the reference standard until Flow Parity (Phase Alpha) is achieved. Next scheduled parity review: post unified yield + deterministic mode completion.