// Data-wire renderer. Live wires are solid and colored by their dataKind;
// tentative wires are dashed and dimmer, and their chip offers Commit /
// Dissolve. Same two-affordance hit design as PlainEdge (interaction rules
// 1-3): wide zoom-compensated interaction path + always-clickable chip.

import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  useViewport,
  type EdgeProps,
} from '@xyflow/react';
import { arcRelationsByFamily, getArcRelation } from '@node-canvas/core';
import { Check, Trash2, X } from 'lucide-react';
import { memo } from 'react';
import { useCanvasStore } from '../store/canvasStore';
import { PORT_KIND_COLORS } from './CanvasNode';

export type WireEdgeData = {
  status: 'live' | 'tentative';
  dataKind: string;
  portLabel: string;
  /** Arc wires (prop -> prop): the chip carries the relationship. */
  isArc?: boolean;
  relation?: string;
};

const ARC_FAMILIES = arcRelationsByFamily();

function WireEdgeComponent({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  selected,
  data,
}: EdgeProps & { data?: WireEdgeData }) {
  const { zoom } = useViewport();
  const commitWire = useCanvasStore((state) => state.commitWire);
  const dissolveWire = useCanvasStore((state) => state.dissolveWire);
  const deleteWire = useCanvasStore((state) => state.deleteWire);
  const setWireRelationTo = useCanvasStore((state) => state.setWireRelationTo);

  const [path, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });

  const interactionWidth = Math.max(24, 24 / Math.max(zoom, 0.05));
  const tentative = data?.status === 'tentative';
  const color = PORT_KIND_COLORS[data?.dataKind ?? ''] ?? '#94a3b8';

  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        interactionWidth={interactionWidth}
        className={`wire-edge ${tentative ? 'is-tentative' : 'is-live'} ${selected ? 'is-selected' : ''}`}
        style={{ ['--wire-color' as string]: color }}
      />
      <EdgeLabelRenderer>
        <div
          className="edge-chip nodrag nopan"
          style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)` }}
          data-wire-chip={id}
        >
          {tentative ? (
            <span className="edge-chip-menu wire-tentative-menu">
              <button
                className="wire-chip-commit"
                title="Commit: this idea lands here (other candidates dissolve)"
                onClick={() => commitWire(id)}
              >
                <Check size={13} aria-hidden />
              </button>
              <span className="wire-chip-kind">{data?.portLabel ?? 'candidate'}?</span>
              <button
                className="wire-chip-dissolve"
                title="Dissolve this candidate"
                onClick={() => dissolveWire(id)}
              >
                <X size={13} aria-hidden />
              </button>
            </span>
          ) : selected ? (
            <span className="edge-chip-menu">
              {data?.isArc ? (
                <select
                  className="arc-relation-select nodrag"
                  aria-label="Arc relationship"
                  value={data.relation ?? ''}
                  onChange={(event) =>
                    setWireRelationTo(id, event.target.value === '' ? undefined : event.target.value)
                  }
                >
                  <option value="">relationship…</option>
                  {ARC_FAMILIES.map((group) => (
                    <optgroup key={group.family} label={group.label}>
                      {group.relations.map((relation) => (
                        <option key={relation.id} value={relation.id}>
                          {relation.code} · {relation.label} ({relation.hint})
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              ) : (
                <span className="wire-chip-kind" style={{ color }}>
                  {data?.portLabel ?? 'wire'}
                </span>
              )}
              <button
                className="edge-chip-delete"
                title="Remove this wire"
                onClick={() => deleteWire(id)}
              >
                <Trash2 size={13} aria-hidden />
              </button>
            </span>
          ) : data?.isArc ? (
            <span
              className="edge-chip-face wire-face arc-code"
              style={{ ['--wire-color' as string]: color }}
              title={
                data.relation
                  ? `${getArcRelation(data.relation)?.label ?? data.relation} — click to change`
                  : 'Arc — click to pick its relationship'
              }
              data-arc-code
            >
              {data.relation ? getArcRelation(data.relation)?.code ?? '?' : '?'}
            </span>
          ) : (
            <span
              className="edge-chip-face wire-face"
              style={{ ['--wire-color' as string]: color }}
              title={`${data?.portLabel ?? 'wire'} — click to edit`}
            >
              ◆
            </span>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

export const WireEdge = memo(WireEdgeComponent);
