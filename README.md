## King of Tokyo – Executive Overview

This project is a ground-up internal rebuild of the board game “King of Tokyo,” used as a safe, contained sandbox to explore modern product patterns: human–AI collaboration, deterministic simulation, observability-first design, accessibility considerations, and incremental modernization strategy. It is intentionally experiential: the value lies as much in the reusable collaboration dialog and decision trace as in the code.

### What It Is
An end‑to‑end playable experience (monsters, dice rolls, rerolls, Tokyo occupancy, damage, healing, victory paths, power cards) rebuilt with structured phases and AI participation hooks. The implementation emphasizes clarity of turn flow, repeatable outcomes for evaluation, and transparent decision scaffolding.

### Why It Exists
Traditional feature rewrites drift or stall because intent gets lost. Here, every major architectural move (state machine adoption, deterministic harnesses, unified decision pipeline) was co-developed alongside narrative documentation and status signaling. The result: a living artifact that demonstrates how to make AI augmentation safe, explainable, and testable before applying it to customer domains.

### Strategic Themes
1. Deterministic Foundations – Seeded randomness + snapshot diffing enable reproducible AI and logic evaluations.
2. Explicit Phased Flow – A finite turn/phase model replaces scattered flags, making behavior auditable and upgrade-friendly.
3. Unified Decision Points – Collapsing divergent human vs AI logic paths reduces risk and improves explainability.
4. Observability Early – Phase spans, timeline history, and rationale placeholders ensure insight precedes optimization.
5. Incremental Parity – Distinguishing mechanical correctness from experiential feel guides smarter prioritization.
6. Dialog as IP – The curated human↔AI design conversations (not just the resulting code) form a reusable modernization playbook.

### What Has Been Accomplished
✅ Core gameplay loop (roll, reroll, resolve, takeover / yield decisions, buy opportunities).  
✅ Structured phase machine groundwork and transition telemetry.  
✅ Deterministic modes for reproducible simulation and AI pathway validation (initial decision paths unified).  
✅ Power card catalog skeleton and purchase flow with effect queue scaffolding.  
✅ Logging + span instrumentation for phase timing and decision milestones.  
✅ UI component baseline (player panels, dice tray, modal scaffolds, profile cards).  
🟡 Yield & takeover unified backend pipeline (human-facing enhanced modal pending).  
🟡 Expanded AI rationale surfacing & accessibility enhancements (in progress).  
⬜ Persistence layer (snapshot import/export) – planned.  
⬜ Advanced AI heuristics (multi-roll EV, personality tuning) – planned.  

### How To Look At This (Executive Lens)
Think of the game loop like a compressed enterprise workflow: phases ≈ process stages; dice outcomes ≈ event inputs; yield/buy decisions ≈ approval or gating checkpoints. By perfecting clarity, timing, and reproducibility here, we de-risk applying similar AI augmentation and observability patterns to real customer processes (claims, supply chain steps, employee workflows).

### Reusable Outputs
- Pattern set: deterministic harness, phase transition ledger, unified decision queue.
- Collaboration transcript motifs: “refactor intent explanation,” “risk enumeration before merge,” “prompted rationale scaffolding.”
- Status taxonomy (✅ / 🟡 / ⬜ / ⚠️ / 🧪) enabling quick portfolio-level rollups.
- Documentation style that blends narrative audit + concise progression signals.

### Near-Term Focus
- Finalize human-facing yield/defender interaction & accessibility semantics.
- Introduce persistence + session recovery.
- Expand AI decision rationale into structured, test-assertable metadata.
- Broaden effect processing and card breadth for rule depth parity.

### How To Contribute
Playtest, propose clarity or pacing improvements, enhance accessibility, add rationale surfacing, or help formalize dialog pattern extraction. Light, well-scoped contribution lanes are maintained to keep onboarding fast.

### Where The Original Technical Detail Went
The prior, deeply technical README is preserved at `docs/README.technical.backup.md`. Additional implementation roadmaps and audits:  
- `docs/IMPLEMENTATION_TODO.md` (canonical execution tracker)  
- `docs/GAME_FLOW_PARITY_AUDIT.md` (experience & timing parity)  
- `RULES_PARITY.md` (rules coverage & dimension matrix)  
- `UI_PARITY_TODO.md` (visual / interaction alignment tasks)  

### Guiding Principle
Code is transient; the structured methodology and dialog that generated it are the durable, reusable asset.

---
For questions, architectural walkthroughs, or contribution interest: open an issue or annotate directly in the relevant doc.

---
