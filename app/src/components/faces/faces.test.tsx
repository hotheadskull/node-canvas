import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { addNode, addWire, createEmptyDocument, serializeDocument, spawnNode } from '@node-canvas/core';
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

  it('document face: ordered intake list reorders the compiled work', async () => {
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

    // intake list shows both sections in wire order
    const rows = await screen.findAllByText(/^(A|B)$/);
    expect(rows.map((row) => row.textContent)).toEqual(['A', 'B']);

    // compiled preview follows wire order (hidden: true -- RF keeps nodes
    // visibility:hidden in jsdom because its measurement pass never runs)
    fireEvent.click(screen.getByRole('button', { name: 'Preview', hidden: true }));
    expect(document.querySelector('[data-compiled-preview]')!.textContent).toBe(
      'Alpha text.\n\nBeta text.',
    );

    // move B up -> compile order flips
    fireEvent.click(screen.getByRole('button', { name: 'Move B up', hidden: true }));
    expect(document.querySelector('[data-compiled-preview]')!.textContent).toBe(
      'Beta text.\n\nAlpha text.',
    );
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

  it('document face: Split preset creates wired stubs', async () => {
    seed(['document']);
    render(<App />);
    fireEvent.click(await screen.findByRole('button', { name: /Split/, hidden: true }));
    fireEvent.click(screen.getByRole('menuitem', { name: /Beat sheet/, hidden: true }));
    const doc = useCanvasStore.getState().document;
    expect(doc.nodes).toHaveLength(6); // document + 5 beats
    expect(doc.wires).toHaveLength(5);
    expect(doc.wires.every((wire) => wire.status === 'live')).toBe(true);
    expect(doc.nodes.some((node) => node.data.title === 'Opening image')).toBe(true);
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
