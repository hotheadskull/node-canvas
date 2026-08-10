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
import {
  arcRelationsByFamily,
  DATA_KIND_STYLES,
  getArcRelation,
  WIRE_OPACITY,
  WIRE_OPACITY_HEAVY,
  type DataKind,
} from '@node-canvas/core';
import { Check, Trash2, X } from 'lucide-react';
import { memo } from 'react';
import { useCanvasStore } from '../store/canvasStore';

export type WireEdgeData = {
  status: 'live' | 'tentative';
  dataKind: string;
  portLabel: string;
  /** Arc wires (prop -> prop): the chip carries the relationship. */
  isArc?: boolean;
  relation?: string;
  /** User label -- e.g. the ROLE on an Event's Involves wire ("bride"). */
  label?: string;
  /** Within the ~8-wire animation budget (Canvas assigns). */
  animate?: boolean;
  /** Density filter (§6): outside the filter -- render as a whisper. */
  muted?: boolean;
  /** Routed harness (flat -- see harnessRouting.ts). Absent => bezier. */
  harnessD?: string;
  harnessLabelX?: number;
  harnessLabelY?: number;
  harnessSX?: number;
  harnessSY?: number;
  harnessTX?: number;
  harnessTY?: number;
  harnessJunctionX?: number;
  harnessJunctionY?: number;
  harnessTieX?: number;
  harnessTieY?: number;
  harnessTieCount?: number;
};

/** Signal character per data kind (spec §5) -- dash/duration/timing live in
 * CSS as .sig-<kind>; this is just the mapping's existence. */
const SIGNAL_KINDS = new Set([
  'text', 'thread', 'person', 'place', 'thing', 'cite', 'claim', 'prop', 'plant', 'event', 'any',
]);

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
  const setWireLabel = useCanvasStore((state) => state.setWireLabel);

  // Ghost-and-settle (spec §4): the harness path is routed from the
  // DOCUMENT's positions. While a drag is in flight the live handle coords
  // diverge from the routed anchors -- the wire drops to a straight ghost
  // and settles back onto the harness on release.
  const TOLERANCE = 6;
  const settled =
    data?.harnessD !== undefined &&
    data.harnessSX !== undefined &&
    Math.abs(sourceX - data.harnessSX!) < TOLERANCE &&
    Math.abs(sourceY - data.harnessSY!) < TOLERANCE &&
    Math.abs(targetX - data.harnessTX!) < TOLERANCE &&
    Math.abs(targetY - data.harnessTY!) < TOLERANCE;
  const ghosting = data?.harnessD !== undefined && !settled;

  const [bezierPath, bezierLabelX, bezierLabelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });
  const path = settled
    ? data!.harnessD!
    : ghosting
      ? `M${sourceX},${sourceY} L${targetX},${targetY}`
      : bezierPath;
  const labelX = settled ? data!.harnessLabelX! : bezierLabelX;
  const labelY = settled ? data!.harnessLabelY! : bezierLabelY;

  const interactionWidth = Math.max(24, 24 / Math.max(zoom, 0.05));
  const tentative = data?.status === 'tentative';
  // Observatory color law: a wire is the colour of what travels down it --
  // hue, stroke weight, AND dash pattern all come from the dataKind.
  const kind = (data?.dataKind ?? 'any') as DataKind;
  const kindStyle = DATA_KIND_STYLES[kind] ?? DATA_KIND_STYLES.any;
  const color = kindStyle.hue;
  const opacity = kind === 'thread' ? WIRE_OPACITY_HEAVY : WIRE_OPACITY;

  return (
    <>
      {/* the halo: same path, wide and faint -- live settled wires only */}
      {!tentative && !ghosting && data?.muted !== true && (
        <path
          d={path}
          fill="none"
          stroke={color}
          strokeWidth={7}
          strokeOpacity={0.09}
          className="wire-halo"
        />
      )}
      <BaseEdge
        id={id}
        path={path}
        interactionWidth={interactionWidth}
        className={`wire-edge ${tentative ? 'is-tentative' : 'is-live'} ${ghosting ? 'is-ghost' : ''} ${selected ? 'is-selected' : ''} ${data?.muted === true && !selected ? 'is-muted' : ''}`}
        style={{
          ['--wire-color' as string]: color,
          strokeWidth: kindStyle.stroke,
          strokeDasharray: tentative ? '7 5' : ghosting ? '4 4' : kindStyle.dash,
          opacity: tentative ? undefined : ghosting ? 0.4 : opacity,
        }}
      />
      {/* the travelling signal (spec §5): a dash window animating along the
          same path; character per data kind, ~8-wire budget, killed by
          prefers-reduced-motion in CSS */}
      {!tentative && !ghosting && data?.animate === true && SIGNAL_KINDS.has(kind) && (
        <path
          d={path}
          fill="none"
          className={`wire-signal sig-${kind}`}
          style={{ stroke: color }}
        />
      )}
      {/* junction dot: one give splitting to several takes (spec §4) -- no
          dot means no relationship, so an unmarked crossing never lies */}
      {data?.harnessJunctionX !== undefined && settled && (
        <g className="wire-junction" data-junction>
          <circle cx={data.harnessJunctionX} cy={data.harnessJunctionY} r={3.4} fill={color} />
          <circle
            cx={data.harnessJunctionX}
            cy={data.harnessJunctionY}
            r={6.5}
            fill="none"
            stroke={color}
            strokeOpacity={0.3}
          />
        </g>
      )}
      {/* strand tie (spec §3): several gives merging into one take port.
          Two 1px verticals 5px apart with the strand count above -- the
          tie marks the merge without ever drawing thicker than a wire. */}
      {settled && data?.harnessTieX !== undefined && (
        <g className="wire-tie" data-tie>
          <line
            x1={(data.harnessTieX as number) - 2.5}
            y1={(data.harnessTieY as number) - 6}
            x2={(data.harnessTieX as number) - 2.5}
            y2={(data.harnessTieY as number) + 6}
            stroke={color}
            strokeWidth={1}
          />
          <line
            x1={(data.harnessTieX as number) + 2.5}
            y1={(data.harnessTieY as number) - 6}
            x2={(data.harnessTieX as number) + 2.5}
            y2={(data.harnessTieY as number) + 6}
            stroke={color}
            strokeWidth={1}
          />
          {data.harnessTieCount !== undefined && (
            <text
              className="wire-tie-count"
              x={data.harnessTieX}
              y={(data.harnessTieY as number) - 9}
              textAnchor="middle"
              fill={color}
            >
              {data.harnessTieCount}
            </text>
          )}
        </g>
      )}
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
                <>
                  <span className="wire-chip-kind" style={{ color }}>
                    {data?.portLabel ?? 'wire'}
                  </span>
                  <input
                    className="wire-label-input nodrag"
                    value={data?.label ?? ''}
                    placeholder="label…"
                    aria-label="Wire label"
                    title="Label this wire (an Involves wire's label is the person's role)"
                    onChange={(event) => setWireLabel(id, event.target.value)}
                  />
                </>
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
              {data?.label ?? '◆'}
            </span>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

export const WireEdge = memo(WireEdgeComponent);
