import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { computeAutoHeight, findFreePosition, rectsOverlap, type Rect } from './layout';

type GoldenCases = {
  findFreePosition: {
    name: string;
    occupied: Rect[];
    desired: { x: number; y: number };
    size: { width: number; height: number };
    expected: { x: number; y: number };
  }[];
  computeAutoHeight: {
    name: string;
    input: { contentHeight: number; minHeight: number; ownedHeight?: number };
    expected: number;
  }[];
};

const golden: GoldenCases = JSON.parse(
  readFileSync(new URL('./layout.golden.json', import.meta.url), 'utf8'),
);

describe('findFreePosition (golden)', () => {
  for (const testCase of golden.findFreePosition) {
    it(testCase.name, () => {
      expect(findFreePosition(testCase.occupied, testCase.desired, testCase.size)).toEqual(
        testCase.expected,
      );
    });
  }

  it('result never overlaps any occupied rect (property check)', () => {
    // deterministic pseudo-random cluster
    let seed = 42;
    const rand = () => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed / 2147483648;
    };
    const occupied: Rect[] = Array.from({ length: 30 }, () => ({
      x: Math.floor(rand() * 1200) - 600,
      y: Math.floor(rand() * 1200) - 600,
      width: 200 + Math.floor(rand() * 300),
      height: 150 + Math.floor(rand() * 250),
    }));
    const size = { width: 300, height: 220 };
    const spot = findFreePosition(occupied, { x: 0, y: 0 }, size);
    for (const rect of occupied) {
      expect(rectsOverlap({ ...spot, ...size }, rect, 40)).toBe(false);
    }
  });

  it('is deterministic: same inputs, same output', () => {
    const occupied: Rect[] = [{ x: 0, y: 0, width: 300, height: 200 }];
    const a = findFreePosition(occupied, { x: 0, y: 0 }, { width: 300, height: 200 });
    const b = findFreePosition(occupied, { x: 0, y: 0 }, { width: 300, height: 200 });
    expect(a).toEqual(b);
  });
});

describe('computeAutoHeight (golden)', () => {
  for (const testCase of golden.computeAutoHeight) {
    it(testCase.name, () => {
      expect(computeAutoHeight(testCase.input)).toBe(testCase.expected);
    });
  }

  it('always returns an integer (fractional heights caused v1 oscillation)', () => {
    for (const content of [100.1, 250.5, 399.9, 400.49]) {
      expect(Number.isInteger(computeAutoHeight({ contentHeight: content, minHeight: 220 }))).toBe(
        true,
      );
    }
  });
});
