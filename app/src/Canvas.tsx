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
import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { CanvasNode } from './components/CanvasNode';
import { CommandPalette } from './components/CommandPalette';
import { FocusEditor } from './components/FocusEditor';
import { PlainEdge } from './components/PlainEdge';
import { Starfield } from './components/Starfield';
import { Toast } from './components/Toast';
import { Toolbar } from './components/Toolbar';
import { WireEdge } from './components/WireEdge';
import { firstCompatibleTake, PLAIN_HANDLES, useCanvasStore } from './store/canvasStore';

const nodeTypes = { canvas: CanvasNode, assembly: AssemblyFace };
const edgeTypes = { plain: PlainEdge, wire: WireEdge };

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
  const openEditor = useCanvasStore((state) => state.openEditor);

  const [menuOpen, setMenuOpen] = useState(false);
  const [rfNodes, setRfNodes] = useState<Node[]>([]);
  const [rfEdges, setRfEdges] = useState<Edge[]>([]);
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

  // Sync core document -> RF state. Existing RF node objects are merged so
  // RF-owned fields (measured dims, selection, dragging) survive the sync.
  useEffect(() => {
    setRfNodes((current) => {
      const byId = new Map(current.map((node) => [node.id, node]));
      const canvasNodes = document.nodes
        .filter((docNode) => view.nodeVisible(docNode.id))
        .map((docNode) => {
          const existing = byId.get(docNode.id);
          const strip = view.phrasing?.get(docNode.id);
          return {
            ...existing,
            id: docNode.id,
            type: 'canvas' as const,
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
            ...(docNode.size
              ? { style: { width: docNode.size.width, height: docNode.size.height } }
              : {}),
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
            },
          };
        });
      const faceNodes = document.assemblies
        .filter((assembly) => view.assemblyVisible(assembly.id))
        .map((assembly) => ({
          ...byId.get(assembly.id),
          id: assembly.id,
          type: 'assembly' as const,
          position: assembly.position,
          data: {
            assemblyId: assembly.id,
            name: assembly.name,
            collapsed: assembly.collapsed,
          },
        }));
      return [...canvasNodes, ...faceNodes];
    });
  }, [document.nodes, document.assemblies, view]);

  useEffect(() => {
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
          {
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
          },
        ];
      });
      const wireEdges = document.wires.flatMap((wire) => {
        const source = displayEndpoint(view.viewDoc, wire.source);
        const target = displayEndpoint(view.viewDoc, wire.target);
        if (source === target) return [];
        if (!endpointVisible(source) || !endpointVisible(target)) return [];
        const sourceNode = document.nodes.find((node) => node.id === wire.source);
        const givePort = sourceNode ? getPort(sourceNode.type, wire.sourcePort) : undefined;
        const isArc = givePort?.dataKind === 'prop' && wire.targetPort === 'arc-in';
        return [
          {
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
              ...(isArc ? { isArc } : {}),
              ...(wire.relation !== undefined ? { relation: wire.relation } : {}),
            },
          },
        ];
      });
      return [...plainEdges, ...wireEdges];
    });
  }, [document.edges, document.wires, document.nodes, view]);

  const isAssemblyId = useCallback(
    (id: string) => document.assemblies.some((assembly) => assembly.id === id),
    [document.assemblies],
  );

  const onNodesChange = useCallback(
    (changes: NodeChange<Node>[]) => {
      setRfNodes((nodes) => applyNodeChanges(changes, nodes));
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
        defaultViewport={initialViewport}
        onMove={(_event, viewport) => {
          const bucket = viewport.zoom < 0.25 ? 'far' : 'near';
          setZoomBucket((current) => (current === bucket ? current : bucket));
        }}
        onMoveEnd={(_event, viewport) => saveViewport(viewport)}
        onlyRenderVisibleElements
        connectionMode={ConnectionMode.Loose}
        connectionRadius={40}
        connectOnClick
        minZoom={0.05}
        maxZoom={2.5}
        deleteKeyCode={['Delete', 'Backspace']}
        zoomOnDoubleClick={false}
        onNodeDoubleClick={(_event, node) => {
          // double-click opens the focus editor (design B) on writing nodes;
          // on an assembly star/face it dives toward it (explicit action)
          if (node.type === 'canvas') openEditor(node.id);
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
      <CommandPalette />
      {menuOpen && <AddNodeMenu onPick={pickType} onClose={() => setMenuOpen(false)} />}
    </div>
  );
}
