// ============================================================================
// FLOW & LOGIC derivations (design direction 2026-08-12 §14)
//
// Logic nodes are OPTIONAL reasoning tools, not the default way information
// connects. They are portless like every other ordinary node, so they read
// PLAIN EDGES: whatever is wired into them is an input, whatever they feed
// is an output. Everything here is pure and derived -- a logic node stores
// only its own order and settings, never a copy of its neighbours (I7/I10).
// ============================================================================

import type { CanvasDocument, CanvasNode } from './schema';
import { getNodeDef, nodeLabel, type CanvasMode } from './registry';
import { stripHtml } from './derive';

/** Every registered flow/logic type. */
export const LOGIC_TYPES = [
  'sequence',
  'decision',
  'condition',
  'and',
  'or',
  'not',
  'compare',
  'merge',
  'split',
  'transform',
  'filter',
] as const;

export type LogicType = (typeof LOGIC_TYPES)[number];

export function isLogicType(type: string): type is LogicType {
  return (LOGIC_TYPES as readonly string[]).includes(type);
}

export type LogicNeighbor = {
  nodeId: string;
  type: string;
  /** The node's own title, or a readable fallback drawn from its prose. */
  title: string;
  /** The label the user put on the connecting edge, if any. */
  edgeLabel?: string;
  edgeId: string;
};

export type LogicWiring = {
  /** Nodes feeding this one. */
  inputs: LogicNeighbor[];
  /** Nodes this one feeds. */
  outputs: LogicNeighbor[];
};

const UNTITLED = 'Untitled';

/** A readable name for a node: its title, else its first words, else the
 * type's own label -- a flow node listing "Untitled, Untitled" helps nobody. */
export function readableTitle(node: CanvasNode, mode: CanvasMode = 'universal'): string {
  const title = typeof node.data.title === 'string' ? node.data.title.trim() : '';
  if (title !== '') return title;
  const prose = stripHtml(typeof node.data.content === 'string' ? node.data.content : '')
    .replace(/\s+/g, ' ')
    .trim();
  if (prose !== '') return prose.length > 48 ? `${prose.slice(0, 47)}…` : prose;
  return getNodeDef(node.type) ? nodeLabel(node.type, mode) : UNTITLED;
}

/**
 * What a logic node is wired to, split by direction. Plain edges are
 * undirected in meaning but stored with a source and a target, and that
 * stored orientation IS the flow: A -> Sequence -> B reads as "A comes in,
 * B goes out".
 */
export function logicWiring(
  document: CanvasDocument,
  nodeId: string,
  mode: CanvasMode = 'universal',
): LogicWiring {
  const byId = new Map(document.nodes.map((node) => [node.id, node]));
  const inputs: LogicNeighbor[] = [];
  const outputs: LogicNeighbor[] = [];

  for (const edge of document.edges) {
    const isTarget = edge.target === nodeId;
    const isSource = edge.source === nodeId;
    if (!isTarget && !isSource) continue;
    const otherId = isTarget ? edge.source : edge.target;
    const other = byId.get(otherId);
    if (!other) continue;
    const neighbor: LogicNeighbor = {
      nodeId: otherId,
      type: other.type,
      title: readableTitle(other, mode),
      edgeId: edge.id,
      ...(edge.label !== undefined && edge.label !== '' ? { edgeLabel: edge.label } : {}),
    };
    (isTarget ? inputs : outputs).push(neighbor);
  }
  return { inputs, outputs };
}

/**
 * A Sequence's ordered steps. Order is DATA, never array position (I10):
 * the node stores `stepOrder`, a list of node ids. Anything wired in that
 * the order doesn't mention yet lands at the end, so a fresh connection
 * always appears without the user re-ordering anything.
 */
export function sequenceSteps(
  document: CanvasDocument,
  nodeId: string,
  mode: CanvasMode = 'universal',
): LogicNeighbor[] {
  const { inputs, outputs } = logicWiring(document, nodeId, mode);
  // a Sequence orders everything it touches: what feeds it and what it feeds
  const all = [...inputs, ...outputs];
  const node = document.nodes.find((candidate) => candidate.id === nodeId);
  const stored = node?.data['stepOrder'];
  const order = Array.isArray(stored) ? stored.filter((id): id is string => typeof id === 'string') : [];
  const rank = new Map(order.map((id, index) => [id, index]));
  return [...all].sort((a, b) => {
    const ra = rank.get(a.nodeId);
    const rb = rank.get(b.nodeId);
    if (ra !== undefined && rb !== undefined) return ra - rb;
    // unranked neighbours keep their discovery order, after every ranked one
    if (ra !== undefined) return -1;
    if (rb !== undefined) return 1;
    return 0;
  });
}

/** Move a step to a new index, returning the full order to store. */
export function reorderSteps(current: string[], nodeId: string, newIndex: number): string[] {
  const without = current.filter((id) => id !== nodeId);
  const clamped = Math.max(0, Math.min(without.length, newIndex));
  return [...without.slice(0, clamped), nodeId, ...without.slice(clamped)];
}

export type GateVerdict = {
  /** null when the gate has nothing to judge yet. */
  satisfied: boolean | null;
  /** Inputs counted as "done" over inputs considered. */
  met: number;
  total: number;
  reason: string;
};

/**
 * AND / OR / NOT judge their inputs on one honest, already-derived signal:
 * does the input have any content yet? A gate over empty nodes is
 * unsatisfied; over written ones, satisfied. This keeps the gates truthful
 * without inventing a truth value the document does not store.
 */
export function gateVerdict(
  document: CanvasDocument,
  nodeId: string,
  gate: 'and' | 'or' | 'not',
): GateVerdict {
  const { inputs } = logicWiring(document, nodeId);
  const byId = new Map(document.nodes.map((node) => [node.id, node]));
  const done = inputs.filter((input) => {
    const node = byId.get(input.nodeId);
    if (!node) return false;
    const prose = stripHtml(typeof node.data.content === 'string' ? node.data.content : '').trim();
    const title = typeof node.data.title === 'string' ? node.data.title.trim() : '';
    return prose !== '' || title !== '';
  });
  const met = done.length;
  const total = inputs.length;
  if (total === 0) {
    return { satisfied: null, met, total, reason: 'Nothing wired in yet' };
  }
  if (gate === 'and') {
    return {
      satisfied: met === total,
      met,
      total,
      reason: met === total ? 'Every input has content' : `${total - met} still empty`,
    };
  }
  if (gate === 'or') {
    return {
      satisfied: met > 0,
      met,
      total,
      reason: met > 0 ? `${met} of ${total} has content` : 'None have content yet',
    };
  }
  // NOT: satisfied precisely when its inputs are still empty
  return {
    satisfied: met === 0,
    met,
    total,
    reason: met === 0 ? 'Nothing here yet — as required' : `${met} unexpectedly filled`,
  };
}

/**
 * A Filter keeps only the inputs whose type matches `filterType` (stored on
 * the node). An unset filter passes everything through, so a fresh Filter
 * shows its whole input rather than looking broken.
 */
export function filterPasses(
  document: CanvasDocument,
  nodeId: string,
  mode: CanvasMode = 'universal',
): { kept: LogicNeighbor[]; dropped: LogicNeighbor[]; filterType: string | null } {
  const { inputs } = logicWiring(document, nodeId, mode);
  const node = document.nodes.find((candidate) => candidate.id === nodeId);
  const raw = node?.data['filterType'];
  const filterType = typeof raw === 'string' && raw !== '' ? raw : null;
  if (filterType === null) return { kept: inputs, dropped: [], filterType };
  return {
    kept: inputs.filter((input) => input.type === filterType),
    dropped: inputs.filter((input) => input.type !== filterType),
    filterType,
  };
}
