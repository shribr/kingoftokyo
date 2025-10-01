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
- [x] Deprecated duplicate enhanced AI file (formerly `new/js/ai-decisions.js`) – unified on single engine; legacy snapshots retained under `src/legacy/`.
- [ ] Remove scheduled auto-keep timer path from `aiDecisionService.js` (controller becomes sole actuator).
- [ ] Introduce perception layer (`buildAIState(storeState, activePlayerId)`) – pure extract; eliminate reducer global peeks.
- [ ] Deterministic engine mode (seed + fixed Monte Carlo trial count) under `TEST_MODE` flag.
- [ ] Replace purchase heuristic with portfolio optimizer advisory wrapper.
- [ ] Integrate yield advisory via engine projection (single rationale channel).
- [ ] Effect queue virtual state adapter (pending heals/damage influence risk posture).
- [ ] Decision node labeling (`source`, `factors[]`, `confidence`).
- [ ] Telemetry schema unification (`ai.decision`, `ai.yield`, `ai.purchasePlan`).

### Game Flow & Timing Integrity (ELEVATED TO HIGH)
- [x] Phase finite state machine (legal transition table) – baseline implemented (`phaseFSM.js`) + controller utilities (`phaseController.js`).
- [x] `turnCycleId` concurrency guard (baseline: meta.turnCycleId + guard utilities adopted in CPU turn & watchdog).
- [ ] Phase controller adoption (migrate direct `phaseChanged` dispatches in services to centralized API).
- [ ] Extended concurrency adoption (apply guard to effect queue processing & UI pacing timers).
- [ ] Event-based dice completion (`DICE_ROLL_RESOLVED`) – remove polling loops
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
Status Update (Oct 1, 2025): Phase Alpha Step 1 complete – AI actuation unified (timer removed), perception layer (`buildAIState`) added, engine inputs centralized.

### Phase Alpha (Flow Parity)
1. AI actuation unification (remove timer auto-keep) + perception layer
2. FSM + `turnCycleId`
3. Dice roll resolved event (no polling) & CPU loop refactor
4. Deterministic mode (seeded; fixed trials) + snapshot harness ✅ (trials=64, per-turn & per-decision seeding)
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
- [ ] **AI Rationale Coverage**: >85% major actions annotated with factor weights
- [ ] **Deterministic Stability**: 0 decision diffs across 10 seeded runs per scenario
- [ ] **Duplicate Invocation Count**: 0 `ai.decision.duplicate` events / 500-turn simulation
- [ ] **Effect-Aware Decisions**: ≥90% when queue pending modifications

---
## Deterministic Mode (UPDATED)
**Purpose**: Reproducible dice + AI decision outcomes for CI & regression analysis.

**Activation**: `window.__KOT_TEST_MODE__ = true` (browser) or `KOT_TEST_MODE=1` (env).

**Behavior Changes Implemented**:
1. Monte Carlo trial count fixed to 64.
2. Seeded RNG (Mulberry32) for dice: seed = combineSeed('KOT_DICE', turnCycleId, rollIndex, playerId).
3. Seeded RNG for AI decisions: seed = combineSeed('KOT_AI', turnCycleId, decisionIndex, playerId).
4. Decision object now includes `deterministic: { seed, trials, turnCycleId, decisionIndex }`.
5. Profiling remains optional; deterministic mode does not auto-disable it yet (future improvement: freeze adaptive responses entirely).

**Pending Enhancements**:
- Seeded shop card ordering.
- Replay export (seed + state diff stream).
- Deterministic card effect resolution ordering assertions.

**Smoke Harness**: `tools/deterministicSmoke.js` validates stable dice + decision object across two runs.

---

**Note**: Revisions incorporate parity audit findings (Sept 29, 2025). Legacy remains the reference standard until Flow Parity (Phase Alpha) is achieved.