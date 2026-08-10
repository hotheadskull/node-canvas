// The canvas. Rules encoded here:
// - nodeTypes/edgeTypes are module-level constants (perf target: defined once)
// - NO fitView prop and no programmatic viewport moves on load (I5): the
//   viewport comes from defaultViewport (persisted) and only the user's
//   pan/zoom or the toolbar Fit button ever changes it
// - every mutation routes through the store into core ops (I7)
// - React Flow state is kept with applyNodeChanges/applyEdgeChanges so RF's
//   OWN changes (measurements, selection) are never dropped -- dropping the
//   'dimensions' changes silently breaks all edge rendering. The core
//   document stays the data truth: positions, sizes, titles, wiring.
//
// Connection grammar (user-approved Chunk 4 design):
// - top/bottom dots <-> top/bottom dots: plain relationship edge (I1)
// - give star -> take star: live data wire (validated, live-colored)
// - take star -> give star: same wire, drawn backwards (users do both)
// - give star -> a node's plain dot: TENTATIVE wire into the first
//   compatible intake ("this might go here")

import {
  applyEdgeChanges,
  applyNodeChanges,
  ConnectionMode,
  ReactFlow,
  useReactFlow,
  type Connection,
  type Edge,
  type IsValidConnection,
  type Node,
  type NodeChange,
  type EdgeChange,
} from '@xyflow/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  arcOutline,
  displayEndpoint,
  getPort,
  hiddenIds,
  isValidWire,
  setAssemblyCollapsed,
} from '@node-canvas/core';
import { AddNodeMenu } from './components/AddNodeMenu';
import { ArcRoom } from './components/ArcRoom';
import { AssemblyFace } from './components/AssemblyFace';
import { DocumentRoom } from './components/DocumentRoom';
import { CanvasNode } from './components/CanvasNode';
import { CommandPalette } from './components/CommandPalette';
import { FocusEditor } from './components/FocusEditor';
import { PlainEdge } from './components/PlainEdge';
import { Starfield } from './components/Starfield';
import { TipsPanel } from './components/TipsPanel';
import { Toast } from './components/Toast';
import { Toolbar } from './components/Toolbar';
import { Tutorial } from './components/Tutorial';
import { WireEdge } from './components/WireEdge';
import { firstCompatibleTake, PLAIN_HANDLES, useCanvasStore } from './store/canvasStore';
import { computeHarness, type FlatHarness } from './harnessRouting';

const nodeTypes = { canvas: CanvasNode, assembly: AssemblyFace };
const edgeTypes = { plain: PlainEdge, wire: WireEdge };

// ---- Identity-preserving sync (Chunk 18 perf pass) ----
// The document->RF sync effects used to mint a fresh object for EVERY node
// and edge on EVERY document commit, so React.memo never skipped anything and
// each keystroke re-rendered every visible card (TipTap included). The CPU
// profile of the 500-node stress boot was pure render churn. Rebuilt objects
// that carry no real change are swapped back for their existing instance so
// memoized renderers bail out; RF-owned runtime fields (selection, dragging,
// measured) are ignored by the comparison and survive either way.
const RF_OWNED_FIELDS = new Set(['selected', 'dragging', 'measured', 'resizing']);

function shallowEqual(a: Record<string, unknown>, b: Record<string, unknown>): boolean {
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;
  return aKeys.every((key) => a[key] === b[key]);
}

function keepIdentity<T extends Record<string, unknown>>(existing: T | undefined, candidate: T): T {
  if (!existing) return candidate;
  const keys = new Set([...Object.keys(existing), ...Object.keys(candidate)]);
  for (const key of keys) {
    if (RF_OWNED_FIELDS.has(key)) continue;
    const a = existing[key];
    const b = candidate[key];
    if (a === b) continue;
    if (
      a !== null && b !== null &&
      typeof a === 'object' && typeof b === 'object' &&
      !Array.isArray(a) && !Array.isArray(b) &&
      shallowEqual(a as Record<string, unknown>, b as Record<string, unknown>)
    ) {
      continue;
    }
    return candidate;
  }
  return existing;
}

/** Return `current` itself when nothing changed, so setState bails too. */
function keepArrayIdentity<T>(current: T[], next: T[]): T[] {
  return next.length === current.length && next.every((item, index) => item === current[index])
    ? current
    : next;
}

export function Canvas() {
  const document = useCanvasStore((state) => state.document);
  const initialViewport = useCanvasStore((state) => state.initialViewport);
  const settings = useCanvasStore((state) => state.settings);
  const moveNode = useCanvasStore((state) => state.moveNode);
  const deleteNode = useCanvasStore((state) => state.deleteNode);
  const deleteEdge = useCanvasStore((state) => state.deleteEdge);
  const deleteWire = useCanvasStore((state) => state.deleteWire);
  const dissolveWire = useCanvasStore((state) => state.dissolveWire);
  const connectFromHandles = useCanvasStore((state) => state.connectFromHandles);
  const spawnAt = useCanvasStore((state) => state.spawnAt);
  const saveViewport = useCanvasStore((state) => state.saveViewport);
  const moveAssemblyTo = useCanvasStore((state) => state.moveAssemblyTo);
  const unpack = useCanvasStore((state) => state.unpack);
  const gatherSelection = useCanvasStore((state) => state.gatherSelection);
  const drillTo = useCanvasStore((state) => state.drillTo);
  const exportingCanvas = useCanvasStore((state) => state.exportingCanvas);

  const [menuOpen, setMenuOpen] = useState(false);
  const [rfNodes, setRfNodes] = useState<Node[]>([]);
  const [rfEdges, setRfEdges] = useState<Edge[]>([]);
  // Nodes are handed to RF only after it has MEASURED its container. Before
  // that, onlyRenderVisibleElements has a 0x0 viewport to test against and
  // mounts EVERY node -- on a 500-node canvas that meant ~500 TipTap editors
  // built and immediately unmounted (a 27s boot, found by the stress spec).
  const [flowReady, setFlowReady] = useState(false);
  // Any node mid-drag? The harness freezes (spec §4: wires drop to a ghost
  // line during a drag and settle on release) -- and skipping recompute per
  // drag frame is also the perf answer for the O(n²) hop pass.
  const [draggingCount, setDraggingCount] = useState(0);

  // ⌥⇧A: collapse everything / expand everything (Observatory §2). If any
  // plate is still full, the sweep collapses; otherwise it expands.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!event.altKey || !event.shiftKey || event.code !== 'KeyA') return;
      const target = event.target as HTMLElement | null;
      if (target && /^(input|textarea)$/i.test(target.tagName)) return;
      if (target?.isContentEditable) return;
      event.preventDefault();
      const store = useCanvasStore.getState();
      const anyFull = store.document.nodes.some(
        (node) => node.data['collapsed'] !== 'collapsed',
      );
      store.setAllCollapsed(anyFull);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  // Semantic zoom: past the far threshold, collapsed assemblies render as
  // glowing star points (the theme made mechanical + the perf lever).
  const [zoomBucket, setZoomBucket] = useState<'near' | 'far'>('near');
  const { screenToFlowPosition, getViewport, setCenter } = useReactFlow();
  const drillStack = useCanvasStore((state) => state.drillStack);
  const drilled = drillStack.length > 0 ? drillStack[drillStack.length - 1] : null;

  // Visibility model:
  // - viewDoc treats drilled assemblies as expanded (drilling into a
  //   collapsed group must show its members)
  // - hidden = everything inside a collapsed assembly (transitive)
  // - drill mode additionally scopes the canvas to the drilled assembly's
  //   DIRECT members (nested collapsed groups still render as faces)
  const view = useMemo(() => {
    const viewDoc = drillStack.reduce(
      (doc, assemblyId) => setAssemblyCollapsed(doc, assemblyId, false),
      document,
    );
    const hidden = hiddenIds(viewDoc);
    const drilledAssembly = drilled
      ? viewDoc.assemblies.find((assembly) => assembly.id === drilled)
      : null;
    const scope = drilledAssembly ? new Set(drilledAssembly.memberIds) : null;
    const nodeVisible = (id: string) =>
      !hidden.has(id) && (scope === null || scope.has(id));
    const assemblyVisible = (id: string) =>
      !hidden.has(id) && id !== drilled && (scope === null || scope.has(id));
    // Drilling into an Arc group shows its propositions as PHRASING STRIPS
    // (user-picked design C): indent derived from subordination. Display
    // positions only -- stored positions never change, dragging is off (I5).
    let phrasing: Map<string, { level: number; order: number }> | null = null;
    if (drilledAssembly) {
      const outline = arcOutline(document, drilledAssembly.memberIds);
      if (outline.propCount >= 2) {
        phrasing = new Map(
          outline.entries.map((entry, order) => [entry.nodeId, { level: entry.level, order }]),
        );
      }
    }
    const phrasingOrigin = drilledAssembly?.position ?? { x: 0, y: 0 };
    return { viewDoc, hidden, nodeVisible, assemblyVisible, phrasing, phrasingOrigin };
  }, [document, drillStack, drilled]);

  // The routed harness for every visible live wire. FROZEN while a drag is
  // in flight: WireEdge sees its live handle coords diverge from the frozen
  // anchors and drops to a ghost line; the drop recomputes and settles.
  const zoomBorrow = useCanvasStore((state) => state.zoomBorrow);
  const openNodeId = useCanvasStore((state) => state.openNodeId);
  const harnessRef = useRef<Map<string, FlatHarness>>(new Map());
  const harness = useMemo(() => {
    if (draggingCount > 0) return harnessRef.current;
    const endpointShown = (id: string) => view.nodeVisible(id);
    const next = computeHarness(
      document,
      (wire) =>
        endpointShown(wire.source) &&
        endpointShown(wire.target) &&
        displayEndpoint(view.viewDoc, wire.source) === wire.source &&
        displayEndpoint(view.viewDoc, wire.target) === wire.target,
      zoomBorrow,
      view.nodeVisible,
      openNodeId,
    );
    harnessRef.current = next;
    return next;
  }, [document, view, zoomBorrow, draggingCount, openNodeId]);

  // Esc closes the open plate (unless a fuller overlay is up -- those own
  // Esc); ⇧F from the open plate steps into the focus room (spec §10).
  useEffect(() => {
    if (openNodeId === null) return;
    const onKey = (event: KeyboardEvent) => {
      const store = useCanvasStore.getState();
      if (store.editorNodeId !== null || store.docRoomId !== null) return;
      const target = event.target as HTMLElement | null;
      const typing =
        (target && /^(input|textarea)$/i.test(target.tagName)) || target?.isContentEditable;
      if (event.key === 'Escape') {
        store.setOpenNode(null);
      } else if (event.shiftKey && event.code === 'KeyF' && !typing) {
        event.preventDefault();
        const openNode = store.document.nodes.find((node) => node.id === store.openNodeId);
        if (!openNode) return;
        if (openNode.type === 'document') store.openDocRoom(openNode.id);
        else store.openEditor(openNode.id);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [openNodeId]);

  // Sync core document -> RF state. Existing RF node objects are merged so
  // RF-owned fields (measured dims, selection, dragging) survive the sync.
  useEffect(() => {
    if (!flowReady) return;
    setRfNodes((current) => {
      const byId = new Map(current.map((node) => [node.id, node]));
      const canvasNodes = document.nodes
        .filter((docNode) => view.nodeVisible(docNode.id))
        .map((docNode) => {
          const existing = byId.get(docNode.id);
          const strip = view.phrasing?.get(docNode.id);
          // Drop RF-owned explicit dims on every sync: the NodeResizer writes
          // node.width/height during a resize, and a stale height would pin
          // the card after Fit hands ownership back to auto-growth.
          const { width: _staleW, height: _staleH, ...existingBase } = existing ?? ({} as Node);
          const owned = typeof docNode.data['ownedHeight'] === 'number';
          const isOpen = docNode.id === openNodeId;
          return keepIdentity(existing, {
            ...existingBase,
            id: docNode.id,
            type: 'canvas' as const,
            // Observatory §10: the open plate BORROWS a 736px render width
            // and rides above its neighbours; the stored size is untouched.
            ...(isOpen
              ? { width: 736, zIndex: 1200 }
              : docNode.size
                ? { width: docNode.size.width }
                : {}),
            ...(!isOpen && owned && docNode.size ? { height: docNode.size.height } : {}),
            // Size HINTS for the culling pass only (RF: measured ?? explicit
            // ?? initial). Without a height hint an unmeasured auto-height
            // node "has no dimensions", is exempt from culling, and mounts
            // just to be measured -- 500 TipTap editors at boot. The card's
            // real height still comes from CSS auto-growth after mount.
            ...(docNode.size
              ? { initialWidth: docNode.size.width, initialHeight: docNode.size.height }
              : {}),
            // phrasing strips take a DERIVED display position; the stored
            // position is untouched and dragging is disabled while displayed
            position: strip
              ? {
                  x: view.phrasingOrigin.x + strip.level * 72,
                  y: view.phrasingOrigin.y + strip.order * 96,
                }
              : docNode.position,
            className: strip ? 'phrasing-node' : '',
            draggable: !strip,
            data: {
              coreType: docNode.type,
              title: typeof docNode.data.title === 'string' ? docNode.data.title : '',
              content: typeof docNode.data.content === 'string' ? docNode.data.content : '',
              ...(typeof docNode.data['ownedHeight'] === 'number'
                ? { ownedHeight: docNode.data['ownedHeight'] }
                : {}),
              ...(typeof docNode.data['accent'] === 'string'
                ? { accent: docNode.data['accent'] }
                : {}),
              ...(docNode.data['collapsed'] === 'collapsed'
                ? { collapsed: 'collapsed' as const }
                : {}),
            },
          });
        });
      const faceNodes = document.assemblies
        .filter((assembly) => view.assemblyVisible(assembly.id))
        .map((assembly) =>
          keepIdentity(byId.get(assembly.id), {
            ...byId.get(assembly.id),
            id: assembly.id,
            type: 'assembly' as const,
            position: assembly.position,
            data: {
              assemblyId: assembly.id,
              name: assembly.name,
              collapsed: assembly.collapsed,
            },
          }),
        );
      return keepArrayIdentity(current, [...canvasNodes, ...faceNodes]);
    });
  }, [document.nodes, document.assemblies, view, flowReady, openNodeId]);

  useEffect(() => {
    if (!flowReady) return;
    setRfEdges((current) => {
      const byId = new Map(current.map((edge) => [edge.id, edge]));
      const endpointVisible = (id: string) =>
        view.nodeVisible(id) || view.assemblyVisible(id);
      // Boundary connections DRAW to the outermost collapsed face
      // (display-only remap; storage never changes). Handle ids are dropped
      // when an endpoint remaps -- the face resolves its unnamed handles.
      const plainEdges = document.edges.flatMap((docEdge) => {
        const source = displayEndpoint(view.viewDoc, docEdge.source);
        const target = displayEndpoint(view.viewDoc, docEdge.target);
        if (source === target) return []; // fully inside one collapsed face
        if (!endpointVisible(source) || !endpointVisible(target)) return [];
        const sourceRemapped = source !== docEdge.source;
        const targetRemapped = target !== docEdge.target;
        return [
          keepIdentity(byId.get(docEdge.id), {
            ...byId.get(docEdge.id),
            id: docEdge.id,
            type: 'plain' as const,
            source,
            target,
            ...(!sourceRemapped && docEdge.sourceHandle !== undefined
              ? { sourceHandle: docEdge.sourceHandle }
              : { sourceHandle: null }),
            ...(!targetRemapped && docEdge.targetHandle !== undefined
              ? { targetHandle: docEdge.targetHandle }
              : { targetHandle: null }),
            ...(docEdge.label !== undefined ? { label: docEdge.label } : {}),
          }),
        ];
      });
      // Animation budget (spec §5): ~8 animated wires. First N visible live
      // wires carry the signal; the rest stay static. Reduced-motion kills
      // every animation in CSS regardless.
      let animationBudget = 8;
      const wireEdges = document.wires.flatMap((wire) => {
        const source = displayEndpoint(view.viewDoc, wire.source);
        const target = displayEndpoint(view.viewDoc, wire.target);
        if (source === target) return [];
        if (!endpointVisible(source) || !endpointVisible(target)) return [];
        const sourceNode = document.nodes.find((node) => node.id === wire.source);
        const givePort = sourceNode ? getPort(sourceNode.type, wire.sourcePort) : undefined;
        const isArc = givePort?.dataKind === 'prop' && wire.targetPort === 'arc-in';
        const routed = harness.get(wire.id);
        const animate = wire.status === 'live' && animationBudget > 0 ? (animationBudget--, true) : false;
        return [
          keepIdentity(byId.get(wire.id), {
            ...byId.get(wire.id),
            id: wire.id,
            type: 'wire' as const,
            source,
            sourceHandle: source === wire.source ? wire.sourcePort : null,
            target,
            targetHandle: target === wire.target ? wire.targetPort : null,
            data: {
              status: wire.status,
              dataKind: givePort?.dataKind ?? '',
              portLabel: givePort?.label ?? wire.sourcePort,
              animate,
              ...(routed ?? {}),
              ...(isArc ? { isArc } : {}),
              ...(wire.relation !== undefined ? { relation: wire.relation } : {}),
              ...(wire.label !== undefined ? { label: wire.label } : {}),
            },
          }),
        ];
      });
      return keepArrayIdentity(current, [...plainEdges, ...wireEdges]);
    });
  }, [document.edges, document.wires, document.nodes, view, flowReady, harness]);

  const isAssemblyId = useCallback(
    (id: string) => document.assemblies.some((assembly) => assembly.id === id),
    [document.assemblies],
  );

  const onNodesChange = useCallback(
    (changes: NodeChange<Node>[]) => {
      setRfNodes((nodes) => applyNodeChanges(changes, nodes));
      // drag bookkeeping for the harness freeze (ghost-and-settle)
      for (const change of changes) {
        if (change.type === 'position' && change.dragging === true) {
          setDraggingCount((count) => (count === 0 ? 1 : count));
        } else if (change.type === 'position' && change.dragging === false) {
          setDraggingCount(0);
        }
      }
      for (const change of changes) {
        if (change.type === 'position' && change.position && !Number.isNaN(change.position.x)) {
          if (isAssemblyId(change.id)) moveAssemblyTo(change.id, change.position);
          else moveNode(change.id, change.position);
        } else if (change.type === 'remove') {
          // deleting a face unpacks the group -- member nodes are sacred (I3)
          if (isAssemblyId(change.id)) unpack(change.id);
          else deleteNode(change.id);
        }
      }
    },
    [moveNode, deleteNode, isAssemblyId, moveAssemblyTo, unpack],
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange<Edge>[]) => {
      setRfEdges((edges) => applyEdgeChanges(changes, edges));
      for (const change of changes) {
        if (change.type === 'remove') {
          const wire = document.wires.find((candidate) => candidate.id === change.id);
          if (wire) {
            if (wire.status === 'tentative') dissolveWire(change.id);
            else deleteWire(change.id);
          } else if (document.edges.some((edge) => edge.id === change.id)) {
            deleteEdge(change.id);
          }
        }
      }
    },
    [deleteEdge, deleteWire, dissolveWire, document.wires, document.edges],
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      if (connection.source && connection.target) {
        connectFromHandles(
          connection.source,
          connection.sourceHandle,
          connection.target,
          connection.targetHandle,
        );
      }
    },
    [connectFromHandles],
  );

  // Live valid/invalid coloring during a drag. Returning false BLOCKS the
  // drop and RF marks the hovered handle .invalid (styled red); true marks
  // it .valid (green glow).
  const isValidConnection: IsValidConnection = useCallback(
    (connection) => {
      const { source, target, sourceHandle, targetHandle } = connection;
      if (!source || !target) return false;
      const sourceIsPort = !!sourceHandle && !PLAIN_HANDLES.has(sourceHandle);
      const targetIsPort = !!targetHandle && !PLAIN_HANDLES.has(targetHandle);
      if (!sourceIsPort && !targetIsPort) {
        // plain relationship line: always allowed except self (I1)
        return source !== target;
      }
      const direction = (nodeId: string, portId: string) => {
        const node = document.nodes.find((candidate) => candidate.id === nodeId);
        return node ? getPort(node.type, portId)?.direction : undefined;
      };
      // document BLOCK handles: valid when the drag is a give that could
      // legally wire into the document's spine (it lands at that block)
      if (targetHandle?.startsWith('blk:')) {
        return (
          !!sourceHandle &&
          sourceIsPort &&
          direction(source, sourceHandle) === 'give' &&
          isValidWire(document, {
            source,
            sourcePort: sourceHandle,
            target,
            targetPort: 'sections-in',
          }).ok
        );
      }
      if (sourceIsPort && targetIsPort) {
        const forward = { source, sourcePort: sourceHandle, target, targetPort: targetHandle };
        const reversed = {
          source: target,
          sourcePort: targetHandle,
          target: source,
          targetPort: sourceHandle,
        };
        if (direction(source, sourceHandle) === 'give') {
          return isValidWire(document, forward).ok;
        }
        return isValidWire(document, reversed).ok;
      }
      // give star -> plain dot: allowed when the target has a compatible
      // intake (this creates a tentative wire)
      if (sourceIsPort && direction(source, sourceHandle) === 'give') {
        return (
          source !== target && firstCompatibleTake(document, source, sourceHandle, target) !== null
        );
      }
      // remaining mixed combos fall back to plain edges
      return source !== target;
    },
    [document],
  );

  const pickType = useCallback(
    (type: string) => {
      const center = screenToFlowPosition({
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
      });
      const id = spawnAt(type, center);
      setMenuOpen(false);
      if (!id) return;
      // Spawning is the user's explicit action, so the camera may follow a
      // node that landed off-view (v1 behavior; interaction rule 6 addendum).
      // Collision-free placement can push spawns outside the viewport, and an
      // invisible new node reads as "nothing happened".
      const spawned = useCanvasStore.getState().document.nodes.find((node) => node.id === id);
      if (!spawned) return;
      const { x, y, zoom } = getViewport();
      const view = {
        left: -x / zoom,
        top: -y / zoom,
        right: (window.innerWidth - x) / zoom,
        bottom: (window.innerHeight - y) / zoom,
      };
      const width = spawned.size?.width ?? 300;
      const height = spawned.size?.height ?? 200;
      const fullyVisible =
        spawned.position.x >= view.left &&
        spawned.position.y >= view.top &&
        spawned.position.x + width <= view.right &&
        spawned.position.y + height <= view.bottom;
      if (!fullyVisible) {
        void setCenter(spawned.position.x + width / 2, spawned.position.y + height / 2, {
          zoom,
          duration: 300,
        });
      }
    },
    [screenToFlowPosition, spawnAt, getViewport, setCenter],
  );

  const selectedIds = useMemo(
    () => rfNodes.filter((node) => node.selected).map((node) => node.id),
    [rfNodes],
  );

  const onGather = useCallback(() => {
    if (selectedIds.length >= 2) gatherSelection(selectedIds);
  }, [selectedIds, gatherSelection]);

  const breadcrumbNames = useMemo(
    () =>
      drillStack.map(
        (id) => document.assemblies.find((assembly) => assembly.id === id)?.name ?? 'Group',
      ),
    [drillStack, document.assemblies],
  );

  return (
    <div
      className={`canvas-root density-${settings.density} port-labels-${settings.portLabels} zoom-${zoomBucket}`}
    >
      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        isValidConnection={isValidConnection}
        onInit={() => setFlowReady(true)}
        defaultViewport={initialViewport}
        onMove={(_event, viewport) => {
          const bucket = viewport.zoom < 0.25 ? 'far' : 'near';
          setZoomBucket((current) => (current === bucket ? current : bucket));
          // <45%: plates RENDER collapsed; the stored per-node value is
          // never written (Observatory §2: zoom borrows, never overwrites)
          useCanvasStore.getState().setZoomBorrow(viewport.zoom < 0.45);
        }}
        onNodeClick={(event, node) => {
          // ⌥click: collapse/expand one plate. ⌥⇧click: the whole selection
          // rides along (Observatory §2 -- sticky, user-controlled).
          if (!event.altKey || node.type !== 'canvas') return;
          const store = useCanvasStore.getState();
          if (event.shiftKey) {
            const selected = rfNodes.filter((candidate) => candidate.selected && candidate.type === 'canvas');
            const targets = selected.some((candidate) => candidate.id === node.id)
              ? selected.map((candidate) => candidate.id)
              : [node.id];
            for (const id of targets) store.toggleNodeCollapsed(id);
            return;
          }
          store.toggleNodeCollapsed(node.id);
        }}
        onMoveEnd={(_event, viewport) => saveViewport(viewport)}
        /* Culling pauses during canvas image export so off-screen nodes
           render into the picture (the exportingCanvas flag round-trips) */
        onlyRenderVisibleElements={!exportingCanvas}
        connectionMode={ConnectionMode.Loose}
        connectionRadius={40}
        connectOnClick
        minZoom={0.05}
        maxZoom={2.5}
        deleteKeyCode={['Delete', 'Backspace']}
        zoomOnDoubleClick={false}
        onNodeDoubleClick={(_event, node) => {
          // Observatory §10: double-click grows a plate IN PLACE to the open
          // state; the Focus step (⇧F / footer button) is the full room.
          // Documents keep their fullscreen room (their content IS blocks);
          // on an assembly star/face it dives toward it (explicit action).
          if (node.type === 'canvas' && (node.data as { coreType?: string }).coreType === 'document') {
            useCanvasStore.getState().openDocRoom(node.id);
            return;
          }
          if (node.type === 'canvas') {
            useCanvasStore.getState().setOpenNode(node.id);
            return;
          }
          if (node.type === 'assembly') {
            void setCenter(node.position.x + 130, node.position.y + 70, {
              zoom: 1,
              duration: 400,
            });
          }
        }}
        onError={(code, message) => console.warn(`[RF ${code}] ${message}`)}
        proOptions={{ hideAttribution: true }}
        className="nodecanvas-flow"
      >
        <Starfield />
      </ReactFlow>
      {drillStack.length > 0 && (
        <nav className="breadcrumbs" aria-label="Group navigation">
          <button className="breadcrumb" onClick={() => drillTo(0)}>
            Canvas
          </button>
          {breadcrumbNames.map((name, index) => (
            <span key={`${index}-${name}`} className="breadcrumb-step">
              <span className="breadcrumb-sep">/</span>
              <button
                className="breadcrumb"
                disabled={index === drillStack.length - 1}
                onClick={() => drillTo(index + 1)}
              >
                {name}
              </button>
            </span>
          ))}
        </nav>
      )}
      <Toolbar
        menuOpen={menuOpen}
        onToggleMenu={() => setMenuOpen((open) => !open)}
        selectedCount={selectedIds.length}
        onGather={onGather}
      />
      {/* Legend removed at user request (2026-07-14) until a better design
          exists -- component kept at components/Legend.tsx for its return */}
      <Toast />
      <FocusEditor />
      <ArcRoom />
      <DocumentRoom />
      <CommandPalette />
      <Tutorial />
      <TipsPanel />
      {menuOpen && <AddNodeMenu onPick={pickType} onClose={() => setMenuOpen(false)} />}
    </div>
  );
}
