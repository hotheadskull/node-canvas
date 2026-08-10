# Node Canvas — the whole program, for evaluation

*Written 2026-08-10. Everything below is BUILT and covered by the suite
(275 unit tests, 50 e2e) unless marked as a known gap. Work through it
top to bottom, or jump to whatever you care about most — each section
says what to try and what "correct" looks like.*

## Launching

- **Desktop window**: the `Node Canvas V2` shortcut →
  `Projects\node-canvas\start-node-canvas.bat` (runs `npx tauri dev`).
- **Browser**: `npm run dev -w app` in `Projects\node-canvas`, then
  http://localhost:1421. Same app; browser storage instead of files.
- Your work saves automatically (browser storage, ~5MB) or to a
  `.nodecanvas` file via the dock's Project menu (no size cap).

---

## 1 · The canvas and the sky

The ground is a real night sky: navy gradient, a Milky Way band with a
dust rift, ~460 stars in five parallax layers that drift one full cycle
in 6–18 minutes, a faint dot grid. Nothing pulses faster than a minute.

**Try:** pan (drag with middle/right mouse or scroll), zoom (ctrl+scroll),
drag a selection box with left mouse. **Watch for:** star layers moving
at different speeds as you pan; the band scaling with zoom while stars
stay screen-crisp; nothing ever grabbing attention on an empty canvas.

## 2 · The dock (left rail) and the add sheet

- **+** at top (or **N**) opens the add sheet: five families of
  icon-colored tiles. Arrow keys move, Enter places, Esc closes.
  Hovering a tile previews its description and its ports as real
  colored slots in the side panel.
- Rooms: **1** Canvas · **2** Document (with a document selected) ·
  **3** Arc (with a group selected) · **4** Focus (any plate selected).
- Tools: Find (**⌘K**), Filter (**F**), Ink (**P** — draw on the
  canvas; pen pressure works, strokes save with the document).
- Bottom: Fit, Project (open/save/export), Settings, Help (the ? holds
  the reference card and replays the tour).
- Select 2+ plates → a **Group N / Merge N** pill appears bottom-center.

**Watch for:** labels sliding out ~400ms into a hover; room tiles
disabled until a valid target is selected; every existing feature still
reachable.

## 3 · Plates (the nodes)

Every plate: a colored **spine** (its primary output's data color), a
**take gutter** on the left, a **give gutter** on the right, header,
title, body, meta rail (word count · wires in/out · readiness).

- **Ports** are one slot that changes shape: outline = open ·
  amber pip = wants a wire · filled = one wire · flare = several ·
  glowing = real connection. Color = WHAT travels, never the node type.
- **Readiness ring** in the header cycles seed → developing → ready →
  placed on click. Groups roll up their members' lowest stage.
- **⌥click** collapses a plate to one line; zoom below 45% renders
  everything collapsed without touching your saved state.
- **Double-click opens** the plate in place at 736px: linked rail on
  the left lists its wires as chips, prose column in Spectral, word
  count bar, Focus button. Esc returns. The plate never moves.
- The **swap button** (↔ in the header) flips which side takes and
  which gives, for plates that face the wrong way.

## 4 · Every type has its own body now

| Type | Its body shows |
|---|---|
| **Title** | big-text face; wires a Subject + Complement into a derived Big Idea |
| **Manuscript** | cast presence matrix (people × chapters) + Split |
| **Document** | the blocks editor — wired sections appear INLINE as live embeds; edit one and it forks (amber) with revert / apply-to-source; reorder blocks to reorder the work |
| **Section** | `POV <person> · @ <place>` sub-line + cast band, both derived from wires |
| **Person** | five fields (role / wants / fears / voice / wound) + presence strip over the event timeline |
| **Place** | "within <parent>" + a `contains` band — both nesting directions |
| **Thing** | `held by` chips off possession wires |
| **Event** | story-time input + timeline with a self-dot |
| **Claim** | supports (green) / rebuts (red) / warrant rows; a live rebut brands it `contested`; Split in the footer (Toulmin) |
| **Question** | DASHED spine (it owes an answer); amber "open" line until an answer wire lands, then "answered by X" + an excerpt |
| **Passage** | quote styling + Split (→ Propositions) |
| **Proposition** | phrasing + arc relations (the sermon flow) |
| **Source** | shows its file: images inline, PDFs in a viewer, anything else as a link |
| **Note / Plant / Payoff / Hub** | note prose · plant flag until its payoff wires · payoff resolving plants · hub roster grouped by kind |

**Try:** wire things and watch the derived rows appear live; rename a
Person and watch every cast band update. **Nothing derived is ever
typed twice — if you see a place to retype a name, that's a bug.**

## 5 · Wires and the harness

- Drag from any port, or click a port then click another. While you
  drag, every port the wire could legally land on **lights up in its
  color**; everything else steps back.
- Wires route orthogonally with 45° chamfers, slide into free corridors
  between plates, **staircase around plates** instead of crossing them,
  and hop each other with little arcs. Drag a plate and its wires ghost
  to straight lines, then settle on drop.
- One give feeding several takes: a **junction dot** (no dot = no
  relationship). Several gives into one take: a **tie** — two hairlines
  with the strand count above.
- A port **moves to the top/bottom edge** when its partner sits above
  or below, so wires never wrap around a plate.
- Plain relationship lines (no data) work between ANY two plates with
  zero setup — drag from the top diamond.

## 6 · Getting material in

- **Drop a file** anywhere → a Source node at the cursor. Files ≤2.5MB
  embed inside the document and **survive reload**; bigger files keep
  the name and tell you so.
- **⌘V**: an image → Source · a URL → Source (named by its site) ·
  text → Note. All land at your current view's center.
- **Split** (on Manuscript / Passage / Claim): the panel — count
  stepper, child type, Numbered/Blank/Paste titles, wire-back and
  keep-text toggles, dashed preview, save-your-own presets. Splitting
  is recursive; nothing is ever "already split".
- **Merge** (select 2+ same-type plates): folds them into the
  first-selected — prose appends, wires re-point, groups keep them.

## 7 · Groups and hubs — two different verbs

- **Group** (⌘G / the pill) *contains*: members leave the canvas into a
  collapsed face showing member chips, a readiness bar, and actions
  (expand · open its own canvas · unpack). Collapse/expand is lossless.
  Zoom far out and collapsed groups become stars; double-click dives.
- **Hub** *collects*: members stay on canvas, the hub just lists them.
  **Select a hub** and its neighbourhood lights up while everything
  unconnected drops to 42% — deselect and the canvas restores.

## 8 · Density — when the canvas gets big

- 4+ wires → the **filter bar** appears bottom-center: chips per data
  kind, `n of m shown`; filtered-out wires drop to whispers. **F** pins
  the bar open.
- ~8 wires animate at a time (nearest your view/filter); the rest hold
  still. Reduced-motion kills all of it.
- Minimap bottom-right, pannable and zoomable.

## 9 · Rooms

- **Document room** (2, or double-click a document): block stack left,
  compiled prose right; drag blocks to reorder the actual wires.
- **Arc room** (3, on a group of propositions): the sermon flow —
  subordinate propositions with relation codes, phrasing view indents.
- **Focus** (4, or ⇧F): one column, no chrome.
- **⌘K**: jump to any node by name, or type a thought and capture it.

## 10 · Trust

- Every load and save is schema-validated; a bad file gets an error
  banner, never silence, never a half-loaded canvas.
- Nothing ever moves your plates or camera without your action — no
  auto-layout, no auto-fit, ever. Fit is a button.
- Export: compiled Markdown/text, canvas PNG/SVG, `.nodecanvas` files.
- Deleting a group face unpacks it — member plates always survive.

---

## Known gaps (so you don't file them)

1. **Trunks & highways** — past ~34 plates, parallel wires should bundle
   into bands. Today they stay individual lanes (readable, just busier).
2. **Select-text-in-a-Source → clip a wired node** — needs an in-app
   text/PDF selection layer; Source's Clip port exists and waits.
3. **Open-state extras** — the continuity note (novel), delivery clock
   (sermon), and inline citation chips (paper) for the 736px view.
4. **Block "new" row** — the dashed "type, or drop a node…" row at the
   bottom of a document's blocks.
5. **Union ports on group faces** — wiring to a collapsed group's face.
6. **History/undo timeline** — deliberately not designed yet.
7. **Desktop smoke test** — the Tauri window hasn't had its first real
   pass this era; the browser build is the tested path.
8. Hub doesn't adopt its Subject's hue yet; Person's presence strip
   ticks per event (not per chapter) — flag if either bothers you.

## How to report what you find

One line each is plenty — "X looks wrong", "Y felt confusing", "Z is
missing" — with the node type or gesture named. Screenshots help but
aren't needed. Anything that contradicts a promise made ABOVE is a bug;
anything that just feels off is design feedback; both are wanted.
