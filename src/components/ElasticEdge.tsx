import { BaseEdge, EdgeLabelRenderer, EdgeProps, useInternalNode, getBezierPath } from '@xyflow/react';
import { Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getEdgeParams, getHandleAnchor, intersectToward } from '../utils/edgeUtils';
import { absoluteNodeRects, getAvoidingPath } from '../utils/smartPath';
import { useStore } from '../store/useStore';
import { EDGE_TYPES, edgeTypeOf } from '../utils/edgeTypes';
import { EdgeTypePreview } from './EdgeTypePreview';

const Sparks = ({ x, y }: { x: number; y: number }) => {
  const [active, setActive] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setActive(false), 1000);
    return () => clearTimeout(t);
  }, []);

  if (!active) return null;

  const particles = Array.from({ length: 30 }).map((_, i) => {
    const angle = (Math.PI * 2 * i) / 30 + (Math.random() * 0.2);
    const distance = 40 + Math.random() * 80;
    const tx = Math.cos(angle) * distance;
    const ty = Math.sin(angle) * distance;
    const delay = Math.random() * 0.1;
    return (
      <div
        key={i}
        className="spark-particle"
        style={{
          left: x,
          top: y,
          '--tx': `${tx}px`,
          '--ty': `${ty}px`,
          animationDelay: `${delay}s`
        } as any}
      />
    );
  });

  return (
    <>
      <div className="spark-flash" style={{ left: x, top: y }} />
      {particles}
    </>
  );
};

// The four generic BaseNode handles float (the edge attaches wherever the
// route actually leaves the card). Any OTHER handle id (compile slot,
// sequence beat) pins the edge to that exact dot.
const GENERIC_HANDLES = new Set(['top', 'bottom', 'left', 'right']);

export function ElasticEdge({
  id,
  source,
  target,
  sourceHandleId,
  targetHandleId,
  style = {},
  markerEnd,
  label,
  data,
  selected,
}: EdgeProps) {
  const sourceNode = useInternalNode(source);
  const targetNode = useInternalNode(target);
  const allNodes = useStore(state => state.nodes);
  const updateEdgeLabel = useStore(state => state.updateEdgeLabel);
  const updateEdgeType = useStore(state => state.updateEdgeType);
  const [menuOpen, setMenuOpen] = useState(false);

  if (!sourceNode || !targetNode) {
    return null;
  }

  // ANCHORED ENDS: edges drawn from a compile slot or sequence beat must
  // visually attach to that dot, not float to the host node's boundary --
  // floating made beat connections look attached to the sequence node itself.
  const srcAnchor = sourceHandleId && !GENERIC_HANDLES.has(sourceHandleId)
    ? getHandleAnchor(sourceNode, 'source', sourceHandleId)
    : null;
  const tgtAnchor = targetHandleId && !GENERIC_HANDLES.has(targetHandleId)
    ? getHandleAnchor(targetNode, 'target', targetHandleId)
    : null;

  let { sx, sy, tx, ty, sourcePos, targetPos } = getEdgeParams(sourceNode, targetNode);
  if (srcAnchor) { sx = srcAnchor.x; sy = srcAnchor.y; sourcePos = srcAnchor.position; }
  if (tgtAnchor) { tx = tgtAnchor.x; ty = tgtAnchor.y; targetPos = tgtAnchor.position; }
  // A floating end paired with a pinned end aims at the pin, not the center.
  if (srcAnchor && !tgtAnchor) {
    const t2 = intersectToward(targetNode, sx, sy);
    tx = t2.x; ty = t2.y; targetPos = t2.position;
  } else if (tgtAnchor && !srcAnchor) {
    const s2 = intersectToward(sourceNode, tx, ty);
    sx = s2.x; sy = s2.y; sourcePos = s2.position;
  }

  // SMART ROUTING: if the straight line would plow under other nodes, bow
  // around them. Skipped on huge canvases -- the O(edges x nodes) scan is
  // fine at writing-project scale but not at stress-test scale.
  const SMART_ROUTE_NODE_LIMIT = 300;
  let smart: ReturnType<typeof getAvoidingPath> = null;
  if (allNodes.length <= SMART_ROUTE_NODE_LIMIT) {
    // Nodes hidden by a collapsed hub keep their real store position but are
    // invisible; App passes their ids so we don't dodge empty space.
    const hiddenIds = (data as any)?.hiddenNodeIds as Set<string> | undefined;
    const obstacles = absoluteNodeRects(allNodes)
      .filter(r =>
        r.id !== source &&
        r.id !== target &&
        r.type !== 'group' && // edges may cross group zones freely
        !(hiddenIds?.has(r.id))
      )
      .map(r => r.rect);
    smart = getAvoidingPath(sx, sy, tx, ty, obstacles);

    if (smart) {
      // The endpoints were aimed BEFORE the detour existed, so the route
      // could wrap around an obstacle and double back to the far side of the
      // card. Re-aim each floating end at its first/last waypoint (the
      // direction the route actually approaches from) and route once more --
      // often the re-aimed line is clear and collapses to a plain curve.
      const first = smart.points[1];
      const last = smart.points[smart.points.length - 2];
      let moved = false;
      if (!srcAnchor) {
        const s2 = intersectToward(sourceNode, first[0], first[1]);
        if (s2.x !== sx || s2.y !== sy) { sx = s2.x; sy = s2.y; sourcePos = s2.position; moved = true; }
      }
      if (!tgtAnchor) {
        const t2 = intersectToward(targetNode, last[0], last[1]);
        if (t2.x !== tx || t2.y !== ty) { tx = t2.x; ty = t2.y; targetPos = t2.position; moved = true; }
      }
      if (moved) smart = getAvoidingPath(sx, sy, tx, ty, obstacles);
    }
  }

  const [bezierPath, bezierLabelX, bezierLabelY] = getBezierPath({
    sourceX: sx,
    sourceY: sy,
    targetX: tx,
    targetY: ty,
    sourcePosition: sourcePos,
    targetPosition: targetPos,
  });

  const edgePath = smart?.path ?? bezierPath;
  const labelX = smart?.labelX ?? bezierLabelX;
  const labelY = smart?.labelY ?? bezierLabelY;

  // Relationship type drives color + dash. The color NEVER changes with
  // distance -- the old gold-to-red stretch shift predates typed edges and
  // overrode the user's chosen connection color on long lines.
  const edgeType = edgeTypeOf(data);
  const typeDef = EDGE_TYPES[edgeType];
  const stroke = typeDef.color;

  // Link strength: how often the connection has been "used" (title mentions).
  // Strong links render thicker so load-bearing relationships stand out.
  const strength = (data as any)?.strength || 1;
  const strokeWidth = Math.min(2 + (strength - 1) * 0.6, 4.5);

  // Constellation hover mode set by App: 'lit' edges belong to the hovered
  // node's web, 'dim' edges fade into the background.
  const constellation = (data as any)?.constellation as 'lit' | 'dim' | undefined;
  const dimOpacity = constellation === 'dim' ? 0.06 : 1;

  return (
    <>
      {/* Invisible thick path for much easier clicking */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={30}
        className="react-flow__edge-interaction"
      />
      {/* Visible edge */}
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        className={`edge-energy ${typeDef.animation === 'pulse' ? 'edge-anim-pulse' : ''} ${typeDef.animation === 'dash' ? 'edge-anim-dash' : ''}`}
        style={{
          ...style,
          stroke,
          strokeWidth,
          strokeDasharray: typeDef.dash || (typeDef.animation === 'dash' ? '8 4' : undefined),
          opacity: selected ? 1 : dimOpacity,
          transition: 'stroke 0.1s ease, stroke-width 0.1s ease, opacity 0.25s ease',
          filter: selected ? `drop-shadow(0 0 4px ${stroke})` : 'none',
        }}
      />

      {/* Particle Animation */}
      {typeDef.animation === 'particles' && constellation !== 'dim' && (
        <circle r={strokeWidth + 1} fill={stroke} filter={`drop-shadow(0 0 4px ${stroke})`}>
          <animateMotion dur="2.5s" repeatCount="indefinite" path={edgePath} />
        </circle>
      )}

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
      {/* Selected: inline editor for relationship type + freeform label.
          Otherwise: show the label pill if one is set. */}
      {(data as any)?.isNew && (
        <EdgeLabelRenderer>
          <div className="nodrag nopan" style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
            <Sparks x={sx} y={sy} />
            <Sparks x={tx} y={ty} />
          </div>
        </EdgeLabelRenderer>
      )}

      {selected ? (
        <EdgeLabelRenderer>
          <div
            className="edge-editor nodrag nopan"
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              display: 'flex',
              gap: '4px',
              alignItems: 'center'
            }}
          >
            <div className="relative">
              <button
                onPointerDown={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
                className="flex items-center gap-2 bg-[#1a1a24] border border-[#333] px-2 py-1 rounded cursor-pointer hover:border-gray-500 transition-colors"
                style={{ color: typeDef.color }}
              >
                <EdgeTypePreview def={typeDef} width={18} />
                <span className="text-xs font-bold uppercase tracking-wider">{typeDef.label}</span>
              </button>

              {menuOpen && (
                <div 
                  className="absolute top-full left-0 mt-1 bg-[#1a1a24] border border-[#333] rounded shadow-xl flex flex-col z-50 min-w-[140px] max-h-[600px] overflow-y-auto"
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  {Object.entries(EDGE_TYPES).map(([key, def]) => (
                    <button
                      key={key}
                      className="flex items-center gap-3 px-3 py-2 hover:bg-black/40 text-left transition-colors w-full cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        updateEdgeType(id, key);
                        setMenuOpen(false);
                      }}
                    >
                      <EdgeTypePreview def={def} width={24} />
                      <span className="text-xs font-bold uppercase tracking-wider" style={{ color: def.color }}>{def.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
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
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                useStore.getState().onEdgesChange([{ type: 'remove', id }]);
              }}
              className="text-red-500 hover:text-red-400 bg-[#1a1a24] p-1 rounded border border-[#333] transition-colors flex items-center justify-center cursor-pointer"
              title="Delete Connection"
            >
              <Trash2 size={14} />
            </button>
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
