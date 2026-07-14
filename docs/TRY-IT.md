# Try it out — everything built so far (Chunks 0–8)

**Launch:** double-click the desktop shortcut **Node Canvas V2** (or run
`start-node-canvas.bat` in the repo). The app opens at `localhost:1421`.
Your canvas auto-saves as you work and survives closing the window.

Work through this in order — it builds on itself.

## 1. The canvas basics
- [ ] The app opens to the dark starfield with a subtle gold cross-grid.
      Pan around — the star layers move at different speeds (parallax).
      Watch for occasional shooting stars.
- [ ] Toolbar sits bottom-left, the node-type legend bottom-right (I6).
- [ ] Close the app and reopen: **nothing moves** — nodes and viewport come
      back exactly where you left them (I5).

## 2. The add-node gallery
- [ ] Click **+ Add node**. Miniature node cards, grouped Writing / Knowledge.
- [ ] Hover cards without clicking: the right panel fills with a description,
      **Gives/Takes**, and "Known as" (Section = Scene in Novel, Sermon Point
      in Sermon).
- [ ] Flip the **Core / All** toggle — All adds the Structure group
      (Manuscript lives there). Close and reopen the menu: it remembered
      which view you used.
- [ ] Spawn several nodes rapidly — they never land on top of each other,
      and if one would land off-screen the camera follows it.

## 3. Nodes
- [ ] Spawn a **Title** node: the body IS the words. Type something, then
      select it and drag a corner — the text scales with the box.
- [ ] Spawn a **Note**: type a lot of text — the node grows with it.
      Drag the resizer to take ownership of the size, then click the little
      **Fit** icon in its header to hand the size back.
- [ ] Click the small type tag (e.g. "NOTE") in any node header: pick a
      custom accent color. Reset it with the dashed swatch.
- [ ] Toolbar gear: switch **Density** to Compact and **Port labels** to
      Always / Off. Both persist.

## 4. Connections (three kinds)
- [ ] **Plain edge (always works):** drag from a top/bottom dot of any node
      to any other node. A gold line with a small chip appears. Click the
      chip (or the line) to label or delete it. This works between EVERY
      pair of types, zero setup (I1).
- [ ] **Data wire:** spawn a Note and a Document. Drag the Note's glowing
      right-rail star ("Text") to the Document's left-rail star ("Sections").
      While dragging, compatible stars glow green, incompatible red.
      The wire is colored by its data kind. Works dragged backwards too.
- [ ] **Tentative wire:** drag the Note's give star onto a Document's plain
      top dot (not the star). You get a DASHED wire — "this might go here" —
      and the Document shows an amber **"1 waiting"** badge. Do it to a
      second Document too. Click ✓ on one candidate: it becomes real, the
      other dissolves, and a toast offers **Undo** (try it).

## 5. The writing spine (compile)
- [ ] Spawn a **Document**. Click **Split → Beat sheet**: five wired Section
      stubs appear below it.
- [ ] Write a sentence in two sections, then click **Preview** on the
      Document: the compiled text follows wire order.
- [ ] Use the ↑/↓ arrows in the Document's section list: **reordering the
      wires reorders the compiled text** live.
- [ ] Spawn a **Person**, name them, wire their Identity star into a
      Section's People star. The Document footer shows **Cast: <name>**.
      Rename the person — the cast updates instantly (derived by reference).
- [ ] Notice the small amber dot next to "Sections · wire order": the
      Document is wired but serves no Thread yet (a nudge, never a block).
- [ ] Word count in the footer tracks the compiled text.

## 6. Assemblies (groups)
- [ ] Spawn 2 Persons + 1 Place. Click one, **Ctrl-click** the others,
      then click **Group 3** in the toolbar. They collapse into one card:
      "Person: 2 · Place: 1 · 3 inside".
- [ ] Rename the group by typing in its header.
- [ ] **Expand** (box icon): members return exactly where they were; the
      group becomes a small pill. Collapse again — lossless, every time (I4).
- [ ] **Open** (door icon): drill into the group — scoped canvas, breadcrumb
      bar top-left ("Canvas / your group"). Click Canvas to come back up.
- [ ] Connect an outside Note to the collapsed group's face with a plain
      edge. Drill in, delete one member, come back out: the group and its
      edge survive (the face is a stable interface).
- [ ] Groups can contain groups: gather a group card + a node together.
- [ ] **Unpack**: the group dissolves; every node is still there (I3 —
      members are references, never possessions).

## 7. Data safety (I9)
- [ ] Make an edit and immediately close the window. Reopen: the edit is
      there (saves flush on close).
- [ ] DevTools → Application → Local Storage: corrupt
      `nodecanvas.v2.document` (delete a `}`), reload. You get an error
      banner, a fresh canvas, and the broken payload is preserved under
      `...corrupt-backup` — never silently discarded.

Found something off? Tell Claude which checklist item and what happened —
each of these maps to a test that should have caught it.
