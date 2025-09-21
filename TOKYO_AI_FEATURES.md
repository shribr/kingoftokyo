# King of Tokyo AI Feature Catalog

> Living document enumerating all implemented and scaffolded AI logic. Keep this updated whenever new intelligence features are added or existing ones materially evolve.

_Last updated: 2025-09-21_

## Legend
- **Status**: `Implemented`, `Scaffolded`, `Planned`, `In-Progress`
- **Impact Axes**: 🎯 Strategy | 🎲 Probability | 🧠 Adaptivity | ⚔️ Interaction | ♻️ Survivability | 💰 Economy | 🛠 Infrastructure

---
## 1. Core Architecture & Pipeline
| Feature | Status | Impact | Description | Gameplay Effect |
|---------|--------|--------|-------------|-----------------|
| Deterministic Multi-Stage Pipeline | Implemented | 🛠🎯 | Structured phases: state → goal → dice EV → decision → invariants | Predictable, debuggable AI with layered reasoning |
| Unified State Snapshot | Implemented | 🛠🎯 | Aggregates player stats, opponents, dice, cards, context | Enables holistic decisions vs local heuristics |
| Invariant Enforcement | Implemented | 🛠 | Final legality + sanity pass | Prevents illegal/degenerate actions |

## 2. Personality & Behavioral Modulation
| Feature | Status | Impact | Description | Gameplay Effect |
|---------|--------|--------|-------------|-----------------|
| Personality Profile (risk/aggression/strategy) | Implemented | 🧠🎯 | Per-CPU sliders modulate thresholds | Distinct AI styles (varied opponents) |
| Dynamic Reroll Thresholds | Implemented | 🎲🧠 | Adjusts stop conditions by personality & context | Less mechanical reroll patterns |
| Strategy Bias Weighting | Implemented | 🧠🎯 | Emphasizes economy, VP, or elimination paths | Tailored long-term planning |

## 3. Goal Management
| Feature | Status | Impact | Description | Gameplay Effect |
|---------|--------|--------|-------------|-----------------|
| Persistent Active Goal | Implemented | 🧠🎯 | Retains objective until outweighed by higher EV path | Reduces erratic pivoting |
| Goal Fostering / Upgrading | Implemented | 🧠🎲 | Switches from weak set (1s) to stronger set when justified | Efficient VP progression |
| Churn Minimization Thresholds | Implemented | 🧠 | Requires EV delta before abandoning pursuit | Stability in plan execution |

## 4. Dice Evaluation & Probability Modeling
| Feature | Status | Impact | Description | Gameplay Effect |
|---------|--------|--------|-------------|-----------------|
| Triple & Set EV Modeling | Implemented | 🎲 | Calculates expected success of chasing sets | Smarter pursuit of VP combos |
| Four-/Five-of-a-Kind Extension | Implemented | 🎲 | Weighs incremental marginal value of deeper sets | Avoids premature abandonment |
| Additive Future Face Utility | Implemented | 🎲🧠 | Anticipates future heal/attack/energy potential | Proactive reroll targeting |
| Virtual Extra Die Integration | Implemented | 🎲🧠 | Accounts for owned future capacity (extra die) | Correct valuation of enablers |
| Reroll Benefit Assessment | Implemented | 🎲 | Evaluates marginal gains per remaining reroll | Reduces wasteful roll usage |

## 5. Positional & Tokyo Strategy
| Feature | Status | Impact | Description | Gameplay Effect |
|---------|--------|--------|-------------|-----------------|
| Tokyo Entry Evaluation | Implemented | 🎯♻️ | Balances VP tempo vs expected damage intake | Avoids reckless entry |
| Yield / Retreat Suggestion | Implemented | ♻️🧠 | Flags exit when survival probability drops | Extends AI longevity |
| Inside vs Outside Biasing | Implemented | 🎯 | Alters dice priorities based on position | Context-sensitive aggression |

## 6. Risk & Survivability Management
| Feature | Status | Impact | Description | Gameplay Effect |
|---------|--------|--------|-------------|-----------------|
| Health Threshold Adaptation | Implemented | ♻️🧠 | Dynamic heal prioritization when vulnerable | Mitigates knockout spirals |
| Aggression vs Preservation Balance | Implemented | 🧠🎯 | Personality + situation gates risk-taking | Realistic tempo shifts |

## 7. Opponent & Threat Awareness
| Feature | Status | Impact | Description | Gameplay Effect |
|---------|--------|-------------|-----------------|
| Opponent Health Profiling | Implemented | ⚔️🎯 | Tracks weakest/average health & KO potential | Times lethal pushes |
| Denial / Threat Detection (Cards) | Implemented | ⚔️🧠 | Identifies high-leverage enemy gains to block | Interactive drafting tension |

## 8. Power Card Parsing & Feature Abstraction
| Feature | Status | Impact | Description | Gameplay Effect |
|---------|--------|--------|-------------|-----------------|
| Hybrid Effect Parsing (structured + fallback) | Implemented | 🛠💰 | Extracts standardized feature tags | Enables generalized scoring |
| Feature Tag Canon (attack/heal/energy/extraDie/extraReroll/vp) | Implemented | 🛠 | Single vocabulary across systems | Simplifies synergy & DR logic |

## 9. Power Card Portfolio Logic
| Feature | Status | Impact | Description | Gameplay Effect |
|---------|--------|--------|-------------|-----------------|
| Baseline Heuristic Scoring | Implemented | 💰🧠 | Keyword + cost efficiency + personality | Avoids random purchases |
| Defensive Card Purchase Evaluation | Implemented | ⚔️💰 | Adds denial premium vs opponent trajectories | Strategic counterplay |
| Player Purchase Memory Store | Implemented | 🧠🛠 | Tracks acquired cards & feature counts | Foundation for adaptive builds |
| Feature Extraction Helper | Implemented | 🛠 | Central utility for tagging cards | Feeds synergy & DR layers |
| Synergy Matrix (Multiplicative) | Scaffolded | 🧠💰 | Bonus multipliers across feature pairs | Drives cohesive archetypes |
| Purchase History Diminishing Returns | In-Progress | 💰🧠 | Value decay for repeated feature stacking | Encourages diversified builds |
| Synergy-Aware Greedy Optimizer | Planned | 💰🎯 | Iterative marginal gain selection | Efficient budget utilization |
| Rationale Object Output | Planned | 🛠 | Debug/analysis artifact detailing scoring | Transparency & tuning |

## 10. Adaptivity & Phase Awareness
| Feature | Status | Impact | Description | Gameplay Effect |
|---------|--------|--------|-------------|-----------------|
| Early/Mid/Late Implicit Phase Shift | Implemented | 🧠🎯 | Adjusts economy vs aggression weighting | Natural game pacing |
| Contextual Resource Pivoting | Implemented | 💰🎲 | Chooses energy vs attack vs heal mid-reroll | Opportunistic reroll paths |

## 11. Survivability & Sustainability Enhancements
| Feature | Status | Impact | Description | Gameplay Effect |
|---------|--------|--------|-------------|-----------------|
| Exit Timing Intelligence | Implemented | ♻️ | Survival probability gating for Tokyo | Fewer reckless deaths |
| Defensive Synergy Foresight | Scaffolded | ♻️⚔️ | (Will) Pair sustain + pressure combos | Balanced tempo when added |

## 12. Economic & Investment Modeling
| Feature | Status | Impact | Description | Gameplay Effect |
|---------|--------|--------|-------------|-----------------|
| Cost Efficiency Normalization | Implemented | 💰 | Score tempered by energy cost | Avoids overpaying |
| Future Capacity Valuation | Implemented | 💰🎲 | Values enablers (extraDie/rerolls) upstream | Prioritizes engine pieces |
| Planned Diminishing Marginal Utility | In-Progress | 💰🧠 | Geometric/curve decay for repeats | Smooths overconcentration |

## 13. Transparency & Debuggability
| Feature | Status | Impact | Description | Gameplay Effect |
|---------|--------|--------|-------------|-----------------|
| Structured Decision Object | Implemented | 🛠 | Consistent shape for actions & flags | Easier integration & logging |
| Planned Rationale Breakdown | Planned | 🛠 | Will expose synergy, DR, denial factors | Aids balancing & UX exposition |

## 14. Extensibility Foundations
| Feature | Status | Impact | Description | Gameplay Effect |
|---------|--------|--------|-------------|-----------------|
| Modular EV Components | Implemented | 🛠🎲 | Discrete pieces allow incremental refinement | Faster future feature adds |
| Memory Hooks (Purchases) | Implemented | 🛠🧠 | Data capture for evolution | Enables learning-like patterns |
| Unified Feature Canon | Implemented | 🛠 | Reduces branching complexity | Scales with new cards |

---
## Impact Summaries
- Strategic Depth: Goal retention + synergy pathing + denial logic create emergent archetypes.
- Probability Sophistication: Set EV modeling + future utility forecasting drive efficient rerolls.
- Adaptivity: Personality + health + history embed dynamic recalibration.
- Interaction: Denial & threat monitoring turn market into contested space.
- Survivability: Yield logic + heal prioritization prevent premature elimination.
- Economy: Cost normalization + planned diminishing returns optimize energy allocation.
- Infrastructure: Feature canon + pipeline architecture accelerate safe iteration.

---
## Roadmap (Next Updates)
1. Integrate diminishing returns curve into optimizer.
2. Refactor `optimizePowerCardPortfolio` for synergy-aware marginal greedy selection.
3. Emit rationale object (card-level + aggregate strategic intent).
4. Add defensive synergy foresight scoring (planned extension of denial logic).
5. Surface rationale optionally in UI / debug overlay.

---
## Change Log
- 2025-09-21: Initial comprehensive document created (baseline + scaffolded synergy & memory additions).

---
## Maintenance Instructions
- When adding a new AI feature: place it in the correct category, update status tags of dependent features, and append to Change Log with date.
- If a scaffolded/planned feature is implemented, move it to Implemented and adjust Impact summaries.
