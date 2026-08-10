// ============================================================================
// MERGE -- the inverse of split (Observatory "not yet in core", approved by
// the user 2026-08-10): fold several nodes of ONE type back into one.
//
// The TARGET keeps its identity, position, title, and type. The others'
// prose is appended in the order given; their wires and plain edges are
// re-pointed at the target; their assembly memberships transfer; then the
// absorbed nodes are removed. Nothing else in the document moves (I5).
//
// Same-type only: wires name port ids, and only a same-type target is
// guaranteed to own every port a re-pointed wire lands on.
// ============================================================================

import { GraphError } from './graph';
import { getPort } from './registry';
import type { CanvasDocument, DataWire } from './schema';

export type MergeResult = {
  document: CanvasDocument;
  /** Node ids that were folded into the target (now gone). */
  absorbedIds: string[];
};

export function mergeNodes(
  document: CanvasDocument,
  targetId: string,
  otherIds: readonly string[],
): MergeResult {
  const target = document.nodes.find((node) => node.id === targetId);
  if (!target) throw new GraphError(`node "${targetId}" not found`);
  const others = otherIds.map((id) => {
    const node = document.nodes.find((candidate) => candidate.id === id);
    if (!node) throw new GraphError(`node "${id}" not found`);
    if (node.id === targetId) throw new GraphError('cannot merge a node into itself');
    if (node.type !== target.type) {
      throw new GraphError(
        `merge is same-type only: "${node.type}" cannot fold into "${target.type}"`,
      );
    }
    return node;
  });
  if (others.length === 0) throw new GraphError('nothing to merge');

  const absorbed = new Set(otherIds);
  const remap = (id: string) => (absorbed.has(id) ? targetId : id);

  // prose appends in the order given; empty pieces vanish
  const pieces = [
    typeof target.data.content === 'string' ? target.data.content : '',
    ...others.map((node) => (typeof node.data.content === 'string' ? node.data.content : '')),
  ].filter((piece) => piece !== '');

  // wires re-point at the target; self-loops and exact duplicates drop;
  // a capacity-one intake keeps its EARLIEST wire only
  const seen = new Set<string>();
  const intakeTaken = new Set<string>();
  const wires: DataWire[] = [];
  for (const wire of document.wires) {
    const source = remap(wire.source);
    const targetEnd = remap(wire.target);
    if (source === targetEnd) continue;
    const key = `${source}:${wire.sourcePort}>${targetEnd}:${wire.targetPort}`;
    if (seen.has(key)) continue;
    const intakePort = getPort(
      document.nodes.find((node) => node.id === targetEnd)?.type ?? target.type,
      wire.targetPort,
    );
    const intakeKey = `${targetEnd}:${wire.targetPort}`;
    if (wire.status === 'live' && intakePort?.capacity === 'one') {
      if (intakeTaken.has(intakeKey)) continue;
      intakeTaken.add(intakeKey);
    }
    seen.add(key);
    wires.push(source === wire.source && targetEnd === wire.target
      ? wire
      : { ...wire, source, target: targetEnd });
  }

  // plain edges re-point; self-loops and duplicates (either orientation) drop
  const edgeSeen = new Set<string>();
  const edges = document.edges.flatMap((edge) => {
    const source = remap(edge.source);
    const targetEnd = remap(edge.target);
    if (source === targetEnd) return [];
    const key = [source, targetEnd].sort().join('~');
    if (edgeSeen.has(key)) return [];
    edgeSeen.add(key);
    return [source === edge.source && targetEnd === edge.target
      ? edge
      : { ...edge, source, target: targetEnd }];
  });

  // memberships transfer (deduped); absorbed ids vanish from every group
  const assemblies = document.assemblies.map((assembly) => {
    const memberIds = [...new Set(assembly.memberIds.map(remap))];
    return memberIds.length === assembly.memberIds.length &&
      memberIds.every((id, index) => id === assembly.memberIds[index])
      ? assembly
      : { ...assembly, memberIds };
  });

  return {
    document: {
      ...document,
      nodes: document.nodes.flatMap((node) => {
        if (absorbed.has(node.id)) return [];
        if (node.id !== targetId) return [node];
        return [{ ...node, data: { ...node.data, content: pieces.join('') } }];
      }),
      wires,
      edges,
      assemblies,
    },
    absorbedIds: [...otherIds],
  };
}
