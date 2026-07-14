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
import { useCallback, useEffect, useState } from 'react';
import { getPort, isValidWire } from '@node-canvas/core';
import { AddNodeMenu } from './components/AddNodeMenu';
import { CanvasNode, type CanvasNodeData } from './components/CanvasNode';
import { Legend } from './components/Legend';
import { PlainEdge } from './components/PlainEdge';
import { Starfield } from './components/Starfield';
import { Toast } from './components/Toast';
import { Toolbar } from './components/Toolbar';
import { WireEdge } from './components/WireEdge';
import { firstCompatibleTake, PLAIN_HANDLES, useCanvasStore } from './store/canvasStore';

const nodeTypes = { canvas: CanvasNode };
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

  const [menuOpen, setMenuOpen] = useState(false);
  const [rfNodes, setRfNodes] = useState<Node<CanvasNodeData>[]>([]);
  const [rfEdges, setRfEdges] = useState<Edge[]>([]);
  const { screenToFlowPosition, getViewport, setCenter } = useReactFlow();

  // Sync core document -> RF state. Existing RF node objects are merged so
  // RF-owned fields (measured dims, selection, dragging) survive the sync.
  useEffect(() => {
    setRfNodes((current) => {
      const byId = new Map(current.map((node) => [node.id, node]));
      return document.nodes.map((docNode) => {
        const existing = byId.get(docNode.id);
        return {
          ...existing,
          id: docNode.id,
          type: 'canvas' as const,
          position: docNode.position,
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
    });
  }, [document.nodes]);

  useEffect(() => {
    setRfEdges((current) => {
      const byId = new Map(current.map((edge) => [edge.id, edge]));
      const plainEdges = document.edges.map((docEdge) => ({
        ...byId.get(docEdge.id),
        id: docEdge.id,
        type: 'plain' as const,
        source: docEdge.source,
        target: docEdge.target,
        ...(docEdge.sourceHandle !== undefined ? { sourceHandle: docEdge.sourceHandle } : {}),
        ...(docEdge.targetHandle !== undefined ? { targetHandle: docEdge.targetHandle } : {}),
        ...(docEdge.label !== undefined ? { label: docEdge.label } : {}),
      }));
      const wireEdges = document.wires.map((wire) => {
        const sourceNode = document.nodes.find((node) => node.id === wire.source);
        const givePort = sourceNode ? getPort(sourceNode.type, wire.sourcePort) : undefined;
        return {
          ...byId.get(wire.id),
          id: wire.id,
          type: 'wire' as const,
          source: wire.source,
          sourceHandle: wire.sourcePort,
          target: wire.target,
          targetHandle: wire.targetPort,
          data: {
            status: wire.status,
            dataKind: givePort?.dataKind ?? '',
            portLabel: givePort?.label ?? wire.sourcePort,
          },
        };
      });
      return [...plainEdges, ...wireEdges];
    });
  }, [document.edges, document.wires, document.nodes]);

  const onNodesChange = useCallback(
    (changes: NodeChange<Node<CanvasNodeData>>[]) => {
      setRfNodes((nodes) => applyNodeChanges(changes, nodes));
      for (const change of changes) {
        if (change.type === 'position' && change.position && !Number.isNaN(change.position.x)) {
          moveNode(change.id, change.position);
        } else if (change.type === 'remove') {
          deleteNode(change.id);
        }
      }
    },
    [moveNode, deleteNode],
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

  return (
    <div
      className={`canvas-root density-${settings.density} port-labels-${settings.portLabels}`}
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
        onMoveEnd={(_event, viewport) => saveViewport(viewport)}
        connectionMode={ConnectionMode.Loose}
        connectionRadius={40}
        connectOnClick
        minZoom={0.05}
        maxZoom={2.5}
        deleteKeyCode={['Delete', 'Backspace']}
        onError={(code, message) => console.warn(`[RF ${code}] ${message}`)}
        proOptions={{ hideAttribution: true }}
        className="nodecanvas-flow"
      >
        <Starfield />
      </ReactFlow>
      <Toolbar menuOpen={menuOpen} onToggleMenu={() => setMenuOpen((open) => !open)} />
      <Legend />
      <Toast />
      {menuOpen && <AddNodeMenu onPick={pickType} onClose={() => setMenuOpen(false)} />}
    </div>
  );
}
