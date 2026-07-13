// ============================================================================
// GRAPH OPERATIONS -- pure functions over CanvasDocument. app/ calls these;
// it never re-implements them (I7). Every operation returns a NEW document.
// ============================================================================

import { createId } from './ids';
import type { CanvasDocument, CanvasNode, PlainEdge } from './schema';
import { getNodeDef } from './registry';

export class GraphError extends Error {}

/**
 * Build a node of a registered type at a position, using the registry's spawn
 * defaults. Where the node lands (collision-free placement) is the canvas
 * layer's job -- core just records the position it is given.
 */
export function spawnNode(
  type: string,
  position: { x: number; y: number },
  data: CanvasNode['data'] = {},
): CanvasNode {
  const def = getNodeDef(type);
  if (!def) {
    throw new GraphError(`unregistered node type "${type}" (I8: add it to the registry first)`);
  }
  const node: CanvasNode = {
    id: createId('node'),
    type,
    position,
    data,
  };
  if (def.size) {
    node.size = { ...def.size };
  }
  return node;
}

export function addNode(document: CanvasDocument, node: CanvasNode): CanvasDocument {
  if (document.nodes.some((existing) => existing.id === node.id)) {
    throw new GraphError(`node id "${node.id}" already exists in the document`);
  }
  return { ...document, nodes: [...document.nodes, node] };
}

/** Removing a node also removes every edge AND wire attached to it. */
export function removeNode(document: CanvasDocument, nodeId: string): CanvasDocument {
  if (!document.nodes.some((node) => node.id === nodeId)) {
    throw new GraphError(`node "${nodeId}" not found`);
  }
  return {
    ...document,
    nodes: document.nodes.filter((node) => node.id !== nodeId),
    edges: document.edges.filter((edge) => edge.source !== nodeId && edge.target !== nodeId),
    wires: document.wires.filter((wire) => wire.source !== nodeId && wire.target !== nodeId),
  };
}

export type PlainEdgeOptions = {
  label?: string;
  /** Which handle on each node the user attached to (persisted -- see schema). */
  sourceHandle?: string;
  targetHandle?: string;
};

/**
 * Plain edge (I1): always succeeds between any two distinct existing nodes,
 * regardless of their types, with zero setup. Plain edges are semantically
 * undirected relationships, so a duplicate in either orientation is rejected.
 */
export function addPlainEdge(
  document: CanvasDocument,
  source: string,
  target: string,
  options: PlainEdgeOptions = {},
): CanvasDocument {
  for (const endpoint of [source, target]) {
    if (!document.nodes.some((node) => node.id === endpoint)) {
      throw new GraphError(`cannot connect: node "${endpoint}" not found`);
    }
  }
  if (source === target) {
    throw new GraphError('cannot connect a node to itself');
  }
  const duplicate = document.edges.some(
    (edge) =>
      (edge.source === source && edge.target === target) ||
      (edge.source === target && edge.target === source),
  );
  if (duplicate) {
    throw new GraphError(`nodes "${source}" and "${target}" are already connected`);
  }
  const edge: PlainEdge = { id: createId('edge'), source, target };
  if (options.label !== undefined) edge.label = options.label;
  if (options.sourceHandle !== undefined) edge.sourceHandle = options.sourceHandle;
  if (options.targetHandle !== undefined) edge.targetHandle = options.targetHandle;
  return { ...document, edges: [...document.edges, edge] };
}

export function removePlainEdge(document: CanvasDocument, edgeId: string): CanvasDocument {
  if (!document.edges.some((edge) => edge.id === edgeId)) {
    throw new GraphError(`edge "${edgeId}" not found`);
  }
  return { ...document, edges: document.edges.filter((edge) => edge.id !== edgeId) };
}
