# Try it out — everything built so far (Chunks 0–16)

**Launch:** double-click the desktop shortcut **Node Canvas V2** (or run
`start-node-canvas.bat` in the repo). A console shows build progress, then
the **Node Canvas desktop window** opens (first launch compiles for a few
minutes; after that it's quick). Closing the console stops the app.
Your canvas auto-saves as you work and survives closing the window.

Note: the desktop window keeps its own storage — a canvas you made earlier
in a browser tab won't appear in it (and vice versa).

Work through this in order — it builds on itself.

## 1. The canvas basics
- [ ] The app opens to the dark starfield with a subtle gold cross-grid.
      Pan around — the star layers move at different speeds (parallax).
      Watch for occasional shooting stars.
- [ ] Add node sits top-left; the Fit/settings toolbar sits bottom-left (I6).
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

## 8. Rich text + the focus room (new)
- [ ] Click into any Note/Section body: a small formatting toolbar fades in —
      bold, italic, heading, list, quote. Formatting survives reload and
      shows in the Document's compiled Preview.
- [ ] **Double-click** a Section: the focus room opens — big serif editor,
      live word count. If the section is wired into a Document, prev/next
      (or Alt+←/→) walk its siblings in compile order. Esc returns.
- [ ] In the focus room, set an **owner** (top right). The node now wears a
      small owner chip on the canvas.

## 9. Semantic zoom (new)
- [ ] Collapse a group, then zoom way out: the card becomes a glowing,
      breathing star with its name. Double-click the star to dive back in.

## 10. Readiness + group rollups (new)
- [ ] Click the little dot at the left of any node header: it cycles
      seed (gray) → developing (yellow) → ready (green) → placed (purple).
- [ ] A collapsed group's face now shows readiness counts and, if owners are
      set, "waiting on <name>: N".

## 11. Ctrl+K — jump and capture (new)
- [ ] Press **Ctrl+K**, type a few letters of any node's title, Enter: the
      camera jumps to it.
- [ ] Press Ctrl+K and type a fresh thought, pick "Capture … in the
      Workbench": a Workbench group appears (collapsed, out of the way)
      holding your note, its face counting captures and their age. Your
      camera never moves — capture doesn't break flow.

## 12. Claims and sources (new — the argument spine)
- [ ] Menu → All → "Paper & argument": spawn a **Claim**. Wire anything into
      it… actually first notice: once a Claim is wired to anything, an amber
      dot appears in its header — "Supports intake is empty."
- [ ] Split the Claim → **Toulmin scaffold**: Grounds/Warrant/Backing/
      Rebuttal stubs wire into its Supports, and the amber dot goes out.
- [ ] Spawn a **Source**, wire its Citation star into a Document's Footnotes
      star (hover the Document — hidden ports fade in on its left rail).
- [ ] The Claim now carries the same compile face as a Document: its
      **Split → Toulmin scaffold** button lives right on the node.

## 13. The sermon pack — arcing a passage (new)
- [ ] Menu → All → "Passage & propositions": spawn a **Passage**, paste or
      type the text you're studying, then **Split → Passage → Propositions**.
- [ ] Write one assertion per Proposition; put the verse in its small
      teal **v. ref** chip.
- [ ] Ctrl-click the propositions, **Group** them. The group's face already
      shows the outline: every proposition is a main point until you arc.
- [ ] Wire one proposition's **Proposition** star into another's **Arcs**
      star, then click the **?** chip on the wire: pick from the 18
      relationships (grouped by family — Ground, Inference, Series…).
      The chip now wears the code (G, ∴, N/P…).
- [ ] Click the group's **spline icon** — the **Arc room**. Work the whole
      passage here: edit text, set "serves … as …" per proposition, watch
      the bracket diagram build. Toggle **Arc | Phrasing** for the
      auto-indented outline. Esc returns.
- [ ] Back on the canvas the face shows the finished work: main points bold,
      supports indented with their codes, "N main points · N arcs".
- [ ] **Open** (drill into) the group: propositions render as bare phrasing
      strips, indented by subordination. Your stored layout is untouched —
      leave the group and everything is where you put it.
- [ ] Big Idea: spawn a **Title** and a **Note** ("true worship"). Drag the
      Note's Text star onto the Title's top dot, commit the candidate — it
      lands in the hidden **Subject** intake and the Title face derives the
      exegetical line. Wire a second note into **Complement** (hover the
      Title to see its hidden stars) for the full statement.

## 14. The novel pack — plants, payoffs, events (new)
- [ ] Menu → All → "Story & continuity": spawn a **Plant** ("the pistol on
      the mantel"). It immediately wears the amber dot — "Plant feeds
      nothing yet" — and its face says **Payoffs — none yet**.
- [ ] Spawn a **Payoff**, wire the Plant's star into its **Resolves** star:
      the flag clears and both faces list the pairing. Rename either side —
      the other updates instantly.
- [ ] Spawn two **Events**, give each a **story time** (any numbers — 3.5,
      14.2). Each face draws the mini timeline of every dated event, with
      its own dot emphasized.
- [ ] Wire a **Person's** Identity star into an Event's **Involves** star,
      click the wire's chip and type a role ("bride"): the Event face shows
      the person chip with their role.

## 15. The tour and the ? panel (new)
- [ ] Wipe the canvas (or use a fresh browser profile): a small invite
      offers the two-minute tour. Every step waits for you to actually do
      the action; Back/Next and the step counter are always there.
- [ ] The **?** button (bottom-left) opens **Tips & reference** — the
      three connection kinds, shortcuts, group behavior — and **Replay the
      tour** lives in its header.
