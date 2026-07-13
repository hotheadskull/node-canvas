# Node Canvas V2 — Build Progress

Session protocol: read CLAUDE.md first, work ONLY on the chunk marked **current**,
run the full suite (`npm test` at repo root) before ending, update this file, commit.

The canonical plan is [docs/BRIEF.md](docs/BRIEF.md) (revised from the original
master brief — see its "Revision log" for what changed and why).

## Chunks

| # | Chunk | Status |
|---|-------|--------|
| 0 | Setup: /legacy preserved, workspaces, testing infra, governance docs, hooks | **completed** |
| 1 | Core graph: nodes, plain edges, registry skeleton, Zod document schema, load/save round-trip golden test | **current** |
| 2 | Canvas baseline: legacy look (starfield, toolbar bottom-left, legend bottom-right), plain edges end-to-end, collision-free spawn, auto-fit sizing (golden-tested), I5 regression test | not started |
| 3 | Ports & wires (core): port declarations in registry, wire validation, tentative wires (create/commit/dissolve, golden), story-time stamps | not started |
| 4 | Connection UX: handles, connectOnClick, big hit targets, valid/invalid live coloring, tentative wire rendering, "N ideas waiting" badge | not started |
| 5 | Derivations: compile (wire-order text) + ordered-intake reorder UI, deriveFace, readiness rollups, unsupported-claim flag. Golden tests incl. worked examples | not started |
| 6 | Split: generic Split + template presets (beats, Toulmin, Passage→Propositions). Golden tests + UI | not started |
| 7 | Assemblies (core): membership by reference, multi-membership, nesting, face-proxy stability, lossless collapse/expand. Golden tests are the gate for everything after | not started |
| 8 | Assembly rendering: collapsed face card, drill-in scoped canvas with breadcrumbs, gather-into-Assembly, unpack | not started |
| 9 | Writing spine: Scene/Chapter/Manuscript (per-mode labels: Section/Document), TipTap editors, compile view, Split down the spine, cast auto-derivation | not started |
| 10 | Semantic zoom: Assemblies collapse to star points past zoom threshold, smooth expand, onlyRenderVisibleElements | not started |
| 11 | Workflow layer: readiness rings + rollups, Workbench inbox, ownership tags (launch scope — group projects) | not started |
| 12 | Quick capture & palette: Ctrl+K fuzzy palette, Tauri global-shortcut capture → Workbench (launch-critical polish) | not started |
| 13 | Argument spine: Source/Claim/Thesis/Prose Section, footnote WIRING (no citation formatting — export markdown), unused-research face | not started |
| 14 | Sermon pack: Propositions + arcing wire types, Arc Assembly, phrasing view, Big Idea (Word Study + Illustration are post-launch) | not started |
| 15 | Novel specialists: Plant/Payoff (continuity engine deferred post-launch; story-time fields ship on Event so the data model is ready) | not started |
| 16 | Onboarding: interactive tutorial (spotlight, performs-action-to-advance, Back/Next + step counter, replayable), Tips/Reference panel | not started |
| 17 | Hardening: React Profiler pass, Playwright e2e full loop, migration + backup-before-migrate, export (JSON, compiled text/markdown, PNG/SVG canvas export) | not started |
| 18 | Commercial: license keys, payments, Windows code signing, Tauri updater, crash reporting | not started |

## Deferred post-launch roster
Continuity engine (`stateAt`), Word Study, Illustration, Element/Patch game-design
suite, academic-pack polish, merge-progress faces, citation formatting,
presentation-walk mode. All registry entries + isolated reducers (invariant I8).

## Session log

### 2026-07-13 — Chunk 0 (completed)
- v1 app moved to `/legacy` with git history; `npm run build` verified green there
  (one missing dep `driver.js` installed). /legacy is read-only from now on.
- npm workspaces created: `core/` (pure TS + Zod, ESLint purity rule enforcing I7),
  `app/` (Vite + React 19 skeleton, canvas comes in Chunk 2), `db/` (app metadata
  only — project content lives in per-project .nodecanvas files, see I10).
- Testing infra: Vitest projects across all three workspaces, RTL test in app,
  Playwright e2e scaffold (smoke test), GitHub Actions CI (typecheck strict,
  lint, full vitest suite, Playwright smoke).
- Governance: CLAUDE.md (verbatim, locked), this file, docs/BRIEF.md (revised
  plan with decision log), docs/invariants/INVARIANTS.md (I1–I11).
- Commit guard: .githooks/commit-msg blocks changes to locked files unless the
  message contains INVARIANT-CHANGE-APPROVED; enabled via core.hooksPath.

**Next session: Chunk 1 — core graph.** Start with the document schema (Zod) and
the node/edge/registry types in core/, then the load/save round-trip golden test.
