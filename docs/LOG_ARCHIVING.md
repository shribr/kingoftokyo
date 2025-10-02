# Log & AI Decision Tree Archiving

Status: Introduced Oct 1, 2025 (developer tooling – opt‑in via `#dev` hash)

## Purpose
Provides a lightweight, zero‑backend persistence path for:
- Game Log snapshots (human + AI actions, phase events, yield flow markers, etc.)
- AI Decision Tree (AIDT) roll/decision rationale structure (round → turn → roll nodes)

Enables:
- Point‑in‑time capture for regression / parity audits
- Offline sharing (exported JSON) for collaborative debugging
- Local replay / inspection of imported snapshots independent of current in‑memory state

## Access
1. Launch the game with `#dev` in the URL (e.g. `index.html#dev`).
2. A floating "Dev Panel" appears (bottom‑right).
3. Use the Archive / View buttons:
   - Archive Game Log
   - View Game Logs
   - Archive AIDT
   - View AIDT Logs

Viewers open modal overlays with snapshot listings, live export, archive, and import controls.

## Storage Model
Snapshots persist to `localStorage` (browser‑local only):
- Index keys (arrays of metadata only):
  - `KOT_ARCHIVE_GAME_LOGS`
  - `KOT_ARCHIVE_AIDT_LOGS`
- Payload keys (full snapshot objects):
  - `KOT_ARCHIVE_GAME_LOG_<id>`
  - `KOT_ARCHIVE_AIDT_LOG_<id>`

This avoids rewriting large index arrays when capturing additional snapshots (append‑only metadata list + separate payload objects).

## Snapshot Schema
```jsonc
// Game Log Snapshot
{
  "meta": {
    "type": "gameLog",
    "id": "gameLog_...",          // unique id
    "name": "Manual Snapshot",     // provided or generated
    "ts": 1696195200000,            // epoch ms (capture time)
    "size": 123                     // number of log entries
  },
  "data": [
    {
      "ts": 1696195199123,          // log entry timestamp
      "type": "phase",             // category / tag
      "message": "Player Kong rolls 1,2,3,3,heart,claw"
      /* ... additional fields if present in live log */
    }
  ]
}
```
```jsonc
// AI Decision Tree (AIDT) Snapshot
{
  "meta": {
    "type": "aidt",
    "id": "aidt_...",
    "name": "Manual Snapshot",
    "ts": 1696195200456,
    "size": 4                      // rounds length
  },
  "data": {
    "rounds": [
      {
        "round": 1,
        "turns": [
          {
            "turn": 1,
            "rolls": [
              {
                "faces": "1,1,heart,claw,2,3",  // dice faces string or array
                "score": 0.42,                  // heuristic score (example)
                "action": "reroll",             // stage / decision label
                "playerName": "Kong"
                /* possible enrichment: branch metadata, deterministic seeds */
              }
            ]
          }
        ]
      }
    ]
  }
}
```

NOTE: A schema version field is NOT yet included; forward migrations will add `meta.schemaVersion` when first needed.

## Operations
| Operation | Game Log | AIDT | Effect |
|-----------|----------|------|--------|
| Archive Live | Yes | Yes | Persists snapshot to localStorage (metadata + payload) |
| Export Live | Yes | Yes | Downloads JSON without archiving (transient capture) |
| Import | Yes | Yes | Validates minimal schema then registers as archived snapshot |
| View | Yes | Yes | Renders snapshot contents (entries or rounds/turns/rolls) |

## Import Validation
Minimal guardrails: requires `meta` and `data` root keys; type inferred if absent using structure heuristic. Malformed JSON or missing shape triggers an alert and aborts registration.

## Security & Privacy
- Everything is strictly local (no network calls).
- Imported JSON is trusted post-parse; only minimal shape validation occurs. Avoid importing untrusted files until a stricter validator (planned) is added.

## Performance Considerations
- Each snapshot is a discrete localStorage entry; large numbers of AIDT snapshots (deep rounds with many rolls) may approach localStorage quotas (~5–10MB depending on browser). Future enhancement: LRU pruning + compression.

## Limitations (Current)
- No schema version / migration layer.
- No diff or comparison view between snapshots.
- No filtering (by player, phase, decision type) in viewers.
- No pagination (entire payload rendered at once).
- No integrity hash to detect tampering.

## Planned Enhancements
1. Add `meta.schemaVersion` and validator with upgrade hooks.
2. Snapshot diff (log: structural diff; AIDT: per-node score deltas).
3. Search & filter UI (faces pattern, player, action type).
4. Optional compression (LZ-based) with size badge & decode fallback.
5. Integrity hash (`sha256` of canonicalized `data`) stored in meta.
6. Bulk export (zip multiple snapshots).
7. Prunable retention policy (max N per type, time-based, or manual prune).

## Developer Hooks
Utility functions (in `src/services/logArchiveService.js`):
- `archiveGameLog(store, name?)`
- `archiveAIDT(store, name?)`
- `listArchivedGameLogs()` / `listArchivedAIDT()`
- `loadArchivedGameLog(id)` / `loadArchivedAIDT(id)`
- `currentGameLogSnapshot(store)` / `currentAIDTSnapshot(store)` (without archival)
- `exportSnapshot(snapshot, filename?)`
- `importSnapshotFile(file, opts, cb)`

## Integration Notes
- Archive feature intentionally isolated from core reducers to avoid write amplification during normal play.
- Viewers are lazily imported (dynamic `import()`), minimizing baseline bundle impact when `#dev` not used.

## Troubleshooting
| Symptom | Cause | Fix |
|---------|-------|-----|
| Imported file ignored | Missing `meta` or `data` keys | Verify file not truncated / corrupted |
| Snapshot list empty after archive | localStorage full or blocked | Clear older snapshots / check browser storage settings |
| Large JSON download slow | Very large AIDT tree | Use selective archiving earlier in session |

## Rationale
A minimal, low-risk observability persistence layer accelerates debugging and parity verification without committing to full game state serialization (planned separately). The separation of log vs AIDT allows focused evolution of AI rationale introspection while keeping operational logs stable.

---
## Auto-Archive (Settings-Driven)

New Settings (Advanced Tab):
- Auto-Archive Game Logs at Game Over (`autoArchiveGameLogs`)
- Auto-Archive AI Decision Trees (`autoArchiveAIDTLogs`)
- Archive Retention (Days) (`archiveRetentionDays`)

Behavior:
1. On GAME_OVER detection, the system writes snapshots to temp storage using filename-style keys:
  - `kot_game_YYYYMMDDHHMMSS.log`
  - `kot_aidt_YYYYMMDDHHMMSS.log`
2. Retention pass runs opportunistically:
  - Purges entries older than `archiveRetentionDays`.
  - Enforces a hard cap (default 10) per type (oldest removed first).
3. Manual changes to retention settings trigger a maintenance sweep.

These auto archives appear at the top of the Game Log Viewer under an “Auto Archives” section.

## Replay Mode (Experimental)

From the Game Log Viewer, selecting any (manual or auto) game log snapshot enables a “Start Game Replay” button. Replay mode:
- Steps through log entries on a fixed interval (currently ~500–600ms cadence).
- Emits a `replay.entry` DOM event for potential future visual augmentations.
- Disables nearly all interactive UI (buttons, dice, power cards) except replay controls and (future) pause functionality.
- Provides inline controls: Start, Pause, Resume, Stop.

Scope & Limitations:
- This is a passive narrative replay (log-driven), not a deterministic state reconstruction; board may not reflect historical intermediate states yet.
- Actions are not re-simulated—effects like damage or VP gain aren’t re-applied to produce a branching state timeline.
- Future upgrade path: integrate full serialized game state snapshots to allow frame-accurate visual state restoration.

Planned Replay Enhancements:
1. State hydration snapshots (initial + per-turn diffs) for accurate board rendering.
2. Variable replay speed slider + skip to turn/round.
3. Annotation overlay (highlight active player, dice faces, Tokyo transitions).
4. Exportable replay bundle (log + seeds) for offline review.
5. Deterministic verification mode – re-simulate and flag divergence from archived log.

Developer Hooks (Replay):
- `startReplay(store, snapshot, { speed })`
- `pauseReplay()`, `resumeReplay()`, `stopReplay()`
- `isReplaying()`

CSS Flag:
- `body.replay-mode-active` class applied during replay (disables pointer events for most interactive elements).

Known Edge Cases:
- Starting a new live game during replay is blocked visually but not yet fully prevented at reducer level—avoid mixing actions until full state gating is implemented.
- Very large log snapshots may produce lengthy DOM rendering; future optimization: virtualized list.

---
