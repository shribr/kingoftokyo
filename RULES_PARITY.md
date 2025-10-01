# King of Tokyo – Rules & Experience Parity (Revised)

Revision Date: September 29, 2025 (supersedes Sept 24 report)
Progress Addendum: October 1, 2025 (Updated Oct 1 – Unified Yield & Deterministic Flow Integration)

## Purpose
Provide an accurate, multi-dimensional view of parity between:
1. Legacy (v1) implementation (`/js`, fully playable)  
2. Rewrite (v2) modular architecture (`/new`)

Earlier documents overstated rewrite parity (claiming ~95%). This revision recalibrates metrics to include not only surface rule execution but also timing fidelity, AI depth, interaction clarity, card breadth, and UX polish.

## Legend
✅ Full / production-quality parity  
⚠️ Partial / simplified / quality gap  
⛔ Missing  
🧪 Scaffold present (non-player-facing)  
🟡 In progress (implementation underway but not complete)  
⬜ Not started

## Dimension Summary (High-Level)
| Dimension | Legacy (v1) | Rewrite (v2) | Notes |
|-----------|-------------|--------------|-------|
| Core Rule Correctness | ✅ ~95% | ⚠️ ~80% | Fundamental scoring, damage, Tokyo, victory correct; yield sequencing timing weaker |
| Turn / Timing Integrity | ✅ | ⚠️ ~55% | FSM prototype (flag) + min phase durations + event-based dice; yield/buy unification pending |
| Dice Flow UX | ✅ | ⚠️ (improved) | Event final roll; AI double-actuation race removed; minor animation edge races remain |
| Yield / Tokyo Interaction | ✅ | ⚠️ (improved) | Unified batched prompt + deterministic AI decisions; human modal UI wiring pending |
| Power Card Breadth | ✅ (broad catalog) | ⚠️ ~20% | Small subset + limited effects + no advanced stacking UI (unchanged) |
| Effect Engine (Sequencing) | ✅ (inline resolved) | 🧪 | Queue scaffold + turnCycleId stale guard; processor/UI pending |
| AI Strategy (Dice & Cards) | ✅ Advanced | ⚠️ Basic | Single-pass heuristic; actuation path unified (logic depth unchanged) |
| AI Turn Pacing / Natural Feel | ✅ | ⚠️ | Static delays; lacks adaptive spans (unchanged) |
| Persistence / Recovery | ✅ | ⛔ | Snapshot import/export not implemented (unchanged) |
| Logging & Observability | ✅ Rich | ⚠️ (improved) | Added phase spans + transition history; effect/yield rationale sparse |
| Accessibility | ⚠️ Partial | ⚠️ Early | Both need structured pass; v2 lags on landmarks & live regions (unchanged) |
| UX / Visual Polish | ✅ Mature | ⚠️ Incomplete | Components exist; flow & polish gaps (modals, prompts) (unchanged) |

Weighted composite parity estimate for v2: ≈ 50% (see audit methodology in `GAME_FLOW_PARITY_AUDIT.md`). Updated post-Oct 1 addendum: ≈ 55% (≈ 57% provisional after unified yield pipeline backend; pending UI modal parity bump).

## Detailed Rule Matrix (Mechanical Coverage)
Pure mechanical correctness excluding pacing/UX (what earlier doc measured); kept for transparency.

| Category | Legacy | Rewrite | Gap Summary | Planned Fix |
|----------|--------|---------|-------------|-------------|
| Dice Core Loop (3 rolls, keeps) | ✅ | ✅ | Event-based final resolution added | Add targeted race condition test harness |
| Reroll Bonuses | ✅ | ✅ | Need tests | Unit tests (stacking) |
| Extra Dice Slots | ✅ | ✅ | Animation only; stacking tests missing | Add stacking/limit tests |
| Number Triples Scoring | ✅ | ✅ | – | – |
| Energy Gain/Spend | ✅ | ✅ | – | – |
| Shop Refill (3 cards) | ✅ | ✅ | – | – |
| Shop Flush (2⚡) | ✅ | ✅ | Missing log & test | Add log & unit test |
| Card Purchase Flow | ✅ | ✅ | Catalog breadth gap | Expand catalog incrementally |
| Discard Immediate Effects | ✅ | ⚠️ | Subset only | Implement remaining handlers |
| Keep Effects / Modifiers | ✅ | ⚠️ | Limited types | Extend effect handler registry |
| Attack Resolution (City/Bay) | ✅ | ✅ | – | Attack logging enrichment |
| Tokyo Entry (Forced) | ✅ | ✅ | – | – |
| Yield / Leave Tokyo Choice | ✅ | ⚠️ (backend unified) | Batched pipeline + deterministic AI seeds; human-facing modal & takeover animation polish pending | UI modal integration & takeover feedback polish |
| Start-of-Turn VP (City/Bay) | ✅ | ✅ | – | Add automated assertions |
| Victory (VP) | ✅ | ✅ | – | – |
| Victory (Last Standing) | ✅ | ✅ | – | – |
| Healing Rules | ✅ | ✅ | – | – |
| Elimination Cleanup (Tokyo slots) | ✅ | ⚠️ | Basic, needs edge-case tests (unchanged) | Add elimination test battery |
| Effect Timing System | ✅ | 🧪 | Queue scaffold + stale guard | Implement processor + UI inspector |
| Persistence | ✅ | ⛔ | Missing snapshot flows | Serialize & hydrate store slices |
| AI Decision System | ✅ | ⚠️ | Simplistic heuristic; unified actuation & final roll capture | Port layered heuristics + personality weights |
| Accessibility (ARIA / Focus) | ⚠️ | ⚠️ | Both partial | Add landmark & live region mapping |
| Logging (Structured) | ✅ | ⚠️ (improved) | Phase spans + transition records | Expand semantic categories + rationale logging |
| Tokyo Bay Activation (5–6 players) | ✅ | ✅ | – | Add gating test |
| Multi-Target Effects | ✅ | ⚠️ | Target selection scaffold only | Complete selection interaction loop |

## “Feel Parity” Metrics (Subjective UX / Timing)
| Aspect | Legacy Bench | v2 Current | Delta Cause | Target Remediation |
|--------|-------------|-----------|------------|--------------------|
| Turn Smoothness | Consistent paced | Variable / abrupt | No min-phase guards | FSM + min duration barriers |
| AI Thinking Illusion | Natural pauses | Mechanical waits | Static timeouts | Pacing planner + adaptive delays |
| Yield Interaction Clarity | Clear modal & flow | Mixed heuristic/timeouts | Split decision paths | Unified modal + single decision pipeline |
| Dice Keep Feedback | Locked during roll | Occasional race risk | Timer-based AI keep | Event-driven post-animation hook |
| Buy Phase Engagement | Player-controlled window | Auto short delay | Forced timeout | Explicit BUY_WAIT phase |

## Key Regressions vs Legacy
1. (Partially remediated) FSM prototype + concurrency guards (turnCycleId) added; full adoption & enforcement pending.  
2. Mixed synchronous/asynchronous yield resolution → player clarity loss.  
3. AI lacks strategic layers (no multi-roll EV planning, no personality scaling).  
4. Effect queue not operational → cannot support complex card stack sequencing yet.  
5. Persistence missing → cannot resume long games in rewrite path.

## Immediate Remediation Roadmap (Excerpt)
| Priority | Item | Outcome |
|----------|------|---------|
| P0 | Add phase FSM + `turnCycleId` | 🟡 Deterministic transitions & stale async cancellation (prototype under feature flag) |
| P0 | Replace dice polling with `DICE_ROLL_RESOLVED` event | ✅ Stable CPU reroll loop (complete) |
| P1 | Unified yield modal + AI decision promise | ⬜ Clear, deterministic takeover ordering |
| P1 | BUY_WAIT explicit phase (interaction or timeout) | ⬜ Matches legacy purchasing pace |
| P1 | Timing instrumentation (spans) | 🟡 Initial phase spans + transition history present (needs expansion) |
| P2 | AI heuristic expansion (survival, VP race, economy, Tokyo risk) | ⬜ Improved decision quality |
| P2 | Effect processor + inspector UI | ⬜ Foundation for advanced card parity |
| P2 | Store snapshot persistence | ⬜ Restore session continuity |

## Updated Coverage Estimation Method
Prior method: counted feature booleans.  
New method: weights (Core correctness 40%, Timing 15%, AI 15%, Cards breadth 15%, UX polish 10%, Persistence 5%).  
Rewrite composite ≈ 50%. Recalculation details in audit doc (`GAME_FLOW_PARITY_AUDIT.md`). Post-progress provisional composite ≈ 55%.

## Verification Plan Additions
- Introduce automated phase transition assertion tests.  
- Add timing span capture & histogram overlay (dev mode).  
- Unit tests for yield pipeline & takeover ordering.  
- Snapshot test: start-of-turn VP awarding in dual-slot scenarios.

## Transparency & Historical Note
This correction intentionally preserves earlier (overstated) matrix in repository history for traceability. Parity claims will now require dual sign-off (mechanical + experiential) before escalation.

---
Next scheduled parity review: After unified yield + deterministic mode (target mid-October 2025).

### Progress Addendum (October 1, 2025)
Completed / Improved Since Sept 29:
- Event-based dice resolution (single `DICE_ROLL_RESOLVED` action) replacing polling
- Phase FSM prototype with guarded transitions + min phase duration prototype (ROLL / RESOLVE / BUY)
- Concurrency guard utilities (`turnCycleId`) applied to effect queue & dice scheduling
- AI dice actuation unified (removed legacy auto-keep timer path); final roll metadata captured
- Phase span instrumentation + transition history logging

Impact Rationale:
- Timing Integrity uplift (polling removal + partial FSM adoption) drives principal composite increase
- Observability uplift (spans/history) provides incremental confidence
- Other weighted domains (AI strategic depth, card breadth, persistence) unchanged → caps total shift

Outstanding High-Impact Gaps:
- Human-facing unified yield modal (backend deterministic pipeline implemented)
- Effect processor & inspector UI (beyond queue scaffold)
- Persistence (snapshot serialize/hydrate)
- Strategic AI multi-roll EV planning & personality weighting
- Broader card catalog & advanced stacking effects
- Accessibility & UX polish (landmarks, focus, live regions)

Next Focus Recommendation:
Finalize human yield modal integration (hook into batched prompts) and introduce BUY_WAIT phase pacing before expanding AI strategic depth and effect processor.

### Addendum (Oct 1, 2025 – Unified Yield Pipeline Implemented)
Implemented:
1. Batched yield prompt action (`YIELD_PROMPTS_CREATED`) + terminal resolution action (`YIELD_ALL_RESOLVED`).
2. Deterministic AI yield decision seeding (`combineSeed('KOT_YIELD_DEC', ...)`) with telemetry (`ai.yield.decision`).
3. Telemetry events: `yield.prompts.created`, `yield.decision` (human), `ai.yield.decision`, `yield.flow.complete`, `yield.partial`.
4. Legacy timeout (5100ms) path bypassed (scheduled for full removal) eliminating timing ambiguity for all‑AI scenarios.
5. Advisory now includes deterministic seed (`KOT_YIELD_ADV`) enabling reproducible rationale tests.

Pending (UI / Experience Layer):
- Modal sequencing + a11y focus trap for human defenders.
- Visual takeover confirmation after last prompt decision.
- Removal of legacy prompt action creators from remaining UI components.

Parity Impact:
- Yield timing determinism improved; takeover ordering now strictly gated by resolved prompt set.
- Interaction clarity for human defenders still partial (no new modal yet) → dimension remains ⚠️ pending UI layer work.

