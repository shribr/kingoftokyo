# Architectural Shift Summary

| Dimension | Legacy Path (Pre-Fork) | Rewrite Path (Dual Lane) | Shift Trigger | Risk Mitigation |
| --------- | ---------------------- | ------------------------ | ------------- | --------------- |
| State Management | Implicit module-scoped state & ad hoc updates | Reducer/services segmentation with explicit handlers | Need for deterministic effect sequencing | Integrity baseline + parity matrix checks |
| UI Composition | Monolithic DOM regions + cascading CSS | Componentized mount seams + scoped styles | Increasing CSS collision & layout drift | Scoped class namespaces / isolation wrappers |
| Modal Handling | Independent modal toggles | Unified modal controller + lifecycle orchestration | Overlapping focus & stacking conflicts | Central registry + focus trap policy |
| Decision Logic | Embedded heuristics & inline conditionals | Externalized rationale objects + decision tree | Lack of explainability & tuning friction | Structured schema + visualization layer |
| Animation Feedback | Incremental ad hoc transitions | Cohesive kinetic semantics set (state → motion mapping) | Inconsistent state meaning conveyance | Standardized timing tokens & semantic classes |
| Scenario Execution | Manual ad hoc test setups | Seeded scenario harness (parameterized) | Hard to reproduce complex sequences | Deterministic seed + config manifest |
| Evolution Strategy | Direct edits on live baseline | Parallel fork in `/new/` with staged adoption | Risk of destabilizing core gameplay | Reversible migration checkpoints |
| Error Surface | Reactive debugging post-symptom | Pre-emptive effect queue & lifecycle audit | Latent multi-step failure chains | Queue introspection + staged logging |
| User Pacing | System-driven phase advancement | Player-governed acceptance gating | Perceived rush / reduced deliberation | Explicit commit action + mid-roll economy window |
| Transparency Layering | Console logs & inferred intent | Multi-layer: logs → decision objects → tree UI | Opaque heuristic outcomes | Progressive disclosure interface |
| Refactor Timing | Opportunistic during feature work | Intentional batch waves (componentization) | Drift accumulation / coupling risk | Scheduled waves + boundary mapping |
| Trust Model | Manual verification | Hash integrity baseline + rollback tags | Undetected regression during fork | Hash diff alerts + rollback plan |
