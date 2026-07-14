// ============================================================================
// SPLIT -- run the spine in reverse: a node with a spine intake generates
// stub children pre-wired back into it, in order. Templates (beat sheets,
// Toulmin, Passage->Propositions) are registry-defined presets (I8); this
// module only knows how to split, never what the presets are.
// ============================================================================

import { GraphError } from './graph';
import { createId } from './ids';
import { findFreePosition, type Rect } from './layout';
import { getNodeDef, getPort, spineIntakeOf, type SplitStubSpec } from './registry';
import type { CanvasDocument, CanvasNode, DataWire } from './schema';

export type SplitResult = {
  document: CanvasDocument;
  /** Created stub node ids, in wire (reading) order. */
  createdIds: string[];
};

export type SplitOptions = {
  /** Target intake; defaults to the parent type's spine intake. */
  intakeId?: string;
  /** Injectable so tests and goldens stay deterministic. */
  idFactory?: (prefix: string) => string;
};

const STUB_GAP = 60;

/**
 * Create stub children below the parent, left-to-right in reading order,
 * each wired live into the parent's intake (spine by default; presets may
 * target another, e.g. Toulmin -> a Claim's Supports). Stubs never land on
 * existing nodes (collision-free placement), and the parent never moves (I5).
 */
export function splitNode(
  document: CanvasDocument,
  parentId: string,
  stubs: readonly SplitStubSpec[],
  options: SplitOptions = {},
): SplitResult {
  const idFactory = options.idFactory ?? createId;
  const parent = document.nodes.find((node) => node.id === parentId);
  if (!parent) {
    throw new GraphError(`node "${parentId}" not found`);
  }
  const intake = options.intakeId
    ? getPort(parent.type, options.intakeId)
    : spineIntakeOf(parent.type);
  if (!intake || intake.direction !== 'take') {
    throw new GraphError(`"${parent.type}" has no such intake to split into`);
  }
  if (stubs.length === 0) {
    throw new GraphError('nothing to split into: no stubs given');
  }
  // The stub's give port must match what the intake takes: exact-kind match
  // first; 'any' intakes take a text give (or any give as a last resort).
  const giveForIntake = (type: string) => {
    const ports = getNodeDef(type)?.ports ?? [];
    if (intake.dataKind === 'any') {
      return (
        ports.find((port) => port.direction === 'give' && port.dataKind === 'text') ??
        ports.find((port) => port.direction === 'give')
      );
    }
    return ports.find((port) => port.direction === 'give' && port.dataKind === intake.dataKind);
  };

  for (const stub of stubs) {
    const def = getNodeDef(stub.type);
    if (!def) {
      throw new GraphError(`unregistered stub type "${stub.type}" (I8)`);
    }
    if (!giveForIntake(stub.type)) {
      throw new GraphError(
        `"${stub.type}" cannot feed the ${intake.label} intake of "${parent.type}"`,
      );
    }
  }

  const parentRect: Rect = {
    x: parent.position.x,
    y: parent.position.y,
    width: parent.size?.width ?? 300,
    height: parent.size?.height ?? 200,
  };

  const occupied: Rect[] = document.nodes.map((node) => ({
    x: node.position.x,
    y: node.position.y,
    width: node.size?.width ?? 300,
    height: node.size?.height ?? 200,
  }));

  const newNodes: CanvasNode[] = [];
  const newWires: DataWire[] = [];
  let cursorX = parentRect.x;
  const rowY = parentRect.y + parentRect.height + STUB_GAP * 2;

  for (const stub of stubs) {
    const def = getNodeDef(stub.type)!;
    const size = def.size ?? { width: 300, height: 200 };
    const position = findFreePosition(occupied, { x: cursorX, y: rowY }, size, {
      gap: STUB_GAP,
    });
    const node: CanvasNode = {
      id: idFactory('node'),
      type: stub.type,
      position,
      size: { ...size },
      data: { title: stub.title, content: '' },
    };
    newNodes.push(node);
    occupied.push({ ...position, width: size.width, height: size.height });
    cursorX = position.x + size.width + STUB_GAP;

    newWires.push({
      id: idFactory('wire'),
      source: node.id,
      sourcePort: giveForIntake(stub.type)!.id,
      target: parentId,
      targetPort: intake.id,
      status: 'live',
    });
  }

  return {
    document: {
      ...document,
      nodes: [...document.nodes, ...newNodes],
      wires: [...document.wires, ...newWires],
    },
    createdIds: newNodes.map((node) => node.id),
  };
}
