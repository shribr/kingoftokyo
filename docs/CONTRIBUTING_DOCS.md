## Documentation Contribution Guidelines

All project markdown (.md) files must reside under the `docs/` directory (or its sub-folders).

### Rationale
1. Single discovery point for architecture, parity, and roadmap documents.
2. Eliminates drift from duplicate copies (e.g., historical `new/` folder content).
3. Enables automated docs linting / publishing pipelines (future) to glob on `docs/**/*.md` safely.

### Migration Notes (Oct 1 2025)
- Legacy scattered root markdown files (`RULES_PARITY.md`, `GAME_FLOW_PARITY_AUDIT.md`, etc.) consolidated here.
- Former `new/` directory markdown content merged; no new markdown should be added outside `docs/`.
- A stub `docs/migrated/README.md` exists to redirect external links; remove once consumers update.

### Authoring Conventions
| Aspect | Guideline |
|--------|-----------|
| File naming | Use UPPER_SNAKE_CASE for high-level specs (e.g. `IMPLEMENTATION_TODO.md`), kebab-case for feature-specific notes. |
| Headings | Start with a single H1 per file; use `##` for primary sections. |
| Status badges | Prefer plain text (e.g., `Status: In Progress`) until a build badge pipeline exists. |
| Cross-links | Relative links (e.g., `./GAME_FLOW_PARITY_AUDIT.md`). Avoid absolute repo URLs. |
| Diagrams | Place images in `docs/images/` (create if needed). |
| Large tables | Consider splitting into an appendix file if >200 lines. |

### Adding New Docs
1. Create under `docs/` (subfolder optional for domain grouping, e.g., `docs/ai/` or `docs/flow/`).
2. Update (or create) an index file if discoverability matters (`docs/INDEX.md` planned).
3. Avoid duplicating content—link instead.

### Anti-Patterns (Avoid)
- Creating a parallel `new/` folder again.
- Maintaining two copies of the same spec for “draft” vs “final” — use a Draft section inside the file.
- Embedding base64 images directly (prefer separate asset files).

### Future Enhancements
- Automated TOC injection.
- Docs lint (heading order, link validation).
- Static site generation (MkDocs / Docusaurus) from `docs/` tree.

---
Maintainers: Update this file when adding structural conventions or doc tooling.
