import { useEffect, useState } from 'react';
import { BaseEdge, EdgeLabelRenderer, EdgeProps, getBezierPath, useInternalNode } from '@xyflow/react';
import { getEdgeParams } from '../utils/edgeUtils';
import { useStore } from '../store/useStore';

export function ElasticEdge({
  id,
  source,
  target,
  style = {},
  markerEnd,
  label,
  data,
}: EdgeProps) {
  const sourceNode = useInternalNode(source);
  const targetNode = useInternalNode(target);

  const [isBroken, setIsBroken] = useState(false);
  const onEdgesChange = useStore(state => state.onEdgesChange);

  if (!sourceNode || !targetNode) {
    return null;
  }

  // Floating edge dynamic coordinates
  const { sx, sy, tx, ty, sourcePos, targetPos } = getEdgeParams(sourceNode, targetNode);

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX: sx,
    sourceY: sy,
    sourcePosition: sourcePos,
    targetX: tx,
    targetY: ty,
    targetPosition: targetPos,
  });

  // Calculate Euclidean distance between source and target
  const distance = Math.hypot(tx - sx, ty - sy);

  // Physics parameters
  const MAX_STRETCH = 800; // Snap distance
  const TENSION_START = 400; // Distance where it starts turning red

  useEffect(() => {
    if (distance > MAX_STRETCH && !isBroken) {
      setIsBroken(true);
      // Snap! Disconnect the edge automatically
      onEdgesChange([{ type: 'remove', id }]);
    }
  }, [distance, id, isBroken, onEdgesChange]);

  if (isBroken) {
    return null; // Don't render if it snapped this frame
  }

  // Calculate tension percentage (0 to 1)
  const tension = Math.max(0, Math.min(1, (distance - TENSION_START) / (MAX_STRETCH - TENSION_START)));

  // Interpolate color from Art Deco gold (#8c734b) to strained red (#ef4444)
  // Base: 140, 115, 75
  // Red: 239, 68, 68
  const r = Math.round(140 + tension * (239 - 140));
  const g = Math.round(115 + tension * (68 - 115));
  const b = Math.round(75 + tension * (68 - 75));

  // Link strength: how often the connection has been "used" (title mentions).
  // Strong links render thicker so load-bearing relationships stand out.
  const strength = (data as any)?.strength || 1;
  const baseWidth = Math.min(2 + (strength - 1) * 0.6, 4.5);

  // Constellation hover mode set by App: 'lit' edges belong to the hovered
  // node's web, 'dim' edges fade into the background.
  const constellation = (data as any)?.constellation as 'lit' | 'dim' | undefined;
  const dimOpacity = constellation === 'dim' ? 0.06 : 1;

  // Thinner stroke as it stretches
  const strokeWidth = Math.max(0.5, baseWidth - (tension * 1.5));

  return (
    <>
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        className="edge-energy"
        style={{
          ...style,
          stroke: `rgb(${r}, ${g}, ${b})`,
          strokeWidth,
          opacity: dimOpacity,
          transition: 'stroke 0.1s ease, stroke-width 0.1s ease, opacity 0.25s ease'
        }}
      />
      {/* Strong links get a soft golden aura so heavily-referenced
          relationships visibly glow on the canvas */}
      {strength >= 3 && constellation !== 'dim' && (
        <BaseEdge
          path={edgePath}
          style={{
            stroke: 'rgba(240, 192, 80, 0.35)',
            strokeWidth: strokeWidth + 3,
            filter: 'blur(3px)',
          }}
        />
      )}
      {/* Constellation highlight: the hovered node's web glows */}
      {constellation === 'lit' && (
        <BaseEdge
          path={edgePath}
          style={{
            stroke: 'rgba(255, 214, 102, 0.45)',
            strokeWidth: strokeWidth + 4,
            filter: 'blur(4px)',
          }}
        />
      )}
      {/* If it's highly tense, add a glowing under-layer to show stress */}
      {tension > 0.5 && (
        <BaseEdge
          path={edgePath}
          style={{
            stroke: 'rgba(239, 68, 68, 0.4)',
            strokeWidth: strokeWidth + 4,
            filter: 'blur(4px)',
          }}
        />
      )}
      {/* Named relationship label (double-click an edge to set one) */}
      {label ? (
        <EdgeLabelRenderer>
          <div
            className="edge-label nodrag nopan"
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              opacity: dimOpacity,
            }}
          >
            {String(label)}
          </div>
        </EdgeLabelRenderer>
      ) : null}
    </>
  );
}
