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
// Spatial grammar: EVERYTHING connects in the gutters. Relate diamonds at
// the gutter tops make plain relationship edges (I1); the slots below them
// are the opt-in dataflow layer (I2). Diamonds = relationships, slots =
// data -- two species, one home (user, 2026-08-09).

import {
  Handle,
  NodeResizer,
  Position,
  useUpdateNodeInternals,
  type NodeProps,
} from '@xyflow/react';
import {
  ArrowLeftRight,
  BookMarked,
  BookOpenText,
  Box,
  CalendarDays,
  ChevronsUpDown,
  CircleCheck,
  CircleDot,
  CircleHelp,
  FileText,
  GitBranch,
  Library,
  MapPin,
  Milestone,
  Minimize2,
  Package,
  Paperclip,
  Sparkles,
  Sprout,
  StickyNote,
  Type,
  UserRound,
  type LucideIcon,
} from 'lucide-react';
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import {
  DATA_KIND_STYLES,
  forkNoticesFor,
  getNodeDef,
  hygieneFlags,
  nodeLabel,
  ownerOf,
  readinessOf,
  stripHtml,
  tentativeInboundCount,
  wordCount,
  type PortDef,
} from '@node-canvas/core';
import { useCanvasStore } from '../store/canvasStore';
import { faceFor } from './faces';
import { ReadinessRing } from './ReadinessRing';

export type CanvasNodeData = {
  coreType: string;
  title: string;
  content: string;
  ownedHeight?: number;
  accent?: string;
  /** Observatory §2: sticky user-controlled collapse, persisted in data. */
  collapsed?: 'collapsed';
  /** Gutter swap (user, 2026-08-10): intake and output trade sides. */
  flipped?: boolean;
};

/** The Observatory color law: colour comes from the port's dataKind, never
 * the node's type. ONE source of truth -- core's DATA_KIND_STYLES -- this
 * record just projects the hues for style attributes. */
export const PORT_KIND_COLORS: Record<string, string> = Object.fromEntries(
  Object.entries(DATA_KIND_STYLES).map(([kind, style]) => [kind, style.hue]),
);

/** Tab glyphs are renderer-side, like NODE_FACES (I8) -- one glyph per
 * type, matching the add sheet's icon table (pt2 handoff §10). */
const NODE_ICONS: Record<string, LucideIcon> = {
  title: Type,
  note: StickyNote,
  document: BookOpenText,
  manuscript: Library,
  section: FileText,
  question: CircleHelp,
  person: UserRound,
  place: MapPin,
  thing: Package,
  source: Paperclip,
  claim: CircleCheck,
  passage: BookMarked,
  proposition: Milestone,
  plant: Sprout,
  payoff: Sparkles,
  event: CalendarDays,
  hub: CircleDot,
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

/** Port slot geometry lives in portGeometry.ts, SHARED with the harness's
 * anchor math -- change it there and the DOM and the wires move together.
 * Re-exported here for existing import sites. */
import { autoSideFor, PORT_GAP, PORT_TOP } from '../portGeometry';
export { PORT_GAP, PORT_TOP } from '../portGeometry';
export const PORT_INSET_X = 8;

/** The six port shapes (pt2 handoff §3) from a port's wire count: outline
 * bar open, amber pip when wanted-but-empty, filled bar at 1 wire, a flare
 * mouth at 2-4, a wider flare at 5+. Merged (collapsed) renders as a dot. */
function portStateClass(port: PortDef, count: number): string {
  if (count === 0) return port.flagWhenEmpty ? 'is-open is-wanted' : 'is-open';
  if (count === 1) return 'is-wired';
  if (count <= 4) return 'is-wired is-flare';
  return 'is-wired is-flare-heavy';
}

function PortStars({
  nodeId,
  ports,
  side,
  counts,
  merged,
  candidates,
  broadcasting,
  autoSides,
}: {
  nodeId: string;
  ports: PortDef[];
  side: 'left' | 'right' | 'top' | 'bottom';
  /** Live wires per port id -- drives the shape variant AND the meta rail. */
  counts: ReadonlyMap<string, number>;
  /** Collapsed plate: every handle stays MOUNTED (wires must never drop --
   * v1 lesson: an edge without its handle cannot render) but they stack at
   * one spot and read as a single dot per side. */
  merged?: boolean;
  /** Drag-time broadcast: ports the dragged wire could land on light up
   * in their kind color; the rest step back while a drag is live. */
  candidates?: ReadonlySet<string>;
  broadcasting?: boolean;
  /** Per-port dynamic overrides computed from partner positions */
  autoSides?: Record<string, 'left' | 'right' | 'top' | 'bottom'>;
}) {
  const getSide = (portId: string) => autoSides?.[portId] ?? side;
  const getPosition = (portSide: string) =>
    portSide === 'left' ? Position.Left :
    portSide === 'right' ? Position.Right :
    portSide === 'top' ? Position.Top : Position.Bottom;
  
  const broadcastClass = (portId: string) =>
    candidates?.has(portId) ? 'is-candidate' : broadcasting ? 'is-bystander' : '';
  
  const getStyle = (index: number, portSide: string) => {
    if (merged) {
      if (portSide === 'top' || portSide === 'bottom') return { left: '50%', [portSide === 'top' ? 'top' : 'bottom']: 2 };
      return { top: '50%', [portSide === 'left' ? 'left' : 'right']: 2 };
    }
    
    if (portSide === 'top' || portSide === 'bottom') {
      // Horizontal distribution for top/bottom ports
      return {
        left: `${PORT_TOP + index * PORT_GAP}px`,
        [portSide === 'top' ? 'top' : 'bottom']: 2,
      };
    }
    
    // Vertical distribution for left/right ports
    return {
      top: `${PORT_TOP + index * PORT_GAP}px`,
      [portSide === 'left' ? 'left' : 'right']: 2,
    };
  };

  return (
    <>
      {ports.map((port, index) => {
        const portSide = getSide(port.id);
        return (
          <Handle
            key={port.id}
            id={port.id}
            type="source"
            position={getPosition(portSide)}
            className={`port-star kind-${port.dataKind} ${portStateClass(port, counts.get(port.id) ?? 0)} ${merged ? 'is-merged' : ''} ${port.defaultVisible || merged ? '' : 'is-hidden-port'} ${broadcastClass(port.id)}`}
            style={{
              ...getStyle(index, portSide),
              ['--port-color' as string]: PORT_KIND_COLORS[port.dataKind] ?? '#8e94c2',
            }}
            data-port-label={port.label}
            data-port-direction={port.direction}
          />
        );
      })}
      {!merged &&
        ports.map((port, index) => {
          const portSide = getSide(port.id);
          return (
            <span
              key={`${port.id}-label`}
              className={`port-label side-${portSide} ${port.defaultVisible ? '' : 'is-hidden-port'} ${broadcastClass(port.id)}`}
              style={{
                ...(portSide === 'top' || portSide === 'bottom'
                  ? { left: `${PORT_TOP + index * PORT_GAP}px`, [portSide === 'top' ? 'top' : 'bottom']: -20 }
                  : { top: `${PORT_TOP + index * PORT_GAP}px` }),
                ['--port-color' as string]: PORT_KIND_COLORS[port.dataKind] ?? '#8e94c2',
              }}
              data-for-node={nodeId}
            >
              {port.label}
            </span>
          );
        })}
    </>
  );
}

/** RELATE anchors -- the plain-edge connector (I1), folded into the gutters
 * with the rest of the connection system (user, 2026-08-09): a quiet
 * diamond at the top of each gutter, outline when unused, gold when the
 * node has relationships. Handle ids stay 'top'/'bottom' so every stored
 * edge in every existing document re-anchors with ZERO migration. */
function RelateAnchors({ related }: { related: boolean }) {
  const cls = `node-handle relate-anchor ${related ? 'is-related' : ''}`;
  return (
    <>
      <Handle
        id="top"
        type="source"
        position={Position.Left}
        className={cls}
        style={{ top: 14, left: 2 }}
        data-relate-anchor
      />
      <Handle
        id="bottom"
        type="source"
        position={Position.Right}
        className={cls}
        style={{ top: 14, right: 2 }}
        data-relate-anchor
      />
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
  // Wired ports + in/out counts feed the port grammar (filled slot = real
  // wire) and the meta rail. String signature so pans/typing never re-render.
  const wireSignature = useCanvasStore((state) => {
    const ids: string[] = [];
    let intake = 0;
    let output = 0;
    for (const wire of state.document.wires) {
      if (wire.status !== 'live') continue;
      if (wire.source === id) {
        ids.push(wire.sourcePort);
        output++;
      }
      if (wire.target === id) {
        ids.push(wire.targetPort);
        intake++;
      }
    }
    return `${intake}|${output}|${ids.sort().join(' ')}`;
  });
  const [wiresIn = '0', wiresOut = '0', wiredList = ''] = wireSignature.split('|');
  const wiredPorts = useMemo(
    () => new Set(wiredList === '' ? [] : wiredList.split(' ')),
    [wiredList],
  );

  // Four-sided ports: the SHARED decision (portGeometry.ts). The harness's
  // anchorFor makes the identical call, so the DOM handle and the wire
  // anchor can never land on different edges (a disagreement renders as a
  // permanently ghosted wire). Absent entries fall back to the grammar side.
  const autoSides = useCanvasStore(
    useShallow((state) => {
      const sides: Record<string, 'left' | 'right' | 'top' | 'bottom'> = {};
      const thisNode = state.document.nodes.find((n) => n.id === id);
      if (!thisNode) return sides;
      const ports = getNodeDef(thisNode.type)?.ports ?? [];
      for (const port of ports) {
        const side = autoSideFor(state.document, id, port.id, state.openNodeId);
        if (side !== null) sides[port.id] = side;
      }
      return sides;
    }),
  );
  // Wires PER port (the signature keeps duplicates) -- a port with one
  // wire is a filled bar, 2-4 a flare, 5+ a wide flare (pt2 handoff §3).
  const wireCounts = useMemo(() => {
    const counts = new Map<string, number>();
    if (wiredList !== '') {
      for (const portId of wiredList.split(' ')) {
        counts.set(portId, (counts.get(portId) ?? 0) + 1);
      }
    }
    return counts;
  }, [wiredList]);
  // Relate anchors fill gold once the node carries any relationship --
  // same filled-means-real grammar as the port slots.
  const hasPlainEdges = useCanvasStore((state) =>
    state.document.edges.some((edge) => edge.source === id || edge.target === id),
  );
  // Gutter swap (user, 2026-08-10): the grammar stays fixed -- intake one
  // side, output the other -- but a node can FLIP so it faces its
  // partners instead of forcing the wire the long way around.
  const flipped = data.flipped === true;
  const takeSide = flipped ? ('right' as const) : ('left' as const);
  const giveSide = flipped ? ('left' as const) : ('right' as const);
  // Gutter grammar (user, 2026-08-09): each gutter wears an OUTLINE at rest
  // and FILLS once it carries a connection -- the same filled-means-real
  // rule the slots and diamonds follow, scaled up to the whole rail.
  const leftUsed = Number(flipped ? wiresOut : wiresIn) > 0 || hasPlainEdges;
  const rightUsed = Number(flipped ? wiresIn : wiresOut) > 0 || hasPlainEdges;
  // Drag-time broadcast: which of THIS plate's ports the wire being
  // dragged could land on. String signature so only drags re-render.
  const broadcasting = useCanvasStore((state) => state.connectCandidates !== null);
  const candidateSignature = useCanvasStore((state) => {
    if (state.connectCandidates === null) return '';
    let joined = '';
    for (const key of state.connectCandidates) {
      if (key.startsWith(`${id}:`)) joined += `${key.slice(id.length + 1)} `;
    }
    return joined;
  });
  const candidatePorts = useMemo(
    () =>
      new Set(candidateSignature.trim() === '' ? [] : candidateSignature.trim().split(' ')),
    [candidateSignature],
  );
  const toggleNodeFlipped = useCanvasStore((state) => state.toggleNodeFlipped);
  const updateNodeInternals = useUpdateNodeInternals();
  const cardRef = useRef<HTMLDivElement>(null);
  // "✎ edited in <doc>" -- this node's text was forked inside a document;
  // the original here is untouched, and the notice can SHOW the document's
  // edited version (user request 2026-07-15). Select a string signature so
  // this memoized node only re-renders when a fork actually changes.
  const forkSignature = useCanvasStore((state) =>
    forkNoticesFor(state.document, id)
      .map((notice) => `${notice.documentId}\u0000${notice.blockId}\u0000${notice.fork}`)
      .join('\u0001'),
  );
  const forkNotices = useMemo(
    () => forkNoticesFor(useCanvasStore.getState().document, id),
    // recompute exactly when a fork appears/changes/clears (the signature)
    [forkSignature, id],
  );
  const applyEmbedIn = useCanvasStore((state) => state.applyEmbedIn);
  const [openForkKey, setOpenForkKey] = useState<string | null>(null);

  const [accentPickerOpen, setAccentPickerOpen] = useState(false);
  // Open state (Observatory §10): session-only; wins over collapse.
  const isOpen = useCanvasStore((state) => state.openNodeId === id);
  const setOpenNode = useCanvasStore((state) => state.setOpenNode);
  const openFocusEditor = useCanvasStore((state) => state.openEditor);
  const openDocRoom = useCanvasStore((state) => state.openDocRoom);
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
    // The OPEN state borrows its size (Observatory §10) -- recording its
    // measured height would turn opening into a document write. Observation
    // pauses while open and resumes with the settled height on close.
    if (isOpen) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) recordMeasuredHeight(id, entry.contentRect.height);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [id, recordMeasuredHeight, isOpen]);

  // Collapse (Observatory §2): the stored value is data.collapsed; zoom
  // below 45% BORROWS collapsed rendering without ever writing it back.
  const zoomBorrow = useCanvasStore((state) => state.zoomBorrow);
  const isCollapsed = !isOpen && (data.collapsed === 'collapsed' || zoomBorrow);

  // React Flow requirement: whenever the set of rendered handles CHANGES at
  // runtime (port visibility, size), re-register the node's internals. The
  // MOUNT run is skipped: RF measures a node's handles natively on first
  // render, and calling updateNodeInternals from every mounting node made
  // 500-node boots quadratic (each call notifies every RF subscriber -- the
  // Chunk 18 stress spec measured a 36s hang from this line alone).
  // autoSides rides in the signature: a port MIGRATING to another edge
  // moves its handle, and RF's cached handle bounds must follow or every
  // wire into that port draws from the old spot (renders as a ghost).
  const handleSignature = `${allPorts.map((port) => port.id).join(',')}:${data.ownedHeight ?? ''}:${isCollapsed ? 'c' : isOpen ? 'o' : 'f'}:${flipped ? 'x' : ''}:${Object.entries(autoSides)
    .map(([portId, portSide]) => `${portId}=${portSide}`)
    .join(',')}`;
  const prevSignatureRef = useRef<string | null>(null);
  useEffect(() => {
    if (prevSignatureRef.current === handleSignature) return;
    const isMount = prevSignatureRef.current === null;
    prevSignatureRef.current = handleSignature;
    if (!isMount) updateNodeInternals(id);
  }, [id, handleSignature, updateNodeInternals]);

  const TabIcon = NODE_ICONS[data.coreType] ?? Box;
  // The plate's spine and header tint come from its PRIMARY GIVE's dataKind
  // (the colour of what this node produces). A user accent overrides.
  const primaryKind = gives[0]?.dataKind ?? takes[0]?.dataKind;
  const kindHue =
    data.accent ?? (primaryKind ? DATA_KIND_STYLES[primaryKind].hue : DATA_KIND_STYLES.any.hue);
  const shortId = id.replace(/^node_/, '').slice(0, 4).toUpperCase();
  const words = wordCount(data.content);

  // OPEN plate (Observatory §10): grown in place to 736px -- one quiet
  // header line, a linked rail of port chips, the writing column, a footer
  // rail with the word bar and the Focus step. The canvas dims behind via
  // the plate's own spread shadow; Esc (Canvas-level) returns to the map.
  // Every handle stays mounted at its usual spot so no wire can drop.
  if (isOpen) {
    const progress = Math.min(1, words / 1000);
    const chip = (port: PortDef) => (
      <span
        key={port.id}
        className={`open-chip ${wiredPorts.has(port.id) ? 'is-wired' : ''}`}
        style={{ ['--port-color' as string]: PORT_KIND_COLORS[port.dataKind] ?? '#8e94c2' }}
        title={`${port.label} · ${port.dataKind}${wiredPorts.has(port.id) ? ' · wired' : ''}`}
      >
        {port.label}
      </span>
    );
    return (
      <div
        ref={cardRef}
        className={`canvas-node is-open ${selected ? 'is-selected' : ''}`}
        style={{ ['--accent' as string]: accent, ['--kind' as string]: kindHue }}
        data-open-plate
      >
        <span className={`plate-spine ${data.coreType === 'question' ? 'is-dashed' : ''}`} aria-hidden />
        <span
          className={`canvas-node-gutter gutter-left ${(flipped ? gives : takes).length > 0 ? '' : 'is-empty'} ${leftUsed ? 'is-used' : ''}`}
          aria-hidden
        />
        <div className="plate-column">
          <header className="canvas-node-header plate-header">
            <TabIcon size={10} aria-hidden className="canvas-node-glyph" />
            <span className="canvas-node-kind">
              {def ? nodeLabel(def.type, 'universal') : data.coreType}
            </span>
            <span className="plate-spacer" aria-hidden />
            <span className="open-words">{words} w</span>
            <ReadinessRing stage={readiness} onClick={() => cycleReadiness(id)} />
            <button
              className="open-close nodrag"
              aria-label="Back to the map"
              title="Back to the map (Esc)"
              onClick={() => setOpenNode(null)}
            >
              <Minimize2 size={11} aria-hidden />
            </button>
          </header>
          <span className="plate-rule is-tinted" aria-hidden />
          <div className="open-body">
            <aside className="open-rail nodrag" data-open-rail>
              {takes.length > 0 && <p className="open-rail-title">Takes</p>}
              {takes.map(chip)}
              {gives.length > 0 && <p className="open-rail-title">Gives</p>}
              {gives.map(chip)}
            </aside>
            <div className="open-column nowheel">
              {!faceOwnsTitle && (
                <input
                  className="canvas-node-title open-title nodrag"
                  value={data.title}
                  placeholder="Untitled"
                  onChange={(event) => setNodeTitle(id, event.target.value)}
                />
              )}
              <Face nodeId={id} title={data.title} content={data.content} />
            </div>
          </div>
          <span className="plate-rule" aria-hidden />
          <footer className="open-footer nodrag">
            <span className="open-progress" aria-hidden>
              <i style={{ width: `${progress * 100}%` }} />
            </span>
            <span>{words} words</span>
            <button
              className="open-focus"
              title="Focus: one column, no canvas (⇧F)"
              onClick={() =>
                data.coreType === 'document' ? openDocRoom(id) : openFocusEditor(id)
              }
            >
              Focus
            </button>
          </footer>
        </div>
        <span
          className={`canvas-node-gutter gutter-right ${(flipped ? takes : gives).length > 0 ? '' : 'is-empty'} ${rightUsed ? 'is-used' : ''}`}
          aria-hidden
        />
        <PortStars nodeId={id} ports={takes} side={takeSide} counts={wireCounts} candidates={candidatePorts} broadcasting={broadcasting} autoSides={autoSides} />
        <PortStars nodeId={id} ports={gives} side={giveSide} counts={wireCounts} candidates={candidatePorts} broadcasting={broadcasting} autoSides={autoSides} />
        <RelateAnchors related={hasPlainEdges} />
      </div>
    );
  }

  // Collapsed plate: title + one subtitle line + readiness ring; ports
  // merge to one dot per side (handles stay mounted so no wire can drop).
  if (isCollapsed) {
    const subtitle = stripHtml(data.content).trim().replace(/\s+/g, ' ').slice(0, 90);
    return (
      <div
        ref={cardRef}
        className={`canvas-node is-collapsed ${selected ? 'is-selected' : ''}`}
        style={{ ['--accent' as string]: accent, ['--kind' as string]: kindHue }}
      >
        {waiting > 0 && (
          <span className="waiting-badge" title={`${waiting} idea${waiting === 1 ? '' : 's'} waiting to land here`}>
            {waiting} waiting
          </span>
        )}
        {selected && (
          <>
            <i className="plate-tick tick-tl" aria-hidden />
            <i className="plate-tick tick-tr" aria-hidden />
            <i className="plate-tick tick-bl" aria-hidden />
            <i className="plate-tick tick-br" aria-hidden />
          </>
        )}
        <span className={`plate-spine ${data.coreType === 'question' ? 'is-dashed' : ''}`} aria-hidden />
        <span
          className={`canvas-node-gutter gutter-left ${(flipped ? gives : takes).length > 0 ? '' : 'is-empty'} ${leftUsed ? 'is-used' : ''}`}
          aria-hidden
        />
        <div className="plate-column">
          <header className="canvas-node-header plate-header">
            <TabIcon size={10} aria-hidden className="canvas-node-glyph" />
            <span className="canvas-node-kind">
              {def ? nodeLabel(def.type, 'universal') : data.coreType}
            </span>
            <span className="plate-spacer" aria-hidden />
            <ReadinessRing stage={readiness} onClick={() => cycleReadiness(id)} />
          </header>
          <span className="plate-rule is-tinted" aria-hidden />
          <div className="plate-collapsed-body" data-collapsed-body>
            <span className="plate-collapsed-title">{data.title || 'Untitled'}</span>
            {subtitle !== '' && <span className="plate-subtitle">{subtitle}</span>}
          </div>
        </div>
        <span
          className={`canvas-node-gutter gutter-right ${(flipped ? takes : gives).length > 0 ? '' : 'is-empty'} ${rightUsed ? 'is-used' : ''}`}
          aria-hidden
        />
        <PortStars nodeId={id} ports={takes} side={takeSide} counts={wireCounts} merged candidates={candidatePorts} broadcasting={broadcasting} autoSides={autoSides} />
        <PortStars nodeId={id} ports={gives} side={giveSide} counts={wireCounts} merged candidates={candidatePorts} broadcasting={broadcasting} autoSides={autoSides} />
        <RelateAnchors related={hasPlainEdges} />
      </div>
    );
  }

  return (
    <div
      ref={cardRef}
      className={`canvas-node ${selected ? 'is-selected' : ''}`}
      style={{ ['--accent' as string]: accent, ['--kind' as string]: kindHue }}
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
      {/* selection registration ticks (Observatory: 4 corners, 10x10) */}
      {selected && (
        <>
          <i className="plate-tick tick-tl" aria-hidden />
          <i className="plate-tick tick-tr" aria-hidden />
          <i className="plate-tick tick-bl" aria-hidden />
          <i className="plate-tick tick-br" aria-hidden />
        </>
      )}
      {/* type spine: 3px, the colour of what this node gives, fading down */}
      <span className={`plate-spine ${data.coreType === 'question' ? 'is-dashed' : ''}`} aria-hidden />
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
      {/* Port gutters (Observatory zone 2/4): takes enter LEFT, gives leave
          RIGHT; a side with no ports keeps a whisper so the grammar reads. */}
      <span
        className={`canvas-node-gutter gutter-left ${(flipped ? gives : takes).length > 0 ? '' : 'is-empty'} ${leftUsed ? 'is-used' : ''}`}
        aria-hidden
      />
      <div className="plate-column">
        <header className="canvas-node-header plate-header">
          <TabIcon size={10} aria-hidden className="canvas-node-glyph" />
          <button
            className="canvas-node-kind nodrag"
            title="Change this node's color"
            onClick={() => setAccentPickerOpen((open) => !open)}
          >
            {def ? nodeLabel(def.type, 'universal') : data.coreType}
          </button>
          {flaggedPorts.length > 0 && (
            <span className="hygiene-dot" title={flaggedPorts.join('; ')} data-hygiene-flag />
          )}
          {forkNotices.length > 0 && (
            <span
              className="fork-pill"
              title={`Text forked in ${forkNotices.map((notice) => notice.documentTitle).join(', ')} — details below`}
              data-fork-pill
            >
              <GitBranch size={9} aria-hidden />
              {forkNotices.length} fork{forkNotices.length === 1 ? '' : 's'}
            </span>
          )}
          <span className="plate-spacer" aria-hidden />
          {owner && (
            <span className="owner-chip" title={`Owner: ${owner}`}>
              {owner}
            </span>
          )}
          <span className="plate-id" aria-hidden>
            {shortId}
          </span>
          <ReadinessRing stage={readiness} onClick={() => cycleReadiness(id)} />
          {selected && (
            <button
              className="canvas-node-swap nodrag"
              title={
                flipped
                  ? 'Swap back: intake left, output right'
                  : 'Swap sides: intake and output trade gutters'
              }
              aria-label="Swap connection sides"
              onClick={() => toggleNodeFlipped(id)}
            >
              <ArrowLeftRight size={11} aria-hidden />
            </button>
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
        <span className="plate-rule is-tinted" aria-hidden />
        {/* is-owned: a user-owned height turns the body into a scrolling
            window (nowheel lets the wheel scroll it instead of zooming). */}
        <div className={`canvas-node-main${data.ownedHeight !== undefined ? ' is-owned nowheel' : ''}`}>
          {!faceOwnsTitle && (
            <input
              className="canvas-node-title nodrag"
              value={data.title}
              placeholder="Untitled"
              onChange={(event) => setNodeTitle(id, event.target.value)}
            />
          )}
          <Face nodeId={id} title={data.title} content={data.content} />
        {forkNotices.length > 0 && (
          <div className="fork-notice nodrag" data-fork-notice>
            {forkNotices.map((notice) => {
              const key = `${notice.documentId}:${notice.blockId}`;
              const open = openForkKey === key;
              return (
                <div key={key} className="fork-notice-row">
                  <button
                    className="fork-notice-toggle"
                    title="The original text here is untouched — click to see the document's version"
                    aria-expanded={open}
                    onClick={() => setOpenForkKey(open ? null : key)}
                  >
                    ✎ edited in {notice.documentTitle} {open ? '▾' : '▸'}
                  </button>
                  {open && (
                    <div className="fork-notice-body" data-fork-preview>
                      <span className="fork-notice-text">{stripHtml(notice.fork)}</span>
                      <button
                        className="fork-notice-apply"
                        title="Replace this node's text with the document's version"
                        onClick={() => {
                          applyEmbedIn(notice.documentId, notice.blockId);
                          setOpenForkKey(null);
                        }}
                      >
                        use this version
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
        </div>
        <span className="plate-rule" aria-hidden />
        {/* meta rail (Observatory zone 5): the truth strip -- counts must
            match the wires actually attached */}
        <footer className="plate-meta" aria-hidden>
          <span>{words} w</span>
          <span>
            {wiresIn} in · {wiresOut} out
          </span>
          {forkNotices.length > 0 && (
            <span className="plate-meta-diverged">
              diverged in {forkNotices[0]!.documentTitle}
              {forkNotices.length > 1 ? ` +${forkNotices.length - 1}` : ''}
            </span>
          )}
          <span className="plate-meta-state">{readiness}</span>
        </footer>
      </div>
      <span
        className={`canvas-node-gutter gutter-right ${(flipped ? takes : gives).length > 0 ? '' : 'is-empty'} ${rightUsed ? 'is-used' : ''}`}
        aria-hidden
      />
      <PortStars nodeId={id} ports={takes} side={takeSide} counts={wireCounts} candidates={candidatePorts} broadcasting={broadcasting} autoSides={autoSides} />
      <PortStars nodeId={id} ports={gives} side={giveSide} counts={wireCounts} candidates={candidatePorts} broadcasting={broadcasting} autoSides={autoSides} />
      <RelateAnchors related={hasPlainEdges} />
    </div>
  );
}

export const CanvasNode = memo(CanvasNodeComponent);
