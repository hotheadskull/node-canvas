# Where Node Canvas stands, and what's next

*State of play as of 12 August 2026. Written to answer three questions: what's
planned, what would make it feel professional, and what should be improved.*

## Where it actually is right now

| | |
|---|---|
| Node types | 45, all reachable from one menu |
| Unit tests | 309 green across 35 files |
| Browser tests | 31 green, 18 stale (see below) |
| TODO/FIXME left in source | 0 |
| Desktop build | Working. Portable + installer, x64 and arm64 |
| Biggest source file | `canvasStore.ts`, 1,873 lines |

It is a real application that builds, installs and runs. It is not yet an
application a stranger could use without being told things.

---

## 1. What is already planned

### Bugs you reported, logged and queued
1. **Writing surfaces are invisible** — text boxes don't look editable and the
   caret can't be seen. *This blocks actually writing, so it goes first.*
2. **Connections exist but draw nothing** — the data says connected, the screen
   says nothing.
3. **Resizing shows no live feedback** — cause already located (`Canvas.tsx:347`).

### Consolidations you proposed
4. **The wire system** — one function that owns everything about how a
   connection is drawn, instead of six files that each hold a piece.
5. **The node sizing system** — one answer to "how big is this node and why",
   instead of six places that disagree.

### Already deferred, by earlier decision
Continuity engine, Word Study, Illustration, presentation mode, merge-progress
faces, academic-pack polish. All additive — none of them block writing.

### Chunk 19 — commercial
License keys, payments, code signing, auto-update, crash reporting. Deferred to
last by your call, and partly blocked on accounts only you can create.

---

## 2. What would make it feel professional

Ordered by how much each one changes the impression, not by effort.

### The four that matter most

**a. Code signing.** Right now Windows shows a blue "unrecognised app" warning
on the installer. Nothing else on this list costs you more credibility per
second of exposure — it is the first thing anyone sees, and it says "hobby
project" before the app even opens. A certificate is a real cost (roughly
$200–400/year, or cheaper through Azure Trusted Signing). This is the single
highest-leverage professional item and it is currently sitting in Chunk 19,
which is deferred. Worth pulling forward if you ever show this to anyone else.

**b. Auto-update.** Today: I build it, put it on your Desktop, you run it. That
does not scale past you, and it is why the last build confused you. Tauri has an
updater built in — the app checks a URL, tells you a version is available, and
installs it. Also fixes the "which one am I running" problem permanently.

**c. A first-run experience.** Open the app cold and you get an empty starfield
and no idea what to do. Real products greet you: a short "start a novel / start
a paper / start from blank" choice, which the Project Launcher is already 80% of
the way to being. Your sister and her boyfriend will hit this screen first and
have nobody to ask.

**d. Visible trust in saving.** For a writing tool, the single most important
feeling is *my work is safe*. Right now saving is invisible. It needs a quiet,
always-present indicator — "saved", "saving…", "last saved 2 min ago" — and a
recovery path if the app dies mid-sentence. Writers do not forgive lost work.

### The quieter ones that add up

- **Window state memory** — reopen where you left it, at the size you left it.
- **A real app icon** — currently the Tauri default.
- **Crash recovery** — if it dies, offer the unsaved canvas back on next launch.
- **Keyboard-first flow** — a writing tool should be fast without the mouse:
  new node, connect, navigate, search, all from the keys.
- **Empty-state copy on nodes** — each type telling you what it is for, once,
  instead of forty-five identical "Write here…" prompts.
- **Honest error surfaces** — quiet where it can recover, unmissable where it
  cannot, never a silent failure. (Two of your three current bugs are silent
  failures.)

---

## 3. What should be improved

### Code health

**`canvasStore.ts` is 1,873 lines and does everything.** Document editing,
persistence, undo history, ink, UI panels, templates, projects, toasts. It is
the file most likely to break in a surprising way, and the hardest to test in
pieces. Splitting it by concern — document ops / persistence / session UI /
history — is unglamorous and would pay for itself quickly.

`Canvas.tsx` at 1,050 lines has the same problem, one layer up.

**The 18 stale browser tests.** They drive typed-port dragging, which the new
direction retired. Because they always fail, browser tests were made
non-blocking in CI — which means *a real regression in the other 31 would not
stop anything.* That is the most dangerous item on this page, because it is
invisible. Rewriting them against the universal-port model and turning the gate
back on restores the safety net.

**No end-to-end test covers the thing you actually do.** There are tests for
harnesses, splits, arcs and blocks — but nothing that says "open the app, make a
character, write a chapter, connect them, reload, and find it all there". That
walk is the product. It should be the test that must never go red.

### Experience

- **Node bodies still look alike.** Colour and icon distinguish them; shape,
  size and internal structure mostly do not. Person shows what a node *can* look
  like when it has real structure — most types have not had that pass.
- **Logic nodes are full-size cards** that should be small operators.
- **Three known layout breaks:** Question's hint overflows, Brainstorm's TOPICS
  label clips, Event's story-time label cuts off.

---

## What I would do next, in order

1. **Fix the writing surfaces.** You cannot use it tonight otherwise.
2. **Fix connections drawing nothing.** Second-most confusing failure.
3. **Write the one end-to-end test that covers real use**, so those two never
   silently come back.
4. **Fix resize feedback** — cause already found, should be quick.
5. **Saving you can see** — the cheapest large gain in feeling professional.
6. **Rewrite the 18 stale specs, re-arm CI.** Removes the invisible risk.
7. **Then the two systems** (wires, sizing), which make categories of bug
   impossible rather than fixed one at a time.

Signing, auto-update and first-run belong in the conversation about showing this
to anyone besides yourself.
