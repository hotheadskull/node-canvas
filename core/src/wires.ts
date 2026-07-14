// ============================================================================
// DATA WIRES -- typed give->take connections between named ports (I2: all of
// this is opt-in and additive; plain edges never depend on any of it).
//
// Tentative wires are dashed candidate placements: "this might go here."
// A node may hold tentative wires to several destinations; committing one
// converts it to a live wire and dissolves that node's other tentative wires
// (the dissolved ids are returned so the UI can offer undo).
// ============================================================================

import { getArcRelation } from './arcs';
import { createId } from './ids';
import { GraphError } from './graph';
import { getNodeDef, getPort } from './registry';
import type { CanvasDocument, DataWire } from './schema';

export type WireSpec = {
  source: string;
  sourcePort: string;
  target: string;
  targetPort: string;
};

export type WireValidity =
  | { ok: true }
  | {
      ok: false;
      reason:
        | 'unknown-node'
        | 'unknown-type'
        | 'self'
        | 'no-such-port'
        | 'wrong-direction'
        | 'kind-mismatch'
        | 'duplicate'
        | 'occupied';
      message: string;
    };

/**
 * Validate a prospective wire. `forTentative` skips the capacity check:
 * candidates may pile up on a full intake; capacity is enforced at commit.
 * Exposed for live valid/invalid coloring during connection drags (Chunk 4).
 */
export function isValidWire(
  document: CanvasDocument,
  spec: WireSpec,
  options: { forTentative?: boolean } = {},
): WireValidity {
  const sourceNode = document.nodes.find((node) => node.id === spec.source);
  const targetNode = document.nodes.find((node) => node.id === spec.target);
  if (!sourceNode || !targetNode) {
    return { ok: false, reason: 'unknown-node', message: 'both ends must be existing nodes' };
  }
  if (spec.source === spec.target) {
    return { ok: false, reason: 'self', message: 'a node cannot wire into itself' };
  }
  for (const [node, portId, expected] of [
    [sourceNode, spec.sourcePort, 'give'],
    [targetNode, spec.targetPort, 'take'],
  ] as const) {
    if (!getNodeDef(node.type)) {
      return { ok: false, reason: 'unknown-type', message: `unregistered node type "${node.type}"` };
    }
    const port = getPort(node.type, portId);
    if (!port) {
      return {
        ok: false,
        reason: 'no-such-port',
        message: `"${node.type}" has no port "${portId}"`,
      };
    }
    if (port.direction !== expected) {
      return {
        ok: false,
        reason: 'wrong-direction',
        message: `port "${portId}" is a ${port.direction}, expected a ${expected}`,
      };
    }
  }
  const givePort = getPort(sourceNode.type, spec.sourcePort)!;
  const takePort = getPort(targetNode.type, spec.targetPort)!;
  // 'any' intakes accept every kind (e.g. a Claim's Supports takes sources,
  // other claims, or plain notes)
  if (takePort.dataKind !== 'any' && givePort.dataKind !== takePort.dataKind) {
    return {
      ok: false,
      reason: 'kind-mismatch',
      message: `"${givePort.label}" gives ${givePort.dataKind}; "${takePort.label}" takes ${takePort.dataKind}`,
    };
  }
  const duplicate = document.wires.some(
    (wire) =>
      wire.source === spec.source &&
      wire.sourcePort === spec.sourcePort &&
      wire.target === spec.target &&
      wire.targetPort === spec.targetPort,
  );
  if (duplicate) {
    return { ok: false, reason: 'duplicate', message: 'this wire already exists' };
  }
  if (!options.forTentative && takePort.capacity === 'one') {
    const occupied = document.wires.some(
      (wire) =>
        wire.status === 'live' && wire.target === spec.target && wire.targetPort === spec.targetPort,
    );
    if (occupied) {
      return {
        ok: false,
        reason: 'occupied',
        message: `"${takePort.label}" already has its one connection`,
      };
    }
  }
  return { ok: true };
}

function buildWire(spec: WireSpec, status: DataWire['status']): DataWire {
  return {
    id: createId('wire'),
    source: spec.source,
    sourcePort: spec.sourcePort,
    target: spec.target,
    targetPort: spec.targetPort,
    status,
  };
}

/** Create a live wire. Throws GraphError with the validity message if invalid. */
export function addWire(document: CanvasDocument, spec: WireSpec): CanvasDocument {
  const validity = isValidWire(document, spec);
  if (!validity.ok) {
    throw new GraphError(`cannot wire: ${validity.message}`);
  }
  return { ...document, wires: [...document.wires, buildWire(spec, 'live')] };
}

/** Create a tentative wire (capacity is not enforced until commit). */
export function createTentativeWire(document: CanvasDocument, spec: WireSpec): CanvasDocument {
  const validity = isValidWire(document, spec, { forTentative: true });
  if (!validity.ok) {
    throw new GraphError(`cannot place candidate: ${validity.message}`);
  }
  return { ...document, wires: [...document.wires, buildWire(spec, 'tentative')] };
}

export type CommitResult = {
  document: CanvasDocument;
  /** The committed wire id (unchanged -- ids are stable, I10). */
  committedId: string;
  /** The same source node's other tentative wires, dissolved by this commit. */
  dissolvedIds: string[];
};

/**
 * Commit a tentative wire: it becomes live, and the source node's OTHER
 * tentative wires dissolve (returned for the undo toast).
 */
export function commitTentativeWire(document: CanvasDocument, wireId: string): CommitResult {
  const wire = document.wires.find((candidate) => candidate.id === wireId);
  if (!wire) {
    throw new GraphError(`wire "${wireId}" not found`);
  }
  if (wire.status !== 'tentative') {
    throw new GraphError(`wire "${wireId}" is already live`);
  }
  const takePort = getPort(
    document.nodes.find((node) => node.id === wire.target)!.type,
    wire.targetPort,
  );
  if (takePort?.capacity === 'one') {
    const occupied = document.wires.some(
      (candidate) =>
        candidate.status === 'live' &&
        candidate.target === wire.target &&
        candidate.targetPort === wire.targetPort,
    );
    if (occupied) {
      throw new GraphError(`cannot commit: "${takePort.label}" already has its one connection`);
    }
  }
  const dissolvedIds = document.wires
    .filter(
      (candidate) =>
        candidate.status === 'tentative' &&
        candidate.source === wire.source &&
        candidate.id !== wireId,
    )
    .map((candidate) => candidate.id);
  const dissolved = new Set(dissolvedIds);
  return {
    document: {
      ...document,
      wires: document.wires
        .filter((candidate) => !dissolved.has(candidate.id))
        .map((candidate) =>
          candidate.id === wireId ? { ...candidate, status: 'live' as const } : candidate,
        ),
    },
    committedId: wireId,
    dissolvedIds,
  };
}

/** Remove a single tentative wire without committing anything. */
export function dissolveTentativeWire(document: CanvasDocument, wireId: string): CanvasDocument {
  const wire = document.wires.find((candidate) => candidate.id === wireId);
  if (!wire) {
    throw new GraphError(`wire "${wireId}" not found`);
  }
  if (wire.status !== 'tentative') {
    throw new GraphError(`wire "${wireId}" is live -- use removeWire`);
  }
  return { ...document, wires: document.wires.filter((candidate) => candidate.id !== wireId) };
}

export function removeWire(document: CanvasDocument, wireId: string): CanvasDocument {
  if (!document.wires.some((wire) => wire.id === wireId)) {
    throw new GraphError(`wire "${wireId}" not found`);
  }
  return { ...document, wires: document.wires.filter((wire) => wire.id !== wireId) };
}

/**
 * Move a wire within its intake's ordered list. Wire array order IS compile
 * order, so this is "reorder wires, reorder the chapter". Only the wires
 * targeting (nodeId, portId) reorder; every other wire keeps its position
 * relative to the document.
 */
export function reorderIntakeWire(
  document: CanvasDocument,
  nodeId: string,
  portId: string,
  wireId: string,
  newIndex: number,
): CanvasDocument {
  const intakeWires = document.wires.filter(
    (wire) => wire.target === nodeId && wire.targetPort === portId,
  );
  const currentIndex = intakeWires.findIndex((wire) => wire.id === wireId);
  if (currentIndex === -1) {
    throw new GraphError(`wire "${wireId}" is not on intake "${portId}" of "${nodeId}"`);
  }
  const clamped = Math.max(0, Math.min(newIndex, intakeWires.length - 1));
  if (clamped === currentIndex) return document;
  const reordered = [...intakeWires];
  const [moved] = reordered.splice(currentIndex, 1);
  reordered.splice(clamped, 0, moved!);
  // stitch the reordered subset back into the full list, preserving the
  // positions of unrelated wires
  let cursor = 0;
  return {
    ...document,
    wires: document.wires.map((wire) =>
      wire.target === nodeId && wire.targetPort === portId ? reordered[cursor++]! : wire,
    ),
  };
}

/** Set (or clear, with undefined) a wire's arc relationship (ARC_RELATIONS id). */
export function setWireRelation(
  document: CanvasDocument,
  wireId: string,
  relationId: string | undefined,
): CanvasDocument {
  if (!document.wires.some((wire) => wire.id === wireId)) {
    throw new GraphError(`wire "${wireId}" not found`);
  }
  if (relationId !== undefined && !getArcRelation(relationId)) {
    throw new GraphError(`unknown arc relationship "${relationId}"`);
  }
  return {
    ...document,
    wires: document.wires.map((wire) => {
      if (wire.id !== wireId) return wire;
      if (relationId === undefined) {
        const { relation: _dropped, ...rest } = wire;
        return rest;
      }
      return { ...wire, relation: relationId };
    }),
  };
}

/** Stamp (or clear, with undefined) the story-time index on a wire. */
export function setWireStoryTime(
  document: CanvasDocument,
  wireId: string,
  storyTime: number | undefined,
): CanvasDocument {
  if (!document.wires.some((wire) => wire.id === wireId)) {
    throw new GraphError(`wire "${wireId}" not found`);
  }
  if (storyTime !== undefined && !Number.isFinite(storyTime)) {
    throw new GraphError('story time must be a finite number');
  }
  return {
    ...document,
    wires: document.wires.map((wire) => {
      if (wire.id !== wireId) return wire;
      if (storyTime === undefined) {
        const { storyTime: _dropped, ...rest } = wire;
        return rest;
      }
      return { ...wire, storyTime };
    }),
  };
}

/** "N ideas waiting" -- tentative wires pointed at this node (badge, Chunk 4). */
export function tentativeInboundCount(document: CanvasDocument, nodeId: string): number {
  return document.wires.filter((wire) => wire.status === 'tentative' && wire.target === nodeId)
    .length;
}
