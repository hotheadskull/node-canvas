import { describe, expect, it } from 'vitest';
import { createEmptyDocument, serializeDocument, DOCUMENT_SCHEMA_VERSION } from './schema';
import { loadDocument, runMigrations, MIGRATIONS, type MigrationStep } from './migrate';

// The migration rails ship BEFORE the first real migration so v2 lands on
// proven plumbing: version detection, chain walking, hard failures for
// files from the future, and the migrated flag persistence layers use to
// back up before overwriting (backup-before-migrate).
describe('schema migrations', () => {
  it('loads a current-version document without migrating', () => {
    const doc = createEmptyDocument('Fresh');
    const result = loadDocument(serializeDocument(doc));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.migrated).toBe(false);
    expect(result.fromVersion).toBe(DOCUMENT_SCHEMA_VERSION);
    expect(result.document.name).toBe('Fresh');
  });

  it('rejects text without a schemaVersion as not-a-document', () => {
    const result = loadDocument(JSON.stringify({ name: 'random json' }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/missing schemaVersion/);
  });

  it('rejects invalid JSON and arrays with clear errors', () => {
    expect(loadDocument('{nope')).toMatchObject({ ok: false });
    const arr = loadDocument('[1,2,3]');
    expect(arr.ok).toBe(false);
    if (!arr.ok) expect(arr.error).toMatch(/expected a JSON object/);
  });

  it('refuses files from a NEWER app version instead of mangling them', () => {
    const doc = createEmptyDocument('Future');
    const raw = serializeDocument(doc).replace(
      `"schemaVersion": ${DOCUMENT_SCHEMA_VERSION}`,
      `"schemaVersion": ${DOCUMENT_SCHEMA_VERSION + 5}`,
    );
    const result = loadDocument(raw);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/newer Node Canvas/);
  });

  it('walks a synthetic multi-step chain in order and reports migrated', () => {
    const steps: MigrationStep[] = [
      {
        from: 1,
        description: 'v1->v2: rename note',
        apply: (raw) => ({ ...raw, schemaVersion: 2, renamed: true }),
      },
      {
        from: 2,
        description: 'v2->v3: add flag',
        apply: (raw) => ({ ...raw, schemaVersion: 3, flagged: true }),
      },
    ];
    const run = runMigrations({ schemaVersion: 1 }, steps, 3);
    expect(run.ok).toBe(true);
    if (!run.ok) return;
    expect(run.json).toMatchObject({ schemaVersion: 3, renamed: true, flagged: true });
  });

  it('fails loudly on a GAP in the chain rather than skipping versions', () => {
    const steps: MigrationStep[] = [
      { from: 2, description: 'v2->v3', apply: (raw) => ({ ...raw, schemaVersion: 3 }) },
    ];
    const run = runMigrations({ schemaVersion: 1 }, steps, 3);
    expect(run.ok).toBe(false);
    if (run.ok) return;
    expect(run.error).toMatch(/missing step for v1/);
  });

  it('fails loudly when a step forgets to advance schemaVersion', () => {
    const steps: MigrationStep[] = [
      { from: 1, description: 'broken step', apply: (raw) => ({ ...raw }) },
    ];
    const run = runMigrations({ schemaVersion: 1 }, steps, 2);
    expect(run.ok).toBe(false);
    if (run.ok) return;
    expect(run.error).toMatch(/must set schemaVersion to 2/);
  });

  it('registry sanity: steps are contiguous and end at the current version', () => {
    // Empty today. When real steps land this pins the shape: exactly one
    // step per version, no gaps, chain ends at DOCUMENT_SCHEMA_VERSION.
    const froms = MIGRATIONS.map((step) => step.from).sort((a, b) => a - b);
    const first = froms[0] ?? 0;
    froms.forEach((from, index) => {
      expect(from).toBe(first + index);
    });
    if (MIGRATIONS.length > 0) {
      expect(froms[froms.length - 1]).toBe(DOCUMENT_SCHEMA_VERSION - 1);
    }
  });
});
