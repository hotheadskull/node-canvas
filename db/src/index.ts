// @node-canvas/db -- Drizzle schema + migrations, versioned from day one.
//
// Persistence decision (docs/invariants/INVARIANTS.md I10): the source of
// truth is ONE FILE PER PROJECT (a Zod-validated .nodecanvas JSON document).
// This package holds app-level metadata only: the recent-projects list,
// window state, and user preferences -- never project content.

export const SCHEMA_VERSION = 1;

/**
 * Everything the app remembers between launches that is not project content.
 * Project content lives in the user's .nodecanvas files.
 */
export type AppMetadata = {
  schemaVersion: number;
  recentProjects: { path: string; lastOpenedAt: string }[];
};

export function emptyAppMetadata(): AppMetadata {
  return { schemaVersion: SCHEMA_VERSION, recentProjects: [] };
}
