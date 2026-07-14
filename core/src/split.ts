// ============================================================================
// SPLIT -- run the spine in reverse: a node with a spine intake generates
// stub children pre-wired back into it, in order. Templates (beat sheets,
// Toulmin, Passage->Propositions) are registry-defined presets (I8); this
// module only knows how to split, never what the presets are.
// ============================================================================

import { GraphError } from './graph';
import { createId } from './ids';
import { findFreePosition, type Rect } from './layout';
import { getNodeDef, spineIntakeOf, textGiveOf, type SplitStubSpec } from './registry';
import type { CanvasDocument, CanvasNode, DataWire } from './schema';

export type SplitResult = {
  document: CanvasDocument;
  /** Created stub node ids, in wire (reading) order. */
  createdIds: string[];
};

const STUB_GAP = 60;

/**
 * Create stub children below the parent, left-to-right in reading order,
 * each wired live into the parent's spine intake. Stubs never land on
 * existing nodes (collision-free placement), and the parent never moves (I5).
 *
 * `idFactory` exists so tests (and goldens) can inject deterministic ids.
 */
export function splitNode(
  document: CanvasDocument,
  parentId: string,
  stubs: readonly SplitStubSpec[],
  idFactory: (prefix: string) => string = createId,
): SplitResult {
  const parent = document.nodes.find((node) => node.id === parentId);
  if (!parent) {
    throw new GraphError(`node "${parentId}" not found`);
  }
  const intake = spineIntakeOf(parent.type);
  if (!intake) {
    throw new GraphError(`"${parent.type}" has no spine intake to split into`);
  }
  if (stubs.length === 0) {
    throw new GraphError('nothing to split into: no stubs given');
  }
  for (const stub of stubs) {
    const def = getNodeDef(stub.type);
    if (!def) {
      throw new GraphError(`unregistered stub type "${stub.type}" (I8)`);
    }
    const give = textGiveOf(stub.type);
    if (!give || give.dataKind !== intake.dataKind) {
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
      sourcePort: textGiveOf(stub.type)!.id,
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
