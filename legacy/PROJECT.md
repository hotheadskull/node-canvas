# Project: Writing Hub Gamified Overhaul

## Architecture
- **Frontend App**: Built with React (v19) + Vite + Tailwind CSS v4 + TypeScript.
- **Node Engine**: ReactFlow (`@xyflow/react`) is used for the node canvas.
- **Styling**: Global styles in `src/App.css`. Layout and theme custom variables defined in Tailwind CSS v4 format.
- **State Management**: Zustand store in `src/store/`.
- **Database**: Drizzle ORM + Tauri SQLite plugin for persistence.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|---|---|---|---|
| M1 | E2E Test Suite | E2E Test Track: Create test runner, write Tier 1-4 E2E tests for canvas theme, node geometry, custom connections, and interactions. Publishes TEST_READY.md. | None | IN_PROGRESS (Conv ID: 9664dfaf-c055-4a1e-b029-1d85d4d6dc98) |
| M2 | Canvas & Layout Overhaul | Replace ReactFlow background with cosmic deep-space gradient and starfield overlay. Update sidebars, panels, and project manager with Art Deco matte stone aesthetic. | None | IN_PROGRESS (Conv ID: 655a558b-13fb-431d-8d94-25b292985349) |
| M3 | Custom Node Geometry | Redesign ThemeNode, ItemNode, and LogicNode with custom geometric profiles (Art Deco clip-paths/borders) matching Deadlock Matte Stone theme. | M2 | PLANNED |
| M4 | Premium Interaction States | Add glowing connection handles, tactile hover scaling/glows, and customized custom elastic edges (glowing/animated wires). | M3 | PLANNED |
| M5 | E2E Pass & Adversarial Hardening | Verify all Tier 1-4 E2E tests pass. Conduct Tier 5 adversarial review and white-box coverage hardening. | M1, M4 | PLANNED |

## Interface Contracts
### ReactFlow Canvas ↔ Custom Nodes
- Custom nodes must accept standard `@xyflow/react` NodeProps.
- Custom nodes must maintain input accessibility (RichTextEditor, custom fields) without breaking click-to-edit capabilities.
- Handles must be correctly positioned on the node borders to align with connection ports.

### Custom Elastic Edge ↔ Canvas
- ElasticEdge must receive custom styling/color mapping and SVG filter IDs for glow animations.

## Code Layout
- `src/App.tsx`: Main ReactFlow canvas setup and configuration.
- `src/App.css`: Global styles, CSS variables, and canvas backgrounds.
- `src/components/`: Directory for all node and edge React components.
- `src/components/ElasticEdge.tsx`: Custom edge drawing.
