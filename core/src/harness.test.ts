import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  CHAMFER,
  LANE_GAP,
  STUB,
  findHops,
  harnessPathD,
  routeHarness,
  routePoints,
  type HarnessWireInput,
} from './harness';

const golden = JSON.parse(readFileSync(new URL('./harness.golden.json', import.meta.url), 'utf8'));

const give = (x: number, y: number) => ({ x, y, side: 'right' as const });
const take = (x: number, y: number) => ({ x, y, side: 'left' as const });

describe('routePoints (the orthogonal skeleton)', () => {
  it('level wires run straight: stub, run, stub', () => {
    const points = routePoints(give(100, 50), take(400, 50), 250);
    // no vertical travel needed -- lane is skipped entirely
    expect(points.every((point) => point.y === 50)).toBe(true);
    expect(points[0]).toEqual({ x: 100, y: 50 });
    expect(points[1]).toEqual({ x: 100 + STUB, y: 50 });
    expect(points[points.length - 1]).toEqual({ x: 400, y: 50 });
  });

  it('offset wires travel vertically ONLY in the lane', () => {
    const points = routePoints(give(100, 50), take(400, 250), 300);
    const verticals = points
      .slice(1)
      .map((point, index) => ({ a: points[index]!, b: point }))
      .filter((seg) => Math.abs(seg.a.x - seg.b.x) < 0.01);
    expect(verticals).toHaveLength(1);
    expect(verticals[0]!.a.x).toBe(300);
  });

  it('every segment is axis-aligned (never a diagonal in the skeleton)', () => {
    const points = routePoints(give(0, 0), take(500, 333), 400);
    for (let index = 1; index < points.length; index++) {
      const dx = Math.abs(points[index]!.x - points[index - 1]!.x);
      const dy = Math.abs(points[index]!.y - points[index - 1]!.y);
      expect(dx < 0.01 || dy < 0.01).toBe(true);
    }
  });
});

describe('harnessPathD (chamfers + hops)', () => {
  it('corners become 45° cuts of exactly CHAMFER px on long runs', () => {
    const d = harnessPathD(routePoints(give(0, 0), take(500, 200), 300), new Map());
    // the cut into the first corner ends CHAMFER short of it, then a
    // diagonal line to CHAMFER past it -- both coordinates move => diagonal
    expect(d).toContain(`L${300 - CHAMFER},0`);
    expect(d).toContain(`L300,${CHAMFER}`);
    expect(d).not.toMatch(/C|Q/); // never curves
  });

  it('a vertical run crossing a horizontal run hops it (sweep 1 downward)', () => {
    const mine = routePoints(give(0, 0), take(500, 300), 250);
    const other = routePoints(give(-100, 150), take(600, 150), 50);
    const hops = findHops(mine, [other]);
    expect([...hops.values()].flat()).toContain(150);
    const d = harnessPathD(mine, hops);
    expect(d).toContain('A6,6 0 0 1');
  });

  it('upward travel hops with sweep 0', () => {
    const mine = routePoints(give(0, 300), take(500, 0), 250);
    const other = routePoints(give(-100, 150), take(600, 150), 50);
    const d = harnessPathD(mine, findHops(mine, [other]));
    expect(d).toContain('A6,6 0 0 0');
  });

  it('no hop when the crossing sits within the corner margin', () => {
    const mine = routePoints(give(0, 0), take(500, 40), 250);
    const other = routePoints(give(-100, 30), take(600, 30), 50);
    expect(findHops(mine, [other]).size).toBe(0);
  });
});

describe('routeHarness (lanes + junctions)', () => {
  const family: HarnessWireInput[] = [
    {
      id: 'w1',
      source: give(100, 100),
      target: take(600, 80),
      sourceKey: 'a:text-out',
      targetKey: 'doc',
    },
    {
      id: 'w2',
      source: give(100, 300),
      target: take(600, 106),
      sourceKey: 'b:text-out',
      targetKey: 'doc',
    },
  ];

  it('wires into one target take lanes LANE_GAP apart, in intake order', () => {
    const routed = routeHarness(family);
    const laneOf = (id: string) => {
      const wire = routed.find((candidate) => candidate.id === id)!;
      const vertical = wire.points
        .slice(1)
        .map((point, index) => ({ a: wire.points[index]!, b: point }))
        .find((seg) => Math.abs(seg.a.x - seg.b.x) < 0.01);
      return vertical!.a.x;
    };
    expect(Math.abs(laneOf('w1') - laneOf('w2'))).toBe(LANE_GAP);
  });

  it('one give feeding two takes owns ONE junction dot at the shared stub', () => {
    const shared: HarnessWireInput[] = [
      { ...family[0]!, id: 'j1', sourceKey: 'a:text-out', targetKey: 'doc1' },
      {
        id: 'j2',
        source: give(100, 100),
        target: take(600, 400),
        sourceKey: 'a:text-out',
        targetKey: 'doc2',
      },
    ];
    const routed = routeHarness(shared);
    const junctions = routed.filter((wire) => wire.junction);
    expect(junctions).toHaveLength(1);
    expect(junctions[0]!.junction).toEqual({ x: 100 + STUB, y: 100 });
  });

  it('a lone wire has NO junction (no dot means no relationship)', () => {
    const routed = routeHarness([family[0]!]);
    expect(routed[0]!.junction).toBeUndefined();
  });

  it('golden: the worked two-wire example is byte-stable', () => {
    const routed = routeHarness(golden.input as HarnessWireInput[]);
    expect(routed).toEqual(golden.routed);
  });
});
