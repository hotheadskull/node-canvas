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

import {
  applyEdgeChanges,
  applyNodeChanges,
  ConnectionMode,
  ReactFlow,
  useReactFlow,
  type Connection,
  type Edge,
  type Node,
  type NodeChange,
  type EdgeChange,
} from '@xyflow/react';
import { useCallback, useEffect, useState } from 'react';
import { AddNodeMenu } from './components/AddNodeMenu';
import { CanvasNode, type CanvasNodeData } from './components/CanvasNode';
import { Legend } from './components/Legend';
import { PlainEdge } from './components/PlainEdge';
import { Starfield } from './components/Starfield';
import { Toolbar } from './components/Toolbar';
import { useCanvasStore } from './store/canvasStore';

const nodeTypes = { canvas: CanvasNode };
const edgeTypes = { plain: PlainEdge };

export function Canvas() {
  const document = useCanvasStore((state) => state.document);
  const initialViewport = useCanvasStore((state) => state.initialViewport);
  const moveNode = useCanvasStore((state) => state.moveNode);
  const deleteNode = useCanvasStore((state) => state.deleteNode);
  const deleteEdge = useCanvasStore((state) => state.deleteEdge);
  const connect = useCanvasStore((state) => state.connect);
  const spawnAt = useCanvasStore((state) => state.spawnAt);
  const saveViewport = useCanvasStore((state) => state.saveViewport);

  const [menuOpen, setMenuOpen] = useState(false);
  const [rfNodes, setRfNodes] = useState<Node<CanvasNodeData>[]>([]);
  const [rfEdges, setRfEdges] = useState<Edge[]>([]);
  const { screenToFlowPosition } = useReactFlow();

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
          },
        };
      });
    });
  }, [document.nodes]);

  useEffect(() => {
    setRfEdges((current) => {
      const byId = new Map(current.map((edge) => [edge.id, edge]));
      return document.edges.map((docEdge) => ({
        ...byId.get(docEdge.id),
        id: docEdge.id,
        type: 'plain' as const,
        source: docEdge.source,
        target: docEdge.target,
        ...(docEdge.sourceHandle !== undefined ? { sourceHandle: docEdge.sourceHandle } : {}),
        ...(docEdge.targetHandle !== undefined ? { targetHandle: docEdge.targetHandle } : {}),
        ...(docEdge.label !== undefined ? { label: docEdge.label } : {}),
      }));
    });
  }, [document.edges]);

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
          deleteEdge(change.id);
        }
      }
    },
    [deleteEdge],
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      if (connection.source && connection.target) {
        connect(connection.source, connection.target, {
          ...(connection.sourceHandle ? { sourceHandle: connection.sourceHandle } : {}),
          ...(connection.targetHandle ? { targetHandle: connection.targetHandle } : {}),
        });
      }
    },
    [connect],
  );

  const pickType = useCallback(
    (type: string) => {
      const center = screenToFlowPosition({
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
      });
      spawnAt(type, center);
      setMenuOpen(false);
    },
    [screenToFlowPosition, spawnAt],
  );

  return (
    <div className="canvas-root">
      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        defaultViewport={initialViewport}
        onMoveEnd={(_event, viewport) => saveViewport(viewport)}
        connectionMode={ConnectionMode.Loose}
        connectionRadius={40}
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
      {menuOpen && <AddNodeMenu onPick={pickType} onClose={() => setMenuOpen(false)} />}
    </div>
  );
}
