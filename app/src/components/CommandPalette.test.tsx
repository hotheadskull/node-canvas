import { describe, expect, it } from 'vitest';
import { matchesQuery } from './CommandPalette';

describe('palette matching', () => {
  it('every query word must appear somewhere', () => {
    expect(matchesQuery('The lighthouse Section storm', 'light section')).toBe(true);
    expect(matchesQuery('The lighthouse Section', 'light harbor')).toBe(false);
    expect(matchesQuery('Bob Person', 'bob')).toBe(true);
    expect(matchesQuery('anything', '')).toBe(true);
  });
});
