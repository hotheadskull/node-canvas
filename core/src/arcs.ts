// ============================================================================
// ARCS -- the sermon pack's discourse layer (Biblearc-style arcing), pure
// derivations only (I7). An "arc" is a live wire between two propositions
// (prop-out -> arc-in) whose `relation` field names HOW the source serves the
// target, from the 18-relationship catalog below.
//
// Everything visual (chips on wires, the group face outline, the Arc room,
// the drill-in phrasing view) renders these derivations; nothing here is
// stored beyond the wires themselves.
// ============================================================================

import { stripHtml } from './derive';
import type { CanvasDocument, CanvasNode, DataWire } from './schema';

export type ArcFamily = 'coordinating' | 'restatement' | 'distinct' | 'adversative';

export type ArcRelationDef = {
  /** Stable id stored in wire.relation -- never rename. */
  id: string;
  /** Short code shown on wire chips and brackets ("G", "Id/Exp", "∴"). */
  code: string;
  label: string;
  family: ArcFamily;
  /** The connective words that usually signal this relationship. */
  hint: string;
};

export const ARC_FAMILY_LABELS: Record<ArcFamily, string> = {
  coordinating: 'Coordinating',
  restatement: 'Support by restatement',
  distinct: 'Support by distinct statement',
  adversative: 'Adversative',
};

/**
 * The 18 arcing relationships. Coordinating relations join equals (the
 * source stays at its anchor's level); every other family subordinates the
 * source under its anchor (it indents one level deeper in the phrasing).
 */
export const ARC_RELATIONS: readonly ArcRelationDef[] = [
  { id: 'series', code: 'S', label: 'Series', family: 'coordinating', hint: 'and, moreover' },
  { id: 'progression', code: 'Prog', label: 'Progression', family: 'coordinating', hint: 'then, furthermore — building steps' },
  { id: 'alternative', code: 'Alt', label: 'Alternative', family: 'coordinating', hint: 'or, either… or' },
  { id: 'action-manner', code: 'Ac/Mn', label: 'Action–Manner', family: 'restatement', hint: 'by, in that' },
  { id: 'comparison', code: 'Cf', label: 'Comparison', family: 'restatement', hint: 'as, just as' },
  { id: 'negative-positive', code: 'N/P', label: 'Negative–Positive', family: 'restatement', hint: 'not this… but that' },
  { id: 'idea-explanation', code: 'Id/Exp', label: 'Idea–Explanation', family: 'restatement', hint: 'that is, for example' },
  { id: 'question-answer', code: 'Q/A', label: 'Question–Answer', family: 'restatement', hint: 'a question and its answer' },
  { id: 'ground', code: 'G', label: 'Ground', family: 'distinct', hint: 'for, because, since' },
  { id: 'inference', code: '∴', label: 'Inference', family: 'distinct', hint: 'therefore, accordingly' },
  { id: 'action-result', code: 'Ac/Res', label: 'Action–Result', family: 'distinct', hint: 'so that, with the result that' },
  { id: 'action-purpose', code: 'Ac/Pur', label: 'Action–Purpose', family: 'distinct', hint: 'in order that, so that' },
  { id: 'conditional', code: 'If/Th', label: 'Conditional', family: 'distinct', hint: 'if… then' },
  { id: 'temporal', code: 'T', label: 'Temporal', family: 'distinct', hint: 'when, while, after' },
  { id: 'locative', code: 'L', label: 'Locative', family: 'distinct', hint: 'where, wherever' },
  { id: 'bilateral', code: 'BL', label: 'Bilateral', family: 'distinct', hint: 'supports what precedes AND follows' },
  { id: 'concessive', code: 'Csv', label: 'Concessive', family: 'adversative', hint: 'although, yet, nevertheless' },
  { id: 'situation-response', code: 'S/R', label: 'Situation–Response', family: 'adversative', hint: 'a situation and the response to it' },
];

const RELATIONS_BY_ID = new Map(ARC_RELATIONS.map((relation) => [relation.id, relation]));

export function getArcRelation(id: string): ArcRelationDef | undefined {
  return RELATIONS_BY_ID.get(id);
}

/** Relations grouped by family, in catalog order (for pickers). */
export function arcRelationsByFamily(): { family: ArcFamily; label: string; relations: ArcRelationDef[] }[] {
  return (Object.keys(ARC_FAMILY_LABELS) as ArcFamily[]).map((family) => ({
    family,
    label: ARC_FAMILY_LABELS[family],
    relations: ARC_RELATIONS.filter((relation) => relation.family === family),
  }));
}

/** An arc wire: live, into an arc intake, both ends propositions. */
export function isArcWire(document: CanvasDocument, wire: DataWire): boolean {
  if (wire.status !== 'live' || wire.targetPort !== 'arc-in') return false;
  const source = document.nodes.find((node) => node.id === wire.source);
  const target = document.nodes.find((node) => node.id === wire.target);
  return source?.type === 'proposition' && target?.type === 'proposition';
}

// ---------------------------------------------------------------------------
// Arc outline: main points + subordination levels, derived from the arcs
// among a member set (an "Arc group" is just an assembly holding >= 2
// propositions -- no special entity, so collapse stays lossless, I4).
// ---------------------------------------------------------------------------

export type ArcOutlineEntry = {
  nodeId: string;
  /** 0 = main point; each subordinating arc indents one level deeper. */
  level: number;
  /** The proposition this one serves (its first outgoing arc), if any. */
  anchorId?: string;
  /** The relationship carried by that arc, if one was chosen. */
  relationId?: string;
};

export type ArcOutline = {
  /** Reading order: by canvas position, top to bottom (I5: read-only). */
  entries: ArcOutlineEntry[];
  mainPointIds: string[];
  propCount: number;
  arcCount: number;
};

export function arcOutline(document: CanvasDocument, memberIds: readonly string[]): ArcOutline {
  const memberSet = new Set(memberIds);
  const props = document.nodes.filter(
    (node): node is CanvasNode => memberSet.has(node.id) && node.type === 'proposition',
  );
  const propIds = new Set(props.map((prop) => prop.id));
  const arcs = document.wires.filter(
    (wire) =>
      wire.status === 'live' &&
      wire.targetPort === 'arc-in' &&
      propIds.has(wire.source) &&
      propIds.has(wire.target),
  );

  // Each proposition serves at most one anchor for the outline: its first
  // outgoing arc in wire order (extra arcs still render as wires).
  const outgoing = new Map<string, DataWire>();
  for (const wire of arcs) {
    if (!outgoing.has(wire.source)) outgoing.set(wire.source, wire);
  }

  const levels = new Map<string, number>();
  const levelOf = (id: string, path: Set<string>): number => {
    const known = levels.get(id);
    if (known !== undefined) return known;
    if (path.has(id)) return 0; // arc cycle: treat as a main point, never hang
    path.add(id);
    const wire = outgoing.get(id);
    let level = 0;
    if (wire) {
      const relation = wire.relation ? getArcRelation(wire.relation) : undefined;
      const coordinating = relation?.family === 'coordinating';
      level = levelOf(wire.target, path) + (coordinating ? 0 : 1);
    }
    levels.set(id, level);
    return level;
  };

  const ordered = [...props].sort(
    (a, b) =>
      a.position.y - b.position.y || a.position.x - b.position.x || a.id.localeCompare(b.id),
  );

  const entries: ArcOutlineEntry[] = ordered.map((prop) => {
    const wire = outgoing.get(prop.id);
    return {
      nodeId: prop.id,
      level: levelOf(prop.id, new Set()),
      ...(wire ? { anchorId: wire.target } : {}),
      ...(wire?.relation !== undefined ? { relationId: wire.relation } : {}),
    };
  });

  return {
    entries,
    mainPointIds: entries.filter((entry) => entry.level === 0).map((entry) => entry.nodeId),
    propCount: props.length,
    arcCount: arcs.length,
  };
}

// ---------------------------------------------------------------------------
// Big Idea: the sermon-mode Title derives its exegetical statement from the
// nodes wired into Subject and Complement -- read live, by reference, so
// editing the wired notes updates the statement (same rule as castOf).
// ---------------------------------------------------------------------------

export type BigIdea = {
  subject: string | null;
  complement: string | null;
  /** Derived subject–complement sentence; null until both are wired. */
  exegetical: string | null;
};

export function bigIdeaOf(document: CanvasDocument, nodeId: string): BigIdea {
  const textFrom = (portId: string): string | null => {
    const wire = document.wires.find(
      (candidate) =>
        candidate.status === 'live' &&
        candidate.target === nodeId &&
        candidate.targetPort === portId,
    );
    if (!wire) return null;
    const source = document.nodes.find((node) => node.id === wire.source);
    if (!source) return null;
    const content =
      typeof source.data.content === 'string' ? stripHtml(source.data.content).trim() : '';
    if (content !== '') return content;
    const title = typeof source.data.title === 'string' ? source.data.title.trim() : '';
    return title !== '' ? title : null;
  };
  const subject = textFrom('subject-in');
  const complement = textFrom('complement-in');
  return {
    subject,
    complement,
    exegetical: subject !== null && complement !== null ? `${subject} — ${complement}` : null,
  };
}
