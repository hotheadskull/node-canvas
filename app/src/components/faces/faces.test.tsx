import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  addNode,
  addWire,
  blocksOf,
  compileBlocks,
  createEmptyDocument,
  serializeDocument,
  spawnNode,
} from '@node-canvas/core';
import App from '../../App';
import { useCanvasStore } from '../../store/canvasStore';

function seed(types: string[]) {
  let doc = createEmptyDocument('faces');
  for (const type of types) {
    doc = addNode(doc, spawnNode(type, { x: types.indexOf(type) * 700, y: 0 }));
  }
  localStorage.setItem('nodecanvas.v2.document', serializeDocument(doc));
}

beforeEach(() => {
  localStorage.clear();
  useCanvasStore.setState({ document: createEmptyDocument('reset'), persistenceError: null });
});

describe('node faces (I8: per-type looks plug in without touching shared chrome)', () => {
  it('title nodes render the big-text face bound to the title, with no header input', async () => {
    seed(['title']);
    render(<App />);
    const face = await screen.findByPlaceholderText('The big idea…');
    expect(document.querySelector('[data-face="title"]')).not.toBeNull();
    expect(document.querySelector('.canvas-node-title')).toBeNull();
    fireEvent.change(face, { target: { value: 'Everything connects' } });
    expect(useCanvasStore.getState().document.nodes[0]!.data.title).toBe('Everything connects');
  });

  it('document face: wired sections render INLINE as live blocks; moving a block reorders the work', async () => {
    let doc = createEmptyDocument('spine');
    const chapter = spawnNode('document', { x: 0, y: 0 });
    const sceneA = spawnNode('section', { x: -900, y: -400 });
    const sceneB = spawnNode('section', { x: -900, y: 400 });
    sceneA.data = { title: 'A', content: 'Alpha text.' };
    sceneB.data = { title: 'B', content: 'Beta text.' };
    doc = addNode(addNode(addNode(doc, chapter), sceneA), sceneB);
    doc = addWire(doc, { source: sceneA.id, sourcePort: 'text-out', target: chapter.id, targetPort: 'sections-in' });
    doc = addWire(doc, { source: sceneB.id, sourcePort: 'text-out', target: chapter.id, targetPort: 'sections-in' });
    localStorage.setItem('nodecanvas.v2.document', serializeDocument(doc));
    render(<App />);

    // both sections' TEXT appears inside the document (live embeds, in
    // wire order), marked as embeds -- no chips between paragraphs.
    // findAllByText: the SOURCE section faces also show their words now that
    // unfocused faces render a static preview (Chunk 18 lazy editors).
    await screen.findAllByText('Alpha text.');
    await screen.findAllByText('Beta text.');
    expect(document.querySelectorAll('.doc-block.is-embed.is-live')).toHaveLength(2);
    expect(document.querySelector('[data-doc-blocks]')!.textContent).toMatch(
      /Alpha text\..*Beta text\./s,
    );

    // block order IS compile order: move B's block to the top
    const state = useCanvasStore.getState();
    const bBlock = blocksOf(state.document, chapter.id).find(
      (block) => block.kind === 'embed' && block.wireId === state.document.wires[1]!.id,
    )!;
    state.moveBlockTo(chapter.id, bBlock.id, 0);
    expect(compileBlocks(useCanvasStore.getState().document, chapter.id).text).toBe(
      'Beta text.\n\nAlpha text.',
    );
    // ...and the wires re-synced to match (cast/manuscript views agree)
    expect(
      useCanvasStore.getState().document.wires.map((wire) => wire.source),
    ).toEqual([sceneB.id, sceneA.id]);
  });

  it('document face: cast derives live so renames propagate', async () => {
    let doc = createEmptyDocument('cast');
    const chapter = spawnNode('document', { x: 0, y: 0 });
    const scene = spawnNode('section', { x: -900, y: 0 });
    const bob = spawnNode('person', { x: -1700, y: 0 });
    bob.data = { title: 'Bob' };
    doc = addNode(addNode(addNode(doc, chapter), scene), bob);
    doc = addWire(doc, { source: scene.id, sourcePort: 'text-out', target: chapter.id, targetPort: 'sections-in' });
    doc = addWire(doc, { source: bob.id, sourcePort: 'identity-out', target: scene.id, targetPort: 'people-in' });
    localStorage.setItem('nodecanvas.v2.document', serializeDocument(doc));
    render(<App />);

    expect((await screen.findByText(/Cast:/)).textContent).toContain('Bob');
    useCanvasStore.getState().setNodeTitle(bob.id, 'Robert');
    expect((await screen.findByText(/Cast:/)).textContent).toContain('Robert');
  });

  it('document face: "+ Section" spawns a section already wired into the spine', async () => {
    seed(['document']);
    render(<App />);
    const button = await waitFor(() => {
      const element = document.querySelector('[data-add-section]');
      if (!element) throw new Error('add-section button not rendered yet');
      return element;
    });
    fireEvent.click(button);
    fireEvent.click(button);
    const doc = useCanvasStore.getState().document;
    expect(doc.nodes).toHaveLength(3); // document + 2 sections
    expect(doc.wires).toHaveLength(2);
    expect(doc.wires.every((wire) => wire.status === 'live')).toBe(true);
    expect(doc.nodes.map((node) => node.data.title)).toEqual(
      expect.arrayContaining(['Section 1', 'Section 2']),
    );
    // each section's text already lives in the document as an embed block
    const docNode = doc.nodes.find((node) => node.type === 'document')!;
    expect(blocksOf(doc, docNode.id).filter((block) => block.kind === 'embed')).toHaveLength(2);
    // no standalone preset-Split button on the Document anymore (user
    // decision 2026-07-15: forking needs no button; splitting = highlighting)
    expect(screen.queryByRole('button', { name: /^Split$/, hidden: true })).toBeNull();
  });

  it('other types keep the default face (rich text) with header title input', async () => {
    seed(['note']);
    render(<App />);
    await screen.findByTestId('app-shell');
    await new Promise((resolve) => setTimeout(resolve, 50)); // tiptap mounts async
    expect(document.querySelector('.richtext-content')).not.toBeNull();
    expect(document.querySelector('.canvas-node-title')).not.toBeNull();
    expect(document.querySelector('[data-face="title"]')).toBeNull();
  });
});
