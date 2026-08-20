# Everything on the list

*One place for all of it, 12 Aug 2026. Tick as they land.*

## Broken now — fix first

- [ ] **Writing surfaces invisible** — text boxes don't look editable, caret can't be seen on the near-black body. *Blocks writing. Do first.*
- [ ] **Connections draw nothing** — wire is in the data (reconnect says "already connected") but no line appears
- [ ] **Resize shows no live feedback** — cause found: `Canvas.tsx:347` strips React Flow's live dimensions every sync
- [ ] Question node — hint text overflows the card
- [ ] Brainstorm node — "TOPICS" label clipped at the left edge
- [ ] Event node — "story time" label cut off

## Systems — turn bug classes into impossible states

- [ ] **Command system** — one declaration per action (id, label, icon, shortcut, when-available). 10 files currently handle keys separately. Gives keyboard-first flow and a self-updating shortcut sheet.
- [ ] **Save system** — one owner of what's dirty, when we write, where, and what the user is told. Prerequisite for the save indicator and crash recovery.
- [ ] **Wire system** — one function: (document, view) → wires to draw. 6 files hold pieces today; every wire bug so far was two of them disagreeing.
- [ ] **Sizing system** — one answer to "how big is this node and why". 6 places decide it; behind the resize bug and the spawn-overlap bug.
- [ ] **Theme tokens** — one source generating both TS constants and CSS variables. 10 files reference colour; every palette pass touches all of them.

## Feels professional

- [ ] **Code signing** — Windows shows "unrecognised app" on the installer. Biggest credibility item. ~$200–400/yr.
- [ ] **Auto-update** — no more hand-delivered builds; kills "which version am I running" permanently
- [ ] **First-run experience** — cold open is an empty starfield with no guidance
- [ ] **Visible saving** — "saved / saving… / last saved 2 min ago". Most important feeling in a writing tool.
- [ ] **Crash recovery** — offer the unsaved canvas back after a hard exit
- [ ] Window state memory (size and position on reopen)
- [ ] Real app icon (currently the Tauri default)
- [ ] Keyboard-first flow — new node, connect, navigate, search without the mouse
- [ ] Per-type empty-state copy instead of 45 identical "Write here…" prompts
- [ ] Honest error surfaces — two of the three current bugs fail silently

## Code health

- [ ] **`canvasStore.ts` is 1,873 lines** doing document edits, persistence, undo, ink, panels, templates, toasts. Split by concern.
- [ ] `Canvas.tsx` at 1,050 lines — same problem one layer up
- [ ] **18 stale browser specs** drive retired typed-port dragging. Because they always fail, browser tests are non-blocking in CI — *a real regression in the other 31 would not stop anything.* Rewrite, then re-arm the gate.
- [ ] **No test covers the actual walk** — open app, make a character, write a chapter, connect, reload, still there. That walk is the product.

## Design still open

- [ ] Node shapes/sizes barely vary — colour and icon do all the distinguishing
- [ ] Logic nodes render as full cards; should be small operators
- [ ] Per-type internal structure — only Person has had the pass
- [ ] Pixel/bitmap font? (asked, undecided)
- [ ] Pure-black canvas instead of the nebula? (asked, undecided)

## Later features

- [ ] PDF passage → node extraction (deferred by you)
- [ ] Continuity engine, Word Study, Illustration, presentation mode, merge-progress faces, academic-pack polish
- [ ] Chunk 19 commercial: license keys, payments, crash reporting (signing + updater pulled up above)

---

**Suggested order:** writing surfaces → connections → the end-to-end test that
covers real use → resize → visible saving → rewrite specs + re-arm CI → command
system → wire + sizing systems.
