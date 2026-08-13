// ============================================================================
// CONNECTION INFERENCE -- "the connection itself communicates the
// relationship" (design direction 2026-08-12 §2; user decision, question 1:
// "infer it").
//
// Under the port-heavy model the user had to aim at a named socket: drag
// from Identity to People to say a character is in a chapter. That stack is
// retired. Now a connection is one drag between two nodes, and THIS decides
// what it meant: a Person into a Section is cast, a Place is the setting, a
// Note into a Document is a section of it.
//
// The rule is deliberately boring, because a surprising inference is worse
// than none: take the source's gives in registry order, find the first take
// on the target that accepts that kind and still has room. First match wins.
// No scoring, no heuristics on titles, no learning. If nothing matches, the
// connection stays a plain relationship -- which is always legal (I1).
//
// Direction is forgiving. Dragging Chapter -> Durvain means the same thing
// as Durvain -> Chapter, so a failed forward match is retried reversed. The
// caller gets told which way round it landed and stores the wire that way.
// ============================================================================

import { getNodeDef, type PortDef } from './registry';
import type { CanvasDocument } from './schema';

export type InferredConnection = {
  /** Node the wire leaves (may be the drag's TARGET when reversed). */
  source: string;
  sourcePort: string;
  /** Node the wire enters. */
  target: string;
  targetPort: string;
  /** True when the drag ran target->source and was flipped to fit. */
  reversed: boolean;
};

/** Live wires already landed on this port. */
function inboundCount(document: CanvasDocument, nodeId: string, portId: string): number {
  return document.wires.filter(
    (wire) => wire.status === 'live' && wire.target === nodeId && wire.targetPort === portId,
  ).length;
}

/** A take can accept another wire (capacity 'one' holds exactly one). */
function hasRoom(document: CanvasDocument, nodeId: string, port: PortDef): boolean {
  if (port.capacity !== 'one') return true;
  return inboundCount(document, nodeId, port.id) === 0;
}

/**
 * Takes that must NEVER win an inference. Every type carries `notes-in`, a
 * catch-all text sink, so it matches almost any drag -- and because it
 * matches, it would swallow the readings that actually mean something.
 *
 * Caught by the golden: with Chapter 1's Setting already full, dropping a
 * second Place inferred "this chapter is a note on that place", and
 * dragging a Chapter onto Durvain inferred "the chapter is a note on
 * Durvain" rather than "Durvain is in this chapter". Both are the sink
 * winning. Filing something under Notes stays available -- it just has to
 * be asked for, never guessed.
 */
const NEVER_INFERRED_TAKES = new Set(['notes-in']);

/** How good a reading is. Exact kinds beat catch-all 'any' takes. */
type Candidate = { sourcePort: string; targetPort: string; exact: boolean };

/**
 * Every legal (give, take) pair in ONE direction, best first: exact kind
 * matches before 'any' takes, registry order within each. Registry order
 * decides ties, so the answer is stable for a given pair of types.
 */
function candidatesOneWay(
  document: CanvasDocument,
  sourceId: string,
  targetId: string,
): Candidate[] {
  const sourceNode = document.nodes.find((node) => node.id === sourceId);
  const targetNode = document.nodes.find((node) => node.id === targetId);
  if (!sourceNode || !targetNode) return [];

  const sourceDef = getNodeDef(sourceNode.type);
  const targetDef = getNodeDef(targetNode.type);
  if (!sourceDef || !targetDef) return [];

  const found: Candidate[] = [];
  for (const give of sourceDef.ports.filter((port) => port.direction === 'give')) {
    for (const take of targetDef.ports.filter((port) => port.direction === 'take')) {
      if (NEVER_INFERRED_TAKES.has(take.id)) continue;
      const exact = take.dataKind === give.dataKind;
      // 'any' takes (Claim's Supports, Hub's Holds) accept whatever is
      // offered -- a real reading, just a broader one than an exact kind
      if (!exact && take.dataKind !== 'any') continue;
      if (!hasRoom(document, targetId, take)) continue;
      found.push({ sourcePort: give.id, targetPort: take.id, exact });
    }
  }
  return found.sort((a, b) => Number(b.exact) - Number(a.exact));
}

/**
 * What did the user mean by connecting these two nodes? Returns the wire to
 * create, or null when no typed reading exists and the connection should
 * stay a plain relationship.
 *
 * Self-connections never infer -- a node feeding itself is a loop, not a
 * relationship.
 */
export function inferConnection(
  document: CanvasDocument,
  fromId: string,
  toId: string,
): InferredConnection | null {
  if (fromId === toId) return null;

  const forward = candidatesOneWay(document, fromId, toId);
  const backward = candidatesOneWay(document, toId, fromId);

  // An EXACT reading wins wherever it sits, even if that means flipping the
  // drag: dragging Chapter 1 onto Durvain reads as "Durvain is in this
  // chapter", not "the chapter is a note about Durvain". Only when neither
  // direction has an exact match does the drag's own direction break the
  // tie between two broad ones.
  const pick =
    forward.find((candidate) => candidate.exact) ??
    backward.find((candidate) => candidate.exact) ??
    forward[0] ??
    backward[0];
  if (!pick) return null;

  const isForward = forward.includes(pick);
  return {
    source: isForward ? fromId : toId,
    sourcePort: pick.sourcePort,
    target: isForward ? toId : fromId,
    targetPort: pick.targetPort,
    reversed: !isForward,
  };
}

/**
 * The words for what was inferred, for the wire chip and the undo toast:
 * "Durvain -> cast of Chapter 1". Uses the TAKE's label, because the take
 * is what names the relationship ("People", "Setting", "Supports").
 */
export function describeInference(
  document: CanvasDocument,
  inferred: InferredConnection,
): string {
  const target = document.nodes.find((node) => node.id === inferred.target);
  const def = target ? getNodeDef(target.type) : undefined;
  const take = def?.ports.find((port) => port.id === inferred.targetPort);
  return take?.label ?? 'Related';
}
