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
| 9 | Writing spine: Scene/Chapter/Manuscript (per-mode labels: Section/Document), TipTap editors, compile view, Split down the spine, cast auto-derivation | **completed** |
| 10 | Semantic zoom: Assemblies collapse to star points past zoom threshold, smooth expand, onlyRenderVisibleElements | **completed** |
| 11 | Workflow layer: readiness rings + rollups, Workbench inbox, ownership tags (launch scope — group projects) | **completed** |
| 12 | Quick capture & palette: Ctrl+K fuzzy palette, Tauri global-shortcut capture → Workbench (launch-critical polish) | **completed** (global shortcut awaits the Tauri shell) |
| 13 | Argument spine: Source/Claim/Thesis/Prose Section, footnote WIRING (no citation formatting — export markdown), unused-research face | **completed** |
| 14 | Sermon pack: Propositions + arcing wire types, Arc Assembly, phrasing view, Big Idea (Word Study + Illustration are post-launch) | **completed** |
| 15 | Novel specialists: Plant/Payoff (continuity engine deferred post-launch; story-time fields ship on Event so the data model is ready) | **completed** |
| 16 | Onboarding: interactive tutorial (spotlight, performs-action-to-advance, Back/Next + step counter, replayable), Tips/Reference panel | **completed** |
| 17 | Node remodel: the TAB CARD anatomy system (docs/design/node-anatomy.md) — user picked mockup C; fixes all reported node bugs with regression tests | **completed** |
| 18 | Hardening: React Profiler pass, Playwright e2e full loop, migration + backup-before-migrate, file-per-project (.nodecanvas) persistence, export (JSON, compiled text/markdown, PNG/SVG canvas export) | **current** |
| 19 | Commercial: license keys, payments, Windows code signing, Tauri updater, crash reporting | not started |

## User feedback driving Chunk 17 (verbatim intent, 2026-07-14)

The current nodes "feel like they were thrown together instead of a good
uniform look that will be custom for each node." Specifics to fix, each a
remodel requirement (behavior items are BUGS with tests, not just styling):

1. **Header title slot feels wrong** — the thin strip crams readiness dot +
   type tag + title input + owner chip. The node's NAME deserves the
   prominence; the chrome shouldn't compete with it.
2. **Body doesn't grow as you type** (it did in V1). Root cause to verify:
   the auto-fit mirror renders STRIPPED text while the editor renders
   formatted HTML, so measured height drifts. Spec: the node grows downward
   live with the text, V1-style. Ships with a regression test.
3. **Side rails cut into the text box** — rails/stars paint OVER the body
   instead of the body reserving space for them; rails read as undefined
   clutter. The anatomy system must give ports a real, owned zone.
4. **The Chunk-4 "mix of options" never became a system** — faces are
   hand-built one-offs. Deliverable: one anatomy every type fills (so every
   FUTURE node type inherits a coherent look by construction), plus a
   repeatable per-type design flow: gives/takes/derives/flags -> which
   anatomy slots it fills -> face.

## Design checkpoints (user-requested — do not skip)

- **Before building specialist node renderers or reworking node visuals**
  (first hit in Chunk 4's connection UX polish, then Chunks 9/13/14/15):
  present the user with **3–4 visual mockups** of how nodes could look and
  what should be customizable (header treatments, density/compact modes,
  per-node accent/theming, what the user can adjust per node vs per type).
  The user picks/mixes BEFORE rendering code is written. Requested 2026-07-13.

- **Standing per-node design flow (agreed 2026-07-14).** Every node type —
  new or being refined — goes through this before its rendering code:
  1. **Research + brainstorm**: how real tools and real practitioners handle
     the concept; what the node should give/take/derive/flag; distilled
     into a one-minute **node brief** for the user.
  2. **3–4 mockups** grounded in the brief (for system-level work, each
     shown across several node types so it reads as a family).
  3. **User picks/mixes** → the pick is written down as a spec (zones,
     behavior, what's customizable) BEFORE code.
  4. **Build + tests**, behavior items with regression tests.
  A mix of options must resolve into ONE coherent spec — Chunk 4's lesson:
  combining mockup fragments without a written system produced the
  "thrown together" look Chunk 17 exists to fix.

## Deferred post-launch roster
Continuity engine (`stateAt`), Word Study, Illustration, Element/Patch game-design
suite, academic-pack polish, merge-progress faces, citation formatting,
presentation-walk mode. All registry entries + isolated reducers (invariant I8).

## Session log

### 2026-07-14 (evening) — Chunk 17: the Tab Card anatomy (completed)
- **Pre-flight:** the v1 side project (`Projects\node-canvas-v1`) pointed at
  the SAME GitHub repo on `main`. Renamed its branch to `v1-main` with its
  own upstream — origin/main stays reserved for V2. Old scratch copy is
  stale/harmless.
- **Research → brief → mockups → pick (standing flow, first full run):**
  legacy BaseNode read (V1 never stored a height until manual resize — CSS
  auto-growth was the whole trick; V2's mirror system inverted it, causing
  the grow bug) + canvas-tool survey. Four anatomy languages mocked across
  Note/Document/Person/Proposition; user picked **C — Tab card**; spec
  written to docs/design/node-anatomy.md.
- **Built:** tab (glyph + type + readiness + hygiene + owner + Fit) above
  the card; title = bold accent first line of the body; port stars on the
  border with labels floating OUTSIDE; rails deleted; mirrors deleted
  everywhere (DefaultFace/PropositionFace/NovelFaces); store
  `applyMeasuredHeight` → `recordMeasuredHeight` (records real card height
  for layout math, NEVER renders); Canvas applies an inline height only for
  user-owned sizes and strips RF-resizer dims on every sync (stale explicit
  height pinned the card after Fit — found by the new e2e).
- **Upgrade rule (user-approved):** machine-computed heights release to
  auto-growth; user-owned sizes keep exactly (I5). No migration needed —
  `ownedHeight` already marked ownership.
- e2e/node-anatomy.spec.ts pins all three reported bugs: types 300+ chars
  and asserts live downward growth from a fixed top edge (+ reload
  stability), asserts body width == card width and port labels outside the
  card, and walks resize→ownership→Fit→auto. Interaction rule 13 rewritten.
- Regression caught by diff-review: my CanvasNode rewrite briefly dropped
  two post-14 fixes (hidden-port hover handles; give-vs-take hygiene
  wording) — restored; NovelFaces test caught it. Screenshot-verified.
- Suite: 195 unit + 23 e2e green; typecheck + lint clean.

**Next session: Chunk 18 — hardening** (perf profile, file-per-project
persistence, migrations + backups, exports). Per-node design passes
continue under the standing flow whenever a type comes up.

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

### 2026-07-14 — Chunks 9–13 (completed, one session)

**Chunk 9 design checkpoint RESOLVED:** user saw 4 editor mockups (inline
rich card / focus overlay / side drawer / typewriter strip), liked all four;
shipped A+B (inline + focus overlay) because C/D answer the same question
with more chrome. ONE RichText component behind openEditor() keeps C and D
a preference toggle away. Logged as liked-but-deferred, not rejected.

- 9 Writing spine: TipTap everywhere text is written (toolbar on focus:
  bold/italic/H2/list/quote; content stored as HTML; stripHtml + HTML-aware
  wordCount in core). FocusEditor: double-click -> serif writing room, live
  word count, owner field, Esc back, prev/next + Alt+arrows walk spine
  siblings in wire order. zoomOnDoubleClick off.
- 10 Semantic zoom: zoom-far class below 0.25; collapsed faces render as
  breathing glowing stars with their name; double-click dives to zoom 1
  (explicit action). onlyRenderVisibleElements on.
- 11 Workflow: readiness dot on every header (click cycles seed ->
  developing -> ready -> placed), owner chip + focus-editor field,
  assembly faces roll up readiness counts + "waiting on <owner>: N" +
  workbench "N captured / oldest age". Core: ownerOf, ownersOutstanding,
  workbenchInfo.
- 12 Palette: Ctrl/Cmd+K — jump to any node by title/kind/content words
  (Enter centers it), or capture the typed text as a capturedAt-stamped
  note filed into the standing Workbench assembly (created collapsed on
  first capture; capture NEVER moves the camera). Tauri global shortcut
  deferred until a Tauri shell chunk exists (note: V2 has no desktop shell
  yet — add a Tauri-shell work item before Chunk 17 hardening).
- 13 Argument spine: academic pack (source + claim) as registry-only
  entries; 'any' dataKind intakes; document footnotes-in; Toulmin preset
  (SplitPreset.intake + splitNode options); citedSourceIds/unusedSourceIds
  derivations; generic hygiene dot on node headers (unsupported claims
  flag visibly). Citation formatting stays out of scope by decision.

Bugs found and fixed by e2e this session:
- RF fitView only fits MEASURED nodes; with onlyRenderVisibleElements the
  toolbar Fit ignored off-screen content entirely. Fit now computes bounds
  from the DOCUMENT and calls fitBounds.
- e2e pattern: with visibility culling, assert the model (localStorage)
  first, then Fit, then the DOM.

Suite at session end: 160 unit + 13 e2e green; typecheck + lint clean.
Commits: 503818f, d6c4bab, e86c932, 8db20fb, 69d1ad4.

### 2026-07-14 — Chunks 14–16 (completed, one session)

**Design checkpoints RESOLVED (both with mockups first, per the standing
rule).** Arc visuals: user picked **A+B+C combined, no tabs** (D rejected —
"we do not need to two tab them at all"): relation chips on wires + the
finished outline always on the group face (A), the Arc room overlay as the
workspace (B), drill-in renders propositions as phrasing strips (C).
Plant/Payoff/Event/Big Idea: user picked **Rich faces** (option 3).

- 14 Sermon pack. Core: `passage` + `proposition` types (new `prop`
  dataKind); wires gain optional `relation`; `arcs.ts` ships the 18
  Biblearc relationships in four families, `arcOutline` (coordinating joins
  equals, subordinating indents one level, cycle-safe, reading order =
  canvas position), `bigIdeaOf` (Subject + Complement wires -> exegetical
  statement, read by reference); `setWireRelation`; splitNode now matches
  the stub's give to the intake's kind; Passage -> Propositions preset.
  App: PropositionFace (teal verse chip), relation picker on wire chips
  (grouped by family), arc outline + Arc room button on assembly faces,
  ArcRoom overlay (bracket SVG + Arc|Phrasing toggle, serves/as selects
  edit the real wires), drill-in phrasing strips (DISPLAY positions only,
  dragging disabled — stored positions untouched, I5), Title face derives
  Exegetical/Homiletical lines when wired (unwired shows nothing, I2).
- 15 Novel pack. Core: `plant`/`payoff`/`event` types; PortDef gains
  `flagWhenUnconsumed` (gives) — hygieneFlags honors it generically, and
  these flags fire even unwired (spawning a Plant IS the opt-in; HygieneFlag
  gains an OPTIONAL `direction` field so existing goldens stayed
  byte-identical); `novel.ts`: payoffsOf/plantsResolvedBy (titles read
  live), eventTimeline, involvedIn, storyTimeOf. App: rich faces (payoff
  lists, mini event timeline with self-dot, role chips), wire chips carry
  an editable label (an Involves wire's label IS the role), story-time
  input, "Story & continuity" menu group.
- 16 Onboarding. `tutorial/steps.ts`: 8 steps with PURE done() predicates
  (unit-tested without a DOM); Tutorial.tsx: spotlight (pointer-events
  none — never blocks the canvas), performs-action-to-advance, Back/Next +
  counter, first-run invite (dismiss remembered), replayable; TipsPanel
  from the new ? toolbar button (connection kinds, shortcuts, groups,
  nudges) with "Replay the tour". Nothing ever moves the viewport.

Real gaps found and fixed while building:
- **Claim's Toulmin split had no UI entry point** (Split lives on the
  compile face; claim wasn't registered to it). claim + passage now carry
  DocumentFace — intake list, Split, preview, all free.
- **Hidden ports could never be wired** (no handle rendered): Footnotes and
  Subject/Complement were unreachable — TRY-IT §12 promised otherwise.
  Hidden ports now render handles that appear on node hover (rule 20).
- **Tutorial card swallowed the gallery's clicks** (anchored card sat where
  the menu opens). Cards anchor to the RIGHT edge; the spotlight marks the
  target (rule 19, found by e2e).
- **Back must stick**: the auto-advance predicate re-fired when returning
  to a completed step; entry state is snapshotted in-render (ref) so a
  revisited step only advances on a fresh false->true transition.

Testing notes: React Flow wraps nodes aria-hidden in jsdom (no measurement
pass), so accessible-name queries can't reach ASSEMBLY face buttons — unit
tests address those by attribute; e2e covers real-browser names. RF also
culls some off-origin nodes in jsdom — faces that must be unit-tested in
isolation render directly (they only need the store).

Suite: 194 unit across 22 files + 20 e2e green; typecheck + lint clean.
Goldens: arcs.golden.json + novel.golden.json NEW (shipped with their
features); registry-ports.golden.json extended additively (both commits
carry INVARIANT-CHANGE-APPROVED with existing entries byte-identical).

**Next session: Chunk 17 — hardening.** React Profiler pass, full-loop
Playwright e2e, schema migration + backup-before-migrate, export (JSON,
compiled text/markdown, PNG/SVG canvas export). File-per-project
(.nodecanvas) persistence should ride along with the migration work —
that's also where the Tauri shell earns its file dialogs.
