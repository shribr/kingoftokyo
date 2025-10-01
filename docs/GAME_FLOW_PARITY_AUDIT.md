# Game Flow Parity Audit (Legacy v1 vs Rewrite v2)

Date: September 29, 2025  
Author: Automated audit (v2 architectural review)

## Objective
Document concrete differences in turn sequencing, timing, AI behavior, and interaction clarity between the production-quality legacy implementation and the ongoing modular rewrite. Serves as the canonical reference for measuring “feel parity” beyond raw rule coverage.

## Methodology
1. Inspected legacy `game.js`, `dice.js` for sequencing primitives (turn guards, min durations, roll callbacks, yield flow).  
2. Inspected rewrite services (`turnService.js`, `resolutionService.js`, `aiDecisionService.js`) and domain logic.  
3. Mapped phase + interaction timeline for both.  
4. Identified timing control points, concurrency risks, and UX divergence.  
5. Created remediation roadmap (see main TODO + rules parity doc).  

## Sequencing Comparison
| Aspect | Legacy v1 | Rewrite v2 | Delta |
|--------|-----------|------------|-------|
| Turn Guarding | Flags (`endingTurn`, `switchingPlayers`) prevent double transitions | 🟡 Partial guard via `turnCycleId` (effect queue + dice scheduling) | Extend guard coverage to all timeouts |
| Min Turn Duration | Enforced (≥1s) | 🧪 Prototype min durations (ROLL / RESOLVE / BUY) | Tune thresholds & broaden coverage |
| Dice Animation Completion | Callback-driven with clear phase gating | ✅ Event-based `DICE_ROLL_RESOLVED` (no polling) | Add edge-case harness tests |
| Reroll Flow | Lock while rolling; UI disables | ✅ Event final resolution; no polling loop | Validate race elimination via test harness |
| Keep Selection Timing | Disabled mid-animation | ✅ Unified actuation (timer path removed) | Audit for residual stale timers |
| Attack → Yield → Takeover | Ordered chain with modal clarity | ⚠️ Mixed heuristic + timeouts + immediate takeover attempts | Confusing for users; inconsistent timing |
| Buy Phase | Player-driven exit | ⚠️ Fixed delay; placeholder pacing | Implement explicit BUY_WAIT interactive window |
| CPU Pacing | Distinct phases with dramatic pauses | ⚠️ Static millisecond waits | Feels mechanical |
| Logging Granularity | Rich action categorization | 🟡 Limited (fewer categories) | Harder to diagnose parity gaps |

## AI Behavioral Gap Summary
- Missing multi-roll expected value simulation and survival risk modeling.  
- No personality or strategy weighting (all AI acts similarly).  
- Purchase logic: simple efficiency scoring; no synergy memory.  
- Yield logic: immediate + timeout heuristic mixture vs cohesive rationale.  

## Effect & Card Handling
Legacy: Inline resolution chain with broad catalog; explicit stateful modifiers.  
Rewrite: Effect queue scaffold not yet processing complex stack or delayed triggers.  

## UX / Interaction Parity Gaps
| Area | Legacy Behavior | Rewrite Behavior | Needed |
|------|-----------------|------------------|--------|
| Yield Modal | Blocking decision UI | Heuristic/timeouts | Unified modal + promise resolution |
| Buy Phase | Player linger allowed | Auto-advance | BUY_WAIT phase + CTA |
| Tokyo Entry Highlight | Strong visual emphasis | Basic log | Entry animation & slot highlight |
| AI Thinking Indicator | Implicit pacing feels natural | None | Explicit subtle indicator |
| Timing Feedback | Not required (consistent) | Inconsistent pacing | Timing overlay (dev only) |

## Root Causes
1. 🟡 FSM prototype behind feature flag (not universal yet).  
2. ✅ Polling replaced by event-driven final roll resolution.  
3. ⚠️ Conflated yield decision paths (human vs AI) – pending unified modal.  
4. 🧪 Incomplete effect processing system (queue scaffold + stale guard only).  
5. 🟡 Phase spans + transition history; deeper timing metrics pending.  

## Remediation Roadmap (Condensed)
Roadmap Status Snapshot:
P0: 🟡 FSM prototype; ✅ dice resolved event; ⬜ unified yield; ⬜ BUY_WAIT phase.  
P1: 🟡 Timing spans (initial only); ⬜ AI heuristic modules; ⬜ persistence.  
P2: ⬜ Effect queue operational + inspector; ⬜ rationale weights.  
P3: ⬜ Advanced card interactions; ⬜ AI personalities; ⬜ performance pass.  

## Metrics (Targets Post-Remediation)
| Metric | Target |
|--------|--------|
| CPU Turn σ/μ | < 0.25 |
| Yield Latency (AI) | < 300ms |
| Phase Violations | 0 per 500 turns |
| Stale Async Actions | 0 |
| AI Rationale Coverage | >85% major actions annotated |

## Acceptance Criteria for “Flow Parity Achieved”
1. All turn transitions logged with phase span (start/end + duration).  
2. No polling loops remain in CPU path.  
3. Yield decisions always appear as explicit modal (human) or deterministic rationale (AI).  
4. Tokyo takeover never occurs before all yield prompts resolved.  
5. Buy phase either manually exited or times out with explicit countdown.  

## Traceability Links
- `RULES_PARITY.md` (revised matrix)
- `IMPLEMENTATION_TODO.md` (phased roadmap)
- `UI_PARITY_TODO.md` (visual & timing tasks)

---
Next audit checkpoint scheduled after unified yield + deterministic mode milestone (Phase Alpha subset).
\n+---
## Addendum – Additional Integration Issues (Sept 30, 2025)

### Newly Observed Since Prior Audit
1. **Dual AI Invocation Path**: `cpuTurnController` immediate decisions + `aiDecisionService` scheduled auto-keep timer can overlap, risking double writes to dice keep state.
2. **Modifier Side-Channel**: Reroll bonus & dice slot modifiers read indirectly via global (`window.__KOT_NEW__`) inside reducers; undermines deterministic replay and unit isolation.
3. **Monte Carlo Adaptivity**: Adaptive trial count without deterministic test guard introduces non-reproducible decision output variance.
4. **Effect Queue Blind Spot**: Pending queue entries (heal/damage) not represented in AI perception; risk posture / yield decisions ignore imminent changes.
5. **Mixed Provenance Decision Nodes**: Decision tree currently merges raw heuristic nodes and enriched engine projections without labeling source → interpretability gap.

## Remediation Addendum (Refined Ordering)
Prepend to existing roadmap (status inline):
0. ✅ Remove timer-based auto-keep (unify actuation in controller).
1. ⬜ Introduce perception layer (`buildAIState`) eliminating reducer global peeks.
2. 🟡 Deterministic mode flag (fixed trials + seeded RNG) for engine decisions in tests (initial dice path done; yield decisions pending full integration).
3. ⬜ Augment perception with effect queue virtual deltas (pending heal/energy/VP adjustments).
4. ⬜ Label decision tree nodes with `source: 'heuristic' | 'engine'` and unify scoring surface.
5. ⬜ Integrate yield advisory output from engine projections (single rationale path).

### Expanded Metrics
| Metric | Target | Notes |
|--------|--------|-------|
| Dual Decision Invocations / Roll | 0 | Logged via telemetry counter |
| Deterministic Variation (10 runs) | 0 diffs | TEST_MODE enabled |
| Effect-Aware Decisions (when pending effects) | ≥90% | Decision metadata includes `pendingEffectImpact` |
| Modifier Access Purity | 100% selector-based | Enforced via lint check |
| Labeled Decision Nodes | 100% | Each node includes `source` + `factors[]` |

### Success Criteria Additions
- Snapshot tests covering multi-pair reroll branching produce identical keepIndex sets across runs.
- Yield decisions include structured confidence + risk differentials.
- No reducer references global window for modifier retrieval.
- Telemetry log contains zero entries of type `ai.decision.duplicate` over 500-turn simulation.

---
End Addendum (Sept 30, 2025)

---
## Progress Addendum (Oct 1, 2025)

### Implemented Since Sept 30
1. Event-based dice resolution (`DICE_ROLL_RESOLVED`) removed polling loop.
2. Phase FSM prototype with guarded transitions and invalid transition telemetry (feature-flag gated).
3. Prototype min phase durations (ROLL / RESOLVE / BUY) added for pacing stabilization.
4. Concurrency guard (`turnCycleId`) applied to effect queue & dice scheduling (partial coverage; more needed).
5. AI dice actuation unified (timer auto-keep path removed); final roll metadata captured.
6. Phase span instrumentation + transition history logging established.

### Current Residual Gaps
- Unified yield modal & deterministic AI yield rationale.
- Effect processor & inspector (beyond queue scaffold).
- Persistence (snapshot serialize/hydrate flows).
- Strategic AI depth (multi-roll EV, survival risk, personality).
- Expanded card catalog & stacking interactions.
- Accessibility + UX timing polish (focus, landmarks, pacing indicators).

### Recommended Next Focus
Deterministic mode (seeded RNG + reproducible AI decisions) combined with unified yield modal to lock sequencing integrity and interaction clarity before deep AI heuristic or effect breadth expansion.

### Tracking Metrics (Interim)
| Metric | Pre-Change | Current | Target |
|--------|------------|---------|--------|
| Dice Polling Loops | Present | Removed | Removed |
| Potential Double Actuation Path | Present | Eliminated | Eliminated |
| Phase Transition Telemetry | None | Invalid transitions logged | Stable zero after stabilization |
| Guard Coverage (async timeouts) | Minimal | Partial | Complete |

---
End Addendum (Oct 1, 2025)