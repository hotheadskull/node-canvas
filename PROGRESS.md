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
| 18 | Hardening: perf pass (500-node stress green), Playwright e2e full loop, migration + backup-before-migrate, file-per-project (.nodecanvas) persistence, exports (markdown/text/PNG/SVG), Tauri shell wiring | **completed** (desktop-window smoke test pending — see session log) |
| 19 | Commercial: license keys, payments, Windows code signing, Tauri updater, crash reporting | deferred to VERY LAST (user, 2026-08-06); also blocked on user accounts — see 2026-08-05 log |

## Observatory adoption — the current focus

**RESOLVED (2026-08-09): the user picked a visual system** — not from the
in-repo pitch, but from an external Claude-design handoff they commissioned
and brought back: **docs/design/observatory/** ("plate & harness"). Its
README is the canonical spec — HIGH FIDELITY, values literal and final. It
was verifiably built against core (dataKind port values, readiness stages,
blocks/fork states, assembly actions are all real). The five .dc.html files
are design references, NOT production code; recreate in the real stack.

Build in the README's suggested order, full suite green between phases:

| Phase | Scope | Status |
|---|---|---|
| A | Data-kind color law (core/src/colors.ts) + closed DataKind union + readiness ring component | **completed 2026-08-09** (fonts bundled via fontsource; ReadinessRing per spec) |
| B | Plate anatomy (spine/gutters/rails) + three collapse states (data field; zoom borrows, never writes) | **completed 2026-08-09** |
| C | Wire rendering: chamfers, hops, lanes; junction dots; the 11 signal animations (budget ~8, reduced-motion) | **completed 2026-08-09** |
| D | Corridor derivation from free space; ghost-and-settle on drag (new core/src/routing.ts) | **completed 2026-08-09** |
| E | Assembly face (stacked edges) + block/embed states + fork notice | **completed 2026-08-10** (face union-ports deferred — needs a wiring-semantics decision; §8 colors + fork pill landed in the audit pass — the 78px label column was NOT adopted, the Document pass's margin-line pick holds) |
| F | Open state: in-place grow, linked rail, writing column, per-form bodies | **completed 2026-08-10** (the shell; per-form bodies ride with their node passes — mockups-first rule) |
| G | Split panel (replaces the preset list; presets become saved configs) | **completed 2026-08-10** |
| H | Density: gutter trunks, highways, filter bar, minimap | **completed 2026-08-10** (filter bar + earned resolution + minimap; trunk BANDS/highways remain visual polish — lanes already share corridors) |
| I | "Not yet in core" extras, EACH its own user decision: media/PDF node, ink layer, merge, relation filter, history | **merge + relation filter done 2026-08-10** (user approved G/H/I); media/PDF, ink layer, history each still need their own session + decision |

Notes: bundle Space Grotesk / Spectral / Space Mono (SIL OFL — offline
desktop). Per-node passes continue INSIDE this system (Writing mockup specs
the per-form bodies). Amend I8's look language to name Observatory when
Phase B lands (INVARIANT-CHANGE-APPROVED). Chunk 19 stays very last.

### 2026-08-10 — Observatory G + H + I(part) + nebula (user: "Do phases G, H, and I, then… nebula")

- **G, the split panel (§9):** core splitNode gains `wireBack` (children
  spawn loose) and `keepText` (parent prose MOVES to child 1) — defaults
  preserve every existing golden byte-identically; new split-panel.golden.
  SplitPanel component: Into stepper + type picker (spine-hue swatch,
  types filtered to what the intake takes), Numbered/Blank/Paste titles,
  both toggles, dashed 01/02 preview, Save as preset (localStorage,
  bookmark chips). Registry presets are chips that PRE-FILL the panel;
  heterogeneous/custom-intake ones (Toulmin, Passage→Propositions) run
  directly. Split button now on every DocumentFace type (document itself
  still opts out — fork-not-split, user 2026-07-15).
- **H, density (§6):** FilterBar (bottom-center, appears at 4+ live
  wires): one chip per data kind + "n of m shown" + clear; non-matching
  wires drop to a .12 whisper (selection always resolves; muted wires
  leave the animation budget). Styled RF MiniMap bottom-right. Trunk
  bands/highways deferred as pure rendering polish.
- **I (user-approved):** core/src/merge.ts — SAME-TYPE fold into the
  first-selected: prose appends, wires/edges re-point (self-loops, dupes,
  capacity-one overflow dropped), memberships transfer, absorbed nodes
  gone (merge.golden.json). Toolbar "Merge N" appears for same-type
  selections. Relation filter = the H filter bar. Media/PDF node, ink
  layer, history: each still its own decision + session.
- **Nebula:** Starfield gains a deepest parallax layer of baked SVG
  radial-gradient clouds in the plate palette (margin-safe tile, no CSS
  filters — the Chunk 2 rasterization lesson). Subtle by design.
- e2e/density-split-merge.spec.ts (3): panel→4 wired children;
  merge folds two notes; filter mutes the person wire (4 of 5 shown) +
  minimap. sermon-arc updated to the preset-chip flow.
- Suite: 273 unit + 49 e2e green; typecheck + lint clean. Goldens NEW:
  split-panel.golden.json, merge.golden.json (ship with their features).

### 2026-08-10 (later) — pt2 handoff adopted ("Node canvas UI mockups pt2.zip")

The user brought an UPDATED external handoff — same Observatory system,
now complete: four new mockups (Spec = authoritative, Shell, Presence,
Hub) + a rewritten README. It replaces docs/design/observatory wholesale.
Its 10-step "suggested order", built this session as steps land:

1. **done** `.readiness-dot` deleted; TipsPanel copy fixed (ring + pip).
2. **done** Eleven data-kind hues brightened + four state colours
   (core/src/colors.ts literals; e.g. text #a595f2→#b19bff).
3. **done** Plate surface: 100deg kind tint over the base, 32% tinted
   border, coloured under-glow, selected #8a7ce0 + kind ring, tinted
   rules/dividers, spine fades to 30%.
4. **done** Port = ONE slot changing shape (§3): outline open / amber
   pip wanted / filled 1 wire / 8px flare 2-4 / 12px flare 5+ / r5 dot
   merged. Bar 12×4 r2, wired glow rgba(hue,.85). Counts per port feed
   the variants (CanvasNode wireCounts).
5. **done** The night sky (§1): navy 158deg sky, Milky Way band SVG
   (glow/core/warm cast/second cloud/190 band stars/great rift/2 dust
   knots) in CANVAS space; five star layers at coprime tiles 613/719/
   827/953/1097 in SCREEN space, 20-80% parallax, one-tile drift per
   380-1100s cycle, transform-only; 24px dot grid; shooting stars CUT.
6. **partial (2026-08-10 eve)** — cast band on Section + presence
   matrix on Manuscript + person presence-over-events strip (user-built);
   Place/Person presence strip per chapter + select-to-promote pending.
7. **done (v1)** Hub type + HubFace (roster grouped by dataKind, hue
   chips, "speaks for" subject line). Subject hue-adoption on the plate
   frame is a follow-up (needs a CanvasNode hue override decision).
8. **done** notes-in on all 16 types + source.clip-out + passage.cite-in
   (INVARIANT-CHANGE-APPROVED: registry-ports.golden.json regenerated
   via new scripts/gen-registry-ports-golden.mts).
9. **done (2026-08-10 eve)** — the DOCK (56px left rail: Add node alone
   at top, four rooms with 1-4 keys, Find/Filter/Ink, spacer,
   Fit/Project/Settings/Help; hover labels after 400ms) + add sheet as
   five families of icon-hue tiles with arrow-key navigation, port-preview
   footer, and a Group shortcut tile. Core/All split retired (user).
10. partial — trunks/highways still visual-polish debt (filter bar,
   earned resolution, minimap shipped earlier).

Also landed since (2026-08-10 evening, mixed session — see log): §4
four-sided AUTO port movement (shared decision in app/src/portGeometry.ts),
§3 strand ties at the target stub, the ink layer (perfect-freehand,
strokes persisted through Zod as document.ink), ⌘V paste-to-note, per-type
faces for Section/Manuscript/Passage/Person/Source, panOnScroll (wheel
pans, ctrl+wheel zooms). Still open: drop-file→Source (SourceFace reads
data.sourceUrl but nothing writes it), block "new" row, trunks/highways.
Commits: 94a86a5 (steps 1-5), cda23bb (7+8). Suite green after each:
typecheck, 273 unit, 49 e2e. Verified in-browser via Playwright shots
(sky + band, plate tints, port variants incl. live flare, hub roster).

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

- **Standing per-node design flow (agreed 2026-07-14; scope enriched by the
  user after Chunk 17).** Every node type — new or being refined — gets an
  INDIVIDUAL pass through this before its rendering code:
  1. **Research + brainstorm WITH the user**: what the body actually hosts
     (which information lives in it), how it takes and gives information,
     what it derives/flags; how real tools and practitioners handle the
     concept. Distilled into a **node brief** (docs/design/node-passes/).
  2. **3–4 mockups** grounded in the brief — including whether the node
     earns a UNIQUE SHAPE, how information is stored/laid out in it, and
     how its connection lines and information lines behave.
  3. **User picks/mixes** → the pick is written down as a spec BEFORE code.
  4. **Build + tests**, behavior items with regression tests.
  A mix of options must resolve into ONE coherent spec — Chunk 4's lesson.
  Reference standard: the user's own v1 DocumentNode rework (block sequence,
  per-dropzone handles, live transclusion) — that depth of thinking, per node.

## Per-node design passes (docs/design/node-passes/)

| Node | Status |
|---|---|
| document | **completed 2026-07-15** (blocks editor + same-day polish round; spec, build, and polish decisions in node-passes/document.md) |
| title, note, section, question | not started |
| person, place, thing | not started |
| manuscript, passage, proposition | not started (manuscript should inherit the blocks editor when passed) |
| source, claim, plant, payoff, event | not started |

## Deferred post-launch roster
Continuity engine (`stateAt`), Word Study, Illustration, Element/Patch game-design
suite, academic-pack polish, merge-progress faces, citation formatting,
presentation-walk mode. All registry entries + isolated reducers (invariant I8).

## Session log

### 2026-08-10 (evening) — Dock + add sheet; the user's solo batch reviewed and repaired

Two bodies of work landed together. FIRST, the §10 menu (agent): the
56px left DOCK (Add node alone at top with its own zone, Canvas/Document/
Arc/Focus room tiles enabled off the selection with 1-4 keys, Find/
Filter/Ink, spacer, Fit/Project/Settings/Help; icon-only with 400ms
hover labels; Group N / Merge N moved to a bottom-center selection pill)
and the ADD SHEET (five families of icon-hue tiles, arrow keys + Enter,
port-slot preview footer, N toggles, I8 amended in CLAUDE.md).

SECOND, the user built a large batch solo (out of credits, another
tool): ink layer (perfect-freehand; strokes persist through Zod as
document.ink — I9 respected), four-sided ports + strand ties (core
harness takes top/bottom endpoints), per-type faces (Section cast band,
Manuscript presence matrix, Person role/wants/fears/voice/wound +
presence strip, Passage, Source viewer), ⌘V paste-to-note, ⇧F focuses
the selection, panOnScroll, Core/All tabs retired from the sheet.

Review found and fixed five real bugs in that batch:
- **Port hit areas overlapped at the new 12px pitch** (inset -10px boxes
  ate the neighbour's clicks — every wiring flow silently dead; now
  side-aware: kiss along the slot axis, generous outward).
- **Auto-side decided in two places that disagreed** → permanent ghost
  wires. ONE shared decision now lives in app/src/portGeometry.ts
  (strictly-above/below + close-centers; the open plate never auto-moves;
  autoSides ride the updateNodeInternals signature).
- **Double-click had been rerouted to collapse**, orphaning the open
  state (spec §8: double-click OPENS; ⌥click already collapses).
- **⇧F stripped the `node_` id prefix** before lookup (never matched);
  **⌘V spawned at a fixed origin** (now viewport centre); **PersonFace
  declared its Field component inside render** (input remounted every
  keystroke, dropping focus).
- **The routing "stay dodged" shortcut let the follow-up vertical run
  through unverified space** (e2e caught a route slicing the dropped
  plate). Reverted to the verified drop-pass-return staircase; the
  destination-biased side choice KEPT; routing.golden.json regenerated
  (INVARIANT-CHANGE-APPROVED).

Spec updates for changed UX (not weakened, re-aimed): wheel tests zoom
via ctrl+wheel (panOnScroll), canvas deselect-clicks moved right of the
dock, swap/dropped-plate fixtures park plates side by side so four-sided
auto-movement doesn't pre-empt what they test, AddNodeMenu tests match
the tab-less sheet. playwright.config pins workers: 2 (measured: 4
workers flake AND run slower on this machine).

Suite at close: typecheck clean, 272 unit green, 49/49 e2e green.
Leftovers flagged: drop-file→Source unwritten (SourceFace reads
data.sourceUrl), Canvas.tsx lost many explanatory comments in the solo
batch (history has them), app/check_logs.js + scratch/ left untracked.

### 2026-08-10 (latest) — Gutter swap + drag-time broadcast (user decisions)

- The wrap-around question RESOLVED by the user: the grammar STAYS fixed
  (intake one side, output the other — no four-sided ports); the odd node
  flips instead. **⇄ swap button** on the selected plate's header trades
  its gutters (data.flipped passthrough, persisted; handles re-register;
  anchorFor routes to the swapped sides so wires re-settle instantly).
- **Drag-time broadcast**: starting a wire drag lights EVERY port the wire
  could legally land on across the visible canvas — candidate slots glow
  and pulse in their data-kind color with labels forced on; everything
  else steps back to 25%. Both directions (give→takes, take→gives).
  Computed once per drag start via isValidWire dry-runs; cleared on end.
  Color does the teaching (user: "color coded... easy to learn").
- **Port labels default to ALWAYS** (was hover-only — "not showing
  things"); the gear setting still offers hover/off.
- Bug found by the suite mid-build: a replace_all missed the FULL plate
  variant's PortStars (indentation differs per variant), so candidates/
  flip only worked on open/collapsed plates until the e2e caught it. Also:
  the swap button briefly shared .canvas-node-fit and broke the anatomy
  spec's Fit locator — own class now.
- e2e/connection-affordances.spec.ts (2): broadcast lights document takes
  + dims bystanders + clears on release; flip moves the give to the LEFT
  gutter, wire survives + settles, flip persists across reload.
- Suite: 267 unit + 46 e2e green; typecheck + lint clean.

### 2026-08-10 (later) — Observatory Phase F: the open state (shell)

- Double-click grows a plate IN PLACE to 736px (spec §10). SESSION ONLY:
  the RF node borrows `width: 736, zIndex: 1200`; the stored document is
  untouched (e2e pins byte-identical localStorage across an open/close;
  the measured-height ResizeObserver PAUSES while open so opening can
  never become a write). The plate's own 4000px spread shadow dims the
  canvas behind it — no overlay fighting RF stacking contexts.
- Anatomy: one quiet header line (label · word count · readiness ring ·
  close), 154px linked rail (Takes/Gives as data-kind chips, hue 8% fill /
  24% border, wired chips brighter + glow — replaces the floating port
  labels while open), writing column (23px title, Spectral 16.5/1.72 at
  60ch, padding 22/30/8/26), footer rail (word bar toward a 1k soft scale,
  count, Focus). Esc returns; ⇧F (or Focus) steps into the FocusEditor —
  documents step into their DocumentRoom instead. Every handle stays
  mounted; anchorFor/computeHarness take an OPEN_WIDTH override so wires
  SETTLE on the grown plate (caught by the new e2e: the override applied
  to obstacles but not anchors → permanent ghost).
- Entry rewiring: double-click on writing plates now opens the open state
  (was: FocusEditor); documents keep their room on double-click. Tips
  copy updated; spine.spec walks open → Focus → room.
- e2e/open-state.spec.ts (3): grow/Esc/document-byte-identical; the
  two-step Esc ladder (room, then plate); wire stays settled while open.
- Per-form bodies (novel scene / sermon point / paper section) DEFERRED
  to their per-node passes — the standing mockups-first rule.
- Suite: 267 unit + 44 e2e green; typecheck + lint clean.

### 2026-08-10 — Mockup audit (user zip) + the §8 remainder of Phase E

- The user dropped "Node canvas UI mockups.zip" for a cross-check: it is
  the SAME Observatory handoff, byte-for-byte modulo line endings — no new
  spec content. Audited the build against it anyway:
  - Literal-exact: tokens, data-kind table (11/11 hue/stroke/dash), wire
    opacity .68/.74 + halo w7 .09, junction r3.4 + r6.5 ring .3, all 11
    signal characters, readiness ring, plate anatomy (spine/gutters/
    header gradient/hairlines/meta/ticks/slots), collapse triggers + zoom
    borrow, harness constants.
  - User-approved deviations on record: gutter brightness (outline/fill
    grammar, hand-tuned values), relate diamonds in the gutters.
  - FOUND: Phase E had been marked complete with §8 unshipped. Fixed now —
    block/embed STATE COLORS moved onto the user's margin-line grammar
    (live #a595f2, forked #f0c96a, spec alphas; the 78px label column NOT
    adopted — the Document pass's "lines, not chips" seamlessness pick
    holds); fork notice is now a header PILL (git-branch + "n fork",
    amber .12 fill / .32 border) + "diverged in <doc>" in the meta rail;
    the expandable preview/write-back row (user request 2026-07-15) stays.
  - Known gaps, deliberate: §4 bundles (cable ties) + four-sided ports →
    Phase H density work; §8 fork AGE and §7 face age need core
    timestamps (golden-touching — ask the user first).
- Suite: 267 unit + 41 e2e green; typecheck + lint clean.

### 2026-08-09 (later still) — Observatory Phases D + E + gutter grammar

- **Gutters (user-requested):** each side rail now wears the connection
  grammar at rail scale — a visible outline while open, a lit indigo fill
  once it carries any connection (wires on that side, or any relationship).
  Deliberately brighter than the spec's rgba(0,0,0,.24) by user direction.
- **Phase D — corridors (core/src/routing.ts + routing.golden.json NEW):**
  "corridors are derived, not authored." Every visible plate rides into
  routeHarness as an obstacle, inflated by CORRIDOR_MARGIN (8px);
  clearLaneX slides a wire's vertical lane outward past any plate it would
  slice (no rect is exempt — a lane inside its own source is still wrong);
  dodgeObstacles staircases horizontal runs around plates (nearer edge
  first, both the drop and the pass verified clear; boxed-in keeps the
  crossing — a crossing beats a vanished wire). Segments that START or END
  inside a plate's margin are exempt (stubs leave through their own ring).
  Junction dots now computed from the INPUT stub (dodges can insert
  points); wire labels ride the LONGEST vertical (the real lane, not a
  dodge stub). Hidden members of collapsed groups are NOT obstacles
  (visibility predicate threaded through computeHarness).
- **Phase E — assembly face:** the Observatory face — stacked-edges shadow
  (the only new shape: "there is more inside"), ASSEMBLY label #d08fd0,
  rollup readiness RING in the header, derived count CHIPS colored by the
  member type's give dataKind (hue 10% fill / 24% border), readiness
  distribution bar (stage-ordered flex segments), Space Mono footer with
  member count + icon actions (expand/drill/arc/unpack — aria labels
  unchanged, e2e untouched except the counts-text pin, now chips).
  Expanded groups draw a dashed #3a4070 boundary around the members'
  DOCUMENT rects (display only, follows drags, never moves anything — I5).
  Deferred from §7: union-of-unsatisfied-ports on the face (needs a
  wiring-semantics decision — external wires store member endpoints today)
  and footer age (assemblies carry no timestamp in core).
- e2e: harness.spec gains "a plate dropped onto a wire pushes the route
  into free space" (real drag onto a live wire, then samples every settled
  path segment against the plate's stored rect).
- Suite: 267 unit + 41 e2e green; typecheck + lint clean. Goldens:
  routing.golden.json NEW (ships with its feature; regenerate via
  scripts/gen-routing-golden.mts).

**Next: Phase F — the open state** (in-place grow to 736px, linked rail,
writing column, per-form bodies), then G split panel, H density.

### 2026-08-09 (late night) — Relate anchors join the gutters (user-requested)

- The gold top/bottom diamonds are gone from the plate edges. Plain-edge
  anchors are now RELATE DIAMONDS at the top of each side gutter, wearing
  the plate language: slate outline while unused, gold fill (same
  filled-means-real grammar as the slots) once the node carries any
  relationship, gold on hover. Diamonds = relationships, slots = data —
  two species, one home. I1 untouched: zero-setup plain edges remain.
- ZERO migration: handle ids stayed top/bottom, so every stored edge in
  every existing document re-anchors automatically.
- Rode along: CanvasNode.tsx had three RAW control bytes (NUL/SOH baked
  into the fork-signature separators) making git treat it as binary —
  replaced with written-out escapes, semantics identical.
- e2e locators moved from RF position classes to [data-handleid] (the
  position classes changed with the anchors; face handles keep theirs).
  Tour step + Tips copy updated to describe the diamond.
- Suite: 255 unit + 40 e2e green; typecheck + lint clean.

### 2026-08-09 (night) — Observatory Phase C: the wire harness (completed)

- core/src/harness.ts (+ golden): routePoints (stub → lane → stub
  orthogonal skeleton), harnessPathD (45° chamfers, cuts clamped on short
  runs; hop arcs A6,6 with sweep 1 down / 0 up), findHops (verticals hop
  horizontals, margin clears hop radius + chamfer), routeHarness (lanes
  14px apart per target in intake order; junction dot at the shared stub
  when one give feeds 2+ takes -- no dot, no relationship).
- app/src/harnessRouting.ts: pixel anchors from the SAME constants the
  plate renders with (PORT_TOP/PORT_GAP); collapsed plates anchor at the
  merged dot. Measured empirically: RF anchors an edge at the handle
  OUTER edge (give = nodeRight+3, take = nodeLeft-3) -- the formula-vs-DOM
  drift was 11px and nothing ever settled until measured, not assumed.
- Ghost-and-settle WITHOUT extra state: the harness routes from DOCUMENT
  positions and FREEZES while any node drags (draggingCount); WireEdge
  compares RF live handle coords to the routed anchors -- divergence => a
  straight dashed ghost, release => recompute and settle. The freeze also
  skips the O(n²) hop pass per drag frame.
- Signals: the 11 characters as .sig-<dataKind> CSS (dash sums 1200,
  offset 1200→0; crawl has its own keyframes); Canvas assigns an ~8-wire
  budget; prefers-reduced-motion kills them all.
- Overlay-gating bug FOUND by the suite: the tutorial invite read the
  CLOSED_DOCUMENT sentinel, so it never left once nodes existed and ate a
  hover. Invite now reads a narrow emptiness primitive.
- e2e/harness.spec.ts (4): orthogonal settle, junction dot via real port
  clicks, mid-drag ghost sampled during a real mouse drag, signal budget.
- Suite: 255 unit + 40 e2e green; typecheck clean.

**Known Phase-D debt (expected): lanes can still cross plates** -- corridor
derivation from free space is exactly the next phase.

### 2026-08-09 (later still) — Observatory Phase B complete: collapse states

- data.collapsed rides in node.data (passthrough -- no schema change, no
  golden risk; same precedent as ownedHeight/accent). toggleNodeCollapsed /
  setAllCollapsed in the store; rolled-up stays derived from assemblies.
- Collapsed plate: header rail (label + readiness ring) + title + one
  subtitle line (stripped prose); no face, no meta rail. Ports MERGE to
  one dot per side -- every handle stays mounted at the same spot, so no
  wire can ever drop (v1 lesson: an edge without its handle cannot render).
  handleSignature includes the collapse state so RF re-measures.
- Interactions: ⌥click toggles a plate, ⌥⇧click sweeps the selection,
  ⌥⇧A collapses/expands ALL (skips when typing in an editor).
- Zoom borrow: below 45% every plate RENDERS collapsed via a session-only
  store flag; the stored value is never written (unit test pins document
  identity; e2e pins localStorage bytes).
- e2e/collapse.spec.ts (4 specs): toggle + subtitle + reload persistence;
  wire survives collapsing its source; zoom borrows-never-writes; ⌥⇧A.
- Suite: 244 unit + 36 e2e green; typecheck clean.

**Next: Phase C — the wire harness** (chamfered orthogonal routing,
corridor derivation, hops, junction dots, ghost-and-settle on drag).

### 2026-08-09 (later) — Observatory Phases A + B-anatomy (completed)

- **Phase A done:** fonts bundled (@fontsource Space Grotesk/Spectral/Space
  Mono — offline desktop); ReadinessRing component per spec §3 (26×26, r=8;
  seed dashed / developing amber half-arc / ready green / placed fill+tick)
  replaces the readiness dot on plates.
- **Phase B anatomy done:** CanvasNode rebuilt to the plate —
  [spine 3px][take gutter 13px][body][give gutter 13px]; body =
  header rail (kind-tinted gradient, registry label at 8.5px/.15em, owner
  chip, Space Mono short id, readiness ring) / tinted fading hairline /
  content / hairline / META RAIL (words, n in · n out, stage — counts come
  from real wires). Port slots are 12×4 outline-when-open,
  filled+glow-when-wired (the port grammar). Selection = #7a6ec4 border +
  ring + four corner registration ticks. Tokens in :root are the literal
  handoff values. Wire color law live in WireEdge: hue/weight/dash from
  DATA_KIND_STYLES + 7px halo at .09, opacity .68/.74.
- **Chips above plates (rule 2 upheld):** the meta rail grew every card
  ~20px and a tentative wire's Commit chip vanished under a plate —
  .react-flow__edgelabel-renderer now rides above the node layer and
  .plate-meta is pointer-transparent.
- **Per-keystroke perf:** typing profiled at ~45ms/key in dev-mode e2e —
  pre-existing, React dev-mode JSX overhead (not app code; prod unaffected).
  Mitigations: the five always-mounted overlays (palette, tutorial, focus
  editor, doc room, arc room) now subscribe to CLOSED_DOCUMENT while closed
  (zero re-render per edit); Playwright timeout 30→45s with the profile
  documented in the config comment.
- **Spec fix, not app fix:** the anatomy reload test compared boundingBox
  heights across two fitAll zooms; taller plates changed the second zoom.
  It now compares unscaled offsetHeight (same intent, no zoom coupling).
  Verified byte-identical reload heights by hand first.
- **I8 amended** (INVARIANT-CHANGE-APPROVED): look/feel authority is the
  Observatory spec; /legacy stays reference for interactions only.
- Suite: 239 unit + 32 e2e green; typecheck clean. Next: Phase B collapse
  states (schema field, ⌥click, zoom borrows-never-writes), then Phase C
  wire chamfers/hops/lanes.


### 2026-08-05 — Chunk 18: hardening (completed)

- **Migration rails** (core/src/migrate.ts): schemaVersion read off RAW JSON
  before Zod (DocumentSchema only accepts current), ordered step registry
  (empty at v1 — the pipeline, gap/future-version failures, and the
  `migrated` flag ship proven), loadDocument() as the one read entry point.
  Backup-before-migrate lives in BOTH persistence worlds: localStorage key
  backup-v{N}; Tauri writes <file>.backup-v{N} BEFORE the file can be
  overwritten, and a failed backup refuses the open (I9).
- **Exports** (core/src/export.ts + export.golden.json): hand-rolled
  HTML→Markdown for the StarterKit vocabulary (core stays dependency-free,
  I7); exportMarkdown/exportPlainText over compileBlocks; exportFileStem.
  Malformed HTML degrades to words, never loses them.
- **File-per-project**: projectIO seam (app/src/persistence/projectFile.ts)
  — Tauri native dialogs + fs vs browser download/picker, detected at
  runtime; store gains projectPath binding (auto-save writes through to the
  bound file; localStorage stays the crash-safe working copy), New/Open/
  Save/Save-As with the outgoing canvas stashed + Undo toast; Toolbar
  Project popover + palette commands (per-node "Export … as Markdown").
  PNG/SVG canvas export (html-to-image; exportingCanvas pauses culling).
- **Tauri shell wired**: dialog/fs/global-shortcut plugins (Rust + JS +
  capabilities), cargo check green; Ctrl+Shift+K global capture registered
  at boot (Chunk 12's deferred half). NOT yet smoke-tested as a real
  desktop window — first `npm run tauri -w app dev` run is the next
  session's opening move.
- **Perf pass — the stress spec (500 nodes / 800 edges) went from a
  75-SECOND boot to under 3s.** Root causes, now interaction rules 21–23:
  updateNodeInternals called from every mounting node (quadratic;
  36s from one line); TipTap editors constructed per node at boot (RF
  force-renders all nodes once for handle discovery — editors now mount
  lazily behind a pixel-identical static shell, hover pre-warms);
  missing culling size hints (initialWidth/initialHeight); document→RF
  sync now preserves object identity so memoized nodes/edges skip.
  The lazy-shell bugs the e2e suite caught on the way: focusable shell
  killed RF selection; mousedown-time swap detached the click target;
  async editor construction dropped first keystrokes (immediatelyRender +
  layout-effect focus).
- e2e: full-loop.spec.ts (build → save .nodecanvas → wipe → reopen via real
  picker → reload survival → markdown export, plus PNG export and New-undo)
  and stress.spec.ts (boot <15s budget, culling active, pan + spawn budgets).
- Suite: 235 unit + 32 e2e green; typecheck + lint clean. Goldens:
  export.golden.json NEW (ships with its feature).

**Chunk 19 (commercial) is CURRENT and blocked on user-owned accounts:**
payment provider (Stripe/Paddle/LemonSqueezy — LemonSqueezy/Paddle handle
VAT as merchant-of-record, likely right for a solo dev), a Windows code
signing certificate (or accept SmartScreen warnings at first), updater
signing keys (`tauri signer generate`), and a crash-reporting choice
(Sentry account or a simple local crash log). License-key verification
logic + updater config can be built once the user picks providers. Also
pending: per-node design passes (only Document done — Note/Section next,
mockups-first per the standing flow), and the desktop smoke test above.


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

### 2026-07-15 — Node pass: DOCUMENT (completed; the first full per-node pass)
- Ran the whole standing flow: research (the user's own v1 DocumentNode
  rework was the reference), brainstorm settled with the user (blocks
  replace the sections list; fork-on-edit, NO live write-back; no unique
  shape — fullscreen earned; SEAMLESSNESS rules: lines, not chips), mockups
  (user picked A — margin lines), spec, build.
- Core `blocks.ts` + blocks.golden.json (NEW golden with the feature):
  blocksOf (normalization IS the lazy migration; deterministic synthesized
  ids), compileBlocks (block order = reading order; forks win), fork ops
  (editEmbed / revertEmbed / applyEmbedToSource — the only write-back),
  moveBlock (re-syncs wire order so cast/manuscript agree), severed forked
  embeds convert to owned text; forkNoticesFor.
- App: BlocksFace (margin-line embeds, hover action row — forked rows keep
  it visible: a fork is a pending decision; ＋ insert lines; dnd-kit drag
  reorder; per-block landing handles `blk:<id>` so wires land AT a spot),
  DocumentRoom fullscreen (double-click or Expand), source nodes wear
  "✎ edited in <doc>". manuscript/claim/passage keep the list face.
- REAL bug caught by the new e2e: keying the embed editor by fork-state
  remounted TipTap on the first keystroke into a live embed and dropped the
  caret. Fixed (no state-dependent key; RichText already syncs external
  values when unfocused).
- Long-lived test flake ROOT-CAUSED: the store's debounced save from test N
  fired into test N+1's seeded localStorage. Fixed via cancelPendingSave()
  in test-setup afterEach. Also: jsdom + onlyRenderVisibleElements culls
  any node whose rect misses (0,0) once nodes stopped carrying forced
  inline heights — face tests must seed nodes at the origin.
- Suite: 209 unit + 25 e2e green; typecheck + lint clean. Screenshot
  verified (live blue line, forked amber line + action row, fork notice).

**Next: Chunk 18 hardening, or the next node pass (Note or Section are the
natural follow-ups; manuscript should inherit the blocks editor).**

### 2026-07-15 — Connector system + working-set menu (user-requested)
- **Connectors (user picked design B from 3 mockups):** data ports now live
  in dedicated side GUTTERS (takes left, gives right; 6px whisper on empty
  sides), and plain-edge anchors are GOLD DIAMONDS at top/bottom center —
  relationship lines and data wires are visually different species at
  different, predictable points. Anatomy spec zone 3 amended.
- **Working-set menu:** the add-menu default view shows ONLY the types
  whose per-node pass is done (currently Note + Document; grows per pass).
  The All view + search keep every type reachable — I11 untouched.
- e2e seeds `menuView='all'` in every spec's beforeEach. LESSON: bulk-
  patching specs with PowerShell Get/Set-Content mangles UTF-8 (mojibake in
  4 files) — restored from git and re-patched via a Node script; use Node
  or the Edit tool for source edits, never default-encoding PowerShell.
- Suite: 210 unit + 25 e2e green; typecheck + lint clean. Screenshot
  verified (gutters, diamonds, trimmed menu).

### 2026-07-15 (night) — Document polish round (user feedback, completed)
User feedback after living with the blocks editor drove nine changes
(recorded in node-passes/document.md "Polish round"):
- **Steady connectors:** ports always visible (optional ones dimmed 45% →
  full on node hover), no hover growth; invalid drag targets glow red AND
  wear an ×. Anatomy spec amended; e2e asserts resting opacity + unchanged
  hover transform.
- **Seamless editor:** the per-block toolbar was silently occupying ~29px
  of flow space between every paragraph — now a focus-time overlay; grips
  always faintly visible; live-embed tags are hover OVERLAYS (no layout
  shift; forked tags stay in-flow permanently); insert lines whisper on
  editor hover; block padding tightened.
- **Arrow keys cross blocks** (RichText onBoundary + a domObserver.flush so
  key-repeat can't outrun PM state — found because the e2e pressed keys
  with zero delay and the caret stalled; the flush fixed the real
  key-repeat case too).
- **Preset Split button REMOVED from Document** (user read "Split" as the
  fork — which needs no button). DocumentFace types (claim/passage/
  manuscript) keep theirs until their passes. spine.spec + faces.test now
  drive **"+ Section"** — the new footer button spawning a wired Section
  off the LEFT gutter (titled Section N).
- **Highlight-split** (store.splitSelectionToNode): select text → ✂ Split
  → Section/Note/Question/Source. Text MOVES OUT (user decision), prose
  closes up via a PM delete transaction (mid-paragraph splits don't leave a
  break), new node spawns off the document's right with a plain edge
  labeled "split". e2e covers the full loop.
- **Owned height = scrolling window:** `.canvas-node-main.is-owned` scrolls
  (nowheel); inner editors give up flex-clipping so the body is the ONE
  scroll container. e2e: own short, type past, assert scroll.
- **Fork notice shows the fork:** ForkNotice now carries the fork text
  (inline test updated — NOT a golden change); the source node's "✎ edited
  in <doc>" expands to the document's version + "use this version"
  (applyEmbedIn write-back).
- Declared `@tiptap/pm` in app deps (DOMSerializer for selection HTML).
- KNOWN QUIRK (follow-up): the corner resizer won't START a shrink drag on
  a never-resized auto-height card; grow-first or owned cards shrink fine.
- Suite: **210 unit + 28 e2e green**; typecheck + lint clean. Screenshots
  verified: fork preview on source, split picker, red × mid-drag.

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
