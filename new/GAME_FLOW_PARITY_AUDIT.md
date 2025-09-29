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
| Turn Guarding | Flags (`endingTurn`, `switchingPlayers`) prevent double transitions | None (direct dispatch) | Risk of double nextTurn under rapid UI evolution |
| Min Turn Duration | Enforced (≥1s) | Not enforced | Abrupt pacing possible |
| Dice Animation Completion | Callback-driven with clear phase gating | Delay + polling (`dice.phase`) in CPU loop | Replace with event dispatch |
| Reroll Flow | Lock while rolling; UI disables | Poll until `resolved` | Potential keep / reroll race |
| Keep Selection Timing | Disabled mid-animation | AI keep scheduled via timeout | Race if animation delayed |
| Attack → Yield → Takeover | Ordered chain with modal clarity | Mixed heuristic + timeouts + immediate takeover attempts | Confusing for users; inconsistent timing |
| Buy Phase | Player-driven exit | Fixed delay then CLEANUP | Limits purchase interactions |
| CPU Pacing | Distinct phases with dramatic pauses | Static millisecond waits | Feels mechanical |
| Logging Granularity | Rich action categorization | Limited (fewer categories) | Harder to diagnose parity gaps |

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
1. Lack of formal finite state machine.  
2. Timers instead of event-driven roll and resolve completions.  
3. Conflated yield decision paths (human vs AI).  
4. Incomplete effect processing system.  
5. Minimal instrumentation for timing introspection.  

## Remediation Roadmap (Condensed)
P0: FSM, dice resolved event, unified yield, BUY_WAIT phase.  
P1: Timing spans, AI heuristic modules, persistence.  
P2: Effect queue operational + inspector, rationale weights.  
P3: Advanced card interactions, AI personalities, performance pass.  

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
Next audit checkpoint scheduled after Phase Alpha completion.