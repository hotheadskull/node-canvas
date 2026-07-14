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
| 5 | Derivations: compile (wire-order text) + ordered-intake reorder UI, deriveFace, readiness rollups, unsupported-claim flag. Golden tests incl. worked examples | **completed** |
| 6 | Split: generic Split + template presets (beats, Toulmin, Passage→Propositions). Golden tests + UI | **completed** |
| 7 | Assemblies (core): membership by reference, multi-membership, nesting, face-proxy stability, lossless collapse/expand. Golden tests are the gate for everything after | **completed** |
| 8 | Assembly rendering: collapsed face card, drill-in scoped canvas with breadcrumbs, gather-into-Assembly, unpack | **completed** |
| 9 | Writing spine: Scene/Chapter/Manuscript (per-mode labels: Section/Document), TipTap editors, compile view, Split down the spine, cast auto-derivation | **current** |
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

### 2026-07-14 — Chunks 5 + 6 (completed, one combined commit — the compile
face hosts both the reorder list and Split, so the code interleaves)

Chunk 5 — derivations (all pure, all golden-tested in `derive.golden.json`):
- `derive.ts`: compile (own text, then spine wires in wire order, recursive,
  cycle-guarded, tentative wires never compile), wordCount, castOf (people
  wired into spine sections; names read BY REFERENCE so renames propagate —
  the worked example is pinned), deriveFace (categorized member counts for
  Chunk 7/8 assembly faces), readiness (seed → developing → ready → placed,
  stored in node.data.readiness, rollup = least-advanced overall), and
  hygieneFlags (flagWhenEmpty intakes; only fire for nodes already wired —
  port-free canvases never see one, per I2).
- Registry: PortDef gains `spine` (document.sections-in, manuscript.
  documents-in) and `flagWhenEmpty` (both thread-ins). Ports golden updated.
- `reorderIntakeWire`: wire array order IS compile order; reorder moves a
  wire within its intake subset, unrelated wires keep position. Golden.
- DocumentFace (document + manuscript via the face system): own-text area,
  ordered intake list (↑/↓ reorder — drag-reorder can come later), tentative
  rows shown dimmed as "waiting", compiled preview, live word count, derived
  cast line, hygiene dot on empty thread.

Chunk 6 — Split:
- `split.ts`: splitNode(doc, parent, stubs, idFactory?) — stubs spawn below
  the parent, collision-free, wired live into the spine intake in order;
  parent never moves (I5). idFactory injection keeps goldens deterministic.
- SPLIT_PRESETS in the registry (I8): 3 blank sections + beat sheet for
  document, 3 chapter stubs for manuscript. Toulmin lands with Chunk 13,
  Passage→Propositions with Chunk 14. Preset validity is itself tested
  (every preset stub can feed every declared target type).
- Split button + preset menu on the compile face.

Two REAL bugs found by e2e this session (both now interaction rules):
- Rule 17: collision-free spawn can land a node off-viewport → "nothing
  happened". The camera now follows spawns (spawning is the explicit user
  action; v1 shipped this same fix). Nothing else may move the viewport.
- Rule 18: debounced saves flushed on pagehide/beforeunload — a reorder
  followed by a fast reload used to lose the reorder (I9 violation).

Suite: 126 unit + 8 e2e green; typecheck + lint clean.

**Next session: Chunk 7 — Assemblies in core.** Pure logic, no UI: membership
by reference (I3), multi-membership, nesting, face-proxy stability (delete an
inner node → face survives, external connections intact), lossless
collapse/expand round-trip at 3 nesting levels (I4). These goldens gate
everything after. UI lands in Chunk 8 (drill-in, breadcrumbs, gather/unpack).

### 2026-07-14 — Chunks 7 + 8 (completed)

Chunk 7 — assemblies in core (the I3/I4 gate, all golden in
`assemblies.golden.json`):
- Schema: `assemblies` array — { id, name, memberIds, position, collapsed }.
  memberIds are REFERENCES to nodes or other assemblies (nesting); schema
  validates existence, duplicates, and rejects membership cycles on load.
  Plain-edge endpoints may be assembly ids: connections attach to the FACE.
- `collapsed` is a pure view flag — collapse transforms nothing, so the I4
  lossless round-trip is structural (golden: collapse 3 levels → expand →
  byte-identical serialize).
- Ops: createAssembly, add/removeMember, deleteAssembly/unpack (members
  never deleted — I3 golden), duplicateAssembly (copies the reference list,
  zero nodes — I3 golden), setCollapsed, move, rename.
- Derivations: memberNodeIds (transitive), hiddenIds (everything inside a
  collapsed group), displayEndpoint (outermost collapsed face — display
  remap only, storage untouched).
- Face stability golden: delete an inner node → faces survive, external
  face edges intact, document still validates.
- All existing goldens gained `"assemblies"` (required field, intentional
  format extension shipped with the feature).

Chunk 8 — assembly rendering:
- AssemblyFace node: collapsed = full card (name, deriveFace counts,
  member count, Unpack) / expanded = compact pill so the group always has
  collapse/drill affordances. Unnamed dot handles: remapped boundary
  connections resolve on the face.
- Canvas visibility model: hidden members filtered out; boundary edges/
  wires DRAW to the outermost collapsed face (handles stripped on remap);
  fully-internal connections hidden.
- Gather: ctrl-click selection → "Group N" toolbar button → collapsed
  assembly at the centroid. Deleting a face unpacks (members sacred).
- Drill-in: face's Open button scopes the canvas to the group's direct
  members (nested collapsed groups render as faces) with a breadcrumb bar;
  drilling treats the drilled group as expanded; editing inside edits the
  real nodes.
- e2e: gather → counts face → expand/collapse → drill + breadcrumbs →
  unpack; external edge to face survives deleting a member inside.
  (Playwright notes: RF multi-select is Ctrl on Windows, not Shift; role
  name matching is substring — scope breadcrumb queries.)

Suite: 145 unit + 10 e2e green; typecheck + lint clean. Screenshot-verified
(collapsed face: "Person: 2 · Place: 1", 3 inside, unpack/expand/open).

Known limitation (revisit with semantic zoom, Chunk 10): a node belonging
to TWO simultaneously-collapsed groups draws its boundary connections to
whichever face the ancestor walk finds last — harmless visually, worth a
deterministic rule later. Wire-to-face (assembly give ports derived from
members) is deferred until the writing spine makes it meaningful.

**Next session: Chunk 9 — writing spine.** TipTap editors on section/
document/manuscript faces, full-editor view, richer compile view. The
spine mechanics (compile, Split, cast) already exist — this chunk is
about making writing in them feel good.

**Chunk 4 design checkpoint RESOLVED (2026-07-13).** User saw 4 mockups and
chose a mix: **A's title bar** (tinted header band + kind tag) + **B's port
rails** (takes enter on the LEFT rail, gives exit on the RIGHT rail — canvas
reads left→right) + **C's glowing-star ports** (small stars with glow, but
hit areas stay ≥24px invisible per interaction rule 1). Customizable:
per-node accent override, density mode (comfortable/compact per canvas),
port-label visibility (hover/always/off per canvas). Spatial grammar:
top/bottom dots = plain relationship edges; left/right rails = dataflow.
