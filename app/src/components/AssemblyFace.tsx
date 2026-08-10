// The assembly's face -- Observatory §7. Collapsed: a plate with STACKED
// EDGES (the only new shape in the system -- "there is more inside"):
// ASSEMBLY label, rollup readiness ring, name, derived count chips, the
// readiness distribution bar, then a footer with the member count and the
// three actions (expand / drill in / unpack). Expanded: members render
// inside a dashed boundary; the face becomes a pill carrying the same
// actions. External connections attach HERE -- the face is the assembly's
// stable interface (I3), so it has plain-edge dots.

import { Handle, Position, type NodeProps } from '@xyflow/react';
import {
  Boxes,
  DoorOpen,
  Maximize2,
  Minimize2,
  PackageOpen,
  Spline,
} from 'lucide-react';
import { memo, useMemo } from 'react';
import {
  arcOutline,
  DATA_KIND_STYLES,
  deriveFace,
  getArcRelation,
  getNodeDef,
  memberNodeIds,
  ownersOutstanding,
  READINESS_STAGES,
  rollupReadiness,
  stripHtml,
  workbenchInfo,
} from '@node-canvas/core';
import { useCanvasStore } from '../store/canvasStore';
import { ReadinessRing } from './ReadinessRing';

/** Human age for the workbench face ("2h", "12d"). */
function ageOf(iso: string): string {
  const ms = Date.now() - Date.parse(iso);
  const hours = Math.floor(ms / 3_600_000);
  if (hours < 1) return 'just now';
  if (hours < 48) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

/** A count chip's hue follows the color law: the member TYPE's primary give
 * dataKind (never the type itself). */
function chipHue(type: string): string {
  const give = getNodeDef(type)?.ports.find((port) => port.direction === 'give');
  return (give && DATA_KIND_STYLES[give.dataKind]?.hue) ?? DATA_KIND_STYLES.any.hue;
}

const STAGE_BAR_COLORS: Record<string, string> = {
  seed: '#4a4f76',
  developing: '#ffc94d',
  ready: '#52dd93',
  placed: 'rgba(82,221,147,.4)',
};

export type AssemblyFaceData = {
  assemblyId: string;
  name: string;
  collapsed: boolean;
};

function AssemblyFaceComponent({ data, selected }: NodeProps & { data: AssemblyFaceData }) {
  const document = useCanvasStore((state) => state.document);
  const setCollapsed = useCanvasStore((state) => state.setCollapsed);
  const renameAssemblyTo = useCanvasStore((state) => state.renameAssemblyTo);
  const drillIn = useCanvasStore((state) => state.drillIn);
  const unpack = useCanvasStore((state) => state.unpack);

  const counts = useMemo(
    () => deriveFace(document, memberNodeIds(document, data.assemblyId)),
    [document, data.assemblyId],
  );
  const members = useMemo(
    () => memberNodeIds(document, data.assemblyId),
    [document, data.assemblyId],
  );
  const memberCount = members.length;
  const rollup = useMemo(() => rollupReadiness(document, members), [document, members]);
  const owners = useMemo(() => ownersOutstanding(document, members), [document, members]);
  const workbench = useMemo(() => workbenchInfo(document, members), [document, members]);
  // An "Arc group" is just an assembly holding >= 2 propositions -- no
  // special entity (I3/I4 stay untouched); the outline is pure derivation.
  const outline = useMemo(() => arcOutline(document, members), [document, members]);
  const isArcGroup = outline.propCount >= 2;
  const openArcRoom = useCanvasStore((state) => state.openArcRoom);

  // Expanded boundary (spec §7): a dashed box around the members' rects,
  // drawn RELATIVE to the face's own position. Display only -- it never
  // moves anything (I5); it just follows the document as members drag.
  const boundary = useMemo(() => {
    if (data.collapsed) return null;
    const assembly = document.assemblies.find(
      (candidate) => candidate.id === data.assemblyId,
    );
    if (!assembly || assembly.memberIds.length === 0) return null;
    let x1 = Infinity;
    let y1 = Infinity;
    let x2 = -Infinity;
    let y2 = -Infinity;
    for (const memberId of assembly.memberIds) {
      const node = document.nodes.find((candidate) => candidate.id === memberId);
      if (node) {
        const def = getNodeDef(node.type);
        const width = node.size?.width ?? def?.size?.width ?? 300;
        const height = node.size?.height ?? def?.size?.height ?? 150;
        x1 = Math.min(x1, node.position.x);
        y1 = Math.min(y1, node.position.y);
        x2 = Math.max(x2, node.position.x + width);
        y2 = Math.max(y2, node.position.y + height);
        continue;
      }
      const nested = document.assemblies.find((candidate) => candidate.id === memberId);
      if (nested) {
        x1 = Math.min(x1, nested.position.x);
        y1 = Math.min(y1, nested.position.y);
        x2 = Math.max(x2, nested.position.x + 260);
        y2 = Math.max(y2, nested.position.y + 130);
      }
    }
    if (!Number.isFinite(x1)) return null;
    const pad = 18;
    return {
      left: x1 - pad - assembly.position.x,
      top: y1 - pad - assembly.position.y,
      width: x2 - x1 + pad * 2,
      height: y2 - y1 + pad * 2,
    };
  }, [data.collapsed, data.assemblyId, document]);

  const propText = (nodeId: string): string => {
    const node = document.nodes.find((candidate) => candidate.id === nodeId);
    if (!node) return '…';
    const content = typeof node.data.content === 'string' ? stripHtml(node.data.content).trim() : '';
    if (content !== '') return content;
    const title = typeof node.data.title === 'string' ? node.data.title.trim() : '';
    return title !== '' ? title : 'Untitled proposition';
  };

  const actionButtons = (
    <>
      <button
        className="assembly-face-button nodrag"
        title={data.collapsed ? 'Expand in place' : 'Collapse into this card'}
        aria-label={data.collapsed ? 'Expand group' : 'Collapse group'}
        onClick={() => setCollapsed(data.assemblyId, !data.collapsed)}
      >
        {data.collapsed ? <Maximize2 size={12} aria-hidden /> : <Minimize2 size={12} aria-hidden />}
      </button>
      <button
        className="assembly-face-button nodrag"
        title="Open this group on its own canvas"
        aria-label="Open group"
        onClick={() => drillIn(data.assemblyId)}
      >
        <DoorOpen size={12} aria-hidden />
      </button>
      {isArcGroup && (
        <button
          className="assembly-face-button nodrag"
          title="Arc room: work the propositions and their relationships"
          aria-label="Open Arc room"
          onClick={() => openArcRoom(data.assemblyId)}
        >
          <Spline size={12} aria-hidden />
        </button>
      )}
      <button
        className="assembly-face-button assembly-face-unpack nodrag"
        title="Dissolve the group — every node stays on the canvas"
        aria-label="Unpack group"
        onClick={() => unpack(data.assemblyId)}
      >
        <PackageOpen size={12} aria-hidden />
      </button>
    </>
  );

  return (
    <div
      className={`assembly-face ${data.collapsed ? 'is-collapsed' : 'is-pill'} ${selected ? 'is-selected' : ''}`}
      data-assembly-face={data.assemblyId}
    >
      {boundary && (
        <span
          className="assembly-boundary"
          style={boundary}
          aria-hidden
          data-assembly-boundary
        />
      )}
      <header className="assembly-face-header">
        <Boxes size={12} aria-hidden className="assembly-face-icon" />
        <span className="assembly-face-label">Assembly</span>
        <input
          className="assembly-face-name nodrag"
          value={data.name}
          placeholder="Group name"
          onChange={(event) => renameAssemblyTo(data.assemblyId, event.target.value)}
        />
        {rollup.total > 0 && <ReadinessRing stage={rollup.overall} size={15} />}
        {!data.collapsed && <span className="assembly-face-actions">{actionButtons}</span>}
      </header>
      {data.collapsed && (
        <div className="assembly-face-body">
          {counts.length === 0 ? (
            <p className="assembly-face-empty">Empty group</p>
          ) : (
            <p className="assembly-face-counts">
              {counts.map((entry) => {
                const hue = chipHue(entry.type);
                return (
                  <span
                    key={entry.type}
                    className="face-chip"
                    style={{
                      background: `color-mix(in srgb, ${hue} 10%, transparent)`,
                      borderColor: `color-mix(in srgb, ${hue} 24%, transparent)`,
                      color: hue,
                    }}
                  >
                    {entry.label} {entry.count}
                  </span>
                );
              })}
            </p>
          )}
          {isArcGroup && (
            <div className="arc-face-outline nodrag" data-arc-outline>
              {outline.entries.map((entry) => (
                <p
                  key={entry.nodeId}
                  className={entry.level === 0 ? 'arc-face-main' : 'arc-face-sub'}
                  style={{ paddingLeft: `${entry.level * 12}px` }}
                >
                  {entry.relationId && (
                    <span className="arc-face-code">
                      {getArcRelation(entry.relationId)?.code ?? '?'}
                    </span>
                  )}
                  {propText(entry.nodeId)}
                </p>
              ))}
              <p className="arc-face-stats">
                {outline.mainPointIds.length} main point
                {outline.mainPointIds.length === 1 ? '' : 's'} · {outline.arcCount} arc
                {outline.arcCount === 1 ? '' : 's'}
              </p>
            </div>
          )}
          {rollup.total > 0 && (
            <div
              className="readiness-bar"
              data-readiness-bar
              title={READINESS_STAGES.filter((stage) => rollup.counts[stage] > 0)
                .map((stage) => `${rollup.counts[stage]} ${stage}`)
                .join(' · ')}
            >
              {READINESS_STAGES.filter((stage) => rollup.counts[stage] > 0).map((stage) => (
                <span
                  key={stage}
                  className={`readiness-bar-seg seg-${stage}`}
                  style={{ flex: rollup.counts[stage], background: STAGE_BAR_COLORS[stage] }}
                />
              ))}
            </div>
          )}
          {owners.length > 0 && (
            <p className="assembly-face-owners" title="Unfinished work per owner">
              waiting on {owners.map((entry) => `${entry.owner}: ${entry.outstanding}`).join(' · ')}
            </p>
          )}
          {workbench.count > 0 && data.name.trim().toLowerCase() === 'workbench' && (
            <p className="assembly-face-workbench">
              {workbench.count} captured
              {workbench.oldestCapturedAt
                ? ` · oldest ${ageOf(workbench.oldestCapturedAt)}`
                : ''}
            </p>
          )}
          <footer className="assembly-face-footer">
            <span className="assembly-face-members">
              {memberCount} member{memberCount === 1 ? '' : 's'}
            </span>
            <span className="assembly-face-actions">{actionButtons}</span>
          </footer>
        </div>
      )}
      {/* semantic zoom: past the far threshold the whole card renders as a
          single glowing star (shown/hidden purely by the canvas zoom class) */}
      <div className="assembly-star" aria-hidden>
        <span className="assembly-star-point" />
        <span className="assembly-star-name">{data.name}</span>
      </div>
      {/* unnamed dot handles: remapped boundary edges resolve here */}
      <Handle type="source" position={Position.Top} className="node-handle assembly-handle" />
      <Handle type="target" position={Position.Bottom} className="node-handle assembly-handle" />
    </div>
  );
}

export const AssemblyFace = memo(AssemblyFaceComponent);
