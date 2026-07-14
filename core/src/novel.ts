// ============================================================================
// NOVEL PACK derivations -- plant/payoff pairing and the story-time line.
// Pure functions only (I7); the rich faces render these.
//
// The continuity engine (stateAt over Event effects) is post-launch by
// decision; storyTime ships on Event NOW so documents never need migrating
// when it lands (BRIEF revision log #10).
// ============================================================================

import type { CanvasDocument, CanvasNode } from './schema';

export type PairEntry = {
  nodeId: string;
  /** Read live at derivation time (renames propagate, same rule as castOf). */
  title: string;
};

function titleOf(document: CanvasDocument, nodeId: string): string {
  const node = document.nodes.find((candidate) => candidate.id === nodeId);
  const title = node && typeof node.data.title === 'string' ? node.data.title.trim() : '';
  return title !== '' ? title : 'Untitled';
}

/** Everything this plant's give feeds live -- its payoffs, in wire order. */
export function payoffsOf(document: CanvasDocument, plantId: string): PairEntry[] {
  return document.wires
    .filter(
      (wire) =>
        wire.status === 'live' && wire.source === plantId && wire.sourcePort === 'plant-out',
    )
    .map((wire) => ({ nodeId: wire.target, title: titleOf(document, wire.target) }));
}

/** The plants this payoff resolves, in wire order. */
export function plantsResolvedBy(document: CanvasDocument, payoffId: string): PairEntry[] {
  return document.wires
    .filter(
      (wire) =>
        wire.status === 'live' && wire.target === payoffId && wire.targetPort === 'plants-in',
    )
    .map((wire) => ({ nodeId: wire.source, title: titleOf(document, wire.source) }));
}

// ---------------------------------------------------------------------------
// Story time: a plain number on event.data.storyTime (any scale the writer
// likes -- chapter 14.2, day 380, year 1066). The timeline is derived.
// ---------------------------------------------------------------------------

export function storyTimeOf(node: CanvasNode): number | null {
  const value = node.data['storyTime'];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export type TimelineEntry = { nodeId: string; storyTime: number; title: string };

/** Every event with a story-time, sorted -- the mini timeline's data. */
export function eventTimeline(document: CanvasDocument): TimelineEntry[] {
  return document.nodes
    .filter((node) => node.type === 'event')
    .flatMap((node) => {
      const storyTime = storyTimeOf(node);
      return storyTime === null
        ? []
        : [{ nodeId: node.id, storyTime, title: titleOf(document, node.id) }];
    })
    .sort((a, b) => a.storyTime - b.storyTime || a.nodeId.localeCompare(b.nodeId));
}

/** People wired into an event's Involves intake, with their wire's role label. */
export type InvolvementEntry = { personId: string; name: string; role: string | null };

export function involvedIn(document: CanvasDocument, eventId: string): InvolvementEntry[] {
  return document.wires
    .filter(
      (wire) =>
        wire.status === 'live' && wire.target === eventId && wire.targetPort === 'involves-in',
    )
    .map((wire) => ({
      personId: wire.source,
      name: titleOf(document, wire.source),
      role: typeof wire.label === 'string' && wire.label.trim() !== '' ? wire.label.trim() : null,
    }));
}
