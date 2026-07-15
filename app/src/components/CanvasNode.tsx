// The shared node frame, rebuilt to the Tab Card anatomy (Chunk 17,
// docs/design/node-anatomy.md — user-picked mockup C):
// 1. TAB above the card: glyph + type + status. The only chrome strip.
// 2. BODY: title as the bold accent first line, then the type's face.
//    Grows with content natively (V1 rule: no inline height unless the
//    user owns it) — no mirrors, no measurement feedback.
// 3. PORTS on the border (takes left, gives right), labels float OUTSIDE
//    the card, so stars and labels can never cover body text.
// 4. STATUS on the tab; the tentative "waiting" badge keeps its corner.
//
// Spatial grammar: top/bottom dots make plain relationship edges (I1);
// the left/right border stars are the opt-in dataflow layer (I2).

import {
  Handle,
  NodeResizer,
  Position,
  useUpdateNodeInternals,
  type NodeProps,
} from '@xyflow/react';
import {
  BookMarked,
  BookOpenText,
  Box,
  CalendarClock,
  ChevronsUpDown,
  CircleHelp,
  GitBranch,
  Layers,
  Library,
  MapPin,
  Package,
  Quote,
  Scale,
  Sprout,
  StickyNote,
  Target,
  Type,
  User,
  type LucideIcon,
} from 'lucide-react';
import { memo, useEffect, useRef, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import {
  forkNoticesFor,
  getNodeDef,
  hygieneFlags,
  nodeLabel,
  ownerOf,
  readinessOf,
  tentativeInboundCount,
  type PortDef,
} from '@node-canvas/core';
import { useCanvasStore } from '../store/canvasStore';
import { faceFor } from './faces';

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
  cite: '#14b8a6',
  claim: '#f43f5e',
  prop: '#34d399',
  plant: '#84cc16',
  event: '#c084fc',
  any: '#cbd5e1',
};

/** Tab glyphs are renderer-side, like NODE_FACES (I8). */
const NODE_ICONS: Record<string, LucideIcon> = {
  title: Type,
  note: StickyNote,
  document: BookOpenText,
  manuscript: Library,
  section: Layers,
  question: CircleHelp,
  person: User,
  place: MapPin,
  thing: Package,
  source: Quote,
  claim: Scale,
  passage: BookMarked,
  proposition: GitBranch,
  plant: Sprout,
  payoff: Target,
  event: CalendarClock,
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

const PORT_TOP = 34;
const PORT_GAP = 26;

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
  // Hidden (non-defaultVisible) ports render too, but only APPEAR on node
  // hover -- otherwise they have no handle and can never be wired (found
  // fixing TRY-IT §12: Footnotes and Subject/Complement were unreachable).
  return (
    <>
      {ports.map((port, index) => (
        <Handle
          key={port.id}
          id={port.id}
          type="source"
          position={position}
          className={`port-star kind-${port.dataKind} ${port.defaultVisible ? '' : 'is-hidden-port'}`}
          style={{
            top: `${PORT_TOP + index * PORT_GAP}px`,
            ['--port-color' as string]: PORT_KIND_COLORS[port.dataKind] ?? '#94a3b8',
          }}
          data-port-label={port.label}
          data-port-direction={port.direction}
        />
      ))}
      {ports.map((port, index) => (
        <span
          key={`${port.id}-label`}
          className={`port-label side-${side} ${port.defaultVisible ? '' : 'is-hidden-port'}`}
          style={{ top: `${PORT_TOP + index * PORT_GAP}px` }}
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
  const setNodeAccent = useCanvasStore((state) => state.setNodeAccent);
  const setOwnedSize = useCanvasStore((state) => state.setOwnedSize);
  const clearOwnedHeight = useCanvasStore((state) => state.clearOwnedHeight);
  const recordMeasuredHeight = useCanvasStore((state) => state.recordMeasuredHeight);
  const waiting = useCanvasStore((state) => tentativeInboundCount(state.document, id));
  const cycleReadiness = useCanvasStore((state) => state.cycleReadiness);
  const { readiness, owner } = useCanvasStore(
    useShallow((state) => {
      const docNode = state.document.nodes.find((candidate) => candidate.id === id);
      return {
        readiness: docNode ? readinessOf(docNode) : ('seed' as const),
        owner: docNode ? ownerOf(docNode) : null,
      };
    }),
  );
  const flaggedPorts = useCanvasStore(
    useShallow((state) =>
      hygieneFlags(state.document)
        .filter((flag) => flag.nodeId === id)
        .map((flag) =>
          flag.direction === 'give'
            ? `${flag.portLabel} feeds nothing yet`
            : `${flag.portLabel} intake is empty`,
        ),
    ),
  );
  const updateNodeInternals = useUpdateNodeInternals();
  const cardRef = useRef<HTMLDivElement>(null);
  // "✎ edited in <doc>" -- this node's text was forked inside a document;
  // the original here is untouched (document pass, no-write-back rule).
  const forkedIn = useCanvasStore(
    useShallow((state) => [
      ...new Set(forkNoticesFor(state.document, id).map((notice) => notice.documentTitle)),
    ]),
  );

  const [accentPickerOpen, setAccentPickerOpen] = useState(false);
  const Face = faceFor(data.coreType);
  // The title face IS the node's words -- no separate title line.
  const faceOwnsTitle = data.coreType === 'title';

  // ALL declared ports get handles (hidden ones appear on hover).
  const allPorts = def?.ports ?? [];
  const takes = allPorts.filter((port) => port.direction === 'take');
  const gives = allPorts.filter((port) => port.direction === 'give');

  // Keep the document's size in sync with the REAL rendered card, so spawn
  // collision / Fit / split math stay truthful. One direction only: this
  // never sets a style, so growth can never lag or loop (anatomy spec).
  useEffect(() => {
    const element = cardRef.current;
    if (!element || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) recordMeasuredHeight(id, entry.contentRect.height);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [id, recordMeasuredHeight]);

  // React Flow requirement: whenever the set of rendered handles can change
  // at runtime (port visibility, size), re-register the node's internals.
  const handleSignature = `${allPorts.map((port) => port.id).join(',')}:${data.ownedHeight ?? ''}`;
  useEffect(() => {
    updateNodeInternals(id);
  }, [id, handleSignature, updateNodeInternals]);

  const TabIcon = NODE_ICONS[data.coreType] ?? Box;

  return (
    <div
      ref={cardRef}
      className={`canvas-node ${selected ? 'is-selected' : ''}`}
      style={{ ['--accent' as string]: accent }}
    >
      <NodeResizer
        isVisible={selected ?? false}
        minWidth={def?.size?.width ? Math.min(def.size.width, 240) : 240}
        minHeight={90}
        onResizeEnd={(_event, params) => setOwnedSize(id, params.width, params.height)}
        lineClassName="node-resizer-line"
        handleClassName="node-resizer-handle"
      />
      {waiting > 0 && (
        <span className="waiting-badge" title={`${waiting} idea${waiting === 1 ? '' : 's'} waiting to land here`}>
          {waiting} waiting
        </span>
      )}
      <header className="canvas-node-header canvas-node-tab">
        <TabIcon size={11} aria-hidden className="canvas-node-glyph" />
        <button
          className="canvas-node-kind nodrag"
          title="Change this node's color"
          onClick={() => setAccentPickerOpen((open) => !open)}
        >
          {def ? nodeLabel(def.type, 'universal') : data.coreType}
        </button>
        <button
          className={`readiness-dot nodrag stage-${readiness}`}
          title={`Readiness: ${readiness} — click to advance`}
          aria-label={`Readiness: ${readiness}`}
          onClick={() => cycleReadiness(id)}
        />
        {flaggedPorts.length > 0 && (
          <span className="hygiene-dot" title={flaggedPorts.join('; ')} data-hygiene-flag />
        )}
        {owner && (
          <span className="owner-chip" title={`Owner: ${owner}`}>
            {owner}
          </span>
        )}
        {data.ownedHeight !== undefined && selected && (
          <button
            className="canvas-node-fit nodrag"
            title="Fit: the card grows with its text again"
            onClick={() => clearOwnedHeight(id)}
          >
            <ChevronsUpDown size={11} aria-hidden />
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
      <div className="canvas-node-main">
        {!faceOwnsTitle && (
          <input
            className="canvas-node-title nodrag"
            value={data.title}
            placeholder="Untitled"
            onChange={(event) => setNodeTitle(id, event.target.value)}
          />
        )}
        <Face nodeId={id} title={data.title} content={data.content} />
        {forkedIn.length > 0 && (
          <p className="fork-notice nodrag" data-fork-notice title="The original text here is untouched">
            ✎ edited in {forkedIn.join(', ')}
          </p>
        )}
      </div>
      <PortStars nodeId={id} ports={takes} side="left" />
      <PortStars nodeId={id} ports={gives} side="right" />
      <Handle id="top" type="source" position={Position.Top} className="node-handle" />
      <Handle id="bottom" type="source" position={Position.Bottom} className="node-handle" />
    </div>
  );
}

export const CanvasNode = memo(CanvasNodeComponent);
