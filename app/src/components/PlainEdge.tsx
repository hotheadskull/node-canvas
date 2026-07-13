// Plain edge with TWO redundant click affordances -- the v1 lesson where an
// edge was only clickable on some machines because the hit area was the
// visible 2px stroke:
//   1. BaseEdge renders an invisible interaction path, widened and
//      zoom-compensated so it is ~24 screen px at any zoom level.
//   2. The label chip (EdgeLabelRenderer -> real DOM, pointer-events: all)
//      is always present and always clickable, even if path clicks fail.
// Selecting the edge opens the inline menu on the chip: rename or delete.

import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  useViewport,
  type EdgeProps,
} from '@xyflow/react';
import { Trash2 } from 'lucide-react';
import { memo } from 'react';
import { useCanvasStore } from '../store/canvasStore';

function PlainEdgeComponent({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  selected,
  label,
}: EdgeProps) {
  const { zoom } = useViewport();
  const setEdgeLabel = useCanvasStore((state) => state.setEdgeLabel);
  const deleteEdge = useCanvasStore((state) => state.deleteEdge);

  const [path, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });

  // ~24 screen px of clickable width regardless of zoom level
  const interactionWidth = Math.max(24, 24 / Math.max(zoom, 0.05));

  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        interactionWidth={interactionWidth}
        className={`plain-edge ${selected ? 'is-selected' : ''}`}
      />
      <EdgeLabelRenderer>
        <div
          className={`edge-chip nodrag nopan ${selected ? 'is-selected' : ''}`}
          style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)` }}
          data-edge-chip={id}
        >
          {selected ? (
            <span className="edge-chip-menu">
              <input
                className="edge-chip-input"
                value={typeof label === 'string' ? label : ''}
                placeholder="Label this line…"
                autoFocus
                onChange={(event) => setEdgeLabel(id, event.target.value)}
              />
              <button
                className="edge-chip-delete"
                title="Remove this connection"
                onClick={() => deleteEdge(id)}
              >
                <Trash2 size={13} aria-hidden />
              </button>
            </span>
          ) : (
            <span className="edge-chip-face" title="Click to edit this connection">
              {typeof label === 'string' && label !== '' ? label : '·'}
            </span>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

export const PlainEdge = memo(PlainEdgeComponent);
