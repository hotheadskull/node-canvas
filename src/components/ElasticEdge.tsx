import { BaseEdge, EdgeLabelRenderer, EdgeProps, useInternalNode } from '@xyflow/react';
import { getEdgeParams } from '../utils/edgeUtils';
import { useStore } from '../store/useStore';
import { EDGE_TYPES, edgeTypeOf } from '../utils/edgeTypes';

export function ElasticEdge({
  id,
  source,
  target,
  style = {},
  markerEnd,
  label,
  data,
  selected,
}: EdgeProps) {
  const sourceNode = useInternalNode(source);
  const targetNode = useInternalNode(target);
  const updateEdgeLabel = useStore(state => state.updateEdgeLabel);
  const updateEdgeType = useStore(state => state.updateEdgeType);

  if (!sourceNode || !targetNode) {
    return null;
  }

  // Floating edge dynamic coordinates
  const { sx, sy, tx, ty } = getEdgeParams(sourceNode, targetNode);

  // Calculate Euclidean distance between source and target
  const distance = Math.hypot(tx - sx, ty - sy);

  // Physics parameters. Edges no longer snap/delete at distance -- silently
  // destroying a connection on a far drag was a footgun. Tension visuals
  // (color shift, thinning) still communicate the stretch.
  const MAX_STRETCH = 800;
  const TENSION_START = 400; // Distance where it starts turning red

  // FAN-OUT: each edge bows by a small, stable offset derived from its id so
  // several edges converging on a busy node separate instead of knotting.
  const idHash = id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const bow = ((idHash % 7) - 3) * 9; // -27..27px perpendicular offset
  const nx = distance > 0 ? -(ty - sy) / distance : 0; // unit perpendicular
  const ny = distance > 0 ? (tx - sx) / distance : 0;
  const cx = (sx + tx) / 2 + nx * bow;
  const cy = (sy + ty) / 2 + ny * bow;
  const edgePath = `M ${sx},${sy} Q ${cx},${cy} ${tx},${ty}`;
  // Quadratic bezier midpoint (t = 0.5) for the label/editor position
  const labelX = 0.25 * sx + 0.5 * cx + 0.25 * tx;
  const labelY = 0.25 * sy + 0.5 * cy + 0.25 * ty;

  // Calculate tension percentage (0 to 1)
  const tension = Math.max(0, Math.min(1, (distance - TENSION_START) / (MAX_STRETCH - TENSION_START)));

  // Interpolate color from Art Deco gold (#8c734b) to strained red (#ef4444)
  // Base: 140, 115, 75
  // Red: 239, 68, 68
  const r = Math.round(140 + tension * (239 - 140));
  const g = Math.round(115 + tension * (68 - 115));
  const b = Math.round(75 + tension * (68 - 75));

  // Relationship type drives base color + dash; the default 'references'
  // type keeps the classic gold that shifts red under tension.
  const edgeType = edgeTypeOf(data);
  const typeDef = EDGE_TYPES[edgeType];
  const stroke = edgeType === 'references' ? `rgb(${r}, ${g}, ${b})` : typeDef.color;

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
          stroke,
          strokeWidth,
          strokeDasharray: typeDef.dash,
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
      {/* Constellation highlight: the hovered node's web glows, and a pulse
          of light travels along the lit connections */}
      {constellation === 'lit' && (
        <>
          <BaseEdge
            path={edgePath}
            style={{
              stroke: 'rgba(255, 214, 102, 0.45)',
              strokeWidth: strokeWidth + 4,
              filter: 'blur(4px)',
            }}
          />
          <BaseEdge
            path={edgePath}
            className="edge-pulse"
            style={{
              stroke: '#ffd666',
              strokeWidth: Math.max(1.5, strokeWidth),
            }}
          />
        </>
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

      {/* Selected: inline editor for relationship type + freeform label.
          Otherwise: show the label pill if one is set. */}
      {selected ? (
        <EdgeLabelRenderer>
          <div
            className="edge-editor nodrag nopan"
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            }}
          >
            <select
              value={edgeType}
              onChange={(e) => updateEdgeType(id, e.target.value)}
              onPointerDown={(e) => e.stopPropagation()}
              style={{ color: typeDef.color }}
            >
              {Object.entries(EDGE_TYPES).map(([key, def]) => (
                <option key={key} value={key}>{def.label}</option>
              ))}
            </select>
            <input
              defaultValue={String(label || '')}
              placeholder="label…"
              onPointerDown={(e) => e.stopPropagation()}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
              }}
              onBlur={(e) => {
                const v = e.target.value.trim();
                if (v !== String(label || '')) updateEdgeLabel(id, v);
              }}
            />
          </div>
        </EdgeLabelRenderer>
      ) : label ? (
        <EdgeLabelRenderer>
          <div
            className="edge-label nodrag nopan"
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              opacity: dimOpacity,
              borderColor: edgeType === 'references' ? undefined : typeDef.color,
              color: edgeType === 'references' ? undefined : typeDef.color,
            }}
          >
            {String(label)}
          </div>
        </EdgeLabelRenderer>
      ) : null}
    </>
  );
}
