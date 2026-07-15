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

## Open questions (brainstorm agenda)
1. Do dropzones REPLACE the intake list as how sections live in the
   document, or complement it (sections in the spine list; dropzones for
   quotes/sources/notes embedded mid-prose)?
2. Keep v1's write-back transclusion rule in V2? (Powerful, but surprising;
   V2 compile is currently one-way. If kept: editing an embed edits the
   section node everywhere — needs to be visibly signaled.)
3. Unique shape: does Document earn a "page" look (paper margins, wider
   default, subtle page edge) distinct from the standard card?
4. Fullscreen: v1 has a fullscreen portal; V2 has the focus room. Merge
   into one surface or keep both (focus = one section; fullscreen = whole
   document with embeds)?
5. What does the document GIVE beyond compiled text — should embeds be
   addressable (deep-link a paragraph)? (Probably post-launch; note only.)

## Status
- [x] Research (v1 rework + V2 machine inventory)
- [ ] Brainstorm settled with user
- [ ] 3–4 mockups
- [ ] Spec written
- [ ] Build + tests
