// ============================================================================
// THE HARNESS -- orthogonal wire routing (Observatory spec §4).
//
// Wires are orthogonal with 45° chamfers, never curves and never hard right
// angles: stub out flat, chamfer over exactly 10px, travel vertically in a
// lane, chamfer in, stub into the target. Lanes are spaced 14px. Where a
// vertical run crosses another wire's horizontal run, the vertical draws a
// semicircular hop. One give feeding several takes shares a stub and splits
// at a junction dot -- no dot means no relationship.
//
// This module is PURE GEOMETRY (I7): callers supply pixel anchors. Corridor
// derivation (Phase D) lives in routing.ts: pass node rects as `obstacles`
// and lanes slide into free channels, horizontal runs dodge plates.
// ============================================================================

import { clearLaneX, dodgeObstacles, inflate, type RoutingRect } from './routing';

export type HarnessPoint = { x: number; y: number };

export type HarnessEndpoint = {
  x: number;
  y: number;
  /** Which edge of the node the port sits on. */
  side: 'left' | 'right';
};

export type HarnessWireInput = {
  id: string;
  source: HarnessEndpoint;
  target: HarnessEndpoint;
  /** Group key for junctions: wires sharing a source port share a stub. */
  sourceKey: string;
  /** Group key for lanes: wires into one target stack 14px apart. */
  targetKey: string;
};

export type HarnessWire = {
  id: string;
  d: string;
  points: HarnessPoint[];
  labelX: number;
  labelY: number;
  /** Present on the FIRST wire of a shared-stub group: draw the split dot. */
  junction?: HarnessPoint;
};

export const STUB = 12;
export const CHAMFER = 10;
export const LANE_GAP = 14;
/** How far short of the target column the default lane sits (pre-Phase-D). */
const LANE_MARGIN = 26;
const HOP_RADIUS = 6;

/** Direction a stub leaves/enters a port. */
function stubSign(side: 'left' | 'right'): number {
  return side === 'right' ? 1 : -1;
}

/**
 * The orthogonal skeleton: source stub, horizontal run to the lane,
 * vertical travel, horizontal run into the target stub. Degenerate runs
 * (already level, or lane collinear) collapse to fewer points.
 */
export function routePoints(
  source: HarnessEndpoint,
  target: HarnessEndpoint,
  laneX: number,
): HarnessPoint[] {
  // Stubs extend AWAY from their node edge: right-side ports stub to +x,
  // left-side ports to -x -- the same sign rule at both ends.
  const start = { x: source.x, y: source.y };
  const stubOut = { x: source.x + stubSign(source.side) * STUB, y: source.y };
  const stubIn = { x: target.x + stubSign(target.side) * STUB, y: target.y };
  const end = { x: target.x, y: target.y };

  const points: HarnessPoint[] = [start, stubOut];
  if (Math.abs(source.y - target.y) < 0.5) {
    // already level: one straight run
    points.push(stubIn, end);
  } else {
    points.push({ x: laneX, y: source.y });
    points.push({ x: laneX, y: target.y });
    points.push(stubIn, end);
  }
  // drop consecutive duplicates (collinear collapses happen naturally)
  return points.filter(
    (point, index) =>
      index === 0 ||
      Math.abs(point.x - points[index - 1]!.x) > 0.01 ||
      Math.abs(point.y - points[index - 1]!.y) > 0.01,
  );
}

type Segment = { a: HarnessPoint; b: HarnessPoint };

function isVertical(seg: Segment): boolean {
  return Math.abs(seg.a.x - seg.b.x) < 0.01;
}

function segments(points: HarnessPoint[]): Segment[] {
  const list: Segment[] = [];
  for (let index = 1; index < points.length; index++) {
    list.push({ a: points[index - 1]!, b: points[index]! });
  }
  return list;
}

/**
 * Crossings where THIS wire's vertical runs cross OTHER wires' horizontal
 * runs (verticals hop horizontals, never the reverse). Returns crossing ys
 * per vertical segment index.
 */
export function findHops(
  points: HarnessPoint[],
  others: HarnessPoint[][],
): Map<number, number[]> {
  const hops = new Map<number, number[]>();
  const mine = segments(points);
  mine.forEach((seg, segIndex) => {
    if (!isVertical(seg)) return;
    const x = seg.a.x;
    const yLo = Math.min(seg.a.y, seg.b.y);
    const yHi = Math.max(seg.a.y, seg.b.y);
    const ys: number[] = [];
    for (const other of others) {
      for (const otherSeg of segments(other)) {
        if (isVertical(otherSeg)) continue;
        const y = otherSeg.a.y;
        const xLo = Math.min(otherSeg.a.x, otherSeg.b.x);
        const xHi = Math.max(otherSeg.a.x, otherSeg.b.x);
        // strict interior crossings only -- endpoints touching is a junction
        // question, not a hop. The margin clears both the hop radius and the
        // chamfer cut so an arc can never be emitted past a corner.
        const margin = HOP_RADIUS + CHAMFER;
        if (y > yLo + margin && y < yHi - margin && x > xLo + 0.5 && x < xHi - 0.5) {
          ys.push(y);
        }
      }
    }
    if (ys.length > 0) {
      // de-dup near-identical crossings, sort along travel direction
      const unique = [...new Set(ys.map((y) => Math.round(y)))];
      unique.sort((a, b) => (seg.b.y > seg.a.y ? a - b : b - a));
      hops.set(segIndex, unique);
    }
  });
  return hops;
}

/** Clamp the chamfer cut so short segments never invert. */
function cutFor(prev: HarnessPoint, corner: HarnessPoint, next: HarnessPoint): number {
  const inLen = Math.abs(corner.x - prev.x) + Math.abs(corner.y - prev.y);
  const outLen = Math.abs(next.x - corner.x) + Math.abs(next.y - corner.y);
  return Math.min(CHAMFER, inLen / 2, outLen / 2);
}

function toward(from: HarnessPoint, to: HarnessPoint, distance: number): HarnessPoint {
  const dx = Math.sign(to.x - from.x);
  const dy = Math.sign(to.y - from.y);
  return { x: from.x + dx * distance, y: from.y + dy * distance };
}

/**
 * Emit the SVG path: 45° chamfers at every corner, semicircular hops on
 * vertical runs (sweep 1 travelling down, 0 travelling up -- spec §4).
 */
export function harnessPathD(points: HarnessPoint[], hops: Map<number, number[]>): string {
  if (points.length < 2) return '';
  const fmt = (value: number) => (Math.round(value * 100) / 100).toString();
  let d = `M${fmt(points[0]!.x)},${fmt(points[0]!.y)}`;

  const emitLineTo = (point: HarnessPoint) => {
    d += ` L${fmt(point.x)},${fmt(point.y)}`;
  };
  const emitVerticalWithHops = (from: HarnessPoint, to: HarnessPoint, ys: number[]) => {
    const down = to.y > from.y;
    const sweep = down ? 1 : 0;
    for (const y of ys) {
      const before = down ? y - HOP_RADIUS : y + HOP_RADIUS;
      const after = down ? y + HOP_RADIUS : y - HOP_RADIUS;
      d += ` L${fmt(from.x)},${fmt(before)}`;
      d += ` A${HOP_RADIUS},${HOP_RADIUS} 0 0 ${sweep} ${fmt(from.x)},${fmt(after)}`;
    }
    emitLineTo(to);
  };

  for (let index = 1; index < points.length; index++) {
    const prev = points[index - 1]!;
    const here = points[index]!;
    const next = points[index + 1];
    const segHops = hops.get(index - 1) ?? [];
    const vertical = Math.abs(here.x - prev.x) < 0.01;

    // where this segment actually ENDS: short of the corner by the chamfer
    const endPoint = next ? toward(here, prev, cutFor(prev, here, next)) : here;

    if (vertical && segHops.length > 0) {
      emitVerticalWithHops(prev, endPoint, segHops);
    } else {
      emitLineTo(endPoint);
    }
    // the chamfer line into the NEXT segment's start
    if (next) {
      const startNext = toward(here, next, cutFor(prev, here, next));
      emitLineTo(startNext);
      points[index] = startNext; // next iteration measures from the cut point
    }
  }
  return d;
}

/**
 * Route a family of wires together: lanes assigned per target (14px apart,
 * in input order = intake order), hops computed across the family, junction
 * dots where a shared source port splits.
 */
export function routeHarness(
  wires: HarnessWireInput[],
  obstacles: RoutingRect[] = [],
): HarnessWire[] {
  const inflated = obstacles.map((rect) => inflate(rect));
  // lane per (targetKey): base lane short of the target column, stepping
  // LANE_GAP per additional inbound wire
  const laneIndex = new Map<string, number>();
  const skeletons = wires.map((wire) => {
    const index = laneIndex.get(wire.targetKey) ?? 0;
    laneIndex.set(wire.targetKey, index + 1);
    // The lane sits on the APPROACH side of the target stub, LANE_MARGIN
    // short of it, stepping LANE_GAP further out per additional inbound
    // wire (input order = intake order, so lane order reads as wire order).
    const sign = stubSign(wire.target.side) as -1 | 1;
    const targetStubX = wire.target.x + sign * STUB;
    let laneX = targetStubX + sign * (LANE_MARGIN + index * LANE_GAP);
    if (inflated.length > 0 && Math.abs(wire.source.y - wire.target.y) >= 0.5) {
      // Phase D: the lane slides outward into the nearest free channel --
      // a vertical run may never slice through a plate. Later lanes start
      // beyond earlier ones (index step), so cleared lanes stay distinct.
      laneX = clearLaneX(laneX, wire.source.y, wire.target.y, inflated, sign);
    }
    let points = routePoints(wire.source, wire.target, laneX);
    if (inflated.length > 0) points = dodgeObstacles(points, inflated);
    return { wire, points };
  });

  // junctions: 2+ wires sharing a source port split at the shared stub end
  const bySource = new Map<string, number[]>();
  skeletons.forEach((entry, index) => {
    const list = bySource.get(entry.wire.sourceKey) ?? [];
    list.push(index);
    bySource.set(entry.wire.sourceKey, list);
  });

  return skeletons.map((entry, index) => {
    const others = skeletons.filter((_, otherIndex) => otherIndex !== index).map((other) => other.points);
    const hops = findHops(entry.points, others);
    // label rides the LONGEST vertical run's midpoint (the main lane --
    // dodge staircases add short verticals that must not steal it), or the
    // path middle when level
    const verticalSeg = segments(entry.points)
      .filter((seg) => isVertical(seg))
      .sort((a, b) => Math.abs(b.b.y - b.a.y) - Math.abs(a.b.y - a.a.y))[0];
    const labelPoint = verticalSeg
      ? { x: verticalSeg.a.x, y: (verticalSeg.a.y + verticalSeg.b.y) / 2 }
      : entry.points[Math.floor(entry.points.length / 2)]!;
    const group = bySource.get(entry.wire.sourceKey) ?? [];
    const isJunctionOwner = group.length > 1 && group[0] === index;
    // the shared stub's end, computed from the INPUT (dodges can insert
    // points, so points[1] is not guaranteed to be the stub tip)
    const stubEnd = {
      x: entry.wire.source.x + stubSign(entry.wire.source.side) * STUB,
      y: entry.wire.source.y,
    };
    return {
      id: entry.wire.id,
      d: harnessPathD(entry.points.map((point) => ({ ...point })), hops),
      points: entry.points,
      labelX: labelPoint.x,
      labelY: labelPoint.y,
      ...(isJunctionOwner ? { junction: { x: stubEnd.x, y: stubEnd.y } } : {}),
    };
  });
}
