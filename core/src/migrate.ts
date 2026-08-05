// ============================================================================
// SCHEMA MIGRATIONS -- how an old .nodecanvas file becomes a current one.
//
// The contract (I9 + brief rule 8):
// - schemaVersion gates everything. It is read off the RAW JSON before any
//   Zod parsing, because DocumentSchema only accepts the CURRENT version.
// - Migrations are pure raw->raw steps registered in MIGRATIONS, one per
//   version bump. Shipping schema v(N+1) means: bump
//   DOCUMENT_SCHEMA_VERSION, add one step here, nothing else.
// - Callers that persist MUST write a pre-migration backup of the original
//   bytes when `migrated` is true, BEFORE the migrated document can
//   overwrite the file (backup-before-migrate). The persistence layers own
//   that; this module just reports what happened.
// - Never throws: failures surface as { ok: false, error } (I9).
// ============================================================================

import { DOCUMENT_SCHEMA_VERSION, DocumentSchema, type CanvasDocument } from './schema';

export type MigrationStep = {
  /** The version this step upgrades FROM (to `from + 1`). */
  from: number;
  /** One line for logs and the pre-migration backup name. */
  description: string;
  /** Pure transform over the raw parsed JSON. Must set schemaVersion to from + 1. */
  apply: (raw: Record<string, unknown>) => Record<string, unknown>;
};

/**
 * The ordered migration registry. Version 1 is current, so it is empty --
 * but the pipeline, its error paths, and the backup contract are already
 * exercised by tests so the FIRST real migration ships onto proven rails.
 */
export const MIGRATIONS: MigrationStep[] = [];

export type LoadResult =
  | {
      ok: true;
      document: CanvasDocument;
      /** True when migration steps ran -- persistence must back up first. */
      migrated: boolean;
      /** The schemaVersion the raw text carried. */
      fromVersion: number;
    }
  | { ok: false; error: string };

/**
 * Run `steps` over raw JSON until it reaches `targetVersion`. Exported so
 * tests can exercise the pipeline with synthetic steps; loadDocument feeds
 * it the real registry.
 */
export function runMigrations(
  json: Record<string, unknown>,
  steps: MigrationStep[],
  targetVersion: number,
): { ok: true; json: Record<string, unknown> } | { ok: false; error: string } {
  let current = json;
  let version = current.schemaVersion as number;
  let guard = 0;
  while (version < targetVersion) {
    if (guard++ > 1000) {
      return { ok: false, error: 'migration did not converge (schemaVersion never advanced)' };
    }
    const step = steps.find((candidate) => candidate.from === version);
    if (!step) {
      return {
        ok: false,
        error: `no migration path from schema v${version} to v${targetVersion} (missing step for v${version})`,
      };
    }
    current = step.apply(current);
    const next = current.schemaVersion;
    if (typeof next !== 'number' || !Number.isInteger(next) || next !== step.from + 1) {
      return {
        ok: false,
        error: `migration "${step.description}" must set schemaVersion to ${step.from + 1}`,
      };
    }
    version = next;
  }
  return { ok: true, json: current };
}

/**
 * Load a .nodecanvas document of ANY supported schema version. The one
 * entry point persistence layers should use for reads: it migrates when
 * needed, validates always, and never throws.
 */
export function loadDocument(raw: string): LoadResult {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch (cause) {
    return { ok: false, error: `not valid JSON: ${(cause as Error).message}` };
  }
  if (typeof json !== 'object' || json === null || Array.isArray(json)) {
    return { ok: false, error: 'not a .nodecanvas document (expected a JSON object)' };
  }
  const record = json as Record<string, unknown>;
  const version = record.schemaVersion;
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) {
    return { ok: false, error: 'not a .nodecanvas document (missing schemaVersion)' };
  }
  if (version > DOCUMENT_SCHEMA_VERSION) {
    return {
      ok: false,
      error:
        `this file is schema v${version}, but this build reads up to v${DOCUMENT_SCHEMA_VERSION} -- ` +
        'it was saved by a newer Node Canvas; update the app to open it',
    };
  }

  let candidate = record;
  const migrated = version < DOCUMENT_SCHEMA_VERSION;
  if (migrated) {
    const run = runMigrations(record, MIGRATIONS, DOCUMENT_SCHEMA_VERSION);
    if (!run.ok) return run;
    candidate = run.json;
  }

  const result = DocumentSchema.safeParse(candidate);
  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('; ');
    const suffix = migrated ? ` (after migrating from schema v${version})` : '';
    return { ok: false, error: `invalid document${suffix}: ${details}` };
  }
  return { ok: true, document: result.data, migrated, fromVersion: version };
}
