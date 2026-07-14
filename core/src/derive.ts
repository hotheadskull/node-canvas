// ============================================================================
// DERIVATIONS -- pure functions computed FROM the graph, never stored as
// user-editable data. Every value here is drill-downable to the nodes that
// produced it (provenance), and every function has a golden test.
//
// Nothing here mutates anything. app/ renders these; it never re-derives.
// ============================================================================

import type { CanvasDocument, CanvasNode } from './schema';
import { getNodeDef, spineIntakeOf } from './registry';

// ---------------------------------------------------------------------------
// Compile: wire-order text concatenation up the spine (I7 worked example:
// "reorder wires, reorder the chapter").
// ---------------------------------------------------------------------------

export type CompileResult = {
  text: string;
  /** Node ids whose text contributed, in reading order (provenance). */
  sources: string[];
  /** Nodes skipped because they were already on the path (cycle guard). */
  cycles: string[];
};

function nodeById(document: CanvasDocument, id: string): CanvasNode | undefined {
  return document.nodes.find((node) => node.id === id);
}

/** LIVE wires into a node's spine intake, in wire (array) order. */
export function spineWiresInto(document: CanvasDocument, nodeId: string) {
  const node = nodeById(document, nodeId);
  if (!node) return [];
  const intake = spineIntakeOf(node.type);
  if (!intake) return [];
  return document.wires.filter(
    (wire) => wire.target === nodeId && wire.targetPort === intake.id && wire.status === 'live',
  );
}

/**
 * Compile a node: its own content, then each spine-wired source's compiled
 * text, in wire order, joined by blank lines. Tentative wires never compile
 * (they are candidates, not placements).
 */
export function compile(document: CanvasDocument, nodeId: string): CompileResult {
  const sources: string[] = [];
  const cycles: string[] = [];

  const visit = (id: string, path: ReadonlySet<string>): string => {
    if (path.has(id)) {
      cycles.push(id);
      return '';
    }
    const node = nodeById(document, id);
    if (!node) return '';
    const nextPath = new Set(path).add(id);
    const own = typeof node.data.content === 'string' ? node.data.content.trim() : '';
    const parts: string[] = [];
    if (own !== '') {
      parts.push(own);
      sources.push(id);
    }
    for (const wire of spineWiresInto(document, id)) {
      const piece = visit(wire.source, nextPath);
      if (piece !== '') parts.push(piece);
    }
    return parts.join('\n\n');
  };

  const text = visit(nodeId, new Set());
  return { text, sources, cycles };
}

/** Node content may be TipTap HTML; derivations count words, not markup. */
export function stripHtml(text: string): string {
  return text
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h[1-6]|li|blockquote)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

export function wordCount(text: string): number {
  const trimmed = stripHtml(text).trim();
  if (trimmed === '') return 0;
  return trimmed.split(/\s+/).length;
}

// ---------------------------------------------------------------------------
// Cast: people wired into the spine's sections, derived BY REFERENCE --
// renaming a person propagates because names are read live, never copied
// (worked example: "rename Bob -> Robert propagates everywhere").
// ---------------------------------------------------------------------------

export type CastEntry = {
  personId: string;
  /** Read live from the person node at derivation time. */
  name: string;
  /** Which sections the person appears in (provenance). */
  appearsIn: string[];
};

export function castOf(document: CanvasDocument, nodeId: string): CastEntry[] {
  const appearances = new Map<string, string[]>();

  const visit = (id: string, path: ReadonlySet<string>) => {
    if (path.has(id)) return;
    const nextPath = new Set(path).add(id);
    const node = nodeById(document, id);
    if (!node) return;
    for (const wire of document.wires) {
      if (wire.target !== id || wire.status !== 'live') continue;
      const source = nodeById(document, wire.source);
      if (source?.type === 'person') {
        const list = appearances.get(source.id) ?? [];
        if (!list.includes(id)) list.push(id);
        appearances.set(source.id, list);
      }
    }
    for (const wire of spineWiresInto(document, id)) {
      visit(wire.source, nextPath);
    }
  };

  visit(nodeId, new Set());
  return [...appearances.entries()].map(([personId, appearsIn]) => ({
    personId,
    name: (() => {
      const person = nodeById(document, personId);
      const title = person && typeof person.data.title === 'string' ? person.data.title : '';
      return title !== '' ? title : 'Unnamed';
    })(),
    appearsIn,
  }));
}

// ---------------------------------------------------------------------------
// deriveFace: categorized member counts for a collapsed face
// ("Person: 2 · Place: 1 · Note: 1"). Assemblies consume this in Chunk 7/8.
// ---------------------------------------------------------------------------

export type FaceCount = { type: string; label: string; count: number };

export function deriveFace(document: CanvasDocument, memberIds: readonly string[]): FaceCount[] {
  const counts = new Map<string, number>();
  for (const id of memberIds) {
    const node = nodeById(document, id);
    if (!node) continue;
    counts.set(node.type, (counts.get(node.type) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([type, count]) => ({
      type,
      label: getNodeDef(type)?.labels.universal ?? type,
      count,
    }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

// ---------------------------------------------------------------------------
// Readiness: seed -> developing -> ready -> placed. Stored per node in
// node.data.readiness (absent = seed); rollups summarize any node set.
// ---------------------------------------------------------------------------

export const READINESS_STAGES = ['seed', 'developing', 'ready', 'placed'] as const;
export type Readiness = (typeof READINESS_STAGES)[number];

export function readinessOf(node: CanvasNode): Readiness {
  const value = node.data['readiness'];
  return READINESS_STAGES.includes(value as Readiness) ? (value as Readiness) : 'seed';
}

export type ReadinessRollup = {
  counts: Record<Readiness, number>;
  /** The least-advanced stage present -- an assembly is only as ready as its rawest member. */
  overall: Readiness;
  total: number;
};

export function rollupReadiness(
  document: CanvasDocument,
  memberIds: readonly string[],
): ReadinessRollup {
  const counts: Record<Readiness, number> = { seed: 0, developing: 0, ready: 0, placed: 0 };
  let total = 0;
  for (const id of memberIds) {
    const node = nodeById(document, id);
    if (!node) continue;
    counts[readinessOf(node)] += 1;
    total += 1;
  }
  const overall =
    READINESS_STAGES.find((stage) => counts[stage] > 0) ??
    ('placed' as Readiness);
  return { counts, overall: total === 0 ? 'seed' : overall, total };
}

// ---------------------------------------------------------------------------
// Ownership: a plain per-node tag (no accounts, no sync -- just a field).
// Rollups answer "who is the group waiting on?"
// ---------------------------------------------------------------------------

export function ownerOf(node: CanvasNode): string | null {
  const value = node.data['owner'];
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null;
}

export type OwnerRollup = { owner: string; outstanding: number };

/** Per-owner counts of member nodes that are not yet 'placed'. */
export function ownersOutstanding(
  document: CanvasDocument,
  memberIds: readonly string[],
): OwnerRollup[] {
  const counts = new Map<string, number>();
  for (const id of memberIds) {
    const node = document.nodes.find((candidate) => candidate.id === id);
    if (!node) continue;
    const owner = ownerOf(node);
    if (!owner || readinessOf(node) === 'placed') continue;
    counts.set(owner, (counts.get(owner) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([owner, outstanding]) => ({ owner, outstanding }))
    .sort((a, b) => b.outstanding - a.outstanding || a.owner.localeCompare(b.owner));
}

// ---------------------------------------------------------------------------
// Workbench: the standing inbox. Quick capture stamps notes with capturedAt;
// the face derives "N notes · oldest X".
// ---------------------------------------------------------------------------

export type WorkbenchInfo = { count: number; oldestCapturedAt: string | null };

export function workbenchInfo(
  document: CanvasDocument,
  memberIds: readonly string[],
): WorkbenchInfo {
  let count = 0;
  let oldest: string | null = null;
  for (const id of memberIds) {
    const node = document.nodes.find((candidate) => candidate.id === id);
    if (!node) continue;
    count += 1;
    const captured = node.data['capturedAt'];
    if (typeof captured === 'string' && (oldest === null || captured < oldest)) {
      oldest = captured;
    }
  }
  return { count, oldestCapturedAt: oldest };
}

// ---------------------------------------------------------------------------
// Hygiene flags: a node flags itself when a flagWhenEmpty intake is empty --
// but ONLY if the node already participates in wiring. Port-free canvases
// never see a flag (I2: ports are opt-in).
// ---------------------------------------------------------------------------

export type HygieneFlag = {
  nodeId: string;
  portId: string;
  portLabel: string;
};

export function hygieneFlags(document: CanvasDocument): HygieneFlag[] {
  const flags: HygieneFlag[] = [];
  for (const node of document.nodes) {
    const def = getNodeDef(node.type);
    if (!def) continue;
    const watched = def.ports.filter((port) => port.direction === 'take' && port.flagWhenEmpty);
    if (watched.length === 0) continue;
    const participates = document.wires.some(
      (wire) =>
        wire.status === 'live' && (wire.source === node.id || wire.target === node.id),
    );
    if (!participates) continue;
    for (const port of watched) {
      const occupied = document.wires.some(
        (wire) =>
          wire.target === node.id && wire.targetPort === port.id && wire.status === 'live',
      );
      if (!occupied) {
        flags.push({ nodeId: node.id, portId: port.id, portLabel: port.label });
      }
    }
  }
  return flags;
}
