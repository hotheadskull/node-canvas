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

## Still open (answer via mockups)
- The embed marking treatment (margin line / gutter dot / ink tint / end
  tag) — mockup axis.
- Post-launch note: addressable embeds (deep-link a paragraph).

## Status
- [x] Research (v1 rework + V2 machine inventory)
- [x] Brainstorm settled with user
- [ ] 3–4 mockups (in progress)
- [ ] Spec written
- [ ] Build + tests
