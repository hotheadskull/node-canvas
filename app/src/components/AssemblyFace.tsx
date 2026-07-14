// The assembly's face card. Collapsed: the full derived face ("Person: 2 ·
// Place: 1", readiness could join later) with expand/open/unpack. Expanded:
// a compact pill near the members so the group always has an affordance to
// collapse, drill into, or unpack. External connections attach HERE -- the
// face is the assembly's stable interface (I3), so it has plain-edge dots.

import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Boxes, DoorOpen, Minimize2, PackageOpen } from 'lucide-react';
import { memo, useMemo } from 'react';
import { deriveFace, memberNodeIds } from '@node-canvas/core';
import { useCanvasStore } from '../store/canvasStore';

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
  const memberCount = useMemo(
    () => memberNodeIds(document, data.assemblyId).length,
    [document, data.assemblyId],
  );

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
      {/* unnamed dot handles: remapped boundary edges resolve here */}
      <Handle type="source" position={Position.Top} className="node-handle assembly-handle" />
      <Handle type="target" position={Position.Bottom} className="node-handle assembly-handle" />
    </div>
  );
}

export const AssemblyFace = memo(AssemblyFaceComponent);
