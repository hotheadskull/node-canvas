# Node Anatomy — the Tab Card system (Chunk 17)

User-approved 2026-07-14 (mockup C picked from four candidate languages).
Every node type — current and future — fills THIS skeleton. A new node type
chooses what goes in its slots; it never invents new chrome. This is the
"flow" that guarantees a uniform family with per-type character.

## The four zones

```
        ┌────────────────┐
        │ ◆ TYPE · status│            <- 1. TAB (identity + status)
   ┌────┴────────────────┴─────────┐
 ○─┤  Title as bold first line     ├─○  <- 3. PORTS (on the border,
   │  Body: the face. Grows with   │        labels float OUTSIDE)
   │  content, V1-style.           │
   │                               │  <- 2. BODY (100% content)
   └───────────────────────────────┘
```

1. **Tab** (`.canvas-node-header`, the drag grip): a small folder tab hanging
   above the card's top-left. Carries, in order: type glyph, type label in the
   node's accent (`.canvas-node-kind`, click = accent picker), readiness dot,
   hygiene dot (when flagged), owner chip (when set), Fit button (when the
   height is user-owned and the node is selected). The tab is the ONLY chrome
   strip. At rest it stays small; it never competes with content.
2. **Body**: the title input (`.canvas-node-title`) styled as the card's bold
   accent-colored first line — words on paper, not a form slot — then the
   type's face. The body owns the full card width. Nothing paints over it.
3. **Ports** (AMENDED 2026-07-15, user-picked connector design B): star
   handles live in dedicated side GUTTERS — slim columns inside the card,
   takes entering LEFT, gives leaving RIGHT, whisper-thin (6px) on a side
   with no ports so the system reads on every node. Labels still float
   OUTSIDE the card. Hit areas stay ≥24px (interaction rule 1).
   **Plain-edge anchors are GOLD DIAMONDS** at top and bottom center —
   matching the gold relationship lines, at fixed predictable points, a
   different species from the data stars at a glance.
4. **Status**: lives on the tab (readiness, hygiene, owner). The tentative
   "N waiting" badge keeps its top-RIGHT corner spot (it is about incoming
   wires, not identity).

## Sizing (the V1 rule, restored)

- **Auto height is the resting state, not a computed one.** A node gets NO
  inline height unless the user owns it. CSS grows the card with its content
  — live, per keystroke, no measurement loop, nothing to lag or fight.
- A manual resize takes ownership (`data.ownedHeight`); the Fit button on the
  tab hands ownership back. Width is always explicit (prose needs a wrap
  width; per-type default from the registry).
- The document still records last-measured heights (for spawn collision, the
  Fit button's bounds math, split placement) via a ResizeObserver on the real
  card — but measurement NEVER feeds back into rendering. One direction only.
- **Upgrade rule (user-approved):** machine-computed heights release to auto;
  user-owned heights are kept exactly. Nothing the user shaped changes (I5).

## States

- **At rest**: tab (small) + content. Status collapses to dots.
- **Selected**: accent border + glow, resizer corners, port labels shown
  (subject to the port-label setting), owner chip and Fit on the tab.
- **Far zoom** (`.zoom-far`): tab text hides; the card reads as a colored
  shape with its title.

## Per-type slots (what a node type may customize)

| Slot | Who fills it | Example |
|---|---|---|
| Tab label | registry `labels` (per mode) | "Chapter" in novel mode |
| Tab glyph | app-side `NODE_ICONS` map (I8: renderer-side) | BookOpen for document |
| Accent | registry `accent`, per-node override kept | — |
| Face | `NODE_FACES` map | compile face, proposition face |
| Default width | registry `size.width` | 420 for passage |
| Extra badges | the face, inside the body | proposition's verse chip |

Per-node deep customization (beyond accent) arrives with each node type's own
design pass (standing per-node flow in PROGRESS.md).

## Bugs this spec retires (each with a regression test)

1. Body not growing while typing → auto-height resting state (e2e types into
   a note and asserts the card grew).
2. Rails/stars cutting into text → no rails; labels outside; body full-width
   (test: body box equals card box minus padding).
3. Header cramming → single tab, status collapses, title lives in the body.
