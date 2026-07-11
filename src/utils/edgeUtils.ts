import { InternalNode, Position } from '@xyflow/react';

// The four generic BaseNode handles float (the edge attaches wherever the
// route actually leaves the card). Any OTHER handle id (compile slot,
// sequence beat) pins the edge to that exact dot.
export const GENERIC_HANDLES = new Set(['top', 'bottom', 'left', 'right']);

// Does either end of this edge pin to a specific handle (beat/slot)?
export function hasAnchoredHandle(edge: { sourceHandle?: string | null; targetHandle?: string | null }) {
  return Boolean(
    (edge.sourceHandle && !GENERIC_HANDLES.has(edge.sourceHandle)) ||
    (edge.targetHandle && !GENERIC_HANDLES.has(edge.targetHandle))
  );
}

function nodeGeometry(node: InternalNode) {
  const w = node.measured?.width || 250;
  const h = node.measured?.height || 150;
  const x = (node.internals?.positionAbsolute?.x || node.position.x);
  const y = (node.internals?.positionAbsolute?.y || node.position.y);
  return { x, y, w, h, cx: x + w / 2, cy: y + h / 2 };
}

// Boundary intersection of a node's bounding box aimed at an arbitrary point.
// Floating edges use this so the line leaves the card on whichever side
// actually faces where the edge is headed.
export function intersectToward(node: InternalNode, targetX: number, targetY: number) {
  const { w, h, cx, cy } = nodeGeometry(node);
  const dx = targetX - cx;
  const dy = targetY - cy;
  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);

  // Guard against a zero-length vector (self-loop or perfectly overlapping
  // nodes) which would otherwise divide by zero and produce NaN coordinates.
  if (absDx === 0 && absDy === 0) {
    return { x: cx, y: cy, position: Position.Top };
  }

  if (absDx * h > absDy * w) {
    // Intersects left or right
    return {
      x: cx + (Math.sign(dx) * w) / 2,
      y: cy + (dy * w) / (2 * absDx),
      position: dx > 0 ? Position.Right : Position.Left,
    };
  }
  // Intersects top or bottom
  return {
    x: cx + (dx * h) / (2 * absDy),
    y: cy + (Math.sign(dy) * h) / 2,
    position: dy > 0 ? Position.Bottom : Position.Top,
  };
}

// Absolute center of a SPECIFIC handle (compile slot, sequence beat). Returns
// null when the id isn't registered so callers can fall back to floating.
export function getHandleAnchor(
  node: InternalNode,
  type: 'source' | 'target',
  handleId: string | null | undefined
) {
  if (!handleId) return null;
  const bounds = node.internals?.handleBounds?.[type];
  const handle = bounds?.find(h => h.id === handleId);
  if (!handle) return null;
  const { x, y } = nodeGeometry(node);
  return {
    x: x + handle.x + handle.width / 2,
    y: y + handle.y + handle.height / 2,
    position: handle.position,
  };
}

export function getEdgeParams(source: InternalNode, target: InternalNode) {
  const tg = nodeGeometry(target);
  const sg = nodeGeometry(source);
  const sourceIntersection = intersectToward(source, tg.cx, tg.cy);
  const targetIntersection = intersectToward(target, sg.cx, sg.cy);

  return {
    sx: sourceIntersection.x,
    sy: sourceIntersection.y,
    tx: targetIntersection.x,
    ty: targetIntersection.y,
    sourcePos: sourceIntersection.position,
    targetPos: targetIntersection.position,
  };
}
