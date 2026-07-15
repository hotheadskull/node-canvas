import { beforeEach, describe, expect, it } from 'vitest';
import {
  addNode,
  addWire,
  blocksOf,
  compileBlocks,
  createEmptyDocument,
  embedText,
  spawnNode,
  type EmbedBlock,
} from '@node-canvas/core';
import { useCanvasStore } from './canvasStore';

// Document blocks store actions (node pass): fork-on-edit, deliberate
// write-back only, wire-into-block landing at a position.

function seed() {
  let doc = createEmptyDocument('blocks');
  const chapter = spawnNode('document', { x: 0, y: 0 });
  const scene = spawnNode('section', { x: -900, y: 0 });
  chapter.data = { title: 'Chapter', content: '<p>Own opening.</p>' };
  scene.data = { title: 'Scene A', content: '<p>Original scene text.</p>' };
  doc = addNode(addNode(doc, chapter), scene);
  doc = addWire(doc, {
    source: scene.id,
    sourcePort: 'text-out',
    target: chapter.id,
    targetPort: 'sections-in',
  });
  useCanvasStore.setState({ document: doc, persistenceError: null, toast: null });
  return { chapterId: chapter.id, sceneId: scene.id };
}

beforeEach(() => {
  localStorage.clear();
});

describe('document blocks actions', () => {
  it('editing an embed forks it; the source never changes; revert restores mirroring', () => {
    const { chapterId, sceneId } = seed();
    const embed = blocksOf(useCanvasStore.getState().document, chapterId).find(
      (block) => block.kind === 'embed',
    ) as EmbedBlock;

    useCanvasStore.getState().editEmbedIn(chapterId, embed.id, '<p>Doc version.</p>');
    let state = useCanvasStore.getState().document;
    const forked = blocksOf(state, chapterId).find(
      (block) => block.id === embed.id,
    ) as EmbedBlock;
    expect(embedText(state, forked)).toBe('<p>Doc version.</p>');
    expect(state.nodes.find((node) => node.id === sceneId)!.data.content).toBe(
      '<p>Original scene text.</p>',
    );

    useCanvasStore.getState().revertEmbedIn(chapterId, embed.id);
    state = useCanvasStore.getState().document;
    const reverted = blocksOf(state, chapterId).find(
      (block) => block.id === embed.id,
    ) as EmbedBlock;
    expect(embedText(state, reverted)).toBe('<p>Original scene text.</p>');
  });

  it('apply to source is the only write-back', () => {
    const { chapterId, sceneId } = seed();
    const embed = blocksOf(useCanvasStore.getState().document, chapterId).find(
      (block) => block.kind === 'embed',
    ) as EmbedBlock;
    useCanvasStore.getState().editEmbedIn(chapterId, embed.id, '<p>Chosen version.</p>');
    useCanvasStore.getState().applyEmbedIn(chapterId, embed.id);
    const state = useCanvasStore.getState().document;
    expect(state.nodes.find((node) => node.id === sceneId)!.data.content).toBe(
      '<p>Chosen version.</p>',
    );
    const relinked = blocksOf(state, chapterId).find(
      (block) => block.id === embed.id,
    ) as EmbedBlock;
    expect(relinked.fork).toBeUndefined();
  });

  it('wireIntoBlock lands the new embed AT the target block position', () => {
    const { chapterId } = seed();
    // a second source to wire in at the TOP (before the own-text block)
    let doc = useCanvasStore.getState().document;
    const noteB = spawnNode('note', { x: -900, y: 500 });
    noteB.data = { title: 'B', content: '<p>Landed first.</p>' };
    doc = addNode(doc, noteB);
    useCanvasStore.setState({ document: doc });

    const firstBlock = blocksOf(doc, chapterId)[0]!;
    useCanvasStore.getState().wireIntoBlock(noteB.id, 'text-out', chapterId, firstBlock.id);

    const state = useCanvasStore.getState().document;
    const blocks = blocksOf(state, chapterId);
    expect(blocks[0]!.kind).toBe('embed');
    expect(compileBlocks(state, chapterId).text.startsWith('<p>Landed first.</p>')).toBe(true);
    expect(useCanvasStore.getState().toast).toBeNull();
  });

  it('insert / edit / move / remove text blocks through the store', () => {
    const { chapterId } = seed();
    useCanvasStore.getState().insertBlockAt(chapterId, 1);
    let blocks = blocksOf(useCanvasStore.getState().document, chapterId);
    expect(blocks).toHaveLength(3); // own text + inserted + embed
    const inserted = blocks[1]!;
    useCanvasStore.getState().setBlockText(chapterId, inserted.id, '<p>Middle.</p>');
    useCanvasStore.getState().moveBlockTo(chapterId, inserted.id, 0);
    blocks = blocksOf(useCanvasStore.getState().document, chapterId);
    expect((blocks[0] as { content: string }).content).toBe('<p>Middle.</p>');
    useCanvasStore.getState().removeBlockIn(chapterId, inserted.id);
    blocks = blocksOf(useCanvasStore.getState().document, chapterId);
    expect(blocks.some((block) => block.id === inserted.id)).toBe(false);
  });
});
