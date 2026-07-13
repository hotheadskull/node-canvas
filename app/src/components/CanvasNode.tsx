// The baseline node renderer. One component for every registered type: the
// registry supplies accent, label, and sizing policy (I8 -- no per-type code
// here until specialist renderers earn their own).

import { Handle, NodeResizer, Position, type NodeProps } from '@xyflow/react';
import { Maximize2 } from 'lucide-react';
import { memo, useEffect, useRef } from 'react';
import { getNodeDef, nodeLabel } from '@node-canvas/core';
import { useCanvasStore } from '../store/canvasStore';

export type CanvasNodeData = {
  coreType: string;
  title: string;
  content: string;
  ownedHeight?: number;
};

// Handles are rendered on all four sides, 14px visible with a 28px invisible
// hit area (interaction rule: hit targets never rely on the visible shape).
const HANDLE_SIDES = [Position.Top, Position.Right, Position.Bottom, Position.Left];

function CanvasNodeComponent({ id, data, selected }: NodeProps & { data: CanvasNodeData }) {
  const def = getNodeDef(data.coreType);
  const accent = def?.accent ?? '#94a3b8';
  const setNodeTitle = useCanvasStore((state) => state.setNodeTitle);
  const setNodeContent = useCanvasStore((state) => state.setNodeContent);
  const applyMeasuredHeight = useCanvasStore((state) => state.applyMeasuredHeight);
  const setOwnedSize = useCanvasStore((state) => state.setOwnedSize);
  const clearOwnedHeight = useCanvasStore((state) => state.clearOwnedHeight);

  const mirrorRef = useRef<HTMLDivElement>(null);

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
      <header className="canvas-node-header">
        <span className="canvas-node-kind">{def ? nodeLabel(def.type, 'universal') : data.coreType}</span>
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
      {HANDLE_SIDES.map((side) => (
        <Handle key={side} id={side} type="source" position={side} className="node-handle" />
      ))}
    </div>
  );
}

export const CanvasNode = memo(CanvasNodeComponent);
