import { useEffect, useState } from 'react';
import { BaseEdge, EdgeProps, getBezierPath, useInternalNode } from '@xyflow/react';
import { getEdgeParams } from '../utils/edgeUtils';
import { useStore } from '../store/useStore';

export function ElasticEdge({
  id,
  source,
  target,
  style = {},
  markerEnd,
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

  const [edgePath] = getBezierPath({
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

  // Interpolate color from default (#4c1d95) to strained red (#ef4444)
  // Base: 76, 29, 149
  // Red: 239, 68, 68
  const r = Math.round(76 + tension * (239 - 76));
  const g = Math.round(29 + tension * (68 - 29));
  const b = Math.round(149 + tension * (68 - 149));
  
  // Thinner stroke as it stretches
  const strokeWidth = Math.max(0.5, 2 - (tension * 1.5));

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
          transition: 'stroke 0.1s ease, stroke-width 0.1s ease'
        }} 
      />
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
    </>
  );
}
