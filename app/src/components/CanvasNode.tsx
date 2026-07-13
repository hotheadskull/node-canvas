// The baseline node renderer, per the user-approved Chunk 4 design mix:
// A's tinted header + kind tag, B's port rails (takes enter LEFT, gives exit
// RIGHT -- the canvas reads left-to-right), C's glowing-star ports. One
// component for every registered type: the registry supplies accent, labels,
// ports, and sizing policy (I8).
//
// Spatial grammar: top/bottom dots make plain relationship edges (I1);
// the left/right rails are the opt-in dataflow layer (I2).

import {
  Handle,
  NodeResizer,
  Position,
  useUpdateNodeInternals,
  type NodeProps,
} from '@xyflow/react';
import { Maximize2 } from 'lucide-react';
import { memo, useEffect, useRef, useState } from 'react';
import { getNodeDef, nodeLabel, tentativeInboundCount, type PortDef } from '@node-canvas/core';
import { useCanvasStore } from '../store/canvasStore';

export type CanvasNodeData = {
  coreType: string;
  title: string;
  content: string;
  ownedHeight?: number;
  accent?: string;
};

/** Port stars are colored by what flows through them, not by the node. */
export const PORT_KIND_COLORS: Record<string, string> = {
  text: '#a78bfa',
  thread: '#fbbf24',
  person: '#3b82f6',
  place: '#10b981',
  thing: '#f59e0b',
};

export const ACCENT_PRESETS = [
  '#f0c050',
  '#ec4899',
  '#3b82f6',
  '#10b981',
  '#a78bfa',
  '#f59e0b',
  '#22d3ee',
  '#ef4444',
];

function PortStars({
  nodeId,
  ports,
  side,
}: {
  nodeId: string;
  ports: PortDef[];
  side: 'left' | 'right';
}) {
  const position = side === 'left' ? Position.Left : Position.Right;
  return (
    <>
      {ports.map((port, index) => (
        <Handle
          key={port.id}
          id={port.id}
          type="source"
          position={position}
          className={`port-star kind-${port.dataKind}`}
          style={{
            top: `${52 + index * 26}px`,
            ['--port-color' as string]: PORT_KIND_COLORS[port.dataKind] ?? '#94a3b8',
          }}
          data-port-label={port.label}
          data-port-direction={port.direction}
        />
      ))}
      {ports.map((port, index) => (
        <span
          key={`${port.id}-label`}
          className={`port-label side-${side}`}
          style={{ top: `${52 + index * 26}px` }}
          data-for-node={nodeId}
        >
          {port.label}
        </span>
      ))}
    </>
  );
}

function CanvasNodeComponent({ id, data, selected }: NodeProps & { data: CanvasNodeData }) {
  const def = getNodeDef(data.coreType);
  const accent = data.accent ?? def?.accent ?? '#94a3b8';
  const setNodeTitle = useCanvasStore((state) => state.setNodeTitle);
  const setNodeContent = useCanvasStore((state) => state.setNodeContent);
  const setNodeAccent = useCanvasStore((state) => state.setNodeAccent);
  const applyMeasuredHeight = useCanvasStore((state) => state.applyMeasuredHeight);
  const setOwnedSize = useCanvasStore((state) => state.setOwnedSize);
  const clearOwnedHeight = useCanvasStore((state) => state.clearOwnedHeight);
  const waiting = useCanvasStore((state) => tentativeInboundCount(state.document, id));
  const updateNodeInternals = useUpdateNodeInternals();

  const [accentPickerOpen, setAccentPickerOpen] = useState(false);
  const mirrorRef = useRef<HTMLDivElement>(null);

  const visiblePorts = (def?.ports ?? []).filter((port) => port.defaultVisible);
  const takes = visiblePorts.filter((port) => port.direction === 'take');
  const gives = visiblePorts.filter((port) => port.direction === 'give');

  // React Flow requirement: whenever the set of rendered handles can change
  // at runtime (port visibility, size), re-register the node's internals.
  const handleSignature = `${visiblePorts.map((port) => port.id).join(',')}:${data.ownedHeight ?? ''}`;
  useEffect(() => {
    updateNodeInternals(id);
  }, [id, handleSignature, updateNodeInternals]);

  // Auto-fit height: measure a hidden MIRROR of the content, never the body.
  // The body flexes to fill the node, so measuring it feeds the node's own
  // height back into itself -- an unbounded growth loop (found in e2e). The
  // mirror's height depends only on the text and the node's width, so the
  // loop is structurally impossible. Core decides the final height (golden-
  // tested math); this only fires when text or width actually change.
  useEffect(() => {
    const element = mirrorRef.current;
    if (!element || typeof ResizeObserver === 'undefined') return;
    const chrome = 40; // header + borders; mirror already carries body padding
    const observer = new ResizeObserver(() => {
      applyMeasuredHeight(id, Math.ceil(element.scrollHeight) + chrome);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [id, applyMeasuredHeight]);

  return (
    <div className={`canvas-node ${selected ? 'is-selected' : ''}`} style={{ ['--accent' as string]: accent }}>
      <NodeResizer
        isVisible={selected ?? false}
        minWidth={def?.size?.width ? Math.min(def.size.width, 240) : 240}
        minHeight={def?.size?.height ? Math.min(def.size.height, 160) : 160}
        onResizeEnd={(_event, params) => setOwnedSize(id, params.width, params.height)}
        lineClassName="node-resizer-line"
        handleClassName="node-resizer-handle"
      />
      {waiting > 0 && (
        <span className="waiting-badge" title={`${waiting} idea${waiting === 1 ? '' : 's'} waiting to land here`}>
          {waiting} waiting
        </span>
      )}
      <header className="canvas-node-header">
        <button
          className="canvas-node-kind nodrag"
          title="Change this node's color"
          onClick={() => setAccentPickerOpen((open) => !open)}
        >
          {def ? nodeLabel(def.type, 'universal') : data.coreType}
        </button>
        <input
          className="canvas-node-title nodrag"
          value={data.title}
          placeholder="Untitled"
          onChange={(event) => setNodeTitle(id, event.target.value)}
        />
        {data.ownedHeight !== undefined && (
          <button
            className="canvas-node-fit nodrag"
            title="Fit height to content again"
            onClick={() => clearOwnedHeight(id)}
          >
            <Maximize2 size={12} aria-hidden />
          </button>
        )}
      </header>
      {accentPickerOpen && (
        <div className="accent-picker nodrag" role="listbox" aria-label="Node color">
          {ACCENT_PRESETS.map((preset) => (
            <button
              key={preset}
              className="accent-swatch"
              style={{ background: preset }}
              aria-label={`Use ${preset}`}
              onClick={() => {
                setNodeAccent(id, preset);
                setAccentPickerOpen(false);
              }}
            />
          ))}
          <button
            className="accent-swatch reset"
            title="Back to the type's color"
            onClick={() => {
              setNodeAccent(id, undefined);
              setAccentPickerOpen(false);
            }}
          >
            ×
          </button>
        </div>
      )}
      <div className="canvas-node-body">
        <textarea
          className="canvas-node-content nodrag"
          value={data.content}
          placeholder="Write here…"
          onChange={(event) => setNodeContent(id, event.target.value)}
        />
        <div className="canvas-node-mirror" ref={mirrorRef} aria-hidden>
          {data.content || ' '}
          {'\n'}
        </div>
      </div>
      {takes.length > 0 && <span className="port-rail rail-left" aria-hidden />}
      {gives.length > 0 && <span className="port-rail rail-right" aria-hidden />}
      <PortStars nodeId={id} ports={takes} side="left" />
      <PortStars nodeId={id} ports={gives} side="right" />
      <Handle id="top" type="source" position={Position.Top} className="node-handle" />
      <Handle id="bottom" type="source" position={Position.Bottom} className="node-handle" />
    </div>
  );
}

export const CanvasNode = memo(CanvasNodeComponent);
