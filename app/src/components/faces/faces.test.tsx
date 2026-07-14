import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { addNode, createEmptyDocument, serializeDocument, spawnNode } from '@node-canvas/core';
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

  it('other types keep the default face with header title input', async () => {
    seed(['note']);
    render(<App />);
    expect(await screen.findByPlaceholderText('Write here…')).toBeTruthy();
    expect(document.querySelector('.canvas-node-title')).not.toBeNull();
    expect(document.querySelector('[data-face="title"]')).toBeNull();
  });
});
