# Node Canvas V2 — Build Progress

Session protocol: read CLAUDE.md first, work ONLY on the chunk marked **current**,
run the full suite (`npm test` at repo root) before ending, update this file, commit.

The canonical plan is [docs/BRIEF.md](docs/BRIEF.md) (revised from the original
master brief — see its "Revision log" for what changed and why).

## Chunks

| # | Chunk | Status |
|---|-------|--------|
| 0 | Setup: /legacy preserved, workspaces, testing infra, governance docs, hooks | **completed** |
| 1 | Core graph: nodes, plain edges, registry skeleton, Zod document schema, load/save round-trip golden test | **completed** |
| 2 | Canvas baseline: legacy look (starfield, toolbar bottom-left, legend bottom-right), plain edges end-to-end, collision-free spawn, auto-fit sizing (golden-tested), I5 regression test | **completed** |
| 3 | Ports & wires (core): port declarations in registry, wire validation, tentative wires (create/commit/dissolve, golden), story-time stamps | **completed** |
| 4 | Connection UX: handles, connectOnClick, big hit targets, valid/invalid live coloring, tentative wire rendering, "N ideas waiting" badge | **completed** |
| 5 | Derivations: compile (wire-order text) + ordered-intake reorder UI, deriveFace, readiness rollups, unsupported-claim flag. Golden tests incl. worked examples | **current** |
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

## Design checkpoints (user-requested — do not skip)

- **Before building specialist node renderers or reworking node visuals**
  (first hit in Chunk 4's connection UX polish, then Chunks 9/13/14/15):
  present the user with **3–4 visual mockups** of how nodes could look and
  what should be customizable (header treatments, density/compact modes,
  per-node accent/theming, what the user can adjust per node vs per type).
  The user picks/mixes BEFORE rendering code is written. Requested 2026-07-13.

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

### 2026-07-13 — Chunk 1 (completed)
- Repo relocated to `C:\Users\hothe\Projects\node-canvas` (old scratch copy is
  stale; desktop shortcut "Node Canvas V2" runs start-node-canvas.bat).
- `core/src/registry.ts`: registry skeleton with the Universal Core eight
  (title, note, document, section, question / person, place, thing), per-mode
  labels (universal/novel/sermon), categories, coreMenu flag, empty `ports`
  arrays awaiting Chunk 3. Helpers: coreMenuTypes, allMenuTypes (I11), nodeLabel.
- `core/src/schema.ts`: Zod .nodecanvas document format v1. parseDocument
  returns a Result (never throws); serializeDocument validates first and
  throws DocumentValidationError rather than saving invalid data (I9);
  deterministic output; node `data` is passthrough so pack payloads survive
  without core schema changes (I8). superRefine enforces unique ids +
  referential integrity.
- `core/src/graph.ts`: pure ops — spawnNode (registry defaults; rejects
  unregistered types), addNode, removeNode (drops attached edges),
  addPlainEdge (I1: works between EVERY pair of types; rejects self/dupes),
  removePlainEdge. All immutable.
- Golden: `core/src/roundtrip.golden.json` — load→save reproduces the file
  byte-exactly (line endings normalized; `.gitattributes` pins goldens to LF).
  NEW golden created with the feature it pins, not an edit of an existing one.
- Full suite green: 29 tests (6 files) + strict typecheck + lint (purity rule).
- Decision: plain edges are semantically undirected; duplicates rejected in
  either orientation. Self-edges rejected (matches v1 spiderweb behavior).

### 2026-07-13 — Chunk 2 (completed)
- Canvas baseline live: parallax starfield ported from /legacy (glow baked
  into star SVGs — CSS drop-shadow filters on full-viewport layers rasterize
  brutally), toolbar bottom-left, registry-driven legend bottom-right (I6).
- `core/src/layout.ts` + `layout.golden.json`: findFreePosition deterministic
  ring search (collision-free spawn) and computeAutoHeight (integer heights).
- Gallery add-node menu: miniature cards from the registry, Writing/Knowledge
  groups, Core/All toggle (persisted), docked hover preview with description
  + "Known as" per-mode names.
- Plain edges end-to-end with the anti-"works on my machine" design: BaseEdge
  interactionWidth zoom-compensated to ~24 screen px + an always-clickable
  label chip (EdgeLabelRenderer) opening the inline edge menu (label/delete).
- Store: zustand wrapping core ops only; localStorage persistence through
  parse/serialize with corrupt-payload backup + error banner (I9); viewport
  persisted; Fit is a toolbar button only (I5).
- docs/ui-interaction-rules.md: hit-target/feedback/consistency rules, each
  backed by a test in app/src/interaction-rules.test.ts where possible.
- **Bugs found by real-browser e2e (now Playwright specs + rules 12-15):**
  (1) controlled RF handler that drops 'dimensions' changes leaves nodes
  unmeasured → edges silently never render; fixed with applyNodeChanges/
  applyEdgeChanges pattern. (2) auto-fit measured the flexing body → feedback
  loop, unbounded height growth AND starved debounced saves; fixed with a
  hidden content mirror. (3) edges must persist sourceHandle/targetHandle
  (v1 F7-10a) — added to the core schema as optional fields.
- Env note: the harness Browser pane doesn't fire RAF/ResizeObserver and
  can't screenshot — Playwright (real Chromium) is the visual-verification
  path for this project. e2e: 3 specs green. Unit: 65 green. Screenshot
  verified: starfield + nodes + edges + menu + legend all correct.

### 2026-07-13 — Chunk 3 (completed)
- Registry ports declared for the core eight (≤6 per type, ≤3 visible,
  takes carry capacity one/many). dataKinds: text, thread, person, place,
  thing. Contract pinned in registry-ports.golden.json + discipline test.
- `core/src/wires.ts`: isValidWire (reason codes for Chunk 4's live
  coloring: unknown-node/self/no-such-port/wrong-direction/kind-mismatch/
  duplicate/occupied), addWire, createTentativeWire (capacity NOT enforced
  — candidates may pile onto a full intake), commitTentativeWire (enforces
  capacity, converts to live, dissolves the source node's other tentative
  wires, returns dissolvedIds for the undo toast), dissolveTentativeWire,
  removeWire, setWireStoryTime (finite or clear), tentativeInboundCount
  (the "N ideas waiting" badge input). removeNode drops attached wires.
- Schema: WireSchema (id/source/sourcePort/target/targetPort/status/label?/
  storyTime?); document gains required `wires` array; integrity checks.
  roundtrip.golden.json EDITED intentionally: pre-release format extension
  (schemaVersion 1 is unreleased), fixture now pins wire round-tripping.
  tentative.golden.json pins the commit lifecycle with fixed ids.
- Note: dev-only localStorage documents from before this chunk fail
  validation (no wires key) → the I9 banner + corrupt-backup path handles
  it. Acceptable pre-release; a real migration ships with the first release.
- Suite: 83 unit tests + 3 e2e green; typecheck + lint clean.

### 2026-07-13 — Chunk 4 (completed)
- Node face per the approved design mix: A's tinted header + clickable kind
  tag (opens the per-node accent picker, 8 presets + reset), B's port rails
  (visible takes stacked on the LEFT, gives on the RIGHT), C's glowing-star
  ports colored by dataKind (text purple, thread gold, person blue, place
  green, thing amber) with ≥24px invisible hit areas and hover growth.
  updateNodeInternals re-registers handles when their set changes.
- Connection grammar: top/bottom dots ↔ dots = plain edge; give→take = live
  wire (take→give wires backwards — users drag both ways); give→plain dot =
  TENTATIVE wire into the first compatible intake; give→incompatible node =
  surfaced error. isValidConnection drives live green/red star coloring and
  blocks invalid drops. connectOnClick enabled.
- WireEdge: solid live / dashed tentative, kind-colored, zoom-compensated
  interaction path + chip (tentative chip: commit ✓ / dissolve ✗; live chip:
  kind label + delete). Commit fires the undo toast ("N other candidates
  dissolved — Undo" restores the pre-commit document). waiting-badge on
  nodes from tentativeInboundCount.
- Customization: per-node accent override (stored in node data), density
  comfortable/compact, port labels hover/always/off — settings popover on
  the toolbar gear, persisted in localStorage.
- Menu preview panel now lists Gives/Takes from the registry ports.
- **Bug found by e2e (now interaction rule 16): hover must never move
  layout.** The bottom-anchored menu grew upward when the hover preview got
  taller, shifting cards under the cursor so clicks missed. Menu now has a
  fixed height; hover content scrolls inside a reserved box.
- Suite: 96 unit + 6 e2e green; typecheck + lint clean. Screenshot verified
  (rails, star ports, labels, dashed tentative + commit chip all correct).

### 2026-07-13 — Post-Chunk-4 addendum (user questions answered in code)
- **Face system** (`app/src/components/faces/`): per-type node BODIES plug in
  via a `NODE_FACES` map with a `DefaultFace` fallback — the app-side
  counterpart of I8. Giving a type a unique look = drop a component in the
  map; CanvasNode (chrome: header, rails, ports, resizer) is never edited.
  Faces land with the chunk that gives the type behavior: document compile
  face (Chunk 5), spine editors w/ TipTap (Chunk 9), dossier faces with
  derivations, specialists (13–15).
- **TitleFace shipped early (user spec):** the Title node IS its words — big
  bold centered text bound to `title`, scaling with the box via container
  queries (`clamp(20px, 14cqmin, 120px)`); no header title input, no
  auto-fit mirror (the box size is the user's statement). Screenshot-verified.
- **Manuscript reserved (spine level 3):** registry entry `manuscript`
  (Manuscript / Sermon Series), ports documents-in / compiled-out / thread-in
  mirroring Document one level up. coreMenu: false — reachable in the All
  view, out of the beginner eight. Behavior + face in Chunk 9; Split runs the
  spine in reverse in Chunk 6. Ports golden updated (new entry, approved).
- Suite: 99 unit + 6 e2e green.

**Next session: Chunk 5 — derivations.** compile (wire-order text) with the
ordered-intake reorder UI (drag-to-reorder list in a node inspector — wire
order is NOT directly manipulable in RF), deriveFace, readiness rollups,
unsupported-claim flag. Golden tests including the worked examples from the
brief (Chapter compile; rename propagation). Document gets its compile face
via the new face system.

**Chunk 4 design checkpoint RESOLVED (2026-07-13).** User saw 4 mockups and
chose a mix: **A's title bar** (tinted header band + kind tag) + **B's port
rails** (takes enter on the LEFT rail, gives exit on the RIGHT rail — canvas
reads left→right) + **C's glowing-star ports** (small stars with glow, but
hit areas stay ≥24px invisible per interaction rule 1). Customizable:
per-node accent override, density mode (comfortable/compact per canvas),
port-label visibility (hover/always/off per canvas). Spatial grammar:
top/bottom dots = plain relationship edges; left/right rails = dataflow.
