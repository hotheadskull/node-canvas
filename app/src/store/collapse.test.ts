// Observatory §2: collapse is sticky, user-controlled, persisted per node
// in data (passthrough -- no schema change); the zoom borrow renders
// collapsed without ever writing the stored value.

import { beforeEach, describe, expect, it } from 'vitest';
import {
  addNode,
  createEmptyDocument,
  loadDocument,
  serializeDocument,
  spawnNode,
} from '@node-canvas/core';
import { useCanvasStore } from './canvasStore';

function seed() {
  let doc = createEmptyDocument('Collapse test');
  const a = spawnNode('note', { x: 0, y: 0 });
  const b = spawnNode('person', { x: 400, y: 0 });
  doc = addNode(doc, a);
  doc = addNode(doc, b);
  return { doc, a, b };
}

beforeEach(() => {
  localStorage.clear();
  useCanvasStore.setState({
    document: createEmptyDocument('reset'),
    zoomBorrow: false,
    toast: null,
  });
});

describe('toggleNodeCollapsed', () => {
  it('sets and clears data.collapsed (clear removes the key entirely)', () => {
    const { doc, a } = seed();
    useCanvasStore.setState({ document: doc });
    useCanvasStore.getState().toggleNodeCollapsed(a.id);
    let node = useCanvasStore.getState().document.nodes.find((n) => n.id === a.id)!;
    expect(node.data['collapsed']).toBe('collapsed');

    useCanvasStore.getState().toggleNodeCollapsed(a.id);
    node = useCanvasStore.getState().document.nodes.find((n) => n.id === a.id)!;
    expect('collapsed' in node.data).toBe(false);
  });

  it('survives a save/load round-trip (passthrough data)', () => {
    const { doc, a } = seed();
    useCanvasStore.setState({ document: doc });
    useCanvasStore.getState().toggleNodeCollapsed(a.id);
    const raw = serializeDocument(useCanvasStore.getState().document);
    const loaded = loadDocument(raw);
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    const node = loaded.document.nodes.find((n) => n.id === a.id)!;
    expect(node.data['collapsed']).toBe('collapsed');
  });
});

describe('setAllCollapsed', () => {
  it('collapses everything, then expands everything', () => {
    const { doc } = seed();
    useCanvasStore.setState({ document: doc });
    useCanvasStore.getState().setAllCollapsed(true);
    expect(
      useCanvasStore.getState().document.nodes.every((n) => n.data['collapsed'] === 'collapsed'),
    ).toBe(true);
    useCanvasStore.getState().setAllCollapsed(false);
    expect(
      useCanvasStore.getState().document.nodes.every((n) => !('collapsed' in n.data)),
    ).toBe(true);
  });
});

describe('zoom borrow', () => {
  it('renders-collapsed flag NEVER touches the document', () => {
    const { doc } = seed();
    useCanvasStore.setState({ document: doc });
    const before = useCanvasStore.getState().document;
    useCanvasStore.getState().setZoomBorrow(true);
    expect(useCanvasStore.getState().zoomBorrow).toBe(true);
    // the document object is IDENTICAL -- no write happened
    expect(useCanvasStore.getState().document).toBe(before);
    useCanvasStore.getState().setZoomBorrow(false);
    expect(useCanvasStore.getState().document).toBe(before);
  });

  it('setting the same value twice does not thrash state', () => {
    const first = useCanvasStore.getState();
    useCanvasStore.getState().setZoomBorrow(false);
    expect(useCanvasStore.getState()).toBe(first);
  });
});
