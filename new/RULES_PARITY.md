# King of Tokyo – Rules & Experience Parity (Revised)

Revision Date: September 29, 2025 (supersedes Sept 24 report)

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

## Dimension Summary (High-Level)
| Dimension | Legacy (v1) | Rewrite (v2) | Notes |
|-----------|-------------|--------------|-------|
| Core Rule Correctness | ✅ ~95% | ⚠️ ~80% | Fundamental scoring, damage, Tokyo, victory correct; yield sequencing timing weaker |
| Turn / Timing Integrity | ✅ | ⚠️ ~45% | Missing FSM & min phase durations; polling in CPU loop |
| Dice Flow UX | ✅ | ⚠️ | Roll/reroll functional; keep timing races possible for AI scheduling |
| Yield / Tokyo Interaction | ✅ | ⚠️ | Mixed immediate + timeout heuristic; clarity gap vs legacy modal flow |
| Power Card Breadth | ✅ (broad catalog) | ⚠️ ~20% | Small subset + limited effects + no advanced stacking UI |
| Effect Engine (Sequencing) | ✅ (inline resolved) | 🧪 | Queue scaffold only; little UI/control surface |
| AI Strategy (Dice & Cards) | ✅ Advanced | ⚠️ Basic | Single-pass heuristic, no multi-turn planning/personality weighting |
| AI Turn Pacing / Natural Feel | ✅ | ⚠️ | Static delays; lacks adaptive “thinking” spans |
| Persistence / Recovery | ✅ | ⛔ | Snapshot import/export not implemented yet (docs previously implied) |
| Logging & Observability | ✅ Rich | ⚠️ | Fewer semantic categories & timing spans |
| Accessibility | ⚠️ Partial | ⚠️ Early | Both need structured pass; v2 lags on landmarks & live regions |
| UX / Visual Polish | ✅ Mature | ⚠️ Incomplete | Components exist; flow & polish gaps (modals, prompts) |

Weighted composite parity estimate for v2: ≈ 50% (see audit methodology in `GAME_FLOW_PARITY_AUDIT.md`).

## Detailed Rule Matrix (Mechanical Coverage)
Pure mechanical correctness excluding pacing/UX (what earlier doc measured); kept for transparency.

| Category | Legacy | Rewrite | Gap Summary | Planned Fix |
|----------|--------|---------|-------------|-------------|
| Dice Core Loop (3 rolls, keeps) | ✅ | ✅ | – | Add event-driven roll resolved action |
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
| Yield / Leave Tokyo Choice | ✅ | ⚠️ | Heuristic + timeout mixing | Unified yield modal & deterministic AI decision flow |
| Start-of-Turn VP (City/Bay) | ✅ | ✅ | – | Add automated assertions |
| Victory (VP) | ✅ | ✅ | – | – |
| Victory (Last Standing) | ✅ | ✅ | – | – |
| Healing Rules | ✅ | ✅ | – | – |
| Elimination Cleanup (Tokyo slots) | ✅ | ⚠️ | Basic, needs edge-case tests | Add elimination test battery |
| Effect Timing System | ✅ | 🧪 | Queue scaffold only | Implement processor + UI inspector |
| Persistence | ✅ | ⛔ | Missing snapshot flows | Serialize & hydrate store slices |
| AI Decision System | ✅ | ⚠️ | Simplistic heuristic | Port layered heuristics + personality weights |
| Accessibility (ARIA / Focus) | ⚠️ | ⚠️ | Both partial | Add landmark & live region mapping |
| Logging (Structured) | ✅ | ⚠️ | Limited categories | Introduce timing spans & categories |
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
1. Absence of finite state machine and concurrency guards (turnCycleId) → timing fragility.  
2. Mixed synchronous/asynchronous yield resolution → player clarity loss.  
3. AI lacks strategic layers (no multi-roll EV planning, no personality scaling).  
4. Effect queue not operational → cannot support complex card stack sequencing yet.  
5. Persistence missing → cannot resume long games in rewrite path.

## Immediate Remediation Roadmap (Excerpt)
| Priority | Item | Outcome |
|----------|------|---------|
| P0 | Add phase FSM + `turnCycleId` | Deterministic transitions & stale async cancellation |
| P0 | Replace dice polling with `DICE_ROLL_RESOLVED` event | Stable CPU reroll loop |
| P1 | Unified yield modal + AI decision promise | Clear, deterministic takeover ordering |
| P1 | BUY_WAIT explicit phase (interaction or timeout) | Matches legacy purchasing pace |
| P1 | Timing instrumentation (spans) | Diagnose & tune parity quantitatively |
| P2 | AI heuristic expansion (survival, VP race, economy, Tokyo risk) | Improved decision quality |
| P2 | Effect processor + inspector UI | Foundation for advanced card parity |
| P2 | Store snapshot persistence | Restore session continuity |

## Updated Coverage Estimation Method
Prior method: counted feature booleans.  
New method: weights (Core correctness 40%, Timing 15%, AI 15%, Cards breadth 15%, UX polish 10%, Persistence 5%).  
Rewrite composite ≈ 50%. Recalculation details in audit doc (`GAME_FLOW_PARITY_AUDIT.md`).

## Verification Plan Additions
- Introduce automated phase transition assertion tests.  
- Add timing span capture & histogram overlay (dev mode).  
- Unit tests for yield pipeline & takeover ordering.  
- Snapshot test: start-of-turn VP awarding in dual-slot scenarios.

## Transparency & Historical Note
This correction intentionally preserves earlier (overstated) matrix in repository history for traceability. Parity claims will now require dual sign-off (mechanical + experiential) before escalation.

---
Next scheduled parity review: After implementation of FSM + unified yield (target mid-October 2025).

