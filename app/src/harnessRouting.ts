// ============================================================================
// HARNESS ANCHORS -- where wires physically attach (Observatory §4).
//
// core/src/harness.ts owns the geometry; this module owns the PIXELS: a
// port slot's center derives from the same constants CanvasNode renders
// with (PORT_TOP / PORT_GAP / PORT_INSET_X), so the harness and the DOM can
// never drift apart. Collapsed plates anchor at their merged dot (v-center).
//
// The routed result is flattened to primitives because Canvas's
// keepIdentity() shallow-compares edge data -- nested objects would break
// identity on every sync and re-render every wire.
// ============================================================================

import {
  getNodeDef,
  routeHarness,
  type CanvasDocument,
  type HarnessEndpoint,
  type HarnessWireInput,
  type RoutingRect,
} from '@node-canvas/core';
import { PORT_GAP, PORT_TOP } from './components/CanvasNode';

/** React Flow anchors an edge at the handle's OUTER edge in its Position
 * direction (measured empirically against the DOM: give = nodeRight + 3,
 * take = nodeLeft - 3 with the current slot geometry). */
const ANCHOR_OUT = 3;

/** Observatory §10: the open state's rendered width. The DOCUMENT width is
 * untouched -- anchors and obstacles borrow this only while a plate is open
 * so wires stay settled on the grown plate. */
export const OPEN_WIDTH = 736;

export type FlatHarness = {
  harnessD: string;
  harnessLabelX: number;
  harnessLabelY: number;
  /** The routed endpoints -- WireEdge compares these against React Flow's
   * LIVE handle coords; divergence means a drag is in flight => ghost. */
  harnessSX: number;
  harnessSY: number;
  harnessTX: number;
  harnessTY: number;
  harnessJunctionX?: number;
  harnessJunctionY?: number;
};

export function anchorFor(
  document: CanvasDocument,
  nodeId: string,
  portId: string,
  direction: 'give' | 'take',
  zoomBorrow: boolean,
  openNodeId: string | null = null,
): HarnessEndpoint | null {
  const node = document.nodes.find((candidate) => candidate.id === nodeId);
  if (!node) return null;
  const def = getNodeDef(node.type);
  if (!def) return null;
  const width =
    nodeId === openNodeId ? OPEN_WIDTH : (node.size?.width ?? def.size?.width ?? 300);
  const height = node.size?.height ?? def.size?.height ?? 150;
  const sidePorts = def.ports.filter((port) => port.direction === direction);
  const index = sidePorts.findIndex((port) => port.id === portId);
  if (index === -1) return null;
  // gutter swap: a flipped node takes on the RIGHT and gives on the LEFT
  const flipped = node.data['flipped'] === true;
  const side =
    direction === 'take'
      ? flipped
        ? ('right' as const)
        : ('left' as const)
      : flipped
        ? ('left' as const)
        : ('right' as const);
  const collapsed = zoomBorrow || node.data['collapsed'] === 'collapsed';
  const y = collapsed
    ? node.position.y + height / 2
    : node.position.y + PORT_TOP + index * PORT_GAP;
  const x =
    side === 'left' ? node.position.x - ANCHOR_OUT : node.position.x + width + ANCHOR_OUT;
  return { x, y, side };
}

/** Route every visible live wire; returns wireId -> flat harness fields.
 * Visible plates ride along as OBSTACLES (Phase D): lanes slide into free
 * channels and horizontal runs dodge plates -- hidden members of collapsed
 * groups must NOT block corridors, hence the visibility predicate. */
export function computeHarness(
  document: CanvasDocument,
  wireVisible: (wire: CanvasDocument['wires'][number]) => boolean,
  zoomBorrow: boolean,
  nodeVisible: (id: string) => boolean = () => true,
  openNodeId: string | null = null,
): Map<string, FlatHarness> {
  const obstacles: RoutingRect[] = document.nodes
    .filter((node) => nodeVisible(node.id))
    .map((node) => {
      const def = getNodeDef(node.type);
      return {
        id: node.id,
        x: node.position.x,
        y: node.position.y,
        width:
          node.id === openNodeId ? OPEN_WIDTH : (node.size?.width ?? def?.size?.width ?? 300),
        height: node.size?.height ?? def?.size?.height ?? 150,
      };
    });
  const inputs: HarnessWireInput[] = [];
  for (const wire of document.wires) {
    if (wire.status !== 'live' || !wireVisible(wire)) continue;
    const source = anchorFor(document, wire.source, wire.sourcePort, 'give', zoomBorrow, openNodeId);
    const target = anchorFor(document, wire.target, wire.targetPort, 'take', zoomBorrow, openNodeId);
    if (!source || !target) continue;
    inputs.push({
      id: wire.id,
      source,
      target,
      sourceKey: `${wire.source}:${wire.sourcePort}`,
      targetKey: `${wire.target}:${wire.targetPort}`,
    });
  }
  const routed = routeHarness(inputs, obstacles);
  const flat = new Map<string, FlatHarness>();
  routed.forEach((wire, index) => {
    const input = inputs[index]!;
    flat.set(wire.id, {
      harnessD: wire.d,
      harnessLabelX: wire.labelX,
      harnessLabelY: wire.labelY,
      harnessSX: input.source.x,
      harnessSY: input.source.y,
      harnessTX: input.target.x,
      harnessTY: input.target.y,
      ...(wire.junction
        ? { harnessJunctionX: wire.junction.x, harnessJunctionY: wire.junction.y }
        : {}),
    });
  });
  return flat;
}
