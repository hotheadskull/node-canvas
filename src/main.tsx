import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { runMigrations } from "./db";

async function boot() {
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
