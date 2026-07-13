import { describe, expect, it } from 'vitest';
import { createId } from './index';

describe('createId', () => {
  it('prefixes ids with the entity kind', () => {
    expect(createId('node')).toMatch(/^node_/);
  });

  it('never returns the same id twice', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 1000; i++) seen.add(createId('node'));
    expect(seen.size).toBe(1000);
  });
});
