# Node pass: Document — brief (IN DISCUSSION)

Per the standing per-node flow. Research done 2026-07-14; brainstorm with the
user is next; mockups only after the open questions below are settled.

## Research

### The user's own v1 rework (node-canvas-v1, uncommitted `DocumentNode.tsx`)
The user redesigned v1's Document recently and it is the reference for how
this pass should think. Its moves:

1. **Block-sequence body**: the document is an ordered list of blocks —
   `text` blocks (typed prose) interleaved with `dropzone` blocks.
2. **Per-dropzone handles**: every dropzone is its own wire target
   (`target-<blockId>`) positioned at that spot in the prose. A wire says
   "this content lands HERE", not just "this feeds the document".
3. **Live transclusion**: a wired node's content renders inline AND is
   editable in place — edits write back to the SOURCE node. One truth,
   touchable from both places.
4. **Blocks reorder by drag** (dnd-kit), delete with undo, "Add wire
   dropzone" opens a new slot; word count spans text blocks; a fullscreen
   portal editor for real writing sessions.

User's own verdict: "it still needs some work but it honestly works well
for what it is."

### What V2's Document already has that v1's lacks
- Pure, golden-tested compile derivation (wire order = reading order,
  recursive up the spine, cycle-guarded, tentative wires excluded).
- Derived cast (rename propagates), HTML-aware word count, hygiene flags,
  Split presets, footnote intake, per-mode labels.
- The focus room (serif overlay) and the Tab Card frame.

## Synthesis direction (to validate with the user)
The v1 node is the better WRITING SURFACE; V2's is the better MACHINE.
Likely shape: V2 Document keeps its spine/compile core, but its face
becomes a block-sequence editor where spine wires can be PLACED as inline
embeds between owned-prose blocks. Block order IS wire order (one ordering,
two views of it — reorder inline, the compile reorders, and vice versa).

## Decisions (brainstorm settled with the user, 2026-07-14/15)
1. **Blocks REPLACE the sections list.** The block sequence IS the document:
   spine wires land as embed blocks, block order is compile order (drag a
   block, the compiled work reorders). No separate intake panel.
2. **No live write-back. Fork on first in-document edit.** An embed mirrors
   its source (LIVE) until edited inside the document, then FORKS: the
   document keeps its version; the source node keeps the original and
   "basically becomes a note" — freely editable without affecting the
   document unless deliberately synced. Per-embed actions: view original /
   apply to source / revert to source (update from source). The source node
   shows one quiet "edited in <doc>" line, not the full variant text.
3. **No unique shape.** The Document is a (typically large) Tab Card and
   "earns the fullscreen mechanic" for real writing sessions.
4. **SEAMLESSNESS is the ruling constraint (user, verbatim intent):**
   inserted text must not "get in the way"; everything edits together as
   one flowing text. NO chips/titles above embeds — connection LINES carry
   the identity. Mockups explore how minimal the embed marking can be.

## SPEC (user picked mockup A — margin lines, 2026-07-15)

**Body = block sequence** stored in the document node's `data.blocks`
(passthrough; no schema change):
- `{ id, kind: 'text', content }` — owned prose (TipTap HTML).
- `{ id, kind: 'embed', wireId, fork?: content }` — a spine wire's landing
  spot. LIVE (no fork): renders the source's text; first in-document edit
  FORKS (stores `fork`). The source node is never written by typing.

**Normalization (derived, lazy migration):** `blocksOf()` appends an embed
block for any live spine wire without one (existing documents migrate by
construction: own text becomes the first text block, wired sections follow
in wire order); drops embed blocks whose wire is gone — UNLESS forked, in
which case the block converts to an owned text block (severed quotes keep
their words); guarantees ≥1 text block.

**Compile = block order.** Text blocks contribute their content; embeds
contribute `fork ?? compile(source)` (cycle-guarded). The wires array is
reordered to match whenever blocks move, so cast/goldens/manuscript
compile stay coherent. The old intake-list panel is GONE for `document`
(manuscript/claim/passage keep the list face for now — their passes come
later).

**Seamlessness (mockup A):** no chips in the prose. An embed is marked by a
2px margin line — blue LIVE, amber FORKED; hover floats source name +
actions (view original / apply to source / revert to source) OUTSIDE the
text column. Hovering between blocks shows a thin ＋ insert line (new text
block). Every block gets a hover grip; blocks drag to reorder (dnd-kit).
Wires can be dropped ON an embed-to-be position: each block carries a
target handle so a connection lands at that spot (persisted wire still
targets `sections-in`).

**Fork lifecycle:** fork on first edit; `apply to source` copies the fork
into the source node (deliberate write-back) and re-links LIVE; `revert to
source` discards the fork. A source node with forked embeds shows one quiet
"✎ edited in <doc>" line (click-through comes with the source-node passes).

**Fullscreen:** earned, not a shape — an expand control opens the same
blocks editor as a full-screen writing room (focus-room styling, Esc back).

## Status
- [x] Research (v1 rework + V2 machine inventory)
- [x] Brainstorm settled with user
- [x] Mockups → user picked A (margin lines)
- [x] Spec written
- [ ] Build + tests
