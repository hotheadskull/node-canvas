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
  getNodeDef,
  getPort,
  hiddenIds,
  isValidWire,
  setAssemblyCollapsed,
} from '@node-canvas/core';
import { AddNodeMenu } from './components/AddNodeMenu';
import { FilterBar } from './components/FilterBar';
import { ArcRoom } from './components/ArcRoom';
import { AssemblyFace } from './components/AssemblyFace';
import { DocumentRoom } from './components/DocumentRoom';
import { CanvasNode } from './components/CanvasNode';
import { ImageNode } from './components/ImageNode';
import { CommandPalette } from './components/CommandPalette';
import { FocusEditor } from './components/FocusEditor';
import { PlainEdge } from './components/PlainEdge';
import { Starfield } from './components/Starfield';
import { TipsPanel } from './components/TipsPanel';
import { Toast } from './components/Toast';
import { Toolbar } from './components/Toolbar';
import { Tutorial } from './components/Tutorial';
import { WireEdge } from './components/WireEdge';
import { InkLayer } from './components/InkLayer';
import { InkPalette } from './components/InkPalette';
import { firstCompatibleTake, PLAIN_HANDLES, useCanvasStore } from './store/canvasStore';
import { computeHarness, type FlatHarness } from './harnessRouting';

const nodeTypes = { canvas: CanvasNode, assembly: AssemblyFace, image: ImageNode };
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
  const inkMode = useCanvasStore((state) => state.inkMode);

  const [menuOpen, setMenuOpen] = useState(false);
  const [rfNodes, setRfNodes] = useState<Node[]>([]);
  const [rfEdges, setRfEdges] = useState<Edge[]>([]);
  const [flowReady, setFlowReady] = useState(false);
  const [draggingCount, setDraggingCount] = useState(0);

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
  const [zoomBucket, setZoomBucket] = useState<'near' | 'far'>('near');
  const { screenToFlowPosition, getViewport, setCenter } = useReactFlow();
  const drillStack = useCanvasStore((state) => state.drillStack);
  const drilled = drillStack.length > 0 ? drillStack[drillStack.length - 1] : null;

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

  const zoomBorrow = useCanvasStore((state) => state.zoomBorrow);
  const openNodeId = useCanvasStore((state) => state.openNodeId);
  const wireFilter = useCanvasStore((state) => state.wireFilter);
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

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const store = useCanvasStore.getState();
      if (store.editorNodeId !== null || store.docRoomId !== null) return;
      const target = event.target as HTMLElement | null;
      const typing =
        (target && /^(input|textarea)$/i.test(target.tagName)) || target?.isContentEditable;
      if (event.key === 'Escape') {
        store.setOpenNode(null);
      } else if (event.shiftKey && event.code === 'KeyF' && !typing) {
        // ⇧F focuses the SELECTED plate (spec §10). RF's data-id is the
        // document node id verbatim -- ids already carry their `node_`
        // prefix, so it is never stripped.
        const selectedEl = window.document.querySelector('.react-flow__node.selected[data-id]');
        if (!selectedEl) return;
        const id = selectedEl.getAttribute('data-id');
        if (!id) return;

        event.preventDefault();
        const selectedNode = store.document.nodes.find((node) => node.id === id);
        if (!selectedNode) return;
        if (selectedNode.type === 'document') store.openDocRoom(selectedNode.id);
        else store.openEditor(selectedNode.id);
      }
    };

    // ⌘V over the canvas (§10): text -> Note, a URL -> Source, an image
    // -> Source. Everything lands at the viewport centre -- a fixed
    // origin would drop it off-view at any pan.
    const onPaste = (event: ClipboardEvent) => {
      const store = useCanvasStore.getState();
      const target = event.target as HTMLElement | null;
      const typing =
        (target && /^(input|textarea)$/i.test(target.tagName)) || target?.isContentEditable;
      if (typing) return;

      const center = screenToFlowPosition({
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
      });
      const asSource = (title: string, url: string, mime: string) => {
        const nodeId = store.spawnAt('source', center);
        if (!nodeId) return;
        store.setNodeTitle(nodeId, title);
        store.setNodeField(nodeId, 'sourceUrl', url);
        store.setNodeField(nodeId, 'sourceType', mime);
      };

      const imageItem = [...(event.clipboardData?.items ?? [])].find((item) =>
        item.type.startsWith('image/'),
      );
      if (imageItem) {
        const file = imageItem.getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = () => asSource('Pasted image', String(reader.result), file.type);
          reader.readAsDataURL(file);
          return;
        }
      }

      const text = event.clipboardData?.getData('text/plain');
      if (!text) return;
      const trimmed = text.trim();
      if (/^https?:\/\/\S+$/.test(trimmed)) {
        let title = trimmed;
        try {
          title = new URL(trimmed).hostname;
        } catch {
          // keep the raw URL as the title
        }
        asSource(title, trimmed, 'text/html');
        return;
      }

      const nodeId = store.spawnAt('note', center);
      if (nodeId) {
        store.setNodeTitle(nodeId, 'Clipped Note');
        store.setNodeContent(nodeId, text);
      }
    };

    window.addEventListener('keydown', onKey);
    window.addEventListener('paste', onPaste);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('paste', onPaste);
    };
  }, [screenToFlowPosition]);

  useEffect(() => {
    if (!flowReady) return;
    setRfNodes((current) => {
      const byId = new Map(current.map((node) => [node.id, node]));
      const canvasNodes = document.nodes
        .filter((docNode) => view.nodeVisible(docNode.id))
        .map((docNode) => {
          const existing = byId.get(docNode.id);
          const strip = view.phrasing?.get(docNode.id);
          const { width: _staleW, height: _staleH, ...existingBase } = existing ?? ({} as Node);
          const owned = typeof docNode.data['ownedHeight'] === 'number';
          const isOpen = docNode.id === openNodeId;
          return keepIdentity(existing, {
            ...existingBase,
            id: docNode.id,
            type: 'canvas' as const,
            ...(isOpen
              ? { width: 736, zIndex: 1200 }
              : docNode.size
                ? { width: docNode.size.width }
                : {}),
            ...(!isOpen && owned && docNode.size ? { height: docNode.size.height } : {}),
            ...(docNode.size
              ? { initialWidth: docNode.size.width, initialHeight: docNode.size.height }
              : {}),
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
              ...(docNode.data['flipped'] === true ? { flipped: true } : {}),
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
      const plainEdges = document.edges.flatMap((docEdge) => {
        const source = displayEndpoint(view.viewDoc, docEdge.source);
        const target = displayEndpoint(view.viewDoc, docEdge.target);
        if (source === target) return []; 
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
        const muted =
          wireFilter !== null && !wireFilter.has(givePort?.dataKind ?? 'any');
        const animate =
          wire.status === 'live' && !muted && animationBudget > 0
            ? (animationBudget--, true)
            : false;
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
              ...(muted ? { muted: true } : {}),
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
  }, [document.edges, document.wires, document.nodes, view, flowReady, harness, wireFilter]);

  const isAssemblyId = useCallback(
    (id: string) => document.assemblies.some((assembly) => assembly.id === id),
    [document.assemblies],
  );

  const onNodesChange = useCallback(
    (changes: NodeChange<Node>[]) => {
      setRfNodes((nodes) => applyNodeChanges(changes, nodes));
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

  const isValidConnection: IsValidConnection = useCallback(
    (connection) => {
      const { source, target, sourceHandle, targetHandle } = connection;
      if (!source || !target) return false;
      const sourceIsPort = !!sourceHandle && !PLAIN_HANDLES.has(sourceHandle);
      const targetIsPort = !!targetHandle && !PLAIN_HANDLES.has(targetHandle);
      if (!sourceIsPort && !targetIsPort) {
        return source !== target;
      }
      const direction = (nodeId: string, portId: string) => {
        const node = document.nodes.find((candidate) => candidate.id === nodeId);
        return node ? getPort(node.type, portId)?.direction : undefined;
      };
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
      if (sourceIsPort && direction(source, sourceHandle) === 'give') {
        return (
          source !== target && firstCompatibleTake(document, source, sourceHandle, target) !== null
        );
      }
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

  const mergeSelection = useCanvasStore((state) => state.mergeSelection);
  const mergeableCount = useMemo(() => {
    if (selectedIds.length < 2) return 0;
    const types = selectedIds.map(
      (id) => document.nodes.find((node) => node.id === id)?.type,
    );
    return types.every((type) => type !== undefined && type === types[0])
      ? selectedIds.length
      : 0;
  }, [selectedIds, document.nodes]);
  const onMerge = useCallback(() => {
    if (selectedIds.length >= 2) mergeSelection(selectedIds[0]!, selectedIds.slice(1));
  }, [selectedIds, mergeSelection]);

  const breadcrumbNames = useMemo(
    () =>
      drillStack.map(
        (id) => document.assemblies.find((assembly) => assembly.id === id)?.name ?? 'Group',
      ),
    [drillStack, document.assemblies],
  );

  // Select-to-promote (spec §8): while exactly ONE hub is selected, its
  // connections resolve to full strength and every plate outside them
  // drops to 42%. Display-only -- nothing is written; deselect restores.
  const promotedHubId = useMemo(() => {
    const selected = rfNodes.filter((node) => node.selected && node.type === 'canvas');
    return selected.length === 1 &&
      (selected[0]!.data as { coreType?: string }).coreType === 'hub'
      ? selected[0]!.id
      : null;
  }, [rfNodes]);
  const promotedNeighbors = useMemo(() => {
    if (promotedHubId === null) return null;
    const set = new Set([promotedHubId]);
    for (const wire of document.wires) {
      if (wire.status !== 'live') continue;
      if (wire.source === promotedHubId) set.add(wire.target);
      if (wire.target === promotedHubId) set.add(wire.source);
    }
    for (const edge of document.edges) {
      if (edge.source === promotedHubId) set.add(edge.target);
      if (edge.target === promotedHubId) set.add(edge.source);
    }
    return set;
  }, [promotedHubId, document.wires, document.edges]);
  const displayNodes = useMemo(
    () =>
      promotedNeighbors === null
        ? rfNodes
        : rfNodes.map((node) =>
            node.type !== 'canvas' || promotedNeighbors.has(node.id)
              ? node
              : { ...node, className: 'is-promote-dim' },
          ),
    [rfNodes, promotedNeighbors],
  );
  const displayEdges = useMemo(
    () =>
      promotedHubId === null
        ? rfEdges
        : rfEdges.map((edge) =>
            edge.source === promotedHubId || edge.target === promotedHubId
              ? { ...edge, className: 'is-promoted' }
              : edge,
          ),
    [rfEdges, promotedHubId],
  );

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    const storeState = useCanvasStore.getState();
    const isEraser = e.buttons === 32 || e.button === 5 || storeState.inkEraserMode;

    if (storeState.inkMode || e.pointerType === 'pen') {
      if ((e.target as HTMLElement).closest('button, input, .dock, .toolbar-floating-pill, .settings-popover, .add-menu, .room-overlay, .selection-actions')) return;
      
      e.stopPropagation();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      const pos = screenToFlowPosition({ x: e.clientX, y: e.clientY });
      
      if (isEraser) {
        storeState.eraseAt(pos.x, pos.y);
      } else {
        storeState.startStroke([pos.x, pos.y, e.pressure]);
      }
    }
  }, [screenToFlowPosition]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    const storeState = useCanvasStore.getState();
    const isEraser = e.buttons === 32 || e.button === 5 || storeState.inkEraserMode;

    if (isEraser && (storeState.inkMode || e.pointerType === 'pen') && e.buttons !== 0) {
      // If moving while erasing and buttons are held down
      e.stopPropagation();
      const pos = screenToFlowPosition({ x: e.clientX, y: e.clientY });
      storeState.eraseAt(pos.x, pos.y);
    } else if (storeState.currentStroke) {
      e.stopPropagation();
      const pos = screenToFlowPosition({ x: e.clientX, y: e.clientY });
      storeState.updateStroke([pos.x, pos.y, e.pressure]);
    }
  }, [screenToFlowPosition]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    const storeState = useCanvasStore.getState();
    if (storeState.currentStroke) {
      e.stopPropagation();
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch (err) {}
      storeState.endStroke();
    }
  }, []);

  const isInkModeActive = inkMode;

  // §10: drop a file onto the canvas -> a Source node at the cursor.
  // Small files embed as a data URL in node.data so they survive reload;
  // browser storage is ~5MB total, so past the cap the Source keeps the
  // name only (the toast says so -- never a silent downgrade).
  const spawnSourceAt = useCallback(
    (position: { x: number; y: number }, title: string, url?: string, mime?: string) => {
      const store = useCanvasStore.getState();
      const nodeId = store.spawnAt('source', position);
      if (!nodeId) return;
      store.setNodeTitle(nodeId, title);
      if (url !== undefined) {
        store.setNodeField(nodeId, 'sourceUrl', url);
        store.setNodeField(nodeId, 'sourceType', mime ?? '');
      }
    },
    [],
  );
  const MAX_EMBED_BYTES = 2_500_000;
  const onCanvasDrop = useCallback(
    (event: React.DragEvent) => {
      const file = event.dataTransfer.files[0];
      const uri = event.dataTransfer.getData('text/uri-list').split('\n')[0]?.trim() ?? '';
      if (!file && uri === '') return;
      event.preventDefault();
      const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
      if (!file) {
        let title = uri;
        try {
          title = new URL(uri).hostname;
        } catch {
          // not a parseable URL; the raw text is still an honest title
        }
        spawnSourceAt(position, title, uri, 'text/html');
        return;
      }
      if (file.size > MAX_EMBED_BYTES) {
        spawnSourceAt(position, file.name);
        useCanvasStore.setState({
          toast: {
            message: `"${file.name}" is too large to embed (2.5MB cap) — the Source keeps its name only`,
          },
        });
        return;
      }
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = () => {
          const store = useCanvasStore.getState();
          const nodeId = store.spawnAt('image', position);
          if (nodeId) {
            store.setNodeField(nodeId, 'mediaUrl', String(reader.result));
            store.setNodeField(nodeId, 'mediaType', file.type);
          }
        };
        reader.readAsDataURL(file);
        return;
      }
      
      const reader = new FileReader();
      reader.onload = () =>
        spawnSourceAt(position, file.name, String(reader.result), file.type);
      reader.readAsDataURL(file);
    },
    [screenToFlowPosition, spawnSourceAt],
  );

  return (
    <div
      className={`canvas-root density-${settings.density} port-labels-${settings.portLabels} zoom-${zoomBucket}`}
      onPointerDownCapture={handlePointerDown}
      onPointerMoveCapture={handlePointerMove}
      onPointerUpCapture={handlePointerUp}
      onPointerCancelCapture={handlePointerUp}
      onDrop={onCanvasDrop}
      onDragOver={(event) => {
        if (
          event.dataTransfer.types.includes('Files') ||
          event.dataTransfer.types.includes('text/uri-list')
        ) {
          event.preventDefault();
        }
      }}
    >
      <ReactFlow
        nodes={displayNodes}
        edges={displayEdges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        selectionOnDrag={!isInkModeActive}
        panOnDrag={!isInkModeActive ? [1, 2] : false}
        nodesDraggable={!isInkModeActive}
        nodesConnectable={!isInkModeActive}
        elementsSelectable={!isInkModeActive}
        onConnectStart={(_event, params) => {
          const { nodeId, handleId } = params;
          if (!nodeId || !handleId) return;
          if (PLAIN_HANDLES.has(handleId) || handleId.startsWith('blk:')) return;
          const store = useCanvasStore.getState();
          const doc = store.document;
          const dragged = getPort(
            doc.nodes.find((node) => node.id === nodeId)?.type ?? '',
            handleId,
          );
          if (!dragged) return;
          const wanted = dragged.direction === 'give' ? 'take' : 'give';
          const candidates = new Set<string>();
          for (const other of doc.nodes) {
            if (other.id === nodeId || !view.nodeVisible(other.id)) continue;
            for (const port of getNodeDef(other.type)?.ports ?? []) {
              if (port.direction !== wanted) continue;
              const wire =
                dragged.direction === 'give'
                  ? { source: nodeId, sourcePort: handleId, target: other.id, targetPort: port.id }
                  : { source: other.id, sourcePort: port.id, target: nodeId, targetPort: handleId };
              if (isValidWire(doc, wire).ok) candidates.add(`${other.id}:${port.id}`);
            }
          }
          store.setConnectCandidates(candidates);
        }}
        onConnectEnd={(event, connectionState) => {
          const store = useCanvasStore.getState();
          store.setConnectCandidates(null);
          
          if (!connectionState.isValid && connectionState.fromNode && connectionState.fromHandle) {
            const target = event.target as Element;
            if (target && target.classList.contains('react-flow__pane')) {
              let clientX = 0;
              let clientY = 0;
              if ('clientX' in event) {
                clientX = event.clientX;
                clientY = event.clientY;
              } else if ('touches' in event && event.touches && event.touches.length > 0) {
                clientX = event.touches[0]?.clientX ?? 0;
                clientY = event.touches[0]?.clientY ?? 0;
              }
              const position = screenToFlowPosition({ x: clientX, y: clientY });
              const newNodeId = store.spawnAt('note', position);
              if (newNodeId) {
                const targetPort = getNodeDef('note')?.ports.find(p => p.direction === 'take')?.id ?? 'notes-in';
                if (connectionState.fromHandle.type === 'source') {
                  store.connectFromHandles(connectionState.fromNode.id, connectionState.fromHandle.id, newNodeId, targetPort);
                } else {
                  store.connectFromHandles(newNodeId, 'text-out', connectionState.fromNode.id, connectionState.fromHandle.id);
                }
              }
            }
          }
        }}
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
            // double-click OPENS (spec §8/§10; ⌥click already collapses) --
            // routing this to collapse orphaned the whole open state
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
        <InkLayer />
      </ReactFlow>
      <FilterBar />
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
      {(() => {
        const singleSelectedId = selectedIds.length === 1 ? selectedIds[0]! : null;
        return (
          <Toolbar
            menuOpen={menuOpen}
            onToggleMenu={() => setMenuOpen((open) => !open)}
            selectedCount={selectedIds.length}
            onGather={onGather}
            mergeableCount={mergeableCount}
            onMerge={onMerge}
            docTargetId={
              singleSelectedId &&
              document.nodes.some(
                (n) =>
                  n.id === singleSelectedId &&
                  ['document', 'manuscript'].includes(n.type),
              )
                ? singleSelectedId
                : null
            }
            arcTargetId={
              singleSelectedId && document.assemblies.some((a) => a.id === singleSelectedId)
                ? singleSelectedId
                : null
            }
            focusTargetId={
              singleSelectedId && document.nodes.some((n) => n.id === singleSelectedId)
                ? singleSelectedId
                : null
            }
          />
        );
      })()}
      {/* Legend removed at user request (2026-07-14) until a better design
          exists -- component kept at components/Legend.tsx for its return */}
      <Toast />
      <FocusEditor />
      <ArcRoom />
      <DocumentRoom />
      <CommandPalette />
      <Tutorial />
      <TipsPanel />
      <InkPalette />
      {menuOpen && <AddNodeMenu onPick={pickType} onClose={() => setMenuOpen(false)} />}
    </div>
  );
}
