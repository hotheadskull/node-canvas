# UI interaction rules

Consistency and bug-prevention rules for every interactive element. Born from
real v1 field reports (an edge menu that opened on one machine and not
another). Where possible each rule is enforced by a test in
`app/src/interaction-rules.test.ts` — add a test when you add a rule.

## Hit targets

1. **Never rely on an element's visible shape for its hit area.** A 2px edge
   stroke, a 14px handle dot, a thin resizer line — each gets an invisible
   enlarged hit region (edge `interactionWidth`, handle `::after` inset,
   resizer grab zones). Minimum effective target: ~24 screen px.
2. **Hit areas are zoom-compensated.** SVG hit widths scale with canvas zoom,
   so compute them against the current zoom (see PlainEdge) or they shrink to
   nothing when zoomed out — which is exactly when precision is worst.
3. **Critical interactions get TWO independent affordances.** Opening the edge
   menu works by clicking the path *or* the always-present label chip. If a
   platform/browser/DPI quirk kills one path, the feature still works.

## Feedback

4. **Everything clickable has a hover state.** If it reacts on hover, users
   discover it; if it doesn't react, users (correctly) assume it's decoration.
5. **During a connection drag, validity is shown live** (coloring on
   handles/edges — lands with ports in Chunk 4).

## Behavior

6. **Nothing moves the user's canvas without an explicit action (I5).**
   Fit-to-view exists only as a button. No fitView on load, no auto-layout.
7. **Inputs inside nodes stop drag.** Every editable element inside a node
   carries `nodrag` so typing and selecting text never fights node dragging.
8. **Sizes are integers.** Fractional heights from measurements caused v1's
   resize oscillation; core's `computeAutoHeight` rounds, and observers only
   write when the change is ≥ 1px.
9. **Destructive actions are recoverable or confirmed.** Deleting nodes/edges
   must be undoable once undo lands (zundo, planned); until then deletion is
   only reachable from clearly-labeled controls, never a stray click.

## React Flow integration (found the hard way in Chunk 2 e2e)

12. **Controlled React Flow must apply ALL change types.** RF delivers its own
    measurements as 'dimensions' NodeChanges; a handler that cherry-picks
    position/select/remove silently leaves every node unmeasured and NO edge
    ever renders (RF's getEdgePosition bails without an error). Always run
    `applyNodeChanges`/`applyEdgeChanges` over RF-side state, and write back
    to the core document separately.
13. **Auto-fit measures a hidden content mirror, never the flexing body.**
    Measuring a container that fills the node feeds the node's height back
    into itself — unbounded growth (300 → 1080px in seconds) and the endless
    commits also starve the debounced save. The mirror's height depends only
    on text + width, so the loop is structurally impossible.
14. **Edges persist their handles.** Multi-handle nodes cannot re-render an
    edge that doesn't record sourceHandle/targetHandle (v1 F7-10a).
15. **Every RF canvas wires `onError`.** RF drops misconfigured elements
    silently or with console-only messages; surface them in dev.

17. **The camera may follow a SPAWN, and nothing else.** Collision-free
    placement can land a new node outside the viewport, and an invisible new
    node reads as "nothing happened" (v1 shipped this same fix). Spawning is
    the user's explicit action, so panning to the spawned node is a
    consequence of it — not a violation of I5. No other derived event may
    move the viewport.
18. **Debounced saves flush on pagehide/beforeunload.** A quick close or
    reload after an edit must never drop the last change (found by e2e:
    reorder + fast reload lost the reorder).
19. **Coach marks never cover the control they point at.** The tutorial card
    anchors to the RIGHT edge of the screen; the spotlight ring marks the
    target. A card placed beside the target sat exactly where the add-node
    gallery opens and swallowed its clicks (found by Chunk 16 e2e).
20. **A declared port always has a wirable handle.** Hidden
    (non-defaultVisible) ports render their handles and appear on node hover
    — a port with no handle is a feature that silently doesn't exist (found
    in Chunk 14: Footnotes and Subject/Complement could never be wired).

16. **Hover must never move layout.** Anything that changes on hover (preview
    panels, expanding rows) renders inside a reserved, fixed-size box. A
    bottom-anchored menu that grows on hover shifts every control upward
    under the user's cursor — clicks land on the wrong card (found by e2e in
    Chunk 4: hovering a node card resized the add-menu and broke picking).

## Consistency sources

10. **The registry is the single source of truth for looks.** Menu cards,
    legend colors, node accents, and preview panels all render from registry
    data. Never hard-code a per-type color or label in a component.
11. **Panels live where I6 (as amended) says:** Add-node top-left with its
    menu anchored below it, toolbar bottom-left, no legend,
    menus anchored to the toolbar. New chrome must justify its pixels.
