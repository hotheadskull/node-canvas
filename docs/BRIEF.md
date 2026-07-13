# Node Canvas V2 — Revised Master Build Brief

This is the canonical build document. It supersedes the original master brief.
The chunk list and statuses live in [PROGRESS.md](../PROGRESS.md); the
invariants live in [docs/invariants/INVARIANTS.md](invariants/INVARIANTS.md)
(locked). This file holds the vision, architecture, and node catalog.

## Revision log (decisions made 2026-07-13, with the user)

1. **Launch packs: novels/worldbuilding AND sermon prep** — the user's own two
   use cases. Novel pack builds first (the argument spine reuses the writing
   spine's compile mechanic), sermon second, launch with both. Academic and
   game-design packs are post-launch.
2. **Vision reframe: the Universal Core IS the student pack.** Target user is
   "a student's dream" — notes, group projects, papers, thought tracking,
   worldbuilding. Core serves students/everyone; packs serve specialists.
3. **Interleaved build order** — canvas baseline right after core graph, so
   every core capability is rendered and felt before the next lands. Writing
   spine ships before semantic zoom (user value before polish).
4. **Persistence: one file per project** — a Zod-validated `.nodecanvas` JSON
   document. Pre-migration backups are file copies beside it. The `db/`
   workspace stores app metadata only (recent projects, window state).
5. **CRDT-compatible format constraint (I10)** — stable IDs everywhere,
   delta-friendly structure, no positional indices as identity. V2 ships
   file-sharing + ownership tags only; real-time collab is NOT in V2, but the
   format must never require a rewrite to add it.
6. **Ownership tags are launch scope** (group projects need "waiting on
   Sarah: 3" rollups). Merge-progress faces stay deferred.
7. **Core nodes are named by FUNCTION, not sphere.** Writing set: Title, Note,
   Document, Section, Question. Knowledge set: Person, Place, Thing. Per-mode
   labels translate on top (Section = Scene / Sermon point / Body paragraph).
   ("Title" as the anchor-node name is provisional — revisit before launch.)
8. **Packs never gate availability (I11)** — enabling a pack changes default
   labels and menu prominence, never access. Every node type is always
   reachable by every user.
9. **Add-node menu is a card gallery with a docked preview panel.**
   - Each entry is a miniature rendering of the actual node (from registry
     data, so it cannot drift).
   - Hover/select fills the preview panel: bigger preview, one-line purpose,
     Gives/Takes, and a "Known as" list (core nodes) or "From <pack>" + a
     cross-sphere use hint (pack nodes).
   - **Core / All toggle** beside search: Core = compact beginner view
     (default); All = full scrollable catalog grouped core → structure →
     packs, preview panel stays docked while scrolling. The menu remembers
     the last-used view. Search always searches everything.
10. **Deferred post-launch:** continuity engine (`stateAt` — story-time fields
    still ship on Event so the data model is ready), Word Study, Illustration,
    Element/Patch suite, citation FORMATTING (footnote/Source wiring stays;
    export markdown and let word processors typeset), merge-progress faces,
    presentation-walk mode.
11. **Added scope:** PNG/SVG canvas export (hardening chunk); Chunk 18 for
    commercial launch (license keys, payments, Windows code signing, Tauri
    updater, crash reporting).
12. **Compile order needs direct manipulation:** wire-order compile is driven
    by an ordered intake list in the node inspector (drag-to-reorder); wires
    are the visual layer of that list.

## Vision

Node Canvas is a visual thought-processing desktop app: an infinite canvas of
typed nodes and meaningful connections. It serves students first (notes, group
projects, papers, thought tracking) through the Universal Core, and
specialists (novelists, worldbuilders, preachers — later: academics, game
designers, and more) through packs. It will be sold commercially. It contains
NO AI features — a deliberate product decision, not a gap.

## Architecture

**Three kinds of connection:**
1. **Plain edge** — a line. Relationship only. Always available (I1).
2. **Data wire (port connection)** — named output port ("give") to named
   intake port ("take"). Typed and validated; information flows. One output
   may feed many intakes.
3. **Tentative wire** — dashed candidate placement. A node may have tentative
   wires to several destinations; each destination shows "N ideas waiting."
   Committing one converts it to a real wire and dissolves that node's other
   tentative wires (with undo and a "N candidates dissolved — undo" toast).

**Ports.** Declared in the registry per node type:
`{ id, direction: give|take, dataKind, label, defaultVisible }`. 4–6 ports per
type max; fewer visible by default, the rest via the node inspector. Runtime
handle changes MUST call `updateNodeInternals(nodeId)`.

**Derivations.** Pure functions in core, computed from the graph, never stored
as user-editable data: compiled text (wire-order concatenation up the spine),
auto-derived casts, word-count rollups, Assembly faces, readiness rollups,
unsupported-claim flags. Every derivation is drill-downable to the nodes that
produced it (provenance).

**Split.** Any node with an intake spine can Split: generate stub child nodes
pre-wired back into the parent's intake. Templates (beat sheets, Toulmin,
Passage→Propositions) are registry-defined Split presets.

**Assemblies.** Core-layer entity: `{ id, memberIds[], internalEdgeIds[],
derivationRules }`. NOT built on React Flow parentId nesting. Rendering is
hybrid: collapsed = one custom card showing the derived face with the
Assembly's output ports; expanded = drill-in scoped canvas with breadcrumbs.
Assemblies nest arbitrarily. The face is a proxy/interface layer — it survives
deletion/rewiring of inner nodes; external connections attach to the face,
never to inner nodes.

**Semantic zoom.** Past a zoom-out threshold, Assemblies (and opt-in dense
webs) render as single glowing star points. The theme made mechanical and the
primary performance lever. Combine with `onlyRenderVisibleElements`.

**Performance targets.** All custom nodes `React.memo`; `nodeTypes`/`edgeTypes`
defined once; Zustand with `useShallow` selectors (drag one node → only it
re-renders, verified with React Profiler); smooth at 1000 nodes, usable at
2000 with collapsed Assemblies.

**Connection accessibility (hard requirements):** `connectOnClick`;
`connectionRadius: 40`; `connectionMode: loose`; handles ≥14px visible with
larger invisible hit areas; hover growth; live valid/invalid coloring;
whole-node-as-source option with explicit drag handle; collision-free spawn
(spiral search); auto-fit height via ResizeObserver → state →
`updateNodeInternals`, manual width via NodeResizer (sizing math golden-tested).

## Node catalog

Five verbs everywhere: **give, take, derive, flag, split.**

### Universal Core — Writing set
| Node | Gives | Takes | Notes |
|---|---|---|---|
| **Title** | Thread outputs (anchor check dims anything not tracing back) | Subject + Complement | The governing idea. Name provisional. |
| **Note** | its text | — | Convert action: promote to any type without retyping. First node in the menu. |
| **Document** | compiled text; cast; word count | Sections intake (compiles in wire order); Thread | |
| **Section** | text upward; cast contribution | People, one Place, POV, StoryTime, Serves (Thread) | = Scene / Sermon point / Body paragraph per mode |
| **Question** | open/answered status (open ones glow) | Answer (wire the resolving node in; keeps the trail) | open-question counts roll up per Assembly |

A **Manuscript/Project** level above Document uses the same intake mechanic
one level up. Split runs the spine in reverse: stubs pre-wired back up.

### Universal Core — Knowledge set
| Node | Gives | Takes | Notes |
|---|---|---|---|
| **Person** | Identity (name + aliases; rename propagates everywhere) | Bond (labeled relationship wires), Possession (story-time-stamped), Anchor | appearances list |
| **Place** | Identity; Contains (place-in-place nesting) | Anchor claims; Setting wires | "sections set here" |
| **Thing** | Identity; State (computed holder at story-time — post-launch reducer) | Possession wires; Anchor | |

### Structure
Assembly, Sequence, Checklist (readiness), Tension (v1's Crucible, core-named).

### Packs (launch: novel + sermon)
- **Novel/worldbuilding:** Plant/Payoff (orphans flag themselves), Event
  (story-time index, role-labeled Involves wires, Effects — reducer
  post-launch), Idea/Theme (presence list, coverage gaps).
- **Sermon:** Proposition (Passage Splits into Propositions), arcing wire
  types (the 18 Biblearc relationships), Arc Assembly (derives main-point
  structure), phrasing view (auto-indents by subordination), Big Idea
  (exegetical/homiletical faces). Word Study + Illustration post-launch.
- **Argument spine (shared by sermon + future academic):** Source (quotes with
  locators), Claim (flags itself when Supports is empty; Toulmin Split
  preset), Prose Section (footnote intake — wiring only, no citation
  formatting at launch).

Pack rules: wire into universal spines, never a parallel system; earn the
place with real port behavior (a renamed Note is rejected); registry-only
(I8); discoverable but unobtrusive (I11).

## Workflow layer
Readiness state on any node (seed → developing → ready → placed; subtle ring;
Assemblies roll up). Workbench standing inbox (quick capture routes here;
face shows "7 notes, oldest 12 days"). Ownership tag on any node with
per-person Assembly rollups — no accounts, no sync.

## Future pack roster
See the original brief's Part 6 list (creative writing, faith & ministry,
academic, professional, games, media, personal, research). Unchanged; nothing
scheduled. Plain edges make every pack node compatible with everything by
default; deep port interactions are curated only where meaningful.

## Known v1 regressions to guard (tests written early)
1. Auto-fit/resize breaking across sessions → golden tests on sizing math + I5 test.
2. Edges breaking at long stretch → edges never disconnect from distance.
3. Canvas moving on load → I5 regression test.
4. Collapse losing nodes → losslessness golden test at 3 nesting levels.
