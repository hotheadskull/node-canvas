# Node Canvas

A desktop writing and worldbuilding tool. Organize a writing project as connected nodes on an infinite starfield canvas — draft scenes, track lore, pin quotes and stats, sequence chapters, and compile everything into a manuscript.

Built with Tauri 2, React 19, TypeScript, React Flow, TipTap, and SQLite (via Drizzle ORM).

## Features

- **Infinite canvas** with an animated parallax starfield background
- **14 node types**: Theme (rich-text documents), Quote, Stat, Task, Sequence, Hub (collapsible clusters), Group (nesting containers), Lore, Snippet, Master, Logic, Item, Deck (drag nodes in to stack them as cards), and Print (compile connected nodes into a manuscript)
- **Elastic edges** that connect node borders dynamically, with drag-to-reconnect
- **Spiderweb auto-linking** — typing another node's title automatically draws a link to it
- **Rich text editing** via TipTap, with markdown/text file drag-and-drop import
- **Projects** with snapshots, JSON import/export, and a trash with restore for both nodes and projects
- **Local-first storage** — everything lives in a SQLite database on your machine
- **Canvas search** and manuscript compile/preview with PDF and markdown export

## Development

Prerequisites: [Node.js](https://nodejs.org/), [Rust](https://www.rust-lang.org/tools/install), and the [Tauri prerequisites](https://tauri.app/start/prerequisites/) for your platform.

```sh
npm install
npm run tauri dev    # run the desktop app in dev mode
npm test             # run the test suite
npm run tauri build  # build a release bundle
```

The SQLite database is stored in the app data directory as `world_engine.db` (the filename is a legacy of the project's original working title and is kept for data compatibility).

## Project structure

- `src/App.tsx` — canvas shell, background, node/edge type registry
- `src/store/useStore.ts` — Zustand store; all state and DB persistence
- `src/db/` — Drizzle schema, Tauri SQL proxy, and migrations
- `src/components/` — one file per node type, plus editor/search/project UI
- `src-tauri/` — Rust shell and Tauri configuration
