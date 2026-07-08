import { InternalNode, Position } from '@xyflow/react';

// Returns the parameters (sx, sy, tx, ty, position) for a line connecting two nodes by computing bounding box intersections
function getIntersection(nodeA: InternalNode, nodeB: InternalNode) {
  const w = nodeA.measured?.width || 250;
  const h = nodeA.measured?.height || 150;
  
  const x = (nodeA.internals?.positionAbsolute?.x || nodeA.position.x) + w / 2;
  const y = (nodeA.internals?.positionAbsolute?.y || nodeA.position.y) + h / 2;

  const targetW = nodeB.measured?.width || 250;
  const targetH = nodeB.measured?.height || 150;

  const targetX = (nodeB.internals?.positionAbsolute?.x || nodeB.position.x) + targetW / 2;
  const targetY = (nodeB.internals?.positionAbsolute?.y || nodeB.position.y) + targetH / 2;

  const dx = targetX - x;
  const dy = targetY - y;
  
  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);
  
  let intersectionX = x;
  let intersectionY = y;
  let position: Position;

  if (absDx * h > absDy * w) {
    // Intersects left or right
    intersectionX = x + (Math.sign(dx) * w) / 2;
    intersectionY = y + (dy * w) / (2 * absDx);
    position = dx > 0 ? Position.Right : Position.Left;
  } else {
    // Intersects top or bottom
    intersectionY = y + (Math.sign(dy) * h) / 2;
    intersectionX = x + (dx * h) / (2 * absDy);
    position = dy > 0 ? Position.Bottom : Position.Top;
  }

  return { x: intersectionX, y: intersectionY, position };
}

export function getEdgeParams(source: InternalNode, target: InternalNode) {
  const sourceIntersection = getIntersection(source, target);
  const targetIntersection = getIntersection(target, source);

  return {
    sx: sourceIntersection.x,
    sy: sourceIntersection.y,
    tx: targetIntersection.x,
    ty: targetIntersection.y,
    sourcePos: sourceIntersection.position,
    targetPos: targetIntersection.position,
  };
}
