import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
// index.css holds the edge animations, node-visibility transitions, and print
// styles -- this import was lost in a main.tsx rewrite and every rule in the
// file silently stopped loading. Do not remove it again.
import "./index.css";
import { runMigrations } from "./db";

async function boot() {
  // Outside Tauri (plain-browser dev / verification runs), stand in for the
  // SQL IPC with an in-memory mock. Dead code in production builds.
  if (import.meta.env.DEV && !('__TAURI_INTERNALS__' in window)) {
    const { installTauriMock } = await import('./dev/tauriMock');
    installTauriMock();
  }
  try {
    console.log("Running SQLite Migrations via Tauri IPC...");
    await runMigrations();
    console.log("Migrations successful.");
  } catch (e) {
    console.error("Migration failed:", e);
  }

  ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}

boot();
