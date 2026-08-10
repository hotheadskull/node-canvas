// ============================================================================
// CORRIDORS -- routing wires through FREE SPACE (Observatory spec §4).
//
// "Corridors are derived, not authored": inflate every node rect by a
// margin; the space that remains is where wires may travel. This module is
// the obstacle side of the harness -- harness.ts owns the wire geometry
// (stubs, chamfers, lanes, hops) and asks these helpers two questions:
//
//   1. clearLaneX  -- where may this wire's vertical lane actually sit?
//      The desired lane (target order, 14px steps) is pushed outward, past
//      any plate it would slice through, into the nearest clear channel.
//   2. dodgeObstacles -- do this wire's horizontal runs cross a plate?
//      Each blocked run detours around the plate (staircase over its top
//      or bottom edge, whichever is nearer), checked against the other
//      obstacles so a dodge never trades one crossing for another.
//
// A rect is NEVER an obstacle for a segment that starts or ends inside it:
// port anchors live inside their own plate's inflated ring, so the stub
// legitimately leaves through it -- and a dodge would be impossible anyway.
//
// Pure TypeScript, pure geometry (I7). Failure mode is graceful: when no
// clear route exists the original segment stands (a crossing wire beats a
// disappeared one).
// ============================================================================

export type RoutingRect = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type InflatedRect = { x1: number; y1: number; x2: number; y2: number };

/** How far a wire keeps clear of every plate edge. */
export const CORRIDOR_MARGIN = 8;
/** Safety cap: a lane gives up sliding after this many pushes. */
const MAX_PUSHES = 24;
/** Safety cap on dodges per horizontal run. */
const MAX_DODGES = 12;

export function inflate(rect: RoutingRect, margin: number = CORRIDOR_MARGIN): InflatedRect {
  return {
    x1: rect.x - margin,
    y1: rect.y - margin,
    x2: rect.x + rect.width + margin,
    y2: rect.y + rect.height + margin,
  };
}

type Point = { x: number; y: number };

function contains(rect: InflatedRect, point: Point): boolean {
  return point.x > rect.x1 && point.x < rect.x2 && point.y > rect.y1 && point.y < rect.y2;
}

/** Rects blocking a VERTICAL run at `x` spanning [yLo, yHi]. */
function verticalBlockers(
  rects: InflatedRect[],
  x: number,
  yLo: number,
  yHi: number,
): InflatedRect[] {
  return rects.filter(
    (rect) => x > rect.x1 && x < rect.x2 && yHi > rect.y1 && yLo < rect.y2,
  );
}

/** Rects blocking a HORIZONTAL run at `y` spanning [xLo, xHi]. */
function horizontalBlockers(
  rects: InflatedRect[],
  y: number,
  xLo: number,
  xHi: number,
): InflatedRect[] {
  return rects.filter(
    (rect) => y > rect.y1 && y < rect.y2 && xHi > rect.x1 && xLo < rect.x2,
  );
}

/**
 * Slide a lane's x outward (in `pushDir`: -1 left, +1 right) until its
 * vertical run [yLo, yHi] sits in free space. NO rect is exempt here: a
 * lane's endpoints join horizontal runs, never ports, so a lane inside any
 * plate -- its own source included -- is always wrong.
 */
export function clearLaneX(
  desiredX: number,
  yLo: number,
  yHi: number,
  obstacles: InflatedRect[],
  pushDir: -1 | 1,
): number {
  const lo = Math.min(yLo, yHi);
  const hi = Math.max(yLo, yHi);
  let x = desiredX;
  for (let push = 0; push < MAX_PUSHES; push++) {
    const blockers = verticalBlockers(obstacles, x, lo, hi);
    if (blockers.length === 0) return x;
    // step past the FURTHEST blocking edge in the push direction, so one
    // push clears every rect the lane currently slices
    x =
      pushDir === 1
        ? Math.max(...blockers.map((rect) => rect.x2)) + 2
        : Math.min(...blockers.map((rect) => rect.x1)) - 2;
  }
  return x;
}

/**
 * Walk an orthogonal polyline; every horizontal run that crosses a plate
 * detours around it (over the nearer of top/bottom, verified clear). Rects
 * containing a run's start or end are exempt for that run -- stubs leave
 * through their own plate's margin by construction.
 */
export function dodgeObstacles(points: Point[], obstacles: InflatedRect[]): Point[] {
  if (obstacles.length === 0 || points.length < 2) return points;
  const out: Point[] = [points[0]!];

  for (let index = 1; index < points.length; index++) {
    const from = out[out.length - 1]!;
    const to = points[index]!;
    const horizontal = Math.abs(to.y - from.y) < 0.01 && Math.abs(to.x - from.x) > 0.01;
    if (!horizontal) {
      out.push(to);
      continue;
    }
    const exempt = (rect: InflatedRect) => contains(rect, from) || contains(rect, to);
    const relevant = obstacles.filter((rect) => !exempt(rect));
    const dir = Math.sign(to.x - from.x);
    let cursor = { ...from };
    for (let dodge = 0; dodge < MAX_DODGES; dodge++) {
      const blockers = horizontalBlockers(
        relevant,
        cursor.y,
        Math.min(cursor.x, to.x),
        Math.max(cursor.x, to.x),
      );
      if (blockers.length === 0) break;
      // nearest blocker along travel
      const next = blockers.reduce((best, rect) =>
        dir > 0
          ? (rect.x1 < best.x1 ? rect : best)
          : (rect.x2 > best.x2 ? rect : best),
      );
      const xStop = dir > 0 ? next.x1 : next.x2;
      const xExit = dir > 0 ? next.x2 : next.x1;
      // choose the pass side: nearer edge first, other side as fallback;
      // both the vertical drop and the horizontal pass must be clear
      const sides = [next.y1, next.y2].sort(
        (a, b) => Math.abs(a - cursor.y) - Math.abs(b - cursor.y),
      );
      const clearSide = sides.find(
        (yPass) =>
          verticalBlockers(relevant, xStop, Math.min(cursor.y, yPass), Math.max(cursor.y, yPass))
            .length === 0 &&
          horizontalBlockers(relevant, yPass, Math.min(xStop, xExit), Math.max(xStop, xExit))
            .length === 0 &&
          verticalBlockers(relevant, xExit, Math.min(yPass, cursor.y), Math.max(yPass, cursor.y))
            .length === 0,
      );
      if (clearSide === undefined) break; // boxed in: the crossing stands
      out.push({ x: xStop, y: cursor.y });
      out.push({ x: xStop, y: clearSide });
      out.push({ x: xExit, y: clearSide });
      out.push({ x: xExit, y: cursor.y });
      cursor = { x: xExit, y: cursor.y };
    }
    out.push(to);
  }
  // collapse consecutive duplicates the dodge may have introduced
  return out.filter(
    (point, index) =>
      index === 0 ||
      Math.abs(point.x - out[index - 1]!.x) > 0.01 ||
      Math.abs(point.y - out[index - 1]!.y) > 0.01,
  );
}
