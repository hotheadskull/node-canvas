// ============================================================================
// DOCUMENT BLOCKS -- the block-sequence body of the Document node
// (docs/design/node-passes/document.md, user-designed after their v1 rework).
//
// The document is an ordered list of blocks: owned TEXT blocks interleaved
// with EMBED blocks, each embed the landing spot of one live spine wire.
// An embed MIRRORS its source until it is edited inside the document, then
// it FORKS: the document keeps its version (`fork`), the source node keeps
// the original. Write-back is deliberate only (applyForkToSource).
//
// Blocks live in the document node's `data.blocks` (schema passthrough --
// no format change, I8/I10: block ids are stable, order is data). All of
// this is pure; the face just renders it (I7).
// ============================================================================

import { compile, spineWiresInto } from './derive';
import { GraphError } from './graph';
import { createId } from './ids';
import type { CanvasDocument, CanvasNode } from './schema';

export type TextBlock = { id: string; kind: 'text'; content: string };
export type EmbedBlock = {
  id: string;
  kind: 'embed';
  /** The live spine wire this embed is the landing spot of. */
  wireId: string;
  /** Present = FORKED: the document's own version of the passage. */
  fork?: string;
};
export type DocBlock = TextBlock | EmbedBlock;

type IdFactory = (prefix: string) => string;

function rawBlocks(node: CanvasNode): DocBlock[] {
  const value = node.data['blocks'];
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const blocks: DocBlock[] = [];
  for (const entry of value) {
    if (typeof entry !== 'object' || entry === null) continue;
    const candidate = entry as Record<string, unknown>;
    if (typeof candidate['id'] !== 'string' || seen.has(candidate['id'])) continue;
    if (candidate['kind'] === 'text' && typeof candidate['content'] === 'string') {
      blocks.push({ id: candidate['id'], kind: 'text', content: candidate['content'] });
      seen.add(candidate['id']);
    } else if (candidate['kind'] === 'embed' && typeof candidate['wireId'] === 'string') {
      blocks.push({
        id: candidate['id'],
        kind: 'embed',
        wireId: candidate['wireId'],
        ...(typeof candidate['fork'] === 'string' ? { fork: candidate['fork'] } : {}),
      });
      seen.add(candidate['id']);
    }
  }
  return blocks;
}

/**
 * The document's normalized block sequence. This is ALSO the lazy migration:
 * - a document without blocks becomes [own text] + one embed per live spine
 *   wire, in wire order (exactly the old intake-list reading order);
 * - live spine wires missing an embed block gain one (appended);
 * - embed blocks whose wire is gone are dropped -- unless FORKED, in which
 *   case they convert to owned text (severed quotes keep their words);
 * - at least one text block always exists (somewhere to type).
 * Synthesized ids are DETERMINISTIC (derived from wire/node ids), so calling
 * this on an un-materialized document is stable across renders (I10).
 */
export function blocksOf(document: CanvasDocument, nodeId: string): DocBlock[] {
  const node = document.nodes.find((candidate) => candidate.id === nodeId);
  if (!node) return [];
  const liveWireIds = new Set(spineWiresInto(document, nodeId).map((wire) => wire.id));

  const kept: DocBlock[] = [];
  const claimed = new Set<string>();
  for (const block of rawBlocks(node)) {
    if (block.kind === 'text') {
      kept.push(block);
      continue;
    }
    if (liveWireIds.has(block.wireId) && !claimed.has(block.wireId)) {
      claimed.add(block.wireId);
      kept.push(block);
    } else if (block.fork !== undefined) {
      kept.push({ id: block.id, kind: 'text', content: block.fork });
    }
  }

  const blocks: DocBlock[] = [];
  if (kept.length === 0) {
    const own = typeof node.data.content === 'string' ? node.data.content : '';
    blocks.push({ id: `blk-${nodeId}-own`, kind: 'text', content: own });
  } else {
    blocks.push(...kept);
  }
  for (const wire of spineWiresInto(document, nodeId)) {
    if (!claimed.has(wire.id)) {
      blocks.push({ id: `blk-${wire.id}`, kind: 'embed', wireId: wire.id });
    }
  }
  if (!blocks.some((block) => block.kind === 'text')) {
    blocks.push({ id: `blk-${nodeId}-tail`, kind: 'text', content: '' });
  }
  return blocks;
}

/** The text an embed displays: its fork, or the source's compiled text. */
export function embedText(document: CanvasDocument, block: EmbedBlock): string {
  if (block.fork !== undefined) return block.fork;
  const wire = document.wires.find((candidate) => candidate.id === block.wireId);
  if (!wire) return '';
  return compile(document, wire.source).text;
}

/**
 * Compile a blocks document: block order IS reading order. Text blocks
 * contribute their content, embeds their fork or the source's compiled
 * text. Falls back to plain compile() for nodes without blocks.
 */
export function compileBlocks(
  document: CanvasDocument,
  nodeId: string,
): { text: string; sources: string[] } {
  const node = document.nodes.find((candidate) => candidate.id === nodeId);
  if (!node) return { text: '', sources: [] };
  if (!Array.isArray(node.data['blocks'])) {
    const compiled = compile(document, nodeId);
    return { text: compiled.text, sources: compiled.sources };
  }
  const parts: string[] = [];
  const sources: string[] = [];
  for (const block of blocksOf(document, nodeId)) {
    if (block.kind === 'text') {
      const trimmed = block.content.trim();
      if (trimmed !== '') {
        parts.push(trimmed);
        if (!sources.includes(nodeId)) sources.push(nodeId);
      }
    } else {
      const text = embedText(document, block).trim();
      if (text !== '') {
        parts.push(text);
        const wire = document.wires.find((candidate) => candidate.id === block.wireId);
        if (wire && !sources.includes(wire.source)) sources.push(wire.source);
      }
    }
  }
  return { text: parts.join('\n\n'), sources };
}

// ---------------------------------------------------------------------------
// Ops -- all pure, all return a new CanvasDocument.
// ---------------------------------------------------------------------------

function withBlocks(
  document: CanvasDocument,
  nodeId: string,
  blocks: DocBlock[],
): CanvasDocument {
  return {
    ...document,
    nodes: document.nodes.map((node) =>
      node.id === nodeId ? { ...node, data: { ...node.data, blocks } } : node,
    ),
  };
}

function requireBlocks(document: CanvasDocument, nodeId: string): DocBlock[] {
  if (!document.nodes.some((node) => node.id === nodeId)) {
    throw new GraphError(`node "${nodeId}" not found`);
  }
  return blocksOf(document, nodeId);
}

/** Persist the current normalized sequence (first edit materializes it). */
export function materializeBlocks(document: CanvasDocument, nodeId: string): CanvasDocument {
  return withBlocks(document, nodeId, requireBlocks(document, nodeId));
}

export function setTextBlockContent(
  document: CanvasDocument,
  nodeId: string,
  blockId: string,
  content: string,
): CanvasDocument {
  const blocks = requireBlocks(document, nodeId);
  if (!blocks.some((block) => block.id === blockId && block.kind === 'text')) {
    throw new GraphError(`no text block "${blockId}"`);
  }
  return withBlocks(
    document,
    nodeId,
    blocks.map((block) =>
      block.id === blockId && block.kind === 'text' ? { ...block, content } : block,
    ),
  );
}

/** Insert an empty text block at `index` (clamped). */
export function insertTextBlock(
  document: CanvasDocument,
  nodeId: string,
  index: number,
  idFactory: IdFactory = createId,
): CanvasDocument {
  const blocks = requireBlocks(document, nodeId);
  const clamped = Math.max(0, Math.min(index, blocks.length));
  const next = [...blocks];
  next.splice(clamped, 0, { id: idFactory('blk'), kind: 'text', content: '' });
  return withBlocks(document, nodeId, next);
}

/** Remove a text block (embeds are removed by deleting their wire). */
export function removeTextBlock(
  document: CanvasDocument,
  nodeId: string,
  blockId: string,
): CanvasDocument {
  const blocks = requireBlocks(document, nodeId);
  if (!blocks.some((block) => block.id === blockId && block.kind === 'text')) {
    throw new GraphError(`no text block "${blockId}"`);
  }
  const next = blocks.filter((block) => block.id !== blockId);
  if (!next.some((block) => block.kind === 'text')) {
    next.push({ id: `${blockId}-fresh`, kind: 'text', content: '' });
  }
  return withBlocks(document, nodeId, next);
}

/**
 * First in-document edit of an embed FORKS it: the document keeps `content`,
 * the source node is untouched (the user's no-write-back rule).
 */
export function editEmbed(
  document: CanvasDocument,
  nodeId: string,
  blockId: string,
  content: string,
): CanvasDocument {
  const blocks = requireBlocks(document, nodeId);
  if (!blocks.some((block) => block.id === blockId && block.kind === 'embed')) {
    throw new GraphError(`no embed block "${blockId}"`);
  }
  return withBlocks(
    document,
    nodeId,
    blocks.map((block) =>
      block.id === blockId && block.kind === 'embed' ? { ...block, fork: content } : block,
    ),
  );
}

/** Discard the fork: the embed mirrors its source again. */
export function revertEmbed(
  document: CanvasDocument,
  nodeId: string,
  blockId: string,
): CanvasDocument {
  const blocks = requireBlocks(document, nodeId);
  return withBlocks(
    document,
    nodeId,
    blocks.map((block) => {
      if (block.id !== blockId || block.kind !== 'embed') return block;
      const { fork: _dropped, ...rest } = block;
      return rest;
    }),
  );
}

/**
 * Deliberate write-back: copy the fork into the SOURCE node's content and
 * re-link live. The only path by which document edits reach the source.
 */
export function applyEmbedToSource(
  document: CanvasDocument,
  nodeId: string,
  blockId: string,
): CanvasDocument {
  const blocks = requireBlocks(document, nodeId);
  const block = blocks.find(
    (candidate): candidate is EmbedBlock =>
      candidate.id === blockId && candidate.kind === 'embed',
  );
  if (!block) throw new GraphError(`no embed block "${blockId}"`);
  if (block.fork === undefined) return document; // nothing to apply
  const wire = document.wires.find((candidate) => candidate.id === block.wireId);
  if (!wire) throw new GraphError(`embed "${blockId}" has no wire`);
  const fork = block.fork;
  const applied: CanvasDocument = {
    ...document,
    nodes: document.nodes.map((node) =>
      node.id === wire.source ? { ...node, data: { ...node.data, content: fork } } : node,
    ),
  };
  return revertEmbed(applied, nodeId, blockId);
}

/**
 * Move a block within the sequence. Embed moves also reorder the underlying
 * spine wires to match block order, so compile/cast/manuscript views agree
 * with what the document shows (one ordering, two views).
 */
export function moveBlock(
  document: CanvasDocument,
  nodeId: string,
  blockId: string,
  newIndex: number,
): CanvasDocument {
  const blocks = requireBlocks(document, nodeId);
  const currentIndex = blocks.findIndex((block) => block.id === blockId);
  if (currentIndex === -1) throw new GraphError(`no block "${blockId}"`);
  const clamped = Math.max(0, Math.min(newIndex, blocks.length - 1));
  if (clamped === currentIndex) return document;
  const next = [...blocks];
  const [moved] = next.splice(currentIndex, 1);
  next.splice(clamped, 0, moved!);

  // re-sync wire order: the embeds' order in `next` becomes the wire order
  const embedWireOrder = next
    .filter((block): block is EmbedBlock => block.kind === 'embed')
    .map((block) => block.wireId);
  const wireRank = new Map(embedWireOrder.map((wireId, index) => [wireId, index]));
  const spineWires = document.wires.filter((wire) => wireRank.has(wire.id));
  const sorted = [...spineWires].sort(
    (a, b) => (wireRank.get(a.id) ?? 0) - (wireRank.get(b.id) ?? 0),
  );
  let cursor = 0;
  const rewired: CanvasDocument = {
    ...document,
    wires: document.wires.map((wire) => (wireRank.has(wire.id) ? sorted[cursor++]! : wire)),
  };
  return withBlocks(rewired, nodeId, next);
}

// ---------------------------------------------------------------------------
// Fork notices -- "✎ edited in <doc>" on source nodes.
// ---------------------------------------------------------------------------

export type ForkNotice = { documentId: string; documentTitle: string; blockId: string };

/** Documents holding a FORKED embed of this node's text. */
export function forkNoticesFor(document: CanvasDocument, sourceId: string): ForkNotice[] {
  const notices: ForkNotice[] = [];
  for (const node of document.nodes) {
    const blocks = rawBlocks(node);
    if (blocks.length === 0) continue;
    for (const block of blocks) {
      if (block.kind !== 'embed' || block.fork === undefined) continue;
      const wire = document.wires.find((candidate) => candidate.id === block.wireId);
      if (wire?.source !== sourceId) continue;
      const title = typeof node.data.title === 'string' && node.data.title !== ''
        ? node.data.title
        : 'Untitled';
      notices.push({ documentId: node.id, documentTitle: title, blockId: block.id });
    }
  }
  return notices;
}
