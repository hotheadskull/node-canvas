// SMART EDGE ROUTING: edges used to be plain beziers that plowed straight
// under whatever sat between their endpoints -- three stacked nodes made the
// top-to-bottom connection look like it attached to the middle one. This
// module detects nodes crossing the edge's straight line and bows the curve
// smoothly around them.
//
// Deliberately NOT grid/A* pathfinding: that costs too much while dragging.
// One perpendicular detour waypoint per (merged) obstacle, smoothed with
// Catmull-Rom, is cheap and reads well at canvas zoom levels.

export interface ObstacleRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface NodeRectEntry {
  id: string;
  type: string | undefined;
  rect: ObstacleRect;
}

// Liang-Barsky segment/rect intersection.
function segmentIntersectsRect(
  x1: number, y1: number, x2: number, y2: number, r: ObstacleRect
): boolean {
  let t0 = 0;
  let t1 = 1;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const p = [-dx, dx, -dy, dy];
  const q = [x1 - r.x, r.x + r.w - x1, y1 - r.y, r.y + r.h - y1];
  for (let i = 0; i < 4; i++) {
    if (p[i] === 0) {
      if (q[i] < 0) return false;
      continue;
    }
    const t = q[i] / p[i];
    if (p[i] < 0) {
      if (t > t1) return false;
      if (t > t0) t0 = t;
    } else {
      if (t < t0) return false;
      if (t < t1) t1 = t;
    }
  }
  return true;
}

function rectContains(r: ObstacleRect, x: number, y: number): boolean {
  return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
}

// Store nodes hold parent-RELATIVE positions for group children; edges work
// in absolute space, so walk the parent chain. Cached per nodes-array
// reference: every edge rendered in the same frame shares one computation.
const rectCache = new WeakMap<object, NodeRectEntry[]>();

export function absoluteNodeRects(nodes: any[]): NodeRectEntry[] {
  const cached = rectCache.get(nodes);
  if (cached) return cached;

  const byId = new Map(nodes.map(n => [n.id, n]));
  const out: NodeRectEntry[] = nodes.map(n => {
    let x = n.position.x;
    let y = n.position.y;
    let pid = n.parentId;
    let guard = 0;
    while (pid && guard++ < 20) {
      const parent = byId.get(pid);
      if (!parent) break;
      x += parent.position.x;
      y += parent.position.y;
      pid = parent.parentId;
    }
    const wRaw = n.measured?.width ?? n.style?.width ?? n.width;
    const hRaw = n.measured?.height ?? n.style?.height ?? n.height;
    const w = Number(wRaw);
    const h = Number(hRaw);
    return {
      id: n.id,
      type: n.type,
      rect: {
        x,
        y,
        w: Number.isFinite(w) && w > 0 ? w : 250,
        h: Number.isFinite(h) && h > 0 ? h : 150,
      },
    };
  });
  rectCache.set(nodes, out);
  return out;
}

// Returns a smooth SVG path from (sx,sy) to (tx,ty) that bows around the
// given obstacles, or null when nothing blocks the straight line (caller
// falls back to the normal bezier).
export function getAvoidingPath(
  sx: number, sy: number, tx: number, ty: number,
  obstacles: ObstacleRect[],
  clearance = 28
): { path: string; labelX: number; labelY: number; points: [number, number][] } | null {
  const dx = tx - sx;
  const dy = ty - sy;
  const len = Math.hypot(dx, dy);
  if (len < 40) return null;
  const ux = dx / len;
  const uy = dy / len;
  // Perpendicular unit vector; detours push along +/- this direction.
  const px = -uy;
  const py = ux;

  // Each hit is an INTERVAL [t1, t2] along the line (the obstacle's entry
  // and exit, plus clearance), not a single center point -- one waypoint at
  // the center makes the curve reach full clearance only there and clip the
  // obstacle's corners on the way in and out.
  const hits: { t1: number; t2: number; offset: number }[] = [];
  for (const r of obstacles) {
    // An obstacle overlapping an endpoint can't be detoured around -- the
    // edge legitimately starts/ends there (overlapping cards, etc.).
    if (rectContains(r, sx, sy) || rectContains(r, tx, ty)) continue;
    const g = clearance / 2;
    const inflated = { x: r.x - g, y: r.y - g, w: r.w + clearance, h: r.h + clearance };
    if (!segmentIntersectsRect(sx, sy, tx, ty, inflated)) continue;

    // Project the rect's corners onto the line (along) and its normal
    // (perpendicular): the along-range gives the detour interval, the
    // perpendicular reach tells us how far each side must bow.
    let minA = Infinity;
    let maxA = -Infinity;
    let minD = Infinity;
    let maxD = -Infinity;
    const corners = [
      [r.x, r.y], [r.x + r.w, r.y], [r.x, r.y + r.h], [r.x + r.w, r.y + r.h],
    ];
    for (const [X, Y] of corners) {
      const a = (X - sx) * ux + (Y - sy) * uy;
      const d = (X - sx) * px + (Y - sy) * py;
      if (a < minA) minA = a;
      if (a > maxA) maxA = a;
      if (d < minD) minD = d;
      if (d > maxD) maxD = d;
    }
    const t1 = Math.max((minA - clearance) / len, 0.04);
    const t2 = Math.min((maxA + clearance) / len, 0.96);
    // Hugging an endpoint: bowing there would kink the arrival angle.
    if (t2 <= t1) continue;

    const leftReq = maxD + clearance;
    const rightReq = -minD + clearance;
    hits.push({ t1, t2, offset: leftReq <= rightReq ? leftReq : -rightReq });
  }
  if (hits.length === 0) return null;

  hits.sort((a, b) => a.t1 - b.t1);

  // Merge intervals that are close along the line and bow the same way, so a
  // run of stacked obstacles gets ONE clean arc instead of a per-node wobble.
  const MERGE_DIST = 140;
  const merged: { t1: number; t2: number; offset: number }[] = [];
  for (const h of hits) {
    const last = merged[merged.length - 1];
    if (last && Math.sign(last.offset) === Math.sign(h.offset) && (h.t1 - last.t2) * len < MERGE_DIST) {
      last.t2 = Math.max(last.t2, h.t2);
      if (Math.abs(h.offset) > Math.abs(last.offset)) last.offset = h.offset;
    } else {
      merged.push({ ...h });
    }
  }

  const wp = (t: number, offset: number): [number, number] =>
    [sx + dx * t + px * offset, sy + dy * t + py * offset];
  const pts: [number, number][] = [[sx, sy]];
  for (const h of merged) {
    // Short intervals collapse to a single apex; longer ones get entry and
    // exit waypoints so the path stays clear along the obstacle's full span.
    if ((h.t2 - h.t1) * len < 60) {
      pts.push(wp((h.t1 + h.t2) / 2, h.offset));
    } else {
      pts.push(wp(h.t1, h.offset), wp(h.t2, h.offset));
    }
  }
  pts.push([tx, ty]);

  // Catmull-Rom through the waypoints, emitted as cubic beziers -- one
  // continuous flowing curve rather than straight elbows.
  let path = `M ${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    path += ` C ${c1x},${c1y} ${c2x},${c2y} ${p2[0]},${p2[1]}`;
  }

  // Label rides the bowed midpoint so it never sits on top of the obstacle
  // the curve just dodged.
  const mid = merged[Math.floor((merged.length - 1) / 2)];
  const midT = (mid.t1 + mid.t2) / 2;
  return {
    path,
    labelX: sx + dx * midT + px * mid.offset,
    labelY: sy + dy * midT + py * mid.offset,
    points: pts,
  };
}
