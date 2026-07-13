// ============================================================================
// LAYOUT MATH -- pure, golden-tested (this regressed repeatedly in v1).
//
// Two jobs:
// - findFreePosition: new nodes NEVER spawn on top of existing nodes (ring
//   search for the nearest clear rect from the requested point).
// - computeAutoHeight: auto-fit height math. Heights are integers so
//   ResizeObserver feedback loops can never oscillate on fractional pixels.
//
// Core computes; the canvas layer measures and applies (I7). Nothing here
// ever runs without an explicit user action (I5) -- these are called when
// the user spawns or types, never on load.
// ============================================================================

export type Rect = { x: number; y: number; width: number; height: number };

/** Overlap test with a clearance gap. Touching at exactly `gap` is NOT overlap. */
export function rectsOverlap(a: Rect, b: Rect, gap = 0): boolean {
  return (
    a.x < b.x + b.width + gap &&
    a.x + a.width + gap > b.x &&
    a.y < b.y + b.height + gap &&
    a.y + a.height + gap > b.y
  );
}

export type FindFreeOptions = {
  /** Clearance kept between rects. */
  gap?: number;
  /** Ring search step in px. */
  step?: number;
  /** Give up after this many rings (then place far right of the desired point). */
  maxRings?: number;
};

/**
 * Nearest clear position for a rect of `size`, starting at `desired`.
 * Deterministic: candidates are visited ring by ring, each ring ordered by
 * distance then clockwise angle from straight up. Same inputs, same output.
 */
export function findFreePosition(
  occupied: readonly Rect[],
  desired: { x: number; y: number },
  size: { width: number; height: number },
  options: FindFreeOptions = {},
): { x: number; y: number } {
  const { gap = 40, step = 80, maxRings = 60 } = options;

  const isFree = (x: number, y: number) =>
    !occupied.some((rect) => rectsOverlap({ x, y, width: size.width, height: size.height }, rect, gap));

  if (isFree(desired.x, desired.y)) {
    return { x: desired.x, y: desired.y };
  }

  for (let ring = 1; ring <= maxRings; ring++) {
    const offsets: { dx: number; dy: number }[] = [];
    for (let i = -ring; i <= ring; i++) {
      for (let j = -ring; j <= ring; j++) {
        if (Math.max(Math.abs(i), Math.abs(j)) === ring) {
          offsets.push({ dx: i * step, dy: j * step });
        }
      }
    }
    offsets.sort((a, b) => {
      const da = a.dx * a.dx + a.dy * a.dy;
      const db = b.dx * b.dx + b.dy * b.dy;
      if (da !== db) return da - db;
      // clockwise from straight up, so spawn preference reads top -> right -> bottom -> left
      const angle = (o: { dx: number; dy: number }) => {
        const raw = Math.atan2(o.dx, -o.dy);
        return raw < 0 ? raw + Math.PI * 2 : raw;
      };
      return angle(a) - angle(b);
    });
    for (const { dx, dy } of offsets) {
      const x = desired.x + dx;
      const y = desired.y + dy;
      if (isFree(x, y)) {
        return { x, y };
      }
    }
  }

  // Pathological density: bail out far to the right of everything near desired.
  const rightmost = occupied.reduce((max, rect) => Math.max(max, rect.x + rect.width), desired.x);
  return { x: rightmost + gap, y: desired.y };
}

export type AutoHeightInput = {
  /** Measured content height in px (fractional allowed -- we round). */
  contentHeight: number;
  /** The type's minimum height (registry spawn height). */
  minHeight: number;
  /**
   * Present once the user has dragged the resizer and taken ownership of the
   * size; auto-fit then never fights them (a Fit action clears it).
   */
  ownedHeight?: number;
};

/**
 * The node's height under the auto-fit policy: grows with content, never
 * below the type minimum, and the user's owned height always wins.
 * Always an integer (fractional heights caused v1's resize oscillation).
 */
export function computeAutoHeight({ contentHeight, minHeight, ownedHeight }: AutoHeightInput): number {
  if (ownedHeight !== undefined) {
    return Math.round(Math.max(ownedHeight, minHeight));
  }
  return Math.round(Math.max(contentHeight, minHeight));
}
