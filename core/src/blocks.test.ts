import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  applyEmbedToSource,
  blocksOf,
  compileBlocks,
  editEmbed,
  embedText,
  forkNoticesFor,
  insertTextBlock,
  materializeBlocks,
  moveBlock,
  removeTextBlock,
  revertEmbed,
  setTextBlockContent,
  type DocBlock,
} from './blocks';
import { GraphError } from './graph';
import { removeWire } from './wires';
import { parseDocument, serializeDocument, type CanvasDocument } from './schema';

const golden = JSON.parse(
  readFileSync(new URL('./blocks.golden.json', import.meta.url), 'utf8'),
) as {
  document: CanvasDocument;
  normalized: DocBlock[];
  compiled: { text: string; sources: string[] };
  legacyMigration: DocBlock[];
};

function loadDoc(): CanvasDocument {
  const parsed = parseDocument(JSON.stringify(golden.document));
  if (!parsed.ok) throw new Error(`golden invalid: ${parsed.error}`);
  return parsed.document;
}

describe('document blocks (user-designed: fork-on-edit, block order = reading order)', () => {
  it('normalizes to the golden sequence (kept blocks + appended loose wire)', () => {
    const doc = loadDoc();
    expect(JSON.parse(JSON.stringify(blocksOf(doc, 'chapter')))).toEqual(golden.normalized);
    // deterministic: same document, same synthesized ids, every call
    expect(blocksOf(doc, 'chapter')).toEqual(blocksOf(doc, 'chapter'));
  });

  it('compiles in block order, forks winning over sources (golden)', () => {
    const doc = loadDoc();
    expect(JSON.parse(JSON.stringify(compileBlocks(doc, 'chapter')))).toEqual(golden.compiled);
  });

  it('lazy migration: a document without blocks becomes own text + wire-order embeds (golden)', () => {
    const doc = loadDoc();
    const { blocks: _dropped, ...bareData } = doc.nodes[0]!.data;
    const legacy: CanvasDocument = {
      ...doc,
      nodes: doc.nodes.map((node) =>
        node.id === 'chapter' ? { ...node, data: bareData } : node,
      ),
    };
    expect(JSON.parse(JSON.stringify(blocksOf(legacy, 'chapter')))).toEqual(
      golden.legacyMigration,
    );
    // and compiles identically to the old spine compile (no behavior change
    // for untouched documents beyond own-text-first ordering)
    const compiled = compileBlocks(legacy, 'chapter');
    expect(compiled.text).toContain('She notices the letter');
    expect(compiled.sources[0]).toBe('chapter');
  });

  it('editing an embed forks: document keeps the new text, source keeps the original', () => {
    const doc = loadDoc();
    const forked = editEmbed(doc, 'chapter', 'b-coffee', '<p>Edited inside the doc.</p>');
    const block = blocksOf(forked, 'chapter').find((candidate) => candidate.id === 'b-coffee')!;
    expect(block.kind).toBe('embed');
    expect(embedText(forked, block as never)).toBe('<p>Edited inside the doc.</p>');
    // the source node is untouched (no write-back)
    const source = forked.nodes.find((node) => node.id === 'sec-coffee')!;
    expect(source.data.content).toBe('<p>She notices the letter before he does.</p>');
  });

  it('revert discards the fork; the embed mirrors its source again', () => {
    const doc = editEmbed(loadDoc(), 'chapter', 'b-coffee', '<p>Edited.</p>');
    const reverted = revertEmbed(doc, 'chapter', 'b-coffee');
    const block = blocksOf(reverted, 'chapter').find((candidate) => candidate.id === 'b-coffee')!;
    expect(embedText(reverted, block as never)).toBe(
      '<p>She notices the letter before he does.</p>',
    );
  });

  it('apply to source is the ONLY write-back: copies the fork, re-links live', () => {
    const doc = loadDoc();
    const applied = applyEmbedToSource(doc, 'chapter', 'b-walk');
    const source = applied.nodes.find((node) => node.id === 'sec-walk')!;
    expect(source.data.content).toBe(
      '<p>Snow starts to fall as they walk, and neither mentions the letter.</p>',
    );
    const block = blocksOf(applied, 'chapter').find((candidate) => candidate.id === 'b-walk')!;
    expect((block as { fork?: string }).fork).toBeUndefined();
  });

  it('deleting the wire severs the embed: forked keeps its words as text, live vanishes', () => {
    const doc = loadDoc();
    // forked embed (b-walk) -> becomes an owned text block
    const cutForked = removeWire(doc, 'w-walk');
    const afterForked = blocksOf(cutForked, 'chapter');
    const converted = afterForked.find((block) => block.id === 'b-walk')!;
    expect(converted.kind).toBe('text');
    expect((converted as { content: string }).content).toContain('Snow starts to fall');
    // live embed (b-coffee) -> simply gone
    const cutLive = removeWire(doc, 'w-coffee');
    expect(blocksOf(cutLive, 'chapter').some((block) => block.id === 'b-coffee')).toBe(false);
  });

  it('moveBlock reorders the sequence AND re-syncs wire order to match', () => {
    const doc = materializeBlocks(loadDoc(), 'chapter');
    const blocks = blocksOf(doc, 'chapter');
    const looseId = blocks[blocks.length - 1]!.id; // the appended w-loose embed
    const moved = moveBlock(doc, 'chapter', looseId, 1);
    const order = blocksOf(moved, 'chapter').map((block) => block.id);
    expect(order.indexOf(looseId)).toBe(1);
    // wires now run loose -> coffee -> walk (block order = wire order)
    const spineOrder = moved.wires
      .filter((wire) => wire.targetPort === 'sections-in')
      .map((wire) => wire.id);
    expect(spineOrder).toEqual(['w-loose', 'w-coffee', 'w-walk']);
    // still a valid, savable document (I9)
    expect(() => serializeDocument(moved)).not.toThrow();
  });

  it('text block ops: edit, insert at index, remove keeps one text block minimum', () => {
    let doc = loadDoc();
    doc = setTextBlockContent(doc, 'chapter', 'b-own', '<p>New opening.</p>');
    expect((blocksOf(doc, 'chapter')[0] as { content: string }).content).toBe(
      '<p>New opening.</p>',
    );
    doc = insertTextBlock(doc, 'chapter', 2, () => 'blk-inserted');
    expect(blocksOf(doc, 'chapter')[2]!.id).toBe('blk-inserted');
    doc = removeTextBlock(doc, 'chapter', 'b-own');
    doc = removeTextBlock(doc, 'chapter', 'b-mid');
    doc = removeTextBlock(doc, 'chapter', 'blk-inserted');
    expect(blocksOf(doc, 'chapter').some((block) => block.kind === 'text')).toBe(true);
    expect(() => setTextBlockContent(doc, 'chapter', 'ghost', 'x')).toThrow(GraphError);
  });

  it('fork notices: the source knows which documents edited it', () => {
    const doc = loadDoc();
    expect(forkNoticesFor(doc, 'sec-walk')).toEqual([
      {
        documentId: 'chapter',
        documentTitle: 'Chapter 3',
        blockId: 'b-walk',
        // the notice CARRIES the edited version so the source can show it
        fork: '<p>Snow starts to fall as they walk, and neither mentions the letter.</p>',
      },
    ]);
    expect(forkNoticesFor(doc, 'sec-coffee')).toEqual([]);
  });
});
