# Node Canvas V2 — Agent Invariants (LOCKED FILE)
Read PROGRESS.md next. Work only on the current chunk.
## Never violate (critical bugs):
1. Plain edges always work with zero setup. Port features are opt-in additions.
2. Assemblies are REFERENCES. Never duplicate member nodes. Members can belong to multiple Assemblies.
3. Collapse/expand of Assemblies is a lossless round-trip.
4. NOTHING moves or resizes the user's nodes or viewport without an explicit user action. No auto-fit on load. No auto-layout ever unless the user clicks a button.
5. core/ is pure TypeScript: no React, React Flow, Tauri, or DB imports.
6. New node types = registry entry + renderer ONLY. Never edit core graph logic to add a type.
7. Zod-validate every load and save. Never swallow persistence errors.
8. UI stays canvas-dominant: the Observatory DOCK on the left edge (Add node alone at its top, spec §10), selection actions in a bottom-center pill, night-sky ground. No legend until a better design is approved (user, 2026-07-14). Look and feel = the OBSERVATORY spec (docs/design/observatory/README.md, user-adopted 2026-08-09; pt2 bundle 2026-08-10, values literal/final): plate anatomy, dataKind color law, readiness rings, dock + add sheet. /legacy remains reference for interactions only.
## Test discipline:
- Run the FULL suite before ending any session. All green or explain why to the user.
- NEVER edit a golden snapshot to make a test pass. Failing golden = behavior changed. Ask the user.
- Every new derivation/reducer gets a golden test in the same PR.
## Session discipline:
- Update PROGRESS.md before ending every session.
- /legacy is read-only reference. Never modify it.
- Files requiring INVARIANT-CHANGE-APPROVED in the commit message: CLAUDE.md, *.golden.*, docs/invariants/**.
