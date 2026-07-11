import { EdgeTypeDef } from '../utils/edgeTypes';

// A live miniature of an edge type: same color, dash pattern, AND animation
// as the real line, so pickers and the legend explain the types by showing
// them in motion instead of as identical static strokes.
export function EdgeTypePreview({ def, width = 24 }: { def: EdgeTypeDef; width?: number }) {
  const anim = def.animation;
  const animClass = anim === 'dash' ? 'edge-anim-dash' : anim === 'pulse' ? 'edge-anim-pulse' : '';
  return (
    <svg width={width} height="6" className="flex-shrink-0 overflow-visible">
      <line
        x1="0" y1="3" x2={width} y2="3"
        stroke={def.color}
        strokeWidth="2"
        strokeDasharray={def.dash || (anim === 'dash' ? '8 4' : undefined)}
        className={animClass}
        style={{ color: def.color, opacity: anim === 'particles' ? 0.35 : undefined }}
      />
      {/* Particle types render as bright dots streaming along a faint line */}
      {anim === 'particles' && (
        <line
          x1="0" y1="3" x2={width} y2="3"
          stroke={def.color}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray="1 9"
          className="edge-anim-dash"
          style={{ color: def.color }}
        />
      )}
    </svg>
  );
}
