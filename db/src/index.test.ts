import { describe, expect, it } from 'vitest';
import { SCHEMA_VERSION, emptyAppMetadata } from './index';

describe('app metadata', () => {
  it('starts at the current schema version with no recent projects', () => {
    const meta = emptyAppMetadata();
    expect(meta.schemaVersion).toBe(SCHEMA_VERSION);
    expect(meta.recentProjects).toEqual([]);
  });
});
