# Handoff: Observatory — complete visual system

## What this is

A complete visual system for the node-canvas app. Every colour, pixel count, dash pattern and duration below is literal and final. Where something replaces already-shipped code, it says so.

**Read `Observatory Spec.dc.html` first** — it is the authoritative reference and renders every rule live. This README is the written form of the same thing plus the code-mapping.

## About the design files

The `.dc.html` files are **design references**, not production code. Do not copy them into the app. Recreate them in the existing environment: **React 18 + TypeScript + Vite + @xyflow/react + Zustand + Tauri**, following the existing `CanvasNode.tsx` / `WireEdge.tsx` / `AssemblyFace.tsx` / `faces/*` / `styles.css` patterns.

Open a file directly in a browser to view it. `support.js` must sit beside them.

**Fidelity: high.** Match the values exactly.

---

## 1. The ground — a real night sky

Replaces the current single-gradient background **and `Starfield.tsx` entirely.** The shooting stars there (`shoot-1/2/3`) are cut: a real sky does not fire one every thirty seconds, and they pull the eye off the wires.

Fourteen layers, bottom to top:

| # | Layer | Spec | Cycle |
|---|---|---|---|
| 0 | sky | `linear-gradient(158deg,#03060f,#061024 34%,#0a1836 66%,#122448)` — navy, not black | static |
| 1 | band glow | 1800×420 at −9°, `rgba(108,138,208,.40)`, blur 72 | static |
| 2 | core | 950×340 `rgba(186,190,228,.44)` at 46% along the band, blur 48 | static |
| 3 | warm core | 560×240 `rgba(214,178,180,.42)` at 44%, blur 34 — the rose-tan cast | static |
| 4 | second cloud | 620×250 `rgba(130,158,222,.34)` at 64%, blur 40 | static |
| 5 | band stars | **190 stars packed on the band**, gaussian across its width | static |
| 6 | great rift | 1400×100 `rgba(20,14,22,.94)`, blur 26 — splits the band | static |
| 7 | dust knots ×2 | organic `rgba(18,12,20,.90)` masses over the core, blur 24–28 | static |
| 8 | stars 6th mag | 86 per 613×431 tile · .55–1.15px · α .24–.48 | 1100s |
| 9 | stars 5th mag | 74 per 719×509 · .60–1.30px · α .34–.64 | 820s |
| 10 | stars 4th mag | 58 per 827×587 · .70–1.60px · α .48–.84 | 600s |
| 11 | stars 3rd mag | 34 per 953×673 · .85–1.95px · α .64–.96 | 460s |
| 12 | stars 2nd mag | 18 per 1097×761 · 1.1–2.3px · α .78–1 | 380s |
| 13 | grid | 1px dots `rgba(255,255,255,.045)`, 24px pitch | static |

**Rules the ground obeys**

- **Nothing under 60 seconds.** Faster reads as motion and competes with the wires.
- **Density is the whole thing.** ~460 stars. Radii use `rnd()*rnd()`, not `rnd()` — biases hard toward small, which is what a real sky looks like.
- **The sky is navy.** `#03060f` → `#122448`. The blue is what makes dust lanes read as brown rather than as holes.
- **Stars draw from eight colours** weighted toward white and blue-white, with a few warm. Pure `#fff` reads as pixels.
- **Band geometry must fit a letterbox.** At −9° the spine rises 141px across 1442px. A steeper angle pushes the band out of frame.
- **Never let the tile show.** 613/719/827/953/1097 are coprime; each layer drifts one whole tile per cycle.
- **The band lives in canvas space, stars in screen space.** Star layers pan at 20/35/50/65/80% for parallax. Zoom scales the band only.
- **Only `transform` animates.** No filter or background-position animation.
- **Contrast budget 12%.** Nothing on an empty canvas exceeds 12% luminance above `#03060f`; the Milky Way core sits at ~9%.
- `prefers-reduced-motion` freezes everything mid-cycle.

---

## 2. The plate

Horizontal flex: `[spine 3px][take gutter 13px][body flex:1][give gutter 13px]`.

Body: **header rail 28px** → tinted hairline → **title 26px** → **content (the only part that grows)** → hairline → **meta rail 22px**.

| Token | Value |
|---|---|
| width | 240 / 268 / 300 / 340 — per type, never per instance |
| radius | 10px · collapsed 9px · panels 12px |
| surface | `linear-gradient(100deg, hue .10, hue .035 42%, hue 0 80%)` over `linear-gradient(180deg,rgba(22,24,53,.95),rgba(12,14,35,.95))` |
| border | `1px rgba(hue,.32)` · selected `1px #8a7ce0` + ring `0 0 0 3px rgba(hue,.22)` |
| shadow | `0 14px 30px -14px rgba(0,0,0,.94)` + `0 0 22px -8px rgba(hue,.22)` · open `0 40px 90px -30px rgba(0,0,0,.98)` |
| spine | 3px, `linear-gradient(180deg, hue, rgba(hue,.30))` |
| gutter | 13px, `rgba(0,0,0,.24)`, 1px `rgba(hue,.14)` divider (16px on 340 plates) |
| header tint | `linear-gradient(96deg, hue .22, hue .05 46%, transparent 74%)` |
| rules | 1px `rgba(hue,.16)`; header rule `rgba(hue,.60)` at its left; fade both ends over 13% |
| tint source | always the **primary give's** dataKind — one hue per plate, never two |

**Type scale**

| Role | Spec |
|---|---|
| registry label | 8px / 500 / .15em / uppercase / hue |
| plate title | 12.5px Space Grotesk / `#e8e9f5` |
| map excerpt | 11.5px Spectral / 1.6 / `#b8bdd6` |
| field label | 8.5px Space Mono / `#8085ad` |
| meta rail | 9px Space Mono / `#9095bd` |
| open title | 23px / 500 / −.01em / `#f2f3fa` |
| open prose | 14px Spectral / 1.72 / max 60ch / `#cdd1e6` |

**Contrast floor:** at 8px use `#9095bd` or lighter (6:1); at 8.5–9px use `#8085ad` or lighter (4.5:1). **Never `#4a4f76` below 10px** — 2.57:1, already shipped as a bug.

---

## 3. The port — one slot that changes shape

A port is **one DOM node with a variant class.** It never multiplies into a stack.

| State | Shape |
|---|---|
| open | outline bar, hue preserved |
| wanted (`flagWhenEmpty`) | outline bar + 5px `#ffc94d` pip at −4,−5 |
| 1 wire | filled bar |
| 2–4 wires | flare: outer edge 8px, inner 4px, length 12 |
| 5+ wires | flare: outer edge 12px, inner 4px, length 12 |
| merged (collapsed plate) | dot, r5 |

| Geometry | Value |
|---|---|
| bar | 12×4px, radius 2 |
| glow | `0 0 7px rgba(hue,.85)` when wired; none when open |
| inset | 2px from the plate edge, centred in the gutter |
| hit area | 24×24px invisible |
| pitch | 12px between slots on the same edge |

**Fill means wired, outline means open. The hue never changes** — an unused port must not go grey, or you lose what it accepts.

**Condensed fan-in:** incoming strands stay **1.2px, 6px apart** for their last 56px — no thick cable. The tie is two 1px verticals 5px apart with a count above. They fan into the flare mouth over 14px. Nothing is ever drawn thicker than a single wire.

Side ports (top/bottom edges) rotate the same six shapes 90°.

---

## 4. The wire

Orthogonal with 45° chamfers. Never a curve, never a hard right angle.

1. **Stub** 6–20px flat off the port
2. **Chamfer** exactly 10px at 45°
3. **Lane** — vertical travel only inside a corridor, 14px pitch
4. Chamfer, stub into the target

**Corridors are derived, not authored.** Inflate every node rect by 24px, decompose the free space into channels, assign lanes in target order. Recompute on drop; ghost to straight lines during drag.

**Hop:** verticals hop horizontals, never the reverse. `V{y-6} A6,6 0 0 1 {x},{y+6} V…` (sweep 1 down, 0 up).

**Junction:** one give feeding many takes shares a stub and splits at a filled dot `r3.4` inside an `r6.5` ring at .3 opacity. **No dot means no relationship** — an unmarked crossing must never read as a connection.

**Four-sided ports:** left = take, right = give by default. When a partner sits above or below, the port moves to that edge (4×11px) so a wire never loops around a plate.

---

## 5. Data kinds and signals

**Colour comes from the port's `dataKind`, never the node's type.** A wire is the colour of what travels down it; a plate's spine is the colour of its primary give.

| kind | hex | stroke | dash | signal | timing | dur |
|---|---|---|---|---|---|---|
| text | `#b19bff` | 1.9 | solid | freight · 44 1156 | linear | 5.2s |
| person | `#f5977f` | 1.6 | 3 3 | comet · 12 1188 | linear | 3.4s |
| place | `#e0a85c` | 1.6 | 2 5 | drift · 5 1195 | ease-in-out | 7.5s |
| thing | `#63e0c6` | 1.6 | 7 4 | single bead · 5 1195 | linear | 6s |
| cite | `#6ea9ff` | 1.5 | 1 4 | crawl · 6 14, offset 20 | linear | 1.1s |
| claim | `#52dd93` | 1.8 | solid | surge · 26 1174 | .85,0,.15,1 | 2.8s |
| prop | `#3fc7b2` | 1.6 | 12 5 | triple bead · 4 6 4 6 4 1176 | linear | 4.6s |
| plant | `#a0e074` | 1.6 | 9 3 2 3 | twin · 9 7 9 1175 | linear | 3s |
| event | `#8c9eff` | 1.6 | 10 4 3 4 | double flash · 10 5 10 1175 | linear | 4s |
| thread | `#e287df` | 2.2 | solid | glow sweep · 34 1166 | .4,0,.6,1 | 5.6s |
| any | `#8e94c2` | 1.4 | 1 6 | inherits its source's | — | — |

State colours: flag `#ffc94d` · conflict `#ff6a58` · healthy `#52dd93` · ink `#6fe0ff`.

**Every wire is three paths:** a halo (same `d`, stroke-width 7, opacity .09), the base stroke (kind hue at .68–.74 with the kind's dash), and the signal (stroke-width 2.6, light tint, dasharray summing to 1200, animating `stroke-dashoffset: 1200 → 0`).

**Budget: 8 animated wires.** Animate only what is in view AND matches the filter or touches the selection. Reduced motion drops the signal path — hue and dash carry the meaning alone.

Relation words (*supports*, *rebuts*, *serves*) render as **text labels on the wire**, not as extra hues. This retires the eleven invented relation colours from earlier passes.

---

## 6. Density — trunks and highways

Individual lane routing does not survive ~34 nodes. Above that:

- **Gutter trunks.** Adjacent-column wires collapse into one band: stroke-width 22–30, `#6b74a8` at .16, 3–5 hairline strands at .3 inside, a tie, a count chip. Past 80% zoom in that gutter it separates back into lanes with **no re-layout**.
- **Highways.** A wire skipping a column leaves the node field and rides a horizontal band above or below it. **Nothing crosses a node, ever.**
- **Resolution is earned.** Only four things draw as real wires: matching the active filter, touching the selection, in view, or nothing at all under reduced motion.

Plus a relation filter bar with an `n of m shown` readout, and a minimap with a viewport rect.

---

## 7. The eighteen types

`● give · ○ take · ◉ spine (ordered intake) · ⚑ flagWhenEmpty · ∞ many`

### Structure

| Type | px | Ports |
|---|---|---|
| **Title** | 240 | ● Thread `thread` · ○ Subject `text·1` · ○ Complement `text·1` |
| **Manuscript** | 340 | ◉ Documents `text·∞` · ● Compiled `text` · ○ Thread ⚑ `thread·1` |
| **Document** | 300 | ◉ Sections `text·∞` · ● Compiled `text` · ○ Thread ⚑ `thread·1` · ○ Footnotes `cite·∞` |
| **Section** | 268 | ● Text `text` · ○ People `person·∞` · ○ Setting `place·1` · ○ POV `person·1` · ○ Serves `thread·1` |

Manuscript carries the cast presence matrix. Section carries the cast band.

### People and world — hubs, never group these

| Type | px | Ports |
|---|---|---|
| **Person** | 268 | ● Identity `person` · ○ Bond `person·∞` · ○ Possession `thing·∞` · ○ Notes `text·∞` **(new)** |
| **Place** | 240 | ● Identity `place` · ○ Contains `place·∞` · ○ Notes **(new)** |
| **Thing** | 240 | ● Identity `thing` · ○ Notes **(new)** |
| **Event** | 240 | ● Event `event` · ○ Involves `person·∞` · ○ Notes **(new)** |

Person fields: role, wants, fears, voice, wound. Presence strip in the map plate.

### Argument

| Type | px | Ports |
|---|---|---|
| **Claim** | 268 | ● Claim `claim` · ◉ Supports ⚑ `any·∞` · ○ Rebuts `any·∞` · ○ Warrant `text·1` |
| **Question** | 268 | ○ Answer `text·1` · ○ Notes **(new)** — takes only; dashed spine |
| **Passage** | 268 | ● Text `text` · ◉ Propositions `prop·∞` · ○ Cite `cite·1` **(new)** |
| **Proposition** | 268 | ● Proposition `prop` · ○ Arcs `prop·∞` · ● Text `text` |

Passage prose is set with a 2px left rule, italic.

### Material and craft

| Type | px | Ports |
|---|---|---|
| **Source** | 268 | ● Citation `cite` · ● Clip `text·∞` **(new)** |
| **Note** | 240 | ● Text `text` |
| **Plant** | 240 | ● Plant ⚑ `plant` |
| **Payoff** | 240 | ○ Resolves ⚑ `plant·∞` |

Drag a PDF onto the canvas to make a Source; select text in it to clip a new node, already wired.

### Containers — two verbs

| Type | px | Ports | Verb |
|---|---|---|---|
| **Group** | 300 | ◉ Members `any·∞` · ● Face (derived) | **contains** — members leave the canvas |
| **Hub** | 300 | ◉ Holds `any·∞` · ● Brief `text` · ○ Subject `any·1` | **collects** — members stay on canvas, the hub only lists them |

A **Document composes** — members' text flows in and comes out as prose. Three different jobs; pick by what should happen to the members.

Group: stacked edges at 5px and 10px offsets. ⌘G gather / ⌘⇧G dissolve / double-click to enter. Dissolve is the exact inverse of gather.

Hub: roster grouped by dataKind. Wire a Place into its Subject and it takes that identity and hue.

### Changes to `registry.ts`

```
+ notes-in    · text · ∞ · defaultVisible false   — on all 16 existing types
+ type 'hub'  · holds / brief / subject
+ source.clip · text · ∞                          — so clips wire back to their page
+ passage.cite· cite · 1                          — a passage should name its source
```

Everything else stays as written. **`DATA_KIND_STYLES` needs one edit** — the eleven hues above are brighter than what currently ships (`#a595f2`→`#b19bff` etc.); strokes and dashes are unchanged.

---

## 8. States

### Four sizes

| State | Shows | Trigger |
|---|---|---|
| star | a dot | <25% zoom |
| collapsed | title + one subtitle + ring; ports merge to one dot per side | ⌥click / ⌥⇧click selection / ⌥⇧A all |
| full | the anatomy above | default |
| open | 736px, in place, canvas dims | double-click |

Collapse is **persisted per node.** Below 45% zoom everything *renders* collapsed but the stored value is **never written**. Collapsing must never drop a wire.

### Readiness — a ring, never a dot

26×26 viewBox, r=8. Values from `derive.ts` `READINESS_STAGES`.

| Stage | Ring |
|---|---|
| seed | `#4a4f76` 1.6, `stroke-dasharray: 2 3` |
| developing | `#4a4f76` full ring + `#ffc94d` right arc `M13,5 A8,8 0 0 1 13,21` |
| ready | `#52dd93` 1.8 full ring |
| placed | `#52dd93` ring, `rgba(82,221,147,.18)` fill, 1.8 tick |

Assemblies show `rollupReadiness` (lowest stage present) plus a distribution bar.

**Delete `.readiness-dot` from `styles.css`** — the Tailwind-coloured dot (`#eab308`/`#22c55e`/`#a855f7`) still ships alongside the ring, and `TipsPanel.tsx` line 86 still documents it.

### Membership marks — the density rule

**Membership is a mark; content flow is a wire.** Twelve characters across twenty-four chapters is 180 relationships — as wires it is a hairball, as marks it is three strips.

| Mark | Where | What |
|---|---|---|
| cast band | Section | chips with the person's hue + name, `+n` overflow |
| presence strip | Person | one tick per chapter, lit where they appear |
| presence matrix | Manuscript | cast down, chapters across |

**Select to promote:** click a hub and its memberships become real wires until you deselect; unconnected nodes drop to 42%. One hub at a time; all twelve at once is never drawn.

A node earns a plate by having connections worth seeing. The canvas may offer to sweep anything with 0–1 wires into a Group.

### Block states — `blocks.ts`

Row: 78px label column, content, 2px left border carrying the state.

| State | Border | Fill | Label |
|---|---|---|---|
| own text | `#2a2f57` | `#0d1020` | own |
| embed, live | `#b19bff` | `rgba(177,155,255,.045)` | live |
| embed, forked | `#ffc94d` | `rgba(255,201,77,.05)` | forked |
| new | 1px dashed `#2a2f57` | none | type, or drop a node… |

A forked block shows **Revert** and **Apply to source** inline. The source plate gains a `1 fork` pill plus `diverged in <doc> · <age>` in its meta rail. **Write-back is never a side effect of typing.**

---

## 9. Splitting

A panel, not a fixed menu:

- **Into** — a `− n +` stepper (26px cells) and a type picker showing the type's spine colour
- **Titles** — segmented: Numbered / Blank / Paste a list
- **Wire back** — toggle, default **on**: each child feeds the parent's spine port
- **Keep text** — toggle, default **off**: move the parent's prose into child 1
- **Preview** — dashed box listing the resulting stubs, numbered
- **Split** (accent outline) and **Save as preset**

The five built-in presets are the same panel pre-filled. **Splitting is recursive and unlimited** — splitting a child is the same command, and nothing marks a node as already split. Worked example: Manuscript → 3 chapters → Ch. 4 → 4 sections → each fed from the side by Source, Note and Person.

---

## 10. The menu

### Dock — 56px

**Add node sits alone at the top** — the only button that makes something, so it gets its own zone, a 38px tile and the strongest fill. Below it the four rooms; below those the three tools that act on what already exists.

```
[ + Add node ]        N     ← 38px, accent fill
────────────
  Canvas              1     ← 34px, active = accent fill + border
  Document            2
  Arc                 3
  Focus               4
────────────
  Find                ⌘K
  Filter              F
  Ink                 P
────────────  (flex spacer above)
  Import
  Settings
```

Icons only at rest; a label slides out on hover after 400ms. No text ever wraps.

### Add sheet — N, or double-click empty canvas

Five families of four in a 4-column grid. **An icon carries the hue instead of a stripe** — eighteen identical colour bars is a legend, not a menu. No borders at rest; only the highlighted tile gets `rgba(hue,.14)` fill + `inset 0 0 0 1px rgba(hue,.40)` ring. Footer previews the highlighted type's ports. Arrow keys move, Enter places at the cursor.

Icons: Title `type` · Manuscript `library` · Document `book-open-text` · Section `file-text` · Person `user-round` · Place `map-pin` · Thing `package` · Event `calendar-days` · Claim `circle-check` · Question `help-circle` · Passage `book-marked` · Proposition `milestone` · Source `paperclip` · Note `sticky-note` · Plant `sprout` · Payoff `sparkles` · Group `layers` · Hub `circle-dot`.

### Every gesture

| Gesture | Result |
|---|---|
| double-click | open a plate · enter a group · new Note on empty canvas |
| esc | close, deselect, dismiss |
| ⌥click / ⌥⇧click / ⌥⇧A | collapse one / selection / all |
| ⌘G / ⌘⇧G | gather into a Group / dissolve it |
| ⌘⌥S | split panel on the selection |
| ⇧F | isolate — hide everything unconnected |
| drag port | draw a wire; valid targets flare, invalid dim |
| drag plate | wires ghost straight, re-route on drop |
| drop file | Source node at the cursor, title and pages read from it |
| select text in a Source | pick a type, get a wired node beside it |
| ⌘V | text → Note, URL → Source, image → Source |
| 1–4 | jump to a room |

**No right-hand inspector and no modal.** Every field is edited in place on the plate — click a dashed baseline and type.

---

## 11. Rooms

The canvas is the only view that shows **relationships**; each room shows one **ordering**.

| Room | Shows | File |
|---|---|---|
| **Canvas** | the map — spatial, all types, wires visible | `Canvas.tsx` |
| **Document** | block stack left (the spine port's ordered intake), compiled prose right; dragging a block reorders the intake wires | `DocumentRoom.tsx` |
| **Arc** | Propositions as a sequence on a curve; opens on any group holding 2+ | `ArcRoom.tsx` |
| **Focus** | one node, one column, no chrome | `FocusEditor.tsx` |

### The open state

Double-click grows the plate **in place** to 736px; it keeps its canvas position and the canvas dims behind it.

- Header collapses to one quiet line
- A **154px linked rail** on the left lists Takes and Gives as hue-coloured chips — the same wires you'd see on the map, listed instead of drawn, so twelve notes are readable without twelve strands
- Writing column: 22px 30px 8px 26px padding, 23px title, 10px Space Mono sub-line, Spectral 14px/1.72 at max 60ch
- Footer: word-count bar, **Link selection**, **Focus**
- `esc` collapses back. **The plate never moves.**

Per-form bodies in the same shell: **novel scene** (POV/tense sub-line, continuity note, cast chips) · **sermon point** (passage blocks with a 2px `rgba(232,192,122,.5)` left rule, italic Spectral, reference in Space Mono `#a08f6a`; delivery clock) · **paper section** (inline citation chips `rgba(99,224,198,.12)`, Space Mono 9px, live wires to Source nodes; `contested` chip in `#ff6a58` where a rebutting node is wired in).

---

## Mapping to the codebase

| Design area | Where |
|---|---|
| Night sky | replaces `Starfield.tsx` + the background in `styles.css` |
| Plate anatomy, rails, spine, gutters, surface tint | `components/CanvasNode.tsx` + `styles.css` |
| Per-type bodies | `components/faces/*` |
| Data-kind colours | `core/src/colors.ts` — **exists and is correct except the eleven hues need brightening** |
| Readiness ring | `components/ReadinessRing.tsx` — exists and is correct |
| Port shapes (flare variants) | `components/CanvasNode.tsx` + `styles.css` — **new** |
| Wire routing, chamfers, hops, ties | `components/WireEdge.tsx` + `app/src/harnessRouting.ts` |
| Corridor derivation | `harnessRouting.ts` — exists |
| Trunks, highways, filter resolution | `WireEdge.tsx` + `Canvas.tsx` |
| Group face | `components/AssemblyFace.tsx` — exists |
| **Hub face** | **new `components/HubFace.tsx`** |
| **Membership marks** | **new — cast band in `faces/SectionFace`, presence strip in `faces/PersonFace`, matrix in `faces/ManuscriptFace`** |
| Block/embed rows, fork notice | `DocumentRoom.tsx`, `faces/DocumentFace.tsx`, `BlocksFace.tsx` |
| Split panel | `components/SplitPanel.tsx` — exists |
| Dock + add sheet | `components/Toolbar.tsx`, `components/AddNodeMenu.tsx` |
| Collapse state | `store/canvasStore.ts` — exists, correct |

## Suggested order

1. **Delete `.readiness-dot`** from `styles.css` and fix the `TipsPanel` copy — 5 minutes, removes a live contradiction.
2. Brighten the eleven hues in `core/src/colors.ts`.
3. Plate surface tint, tinted border, coloured shadow.
4. Port flare variants.
5. The night sky.
6. Membership marks (cast band, presence strip, matrix) + select-to-promote.
7. Hub type + face.
8. `notes-in` on all types.
9. Dock reorder + add sheet as icon tiles.
10. Density: trunks, highways, minimap.

## Not yet designed

Called out so nothing is assumed:

- **Merge** — the inverse of `splitNode`, folding several nodes back into one. Does not exist in code or design.
- **Time** — history, "what changed since yesterday", who changed it, a way back. Does not exist in code or design.

## Files in this bundle

| File | Covers |
|---|---|
| `Observatory Spec.dc.html` | **the authoritative reference** — ground, plate, port, wire, signal, 18 types, states, menu, rooms |
| `Observatory Shell.dc.html` | the whole app in one frame — dock, canvas, groups at scale |
| `Observatory Presence.dc.html` | membership marks, hubs vs groups, select-to-promote |
| `Observatory Hub.dc.html` | fan-in shapes, the open Person plate, the Hub type, Section anatomy |
| `Observatory Canvas.dc.html` | the detail canvas at 100% — plate anatomy, 11 wire signals, ink layer |
| `Observatory Freeform.dc.html` | free placement, derived corridors, four-sided ports |
| `Observatory Dense.dc.html` | 34 nodes — trunks, highways, filter bar, minimap |
| `Observatory Writing.dc.html` | the open state, chrome/content ratio, per-form bodies |
| `support.js` | required runtime for the `.dc.html` files; not part of the design |
