# Node Canvas V2 — Invariants (LOCKED)

Violating any of these is a critical bug. Changes to this file require
INVARIANT-CHANGE-APPROVED in the commit message and explicit user approval.

- **I1 — Plain edges always work.** Click/drag from any node to any node
  produces a simple relationship line. No setup, no types required, carries no
  data. The casual mind-mapping workflow is never degraded.
- **I2 — Ports are opt-in.** All port/dataflow features are additive. A user
  can use the entire app forever without touching a port.
- **I3 — Assemblies are references, never copies.** A node can belong to
  multiple Assemblies. Duplicating an Assembly never duplicates member nodes.
  Deleting an Assembly never deletes member nodes.
- **I4 — Collapse/expand is lossless.** Collapsing and expanding an Assembly
  (any nesting depth) is a perfect round-trip. Golden-tested.
- **I5 — Nothing moves the user's nodes without an explicit user action.**
  No auto-fit, no auto-layout, no viewport jump, no resize on load, ever.
- **I6 — The canvas is the app.** On open: canvas, add-node button, compact
  toolbar bottom-left, legend bottom-right, dark cosmic starfield. Minimal
  chrome. New UI must justify every pixel it takes from the canvas.
- **I7 — Core is pure.** All graph/port/assembly/derivation/compile logic
  lives in `core/` as pure TypeScript, fully covered by golden tests. `app/`
  renders; it never re-implements logic. Enforced by ESLint
  no-restricted-imports.
- **I8 — Node types live in the registry only.** Adding a node type = a
  registry entry + a renderer. If adding a type requires editing core graph
  logic, the abstraction is broken — stop and fix it.
- **I9 — User data is sacred.** Zod-validate on every load and before every
  save. Schema changes ship with a migration and a pre-migration backup.
  Errors are surfaced, never swallowed.
- **I10 — The document format is CRDT-compatible.** One `.nodecanvas` file per
  project. Every entity (node, edge, wire, port assignment, assembly) has a
  stable unique ID assigned at creation; identity NEVER derives from array
  position; ordering is expressed as data (order keys or ID lists), not
  implicit sequence. V2 has no real-time collaboration, but adding it must
  never require a format rewrite.
- **I11 — Packs never gate availability.** Every node type is always reachable
  by every user (menu "All" view and search). Enabling a pack changes default
  labels and menu prominence only. Nothing is ever locked.
