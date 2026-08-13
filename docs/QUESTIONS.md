# Open questions — answer whenever

Twelve questions, ordered by what they block. **1–3 stop current work**; the
rest I can guess at but would rather not.

You don't need to answer them all at once, and you don't need to write much —
a number and a word is plenty (`1: yes, infer it`). Where I have a
recommendation it's marked, so "do what you suggested" works too.

*As of 12 August 2026.*

---

## Blocking — work stops without these

### 1. When you drag one node into another, should the app understand what it means?

You connect Durvain to Chapter 1. Should he then show up in that chapter's cast
list automatically — or is that line just a line until you say more?

This is the promise in §2 of your document: *"the connection itself can
communicate the relationship."* Everything the app works out for you — a scene's
cast, a plant's payoff, a document's compiled text — currently only understands
the old typed connections. Until this is settled, those features can't be
reached by hand, and the twenty stale browser tests can't be rewritten.

- [ ] **Infer it.** A Person into a Section means cast; a Place means setting. Add a label on the wire when you want to be specific.
- [ ] **Ask once.** On connecting, a small chip offers "cast? setting? just related?" and remembers your choice for that pair of types.
- [ ] **Keep it dumb.** A line is only a line; structure comes from fields and document blocks instead.

> **I'd pick:** infer it.

---

### 2. Should a node ever get a size it didn't ask for?

You've said a node is whatever size you dragged it to. Two edge cases aren't
covered by that: a node you've never touched that fills up with text, and a node
whose content shrinks to almost nothing.

- [ ] **Grow until touched.** An untouched node grows with its text; the moment you drag it, that size is final forever.
- [ ] **Never move.** Every node spawns at its type's size and only ever changes when you drag it. Overflow scrolls inside.

> **I'd pick:** grow until touched — it's what happens today.

---

### 3. Should node shapes differ by what they are?

Your §18 wants shape to carry the kind of thing: rounded for people and places,
document-like for writing, diamond for decisions, gate shapes for logic. Right
now every node is the same rectangle and only colour and icon differ.

Worth knowing: shapes make nodes harder to fill with text and harder to resize
predictably, so I'd keep the writing nodes rectangular whatever we decide.

- [ ] **Yes, but only the small ones.** Reference, logic and entity nodes get real shapes; anything you write in stays a rectangle.
- [ ] **Yes, all of it.** Full §18 as written.
- [ ] **No.** Colour and icon are enough; keep one shape.

> **I'd pick:** only the small ones.

---

## Shapes the feature takes — I can build either way

### 4. Should typing a node's name in your prose offer to link it?

Today you type `@` and pick from a list. Your §9 also imagines just writing
"Durvain" and being offered the link. That's more magical and more intrusive —
it means the editor is watching every word.

- [ ] **Only on `@`.** Deliberate, quiet, never surprises you.
- [ ] **Underline matches quietly.** Names of existing nodes get a faint underline you can click to link; nothing happens on its own.
- [ ] **Offer as you type.** A suggestion appears the moment a name matches.

> **I'd pick:** underline quietly.

---

### 5. What should Extract leave behind in the original?

You select a paragraph describing Durvain inside a chapter and extract a
Character node. Your §13 says the original text stays. But should the chapter
now know the two are related?

- [ ] **Link the text.** The extracted words become a live reference to the new node — click through from either side.
- [ ] **Connect the nodes.** Text unchanged, but a connection appears between chapter and character.
- [ ] **Leave it alone.** A copy is made and nothing else changes.

> **I'd pick:** link the text.

---

### 6. Should the boolean gates stay?

AND, OR and NOT now judge whether the things wired into them have been written
yet. It works, but it's the most programming-flavoured corner of the app, and §2
was about getting away from that feeling.

- [ ] **Keep them.** Useful for study checklists and research conditions.
- [ ] **Drop them** and keep Sequence, Decision, Condition, Compare, Merge, Split, Transform, Filter.
- [ ] **Keep but hide.** Available by search, absent from the menu until used once.

> **I'd pick:** keep but hide.

---

### 7. What should a saved template carry?

Templates currently remember types, fields, colours, sizes, layout and the
connections between the selected nodes. Your §23 list also mentions the text
inside them and any embedded scenes.

- [ ] **Structure only.** Fields present but empty; you fill them in each time.
- [ ] **Structure plus placeholders.** Fields carry example or prompt text you overwrite.
- [ ] **Everything, text included.** A template is a full copy of what you selected.

> **I'd pick:** structure plus placeholders.

---

### 8. Should a compact Reference node show anything besides the name?

It's deliberately small. But a Character reference could show a colour dot, an
icon, or a one-word role without getting much bigger.

- [ ] **Name only.** Smallest possible tile.
- [ ] **Icon and name.** You can tell a person from a place at a glance.
- [ ] **Icon, name, and one field** you choose per reference.

> **I'd pick:** icon and name.

---

## Not urgent — but they'll come up

### 9. Which missing node types actually matter to you?

I added Idea, Quote, Concept, Theme, Definition, Evidence, Argument and
Counterargument. Your document also names Word, Translation, Syntax, Outline,
Study and Reminder — those are more specialised. Which do you expect to reach
for, and which were you thinking out loud about?

### 10. Do you want alternate versions of a scene?

Your §12 mentions keeping an alternative version of a passage without destroying
the original. Is that a real need for how you write, or an idea you were
exploring? It's a meaningful build either way, so I'd rather ask.

### 11. Should the app remember anything about time?

When a node was made, when it was last touched, what changed since yesterday.
Nothing tracks this today. It's the foundation of both an undo history and a
"what was I working on" view — but it makes every save bigger.

### 12. What's the first real project you'll put in it?

Not a design question — a calibration one. Knowing whether the first serious use
is the novel, a sermon series, or coursework tells me which rough edges to
smooth first, and it's usually better information than any feature list.
