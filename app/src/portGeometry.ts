// ============================================================================
// PORT GEOMETRY -- the numbers and decisions BOTH renderers share.
//
// CanvasNode places the DOM handles with these; harnessRouting places the
// wire anchors with them. They must agree exactly: WireEdge compares the
// two and any disagreement renders as a permanently ghosted wire (found
// 2026-08-10 -- two hand-rolled copies of the auto-side rule drifted on
// their width fallbacks and tie-breaks).
// ============================================================================

import { getNodeDef, type CanvasDocument, type CanvasNode } from '@node-canvas/core';

/** First port slot center, from the plate top. */
export const PORT_TOP = 34;
/** Pitch between slots on the same edge (pt2 handoff §3: 12px). */
export const PORT_GAP = 12;
/** Observatory §10: the open state's rendered width. The DOCUMENT width is
 * untouched -- anchors, obstacles and side decisions borrow this only
 * while a plate is open. */
export const OPEN_WIDTH = 736;

/** The width a plate RENDERS at right now (stored size, else the
 * registry default, else 300; the open plate borrows OPEN_WIDTH). */
export function nodeRenderWidth(node: CanvasNode, openNodeId: string | null): number {
  if (node.id === openNodeId) return OPEN_WIDTH;
  return node.size?.width ?? getNodeDef(node.type)?.size?.width ?? 300;
}

/** Stored/default height -- the same fallback chain anchorFor uses. */
function nodeStoredHeight(node: CanvasNode): number {
  return node.size?.height ?? getNodeDef(node.type)?.size?.height ?? 150;
}

/**
 * Four-sided ports (pt2 handoff §4): when a wired partner sits ABOVE or
 * BELOW this plate, the port moves to that edge so a wire never loops
 * around the plate. "Above/below" means BOTH of:
 *   - the partner's rect clears this plate's vertical span entirely
 *     (side-by-side neighbours with close centers must NOT trigger it), and
 *   - horizontal centers closer than a quarter of the combined widths.
 * The OPEN plate never auto-moves its own ports: its rendered height is
 * auto (content-sized), so a bottom anchor computed from the stored
 * height would land far from the DOM handle and ghost the wire.
 * The FIRST qualifying live wire decides, so every caller resolves the
 * same side; null = stay on the grammar side.
 */
export function autoSideFor(
  document: CanvasDocument,
  nodeId: string,
  portId: string,
  openNodeId: string | null,
): 'top' | 'bottom' | null {
  if (nodeId === openNodeId) return null;
  const node = document.nodes.find((candidate) => candidate.id === nodeId);
  if (!node) return null;
  const width = nodeRenderWidth(node, openNodeId);
  const height = nodeStoredHeight(node);
  const thisCenterX = node.position.x + width / 2;
  for (const wire of document.wires) {
    if (wire.status !== 'live') continue;
    const isTarget = wire.target === nodeId && wire.targetPort === portId;
    const isSource = wire.source === nodeId && wire.sourcePort === portId;
    if (!isTarget && !isSource) continue;

    const partnerId = isTarget ? wire.source : wire.target;
    const partner = document.nodes.find((candidate) => candidate.id === partnerId);
    if (!partner) continue;

    const partnerAbove = partner.position.y + nodeStoredHeight(partner) <= node.position.y;
    const partnerBelow = partner.position.y >= node.position.y + height;
    if (!partnerAbove && !partnerBelow) continue;

    const partnerWidth = nodeRenderWidth(partner, openNodeId);
    const partnerCenterX = partner.position.x + partnerWidth / 2;
    if (Math.abs(thisCenterX - partnerCenterX) < (width + partnerWidth) / 4) {
      return partnerAbove ? 'top' : 'bottom';
    }
  }
  return null;
}
