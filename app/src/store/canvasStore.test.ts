import { beforeEach, describe, expect, it, vi } from 'vitest';
import { serializeDocument, createEmptyDocument, addNode, spawnNode } from '@node-canvas/core';
import {
  CORRUPT_BACKUP_KEY,
  STORAGE_KEY,
  VIEWPORT_KEY,
  useCanvasStore,
} from './canvasStore';

function seedDocument() {
  let doc = createEmptyDocument('Seeded');
  const a = spawnNode('note', { x: 111, y: 222 });
  const b = spawnNode('person', { x: 999, y: -50 });
  doc = addNode(doc, a);
  doc = addNode(doc, b);
  return { doc, a, b };
}

beforeEach(() => {
  localStorage.clear();
  useCanvasStore.setState({
    document: createEmptyDocument('reset'),
    persistenceError: null,
    initialViewport: { x: 0, y: 0, zoom: 1 },
  });
});

describe('I5 -- nothing moves on load', () => {
  it('restores node positions EXACTLY as saved', () => {
    const { doc } = seedDocument();
    localStorage.setItem(STORAGE_KEY, serializeDocument(doc));
    useCanvasStore.getState().load();
    const loaded = useCanvasStore.getState().document;
    expect(loaded.nodes.map((node) => node.position)).toEqual(
      doc.nodes.map((node) => node.position),
    );
    expect(loaded.nodes.map((node) => node.size)).toEqual(doc.nodes.map((node) => node.size));
  });

  it('restores the viewport the user left, defaulting to identity', () => {
    localStorage.setItem(VIEWPORT_KEY, JSON.stringify({ x: -120, y: 44, zoom: 0.7 }));
    useCanvasStore.getState().load();
    expect(useCanvasStore.getState().initialViewport).toEqual({ x: -120, y: 44, zoom: 0.7 });
  });
});

describe('persistence errors are surfaced, never swallowed (I9)', () => {
  it('keeps a corrupt payload and reports it', () => {
    localStorage.setItem(STORAGE_KEY, '{broken json!!');
    useCanvasStore.getState().load();
    const state = useCanvasStore.getState();
    expect(state.persistenceError).toContain('could not be loaded');
    expect(localStorage.getItem(CORRUPT_BACKUP_KEY)).toBe('{broken json!!');
    expect(state.document.nodes).toHaveLength(0);
  });

  it('starts fresh silently when nothing was saved', () => {
    useCanvasStore.getState().load();
    expect(useCanvasStore.getState().persistenceError).toBeNull();
  });
});

describe('graph interactions', () => {
  it('spawn avoids existing nodes (collision-free)', () => {
    const store = useCanvasStore.getState();
    const first = store.spawnAt('note', { x: 0, y: 0 });
    const second = useCanvasStore.getState().spawnAt('note', { x: 0, y: 0 });
    expect(first).not.toBeNull();
    expect(second).not.toBeNull();
    const doc = useCanvasStore.getState().document;
    const [a, b] = doc.nodes;
    expect(a!.position).not.toEqual(b!.position);
  });

  it('duplicate connections surface a friendly error instead of crashing', () => {
    const store = useCanvasStore.getState();
    const a = store.spawnAt('note', { x: 0, y: 0 })!;
    const b = useCanvasStore.getState().spawnAt('person', { x: 800, y: 0 })!;
    useCanvasStore.getState().connect(a, b);
    useCanvasStore.getState().connect(b, a);
    const state = useCanvasStore.getState();
    expect(state.document.edges).toHaveLength(1);
    expect(state.persistenceError).toContain('already connected');
  });

  it('edge labels write through and clear cleanly', () => {
    const store = useCanvasStore.getState();
    const a = store.spawnAt('note', { x: 0, y: 0 })!;
    const b = useCanvasStore.getState().spawnAt('person', { x: 800, y: 0 })!;
    useCanvasStore.getState().connect(a, b);
    const edgeId = useCanvasStore.getState().document.edges[0]!.id;
    useCanvasStore.getState().setEdgeLabel(edgeId, 'rivals');
    expect(useCanvasStore.getState().document.edges[0]!.label).toBe('rivals');
    useCanvasStore.getState().setEdgeLabel(edgeId, '');
    expect(useCanvasStore.getState().document.edges[0]!.label).toBeUndefined();
  });

  it('saves are debounced and round-trip through the validator', async () => {
    vi.useFakeTimers();
    const store = useCanvasStore.getState();
    store.spawnAt('note', { x: 10, y: 10 });
    vi.advanceTimersByTime(500);
    vi.useRealTimers();
    const raw = localStorage.getItem(STORAGE_KEY);
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw!).nodes).toHaveLength(1);
  });
});

describe('auto-fit height (core math applied by the store)', () => {
  it('grows with content but never below the type minimum', () => {
    const store = useCanvasStore.getState();
    const id = store.spawnAt('note', { x: 0, y: 0 })!;
    useCanvasStore.getState().applyMeasuredHeight(id, 90);
    let node = useCanvasStore.getState().document.nodes[0]!;
    expect(node.size!.height).toBe(220); // note minimum
    useCanvasStore.getState().applyMeasuredHeight(id, 512.4);
    node = useCanvasStore.getState().document.nodes[0]!;
    expect(node.size!.height).toBe(512);
  });

  it('user-owned height wins until Fit clears it', () => {
    const store = useCanvasStore.getState();
    const id = store.spawnAt('note', { x: 0, y: 0 })!;
    useCanvasStore.getState().setOwnedSize(id, 340, 480);
    useCanvasStore.getState().applyMeasuredHeight(id, 900);
    let node = useCanvasStore.getState().document.nodes[0]!;
    expect(node.size!.height).toBe(480);
    useCanvasStore.getState().clearOwnedHeight(id);
    useCanvasStore.getState().applyMeasuredHeight(id, 900);
    node = useCanvasStore.getState().document.nodes[0]!;
    expect(node.size!.height).toBe(900);
  });
});
