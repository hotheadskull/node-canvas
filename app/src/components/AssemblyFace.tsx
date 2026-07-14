// The assembly's face card. Collapsed: the full derived face ("Person: 2 ·
// Place: 1", readiness could join later) with expand/open/unpack. Expanded:
// a compact pill near the members so the group always has an affordance to
// collapse, drill into, or unpack. External connections attach HERE -- the
// face is the assembly's stable interface (I3), so it has plain-edge dots.

import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Boxes, DoorOpen, Minimize2, PackageOpen, Spline } from 'lucide-react';
import { memo, useMemo } from 'react';
import {
  arcOutline,
  deriveFace,
  getArcRelation,
  memberNodeIds,
  ownersOutstanding,
  READINESS_STAGES,
  rollupReadiness,
  stripHtml,
  workbenchInfo,
} from '@node-canvas/core';
import { useCanvasStore } from '../store/canvasStore';

/** Human age for the workbench face ("2h", "12d"). */
function ageOf(iso: string): string {
  const ms = Date.now() - Date.parse(iso);
  const hours = Math.floor(ms / 3_600_000);
  if (hours < 1) return 'just now';
  if (hours < 48) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

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

  const propText = (nodeId: string): string => {
    const node = document.nodes.find((candidate) => candidate.id === nodeId);
    if (!node) return '…';
    const content = typeof node.data.content === 'string' ? stripHtml(node.data.content).trim() : '';
    if (content !== '') return content;
    const title = typeof node.data.title === 'string' ? node.data.title.trim() : '';
    return title !== '' ? title : 'Untitled proposition';
  };

  return (
    <div
      className={`assembly-face ${data.collapsed ? 'is-collapsed' : 'is-pill'} ${selected ? 'is-selected' : ''}`}
      data-assembly-face={data.assemblyId}
    >
      <header className="assembly-face-header">
        <Boxes size={13} aria-hidden className="assembly-face-icon" />
        <input
          className="assembly-face-name nodrag"
          value={data.name}
          placeholder="Group name"
          onChange={(event) => renameAssemblyTo(data.assemblyId, event.target.value)}
        />
        <span className="assembly-face-actions">
          <button
            className="assembly-face-button nodrag"
            title={data.collapsed ? 'Expand in place' : 'Collapse into this card'}
            aria-label={data.collapsed ? 'Expand group' : 'Collapse group'}
            onClick={() => setCollapsed(data.assemblyId, !data.collapsed)}
          >
            {data.collapsed ? <PackageOpen size={13} aria-hidden /> : <Minimize2 size={13} aria-hidden />}
          </button>
          <button
            className="assembly-face-button nodrag"
            title="Open this group on its own canvas"
            aria-label="Open group"
            onClick={() => drillIn(data.assemblyId)}
          >
            <DoorOpen size={13} aria-hidden />
          </button>
          {isArcGroup && (
            <button
              className="assembly-face-button nodrag"
              title="Arc room: work the propositions and their relationships"
              aria-label="Open Arc room"
              onClick={() => openArcRoom(data.assemblyId)}
            >
              <Spline size={13} aria-hidden />
            </button>
          )}
        </span>
      </header>
      {data.collapsed && (
        <div className="assembly-face-body">
          {counts.length === 0 ? (
            <p className="assembly-face-empty">Empty group</p>
          ) : (
            <p className="assembly-face-counts">
              {counts.map((entry, index) => (
                <span key={entry.type}>
                  {index > 0 && ' · '}
                  {entry.label}: {entry.count}
                </span>
              ))}
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
          {rollup.total > 0 && rollup.counts.seed !== rollup.total && (
            <p className="assembly-face-readiness" title="Readiness of everything inside">
              {READINESS_STAGES.filter((stage) => rollup.counts[stage] > 0)
                .map((stage) => `${rollup.counts[stage]} ${stage}`)
                .join(' · ')}
            </p>
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
            <span>{memberCount} inside</span>
            <button
              className="assembly-face-unpack nodrag"
              title="Dissolve the group — every node stays on the canvas"
              onClick={() => unpack(data.assemblyId)}
            >
              Unpack
            </button>
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
