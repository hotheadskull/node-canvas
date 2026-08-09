# Handoff: Observatory — plate & harness visual system

## Overview

A complete visual system for the node-canvas app: how nodes ("plates") are drawn, how wires are routed and animated, how readiness and ports read, how assemblies collapse, how document blocks and embeds show their state, how splitting works, and how the four rooms differ.

The design was built **against the existing core**, not invented alongside it. Type names, port ids, data kinds, capacities, readiness stages and split behaviour are all read from `core/src/registry.ts`, `core/src/derive.ts`, `core/src/blocks.ts` and `core/src/assemblies.ts`. Where the design proposes something the core does not have yet, it is called out explicitly in the "Not yet in core" section at the end.

## About the design files

The `.dc.html` files in this bundle are **design references**. They are static HTML prototypes that show intended appearance and behaviour — they are not production code and should not be copied into the app.

The task is to recreate them inside the existing environment: **React 18 + TypeScript + Vite + `@xyflow/react` + Zustand + Tauri**, using the existing `CanvasNode.tsx`, `WireEdge.tsx`, `PlainEdge.tsx`, `AssemblyFace.tsx`, `faces/*` and `styles.css` patterns. All values below are literal and final.

To view a design file, open it directly in a browser. `support.js` must sit next to the `.dc.html` files.

## Fidelity

**High fidelity.** Colours, type, spacing, radii, stroke widths, dash patterns and animation timings are final and should be matched exactly.

---

## Design tokens

### Ground and surfaces

| Token | Value | Use |
| --- | --- | --- |
| `--ground` | `#05060d` | canvas backdrop |
| `--surface` | `linear-gradient(180deg, rgba(20,23,49,.94), rgba(11,13,32,.94))` | plate fill |
| `--surface-selected` | `linear-gradient(180deg, rgba(26,29,60,.96), rgba(15,17,40,.96))` | selected plate fill |
| `--surface-panel` | `#0a0c18` | side panels, legends |
| `--surface-inset` | `#0d1020` | rows inside panels |
| `--gutter-fill` | `rgba(0,0,0,.24)` | the port gutters down each plate edge |
| `--border` | `#282d51` | plate border |
| `--border-quiet` | `#1b1f3c` | inner hairlines, gutter dividers |
| `--border-panel` | `#1c2038` | panel border |
| `--border-selected` | `#7a6ec4` | selected plate border |
| `--ring-selected` | `0 0 0 3px rgba(165,149,242,.15)` | selection ring |
| `--shadow-plate` | `0 14px 30px -14px rgba(0,0,0,.94)` | plate elevation |
| `--shadow-open` | `0 40px 90px -30px rgba(0,0,0,.98)` | open/expanded plate |

### Text

| Token | Value | Use |
| --- | --- | --- |
| `--text` | `#e8e9f5` | primary |
| `--text-strong` | `#f2f3fa` | card titles in reference sheets |
| `--text-body` | `#cdd1e6` | prose in the open state |
| `--text-muted` | `#b8bdd6` | secondary prose |
| `--text-dim` | `#9095bd` | meta, counts — **minimum for 8px text** |
| `--text-dimmer` | `#8085ad` | labels, list numerals — **minimum for 8.5–9px text** |
| `--text-faint` | `#575c86` | placeholder only, never below 10px |

Do **not** use `#4a4f76` for text below 10px; it measures 2.57:1 and fails.

### Data-kind hues — the core of the system

Colour comes from the **port's `dataKind`**, never from the node's `type`. A wire is the colour of what travels down it; a plate's spine is the colour of its primary give port.

| dataKind | Hue | Wire stroke | Dash |
| --- | --- | --- | --- |
| `text` | `#a595f2` | 1.9 | solid |
| `person` | `#e89b8f` | 1.6 | `3 3` |
| `place` | `#c9a26b` | 1.6 | `2 5` |
| `thing` | `#7fd4c1` | 1.6 | `7 4` |
| `cite` | `#7fa3e8` | 1.5 | `1 4` |
| `claim` | `#6fd39a` | 1.8 | solid |
| `prop` | `#52b8a8` | 1.6 | `12 5` |
| `plant` | `#9fd18a` | 1.6 | `9 3 2 3` |
| `event` | `#8f9ff0` | 1.6 | `10 4 3 4` |
| `thread` | `#d08fd0` | 2.2 | solid |
| `any` | `#8085ad` | 1.4 | `1 6` |

`any` ports adopt the colour of whatever connects to them. Relation words (`supports`, `rebuts`, `serves`) render as **text labels on the wire**, not as additional hues.

Base wire opacity `.68`; `thread` and heavier structural wires `.74`. Every live wire also gets a halo: same path, `stroke-width: 7`, `stroke-opacity: .085–.1`.

### State colours

| State | Value |
| --- | --- |
| flag / attention | `#f0c96a` |
| conflict / contested | `#f0685e` |
| healthy | `#6fd39a` |
| ink annotations | `#84dcf2` |

### Type

| Role | Font | Size / weight |
| --- | --- | --- |
| UI / headings | `Space Grotesk` | 500–600 |
| Prose | `Spectral` | 400, `line-height: 1.72` in the open state |
| Meta / numeric | `Space Mono` | 400 |

Registry label: `8–9px`, `letter-spacing: .15em`, `text-transform: uppercase`, coloured by data kind.
Plate title: `11.5–13px` Space Grotesk 500.
Open-state title: `23px` Space Grotesk 500, `letter-spacing: -.01em`.
Open-state prose: `16.5px` Spectral, `max-width: 60ch`.

### Geometry

- Plate radius `10px`; collapsed and small plates `8–9px`; panels `12px`.
- Border `1px`. Selected plate keeps `1px` plus the selection ring.
- Port gutter width `13px` (`16px` on large plates), with a `1px` divider and `rgba(0,0,0,.24)` fill.
- Type spine: `3px` wide, full height, `linear-gradient(180deg, <hue>, transparent)`, radius matching the plate's left corners.
- Port slot: `12×4px`, radius `2px`, `box-shadow: 0 0 7px <hue at .8>` when live; `1px solid #3a3f65` outline when open.
- Hairline rules fade at both ends: `linear-gradient(90deg, transparent, <colour> 13%, <colour> 86%, transparent)`.

---

## Component specs

### 1. The plate

Horizontal flex: `[type spine 3px][take gutter 13px][body flex:1][give gutter 13px]`.

Body is a vertical stack:
1. **Header rail** — registry label (data-kind coloured), optional badge, spacer, owner chip, node id in Space Mono `#8085ad`, readiness ring. Padding `7px 9px 6px`. Background `linear-gradient(96deg, <hue> 15%, <hue> 4% 46%, transparent 72%)`.
2. Fading hairline, tinted with the type hue at the left: `linear-gradient(90deg, transparent, <hue at .5> 13%, #282d51 52%, #282d51 86%, transparent)`.
3. **Content** — title `11.5–13px`, excerpt in Spectral `12–12.5px`.
4. Fading hairline (untinted, `#1b1f3c`).
5. **Meta rail** — Space Mono `8.5–9.5px` `#9095bd`: word count, `n in · n out`, state.

Port slots are absolutely positioned on the gutters: takes at `left: 2px`, gives at `right: 2px`. Selection adds four corner registration ticks (`10×10px`, `1.5px` borders, `#a595f2`).

**A filled, glowing slot must correspond to a real wire.** Outline style means the port is open. The meta rail's counts must match the wires actually attached.

### 2. Collapse states — three, user-controlled, sticky

| State | Shows | Trigger |
| --- | --- | --- |
| **Full** (default) | everything above | — |
| **Collapsed** | title + one subtitle line + readiness ring; ports merge to one dot per side | `⌥click`, `⌥⇧click` for a selection, `⌥⇧A` for all |
| **Rolled up** | assembly face only; children hidden | assembly collapse |

Persist per node in the document. **Zoom below 45% renders everything collapsed but must not overwrite the stored value** — restore exact user state above the threshold. Collapsing must never drop a wire; hidden ports merge and the harness re-routes to the merged dot.

### 3. Readiness — `derive.ts`

Rendered as a **ring**, never a coloured dot, so it never competes with data-kind hues and stays legible without colour vision. `26×26` viewBox, `r=8`.

| Stage | Ring |
| --- | --- |
| `seed` | `#4a4f76` `1.6` stroke, `stroke-dasharray: 2 3` |
| `developing` | `#4a4f76` full ring + `#f0c96a` right half arc (`M13,5 A8,8 0 0 1 13,21`) |
| `ready` | `#6fd39a` `1.8` full ring |
| `placed` | `#6fd39a` ring, `rgba(111,211,154,.18)` fill, `1.8` tick |

Assemblies show `rollupReadiness` (lowest stage present) plus a distribution bar: flex segments in stage order, colours `#4a4f76 / #f0c96a / #6fd39a / rgba(111,211,154,.4)`.

### 4. Wire routing — the harness

Wires are orthogonal with 45° chamfers, never curves and never hard right angles.

1. **Stub** — leave the port flat for 6–20px.
2. **Chamfer** — turn at 45° over exactly 10px (`L{x+10},{y+10}`).
3. **Lane** — vertical travel happens only in a shared lane. Lanes are spaced **14px** apart.
4. **Chamfer** in, **stub** into the target port.

**Corridors are derived, not authored.** Inflate every node rect by a margin; decompose the remaining free space into vertical and horizontal channels. Lanes live inside those channels, assigned in target order. Recompute on drop — during a drag, wires drop to a straight ghost line and settle on release.

**Hops.** Where a wire crosses another, the crossing wire draws a semicircular hop: `V{y-6} A6,6 0 0 1 {x},{y+6} V…` (sweep `1` for downward travel, `0` for upward). Verticals hop horizontals, never the reverse.

**Junctions.** One give feeding two takes shares a stub and splits at a solid dot (`r=3.4` filled, plus `r=6.5` ring at `.3` opacity). No dot means no relationship — an unmarked crossing must never be readable as a connection.

**Bundles.** Parallel wires get a cable tie (`M{x1},{y} H{x2}` plus end caps) with a `×n` count in Space Mono `8.5px` `#6b709a`.

**Four-sided ports.** Left = take, right = give by default. When a partner sits above or below, the port moves to that edge (`4×11px` instead of `12×4px`) so a wire never loops around a plate.

### 5. Wire animation

Each wire carries a travelling highlight over its base stroke: same path, `stroke-width: 2.6`, `stroke-linecap: round`, a light tint of the data-kind hue, and a dash pattern summing to `1200` animated `stroke-dashoffset: 1200 → 0`.

```css
@keyframes flow { from { stroke-dashoffset: 1200 } to { stroke-dashoffset: 0 } }
```

Distinct signal characters (duration + dasharray + timing function):

| Character | dasharray | timing | duration |
| --- | --- | --- | --- |
| comet | `14 1186` | `linear` | 3.4s |
| stutter | `12 1188` | `steps(11,end)` | 2.2s |
| surge | `26 1174` | `cubic-bezier(.85,0,.15,1)` | 2.8s |
| triple bead | `4 6 4 6 4 1176` | `linear` | 4.6s |
| freight (`stroke-width: 3`) | `44 1156` | `linear` | 5.2s |
| single bead | `5 1195` | `linear` | 6s |
| twin | `9 7 9 1175` | `linear` | 3s |
| crawl | `6 14`, offset `20 → 0` | `linear` | 1.1s |
| glow sweep (`stroke-width: 4.4`, opacity `.75`) | `34 1166` | `cubic-bezier(.4,0,.6,1)` | 5.6s |
| drift | `5 1195` | `cubic-bezier(.45,0,.55,1)` | 7.5s |
| double flash | `10 5 10 1175` | `linear` | 4s |

**Budget: about 8 animated wires on screen.** Animate only wires that are in view, and only those matching the active filter or touching the selection. `@media (prefers-reduced-motion: reduce) { * { animation: none !important } }` — hue and dash still carry all the meaning.

### 6. Density — trunks and highways

Individual lane routing does not survive ~34 nodes. Above that:

- **Gutter trunks.** Adjacent-column wires collapse into one band: `stroke-width: 22–30`, `#6b74a8` at `.16`, with 3–5 hairline strands at `.3` inside it, a tie, and a count chip. Expanding past 80% zoom in that gutter separates the band back into lanes with **no re-layout** — same wires, different rendering.
- **Highways.** A wire skipping a column leaves the node field entirely and rides a horizontal band above or below it. **Nothing crosses a node, ever.**
- **Resolution is earned.** Only four things draw as real wires: matching the active relation filter, touching the selection, in view, or nothing at all under reduced motion.

Also at density: a filter bar of relation chips with an `n of m shown` readout, and a minimap with a viewport rect.

### 7. Assembly face — `assemblies.ts`

The face **is** the interface: external wires attach to the face, never to members.

**Collapsed:** a plate with stacked edges — the only new shape in the system, meaning "there is more inside".

```css
box-shadow:
  5px 5px 0 -1px rgba(20,23,49,.95), 5px 5px 0 0 #262b52,
  10px 10px 0 -1px rgba(20,23,49,.95), 10px 10px 0 0 #1f2445;
```

Contents: `boxes` icon + `ASSEMBLY` label (`#d08fd0`), rollup readiness ring, name, derived count chips from `deriveFace` (`Section 3`, `Person 2`, `Place 1` — pill, `<hue> at .1` fill, `<hue> at .24` border), readiness distribution bar, then a footer with `n members`, age, and three icon buttons: **drill in** (`door-open`), **collapse** (`minimize-2`), **unpack** (`package-open`).

Ports on the face are the union of the members' unsatisfied ports, coloured by data kind.

**Expanded:** members render normally inside a `1px dashed #3a4070` boundary with `rgba(165,149,242,.03)` fill; the face becomes a pill straddling the top-left edge carrying name, member count and the same actions.

**Drill in** opens the assembly as its own canvas, outside world reduced to edge stubs. **Unpack** dissolves the group, leaving members loose with wires intact.

### 8. Blocks and embeds — `blocks.ts`

A Document is a stack of blocks. Each block is a row: a `78px` label column, then content, with a `2px` left border carrying the state colour.

| Block state | Left border | Fill | Label |
| --- | --- | --- | --- |
| own text | `#2a2f57` | `#0d1020` | `own text` |
| embed, live | `#a595f2` | `rgba(165,149,242,.045)` | `link` icon + `embed`, source name beneath, `live` on the right |
| embed, forked | `#f0c96a` | `rgba(240,201,106,.05)` | `git-branch` icon + `forked` |
| new / empty | `1px dashed #2a2f57`, no left accent | none | `new` |

A forked block exposes two actions inline: **Revert to source** (`undo-2`) and **Apply to source** (`upload`, `rgba(240,201,106,.4)` border). Write-back is always deliberate — never a side effect of typing.

**Fork notice on the source.** Any node whose text is forked in a document shows a pill in its header: `git-branch` icon + `n fork`, `rgba(240,201,106,.12)` fill, `rgba(240,201,106,.32)` border, plus `diverged in <doc> · <age>` in the meta rail. Without this, forking is a trap.

### 9. Split panel

Replaces the fixed preset list. Fields:

- **Into** — a `− n +` stepper (`26px` cells, `1px solid #2a2f57`, radius `7px`) and a type picker showing the type's spine colour swatch.
- **Titles** — segmented: `Numbered` / `Blank` / `Paste a list`.
- **Wire back** — toggle, default **on**: each child feeds the parent's spine port.
- **Keep text** — toggle, default **off**: move the parent's prose into child 1.
- **Preview** — a dashed box listing the resulting stubs with `01`, `02`… numbering.
- Actions: **Split** (accent outline) and **Save as preset** (`bookmark`).

The five built-in presets (`3 blank sections`, `Beat sheet`, `Toulmin scaffold`, `Passage → Propositions`, `3 chapter stubs`) are the same panel with fields pre-filled.

**Splitting is recursive and unlimited.** Splitting a child is the same command as splitting its parent, and nothing marks a node as already split. A worked example: Manuscript → 3 chapter stubs → Ch. 4 → 4 sections → each section fed from the side by Source, Note and Person nodes.

### 10. The open state — where writing happens

Double-click a plate: it grows **in place**, keeps its canvas position, and the canvas dims behind it. Width `736px`.

The chrome/content ratio inverts. On the map plate, header and meta rails take 51 of 136px and the prose window holds ~24 words. In the open state:

- Header collapses to one quiet line: type label, badge, saved state, word count, expand/collapse icons.
- A `154px` **linked rail** on the left holds Takes and Gives as chips (data-kind coloured, `<hue> at .08` fill), plus a continuity note — so relationships stay visible while writing.
- The writing column gets `22px 30px 8px 26px` padding, `23px` title, `10px` Space Mono sub-line (POV, tense, citation count), and Spectral `16.5px / 1.72` at `max-width: 60ch`.
- A footer rail carries a word-count progress bar, **Link selection**, and **Focus**.
- `Esc` collapses back to the map. The plate never moves.

Per-form bodies inside the same shell:
- **Novel scene** — POV and tense sub-line, continuity note in the rail, cast/place chips.
- **Sermon point** — passage blocks set apart (`2px solid rgba(232,192,122,.5)` left border, Spectral italic, reference beneath in Space Mono `#a08f6a`), delivery clock beside the word count.
- **Paper section** — inline citation chips (`rgba(127,212,193,.12)` fill, Space Mono `9px`) that are live wires to Source nodes; clicking flies the canvas to the source. A `contested` chip in `#f0685e` wherever a rebutting node is wired in.

**Focus** (`⇧F`) is the third step: one column, no canvas, no rail.

### 11. Rooms

Four views of one document. Same data; each shows a different ordering. The canvas is the only view that shows *relationships*; each room shows one *ordering*.

| Room | Shows | Existing file |
| --- | --- | --- |
| **Canvas** | the map — spatial, all types, wires visible | `Canvas.tsx` |
| **Document room** | block stack on the left (the spine port's ordered intake), compiled prose on the right; dragging a block reorders the intake wires | `DocumentRoom.tsx` |
| **Arc room** | Propositions as a sequence on a curve — for work where order *is* the argument | `ArcRoom.tsx` |
| **Focus editor** | one node, one column, no chrome | `FocusEditor.tsx` |

---

## Interactions

| Action | Trigger | Result |
| --- | --- | --- |
| Open a node | double-click | grows in place to the open state |
| Focus | `⇧F` | full-screen single column |
| Close | `Esc` | back to map state |
| Collapse | `⌥click` / `⌥⇧click` / `⌥⇧A` | collapsed state, persisted |
| Drag a node | pointer drag | wires ghost to straight lines; corridors and lanes recompute on drop |
| Filter relations | chips in the filter bar | matching wires resolve; the rest stay counted bands |
| Isolate | `⇧F` on a selection | non-connected nodes drop to a whisper |
| Drop a file | drag onto canvas | creates a Media node at the cursor; title and page count read from the file |
| Clip to node | select text in a Media node → pick a type | new node beside the source, already wired, page number retained |
| Link from a field | drop a node chip into a field row value | creates the wire |

Field rows inside nodes: fixed mono label column, Spectral value. Empty rows show a `1px dashed #2a2f57` baseline (not a box); focused rows go `1px solid #a595f2` and grow. No modal, no side panel.

---

## State

Per node: `collapsed: 'full' | 'collapsed' | 'rolled-up'` (persisted), `openState: 'map' | 'open' | 'focus'` (session), measured height (existing `recordMeasuredHeight`).

Per canvas: active relation filter set, viewport, derived corridor list (recomputed on node move/resize — cache, invalidate on drop), ink layer strokes (canvas-space, rendered between ground and plates at `z-index: 3`).

Per document: block list with fork state (existing `blocks.ts`), intake order (existing `reorderIntakeWire`).

---

## Mapping to the existing codebase

| Design area | Where it goes |
| --- | --- |
| Plate anatomy, header/meta rails, spine, gutters | `components/CanvasNode.tsx` + `styles.css` |
| Per-type bodies | `components/faces/*` |
| Data-kind colour table | new `core/src/colors.ts`, keyed off `dataKind` in `registry.ts` |
| Readiness ring | new shared component; values from `derive.ts` `READINESS_STAGES` |
| Wire routing, chamfers, hops, lanes | `components/WireEdge.tsx` + new `core/src/routing.ts` (corridor derivation) |
| Trunks, highways, filter-driven resolution | `components/WireEdge.tsx` + `Canvas.tsx` |
| Assembly face, stacked edges, actions | `components/AssemblyFace.tsx` (already has `deriveFace`, `rollupReadiness`, `drillIn`, `unpack`) |
| Block/embed rows, fork notice | `components/DocumentRoom.tsx`, `components/faces/DocumentFace.tsx`, `components/BlocksFace.tsx` |
| Split panel | `components/AddNodeMenu.tsx` neighbour; `splitNode` + `SPLIT_PRESETS` already exist — presets become saved configurations |
| Open state | `components/FocusEditor.tsx` extended to an in-place variant |
| Collapse state | `canvasStore.ts` — new per-node field, persisted through `projectFile.ts` |

## Suggested order

1. Data-kind colour table + readiness ring — everything else depends on them.
2. Plate anatomy and the three collapse states.
3. Wire rendering: chamfers, hops, lane assignment inside authored corridors.
4. Corridor derivation from free space, with ghost-and-settle on drag.
5. Assembly face.
6. Block and embed states + fork notice.
7. Open state and the writing column.
8. Split panel.
9. Density: trunks, highways, filter bar, minimap.

## Not yet in core

Called out so they are not mistaken for existing behaviour:

- **Corridor derivation and lane assignment** — no routing module exists; `layout.ts` does not do this.
- **Collapse state per node** — not in the schema.
- **Relation filtering** — no filter state.
- **Merge** — the inverse of `splitNode`, folding several nodes back into one. Does not exist.
- **Time** — no history, no "what changed since yesterday", no way back.
- **Ink layer** — freehand annotation strokes stored in canvas space.

## Files in this bundle

| File | Covers |
| --- | --- |
| `Observatory System.dc.html` | the reference sheet — data kinds, readiness, collapse, assembly, blocks/embeds, split panel, all 16 node types, port grammar, rooms |
| `Observatory Canvas.dc.html` | the detail canvas at 100% — plate anatomy, 11 wire signals, ink layer, media node, field rows |
| `Observatory Freeform.dc.html` | free placement with derived corridors, four-sided ports, drag behaviour |
| `Observatory Dense.dc.html` | 34 nodes — trunks, highways, filter bar, minimap, zoom tiers |
| `Observatory Writing.dc.html` | the open state, the chrome/content ratio, per-form bodies, three states |
| `support.js` | required runtime for the `.dc.html` files; not part of the design |
