# Node Canvas V2

A visual thought-processing desktop app: an infinite canvas of typed nodes and
meaningful connections. Tauri 2 + React 19 + @xyflow/react, with all domain
logic in a pure TypeScript core.

- **Plan:** [docs/BRIEF.md](docs/BRIEF.md) · **Progress:** [PROGRESS.md](PROGRESS.md)
- **Invariants (locked):** [docs/invariants/INVARIANTS.md](docs/invariants/INVARIANTS.md) and [CLAUDE.md](CLAUDE.md)
- **V1 (reference, read-only):** [/legacy](legacy/) — remains runnable; the
  visual theme and kept behaviors are ported from it.

## Workspaces

| Package | Purpose |
|---|---|
| `core/` | Pure domain logic (graph, ports, assemblies, derivations). No React/Tauri/DB imports — ESLint-enforced. |
| `app/` | Tauri + React renderer. Renders what core decides. |
| `db/` | App metadata (recent projects, prefs). Project content lives in per-project `.nodecanvas` files. |

## Commands

```
npm test            # full suite (required green before every commit)
npm run typecheck   # strict tsc across all workspaces
npm run lint        # includes the core-purity rule
npm run test:e2e    # Playwright smoke
npm run dev         # app dev server
```

One-time after clone: `git config core.hooksPath .githooks` (enables the
locked-file commit guard).
