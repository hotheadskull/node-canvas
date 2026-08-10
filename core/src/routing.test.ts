import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { routeHarness, STUB, type HarnessWireInput } from './harness';
import {
  clearLaneX,
  CORRIDOR_MARGIN,
  dodgeObstacles,
  inflate,
  type RoutingRect,
} from './routing';

const golden = JSON.parse(readFileSync(new URL('./routing.golden.json', import.meta.url), 'utf8'));

const give = (x: number, y: number) => ({ x, y, side: 'right' as const });
const take = (x: number, y: number) => ({ x, y, side: 'left' as const });
const rect = (id: string, x: number, y: number, width = 200, height = 120): RoutingRect => ({
  id,
  x,
  y,
  width,
  height,
});

/** True when any segment of the polyline passes through the UNINFLATED rect
 * interior -- the Phase D promise is that this never happens. */
function crossesRect(points: { x: number; y: number }[], target: RoutingRect): boolean {
  const x1 = target.x;
  const y1 = target.y;
  const x2 = target.x + target.width;
  const y2 = target.y + target.height;
  for (let index = 1; index < points.length; index++) {
    const a = points[index - 1]!;
    const b = points[index]!;
    if (Math.abs(a.x - b.x) < 0.01) {
      // vertical
      const yLo = Math.min(a.y, b.y);
      const yHi = Math.max(a.y, b.y);
      if (a.x > x1 && a.x < x2 && yHi > y1 && yLo < y2) return true;
    } else {
      const xLo = Math.min(a.x, b.x);
      const xHi = Math.max(a.x, b.x);
      if (a.y > y1 && a.y < y2 && xHi > x1 && xLo < x2) return true;
    }
  }
  return false;
}

describe('clearLaneX (lanes live in free channels)', () => {
  it('a clear lane stays exactly where it was asked to be', () => {
    expect(clearLaneX(250, 0, 400, [inflate(rect('a', 500, 0))], -1)).toBe(250);
  });

  it('a lane slicing a plate slides past its inflated edge', () => {
    const plate = rect('mid', 200, 100);
    const cleared = clearLaneX(250, 0, 400, [inflate(plate)], -1);
    expect(cleared).toBeLessThanOrEqual(plate.x - CORRIDOR_MARGIN);
  });

  it('pushes rightward when the approach side is right', () => {
    const plate = rect('mid', 200, 100);
    const cleared = clearLaneX(250, 0, 400, [inflate(plate)], 1);
    expect(cleared).toBeGreaterThanOrEqual(plate.x + plate.width + CORRIDOR_MARGIN);
  });

  it('a plate outside the vertical span never moves the lane', () => {
    expect(clearLaneX(250, 0, 90, [inflate(rect('below', 200, 300))], -1)).toBe(250);
  });
});

describe('dodgeObstacles (horizontal runs go around plates)', () => {
  it('a blocked run staircases around the plate and returns to its level', () => {
    const plate = inflate(rect('mid', 200, 100));
    const points = dodgeObstacles(
      [
        { x: 0, y: 160 },
        { x: 500, y: 160 },
      ],
      [plate],
    );
    expect(points.length).toBeGreaterThan(2);
    expect(crossesRect(points, rect('mid', 200, 100))).toBe(false);
    // ends where it started vertically -- the dodge is a detour, not a drift
    expect(points[points.length - 1]).toEqual({ x: 500, y: 160 });
  });

  it('a run that starts inside a plate margin is exempt from that plate (stubs)', () => {
    const own = inflate(rect('own', 0, 100));
    const points = dodgeObstacles(
      [
        { x: 203, y: 160 }, // just inside own's inflated ring
        { x: 500, y: 160 },
      ],
      [own],
    );
    expect(points).toEqual([
      { x: 203, y: 160 },
      { x: 500, y: 160 },
    ]);
  });

  it('a boxed-in run keeps its crossing (a crossing beats a vanished wire)', () => {
    // walls overlap the blocker's inflated edges: no clear pass either side
    const blocker = rect('mid', 200, 100, 200, 120);
    const wallTop = rect('top', 100, -300, 400, 390);
    const wallBottom = rect('bot', 100, 230, 400, 390);
    const before: { x: number; y: number }[] = [
      { x: 0, y: 160 },
      { x: 500, y: 160 },
    ];
    const points = dodgeObstacles(before, [blocker, wallTop, wallBottom].map((r) => inflate(r)));
    expect(points).toEqual(before);
  });
});

describe('routeHarness with obstacles (the corridor pass)', () => {
  it('a lane that would slice an intervening plate routes around it', () => {
    const middle = rect('mid', 380, 60, 160, 300);
    const wires: HarnessWireInput[] = [
      {
        id: 'w1',
        source: give(300, 100),
        target: take(600, 320),
        sourceKey: 'a:out',
        targetKey: 'b:in',
      },
    ];
    const routed = routeHarness(wires, [middle]);
    expect(crossesRect(routed[0]!.points, middle)).toBe(false);
  });

  it('a level wire dodges a plate sitting between its ports', () => {
    const middle = rect('mid', 250, 100, 160, 140);
    const wires: HarnessWireInput[] = [
      {
        id: 'w1',
        source: give(100, 160),
        target: take(700, 160),
        sourceKey: 'a:out',
        targetKey: 'b:in',
      },
    ];
    const routed = routeHarness(wires, [middle]);
    expect(crossesRect(routed[0]!.points, middle)).toBe(false);
  });

  it('no obstacles reproduces the Phase C routing exactly', () => {
    const wires: HarnessWireInput[] = [
      {
        id: 'w1',
        source: give(100, 100),
        target: take(600, 80),
        sourceKey: 'a:out',
        targetKey: 'doc',
      },
    ];
    expect(routeHarness(wires, [])).toEqual(routeHarness(wires));
  });

  it('junction stays at the shared stub even when dodges reshape the path', () => {
    const middle = rect('mid', 300, 150, 160, 200);
    const wires: HarnessWireInput[] = [
      {
        id: 'j1',
        source: give(100, 100),
        target: take(700, 120),
        sourceKey: 'a:out',
        targetKey: 'doc1',
      },
      {
        id: 'j2',
        source: give(100, 100),
        target: take(700, 420),
        sourceKey: 'a:out',
        targetKey: 'doc2',
      },
    ];
    const routed = routeHarness(wires, [middle]);
    const junctions = routed.filter((wire) => wire.junction);
    expect(junctions).toHaveLength(1);
    expect(junctions[0]!.junction).toEqual({ x: 100 + STUB, y: 100 });
  });

  it('golden: the corridor scenario is byte-stable', () => {
    const routed = routeHarness(
      golden.input as HarnessWireInput[],
      golden.obstacles as RoutingRect[],
    );
    expect(routed).toEqual(golden.routed);
  });
});
