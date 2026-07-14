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

describe('connection routing (connectFromHandles)', () => {
  function twoNodes(typeA: string, typeB: string) {
    const store = useCanvasStore.getState();
    const a = store.spawnAt(typeA, { x: 0, y: 0 })!;
    const b = useCanvasStore.getState().spawnAt(typeB, { x: 900, y: 0 })!;
    return { a, b };
  }

  it('plain dot to plain dot makes a relationship edge (I1)', () => {
    const { a, b } = twoNodes('note', 'person');
    useCanvasStore.getState().connectFromHandles(a, 'top', b, 'bottom');
    const doc = useCanvasStore.getState().document;
    expect(doc.edges).toHaveLength(1);
    expect(doc.wires).toHaveLength(0);
  });

  it('give star to take star makes a live wire', () => {
    const { a, b } = twoNodes('note', 'document');
    useCanvasStore.getState().connectFromHandles(a, 'text-out', b, 'sections-in');
    const doc = useCanvasStore.getState().document;
    expect(doc.wires).toHaveLength(1);
    expect(doc.wires[0]!.status).toBe('live');
    expect(doc.edges).toHaveLength(0);
  });

  it('take star to give star wires the same connection backwards', () => {
    const { a, b } = twoNodes('document', 'note');
    useCanvasStore.getState().connectFromHandles(a, 'sections-in', b, 'text-out');
    const doc = useCanvasStore.getState().document;
    expect(doc.wires).toHaveLength(1);
    expect(doc.wires[0]!.source).toBe(b);
    expect(doc.wires[0]!.target).toBe(a);
  });

  it('give star to a plain dot places a TENTATIVE wire into the first compatible intake', () => {
    const { a, b } = twoNodes('note', 'document');
    useCanvasStore.getState().connectFromHandles(a, 'text-out', b, 'top');
    const doc = useCanvasStore.getState().document;
    expect(doc.wires).toHaveLength(1);
    expect(doc.wires[0]!.status).toBe('tentative');
    expect(doc.wires[0]!.targetPort).toBe('sections-in');
  });

  it('give star to a node with no compatible intake surfaces an error', () => {
    const { a, b } = twoNodes('person', 'note'); // note has no person intake
    useCanvasStore.getState().connectFromHandles(a, 'identity-out', b, 'top');
    const state = useCanvasStore.getState();
    expect(state.document.wires).toHaveLength(0);
    expect(state.persistenceError).toContain('no intake');
  });
});

describe('commit with undo toast', () => {
  it('committing dissolves siblings and the toast undo restores them', () => {
    const store = useCanvasStore.getState();
    const note = store.spawnAt('note', { x: 0, y: 0 })!;
    const doc1 = useCanvasStore.getState().spawnAt('document', { x: 900, y: -400 })!;
    const doc2 = useCanvasStore.getState().spawnAt('document', { x: 900, y: 400 })!;
    useCanvasStore.getState().connectFromHandles(note, 'text-out', doc1, 'top');
    useCanvasStore.getState().connectFromHandles(note, 'text-out', doc2, 'top');
    expect(useCanvasStore.getState().document.wires).toHaveLength(2);

    const first = useCanvasStore.getState().document.wires[0]!.id;
    useCanvasStore.getState().commitWire(first);
    let state = useCanvasStore.getState();
    expect(state.document.wires).toHaveLength(1);
    expect(state.document.wires[0]!.status).toBe('live');
    expect(state.toast?.message).toContain('1 other candidate dissolved');

    state.toast!.undo!();
    state = useCanvasStore.getState();
    expect(state.document.wires).toHaveLength(2);
    expect(state.document.wires.every((wire) => wire.status === 'tentative')).toBe(true);
    expect(state.toast).toBeNull();
  });
});

describe('canvas settings', () => {
  it('persist to localStorage and load back', () => {
    useCanvasStore.getState().setSettings({ density: 'compact', portLabels: 'always' });
    const raw = JSON.parse(localStorage.getItem('nodecanvas.v2.settings')!);
    expect(raw).toEqual({ density: 'compact', portLabels: 'always' });
  });
});

describe('per-node accent', () => {
  it('sets and clears the override', () => {
    const store = useCanvasStore.getState();
    const id = store.spawnAt('note', { x: 0, y: 0 })!;
    useCanvasStore.getState().setNodeAccent(id, '#22d3ee');
    expect(useCanvasStore.getState().document.nodes[0]!.data['accent']).toBe('#22d3ee');
    useCanvasStore.getState().setNodeAccent(id, undefined);
    expect('accent' in useCanvasStore.getState().document.nodes[0]!.data).toBe(false);
  });
});

describe('assemblies in the store', () => {
  function threeNodes() {
    const store = useCanvasStore.getState();
    const a = store.spawnAt('person', { x: 0, y: 0 })!;
    const b = useCanvasStore.getState().spawnAt('place', { x: 900, y: 0 })!;
    const c = useCanvasStore.getState().spawnAt('note', { x: 0, y: 900 })!;
    return { a, b, c };
  }

  it('gather creates a COLLAPSED group referencing the selection (I3)', () => {
    const { a, b } = threeNodes();
    useCanvasStore.getState().gatherSelection([a, b]);
    const doc = useCanvasStore.getState().document;
    expect(doc.assemblies).toHaveLength(1);
    expect(doc.assemblies[0]!.collapsed).toBe(true);
    expect(doc.assemblies[0]!.memberIds.sort()).toEqual([a, b].sort());
    expect(doc.nodes).toHaveLength(3); // nothing copied, nothing deleted
  });

  it('unpack dissolves the group and keeps every node', () => {
    const { a, b } = threeNodes();
    useCanvasStore.getState().gatherSelection([a, b]);
    const assemblyId = useCanvasStore.getState().document.assemblies[0]!.id;
    useCanvasStore.getState().unpack(assemblyId);
    const doc = useCanvasStore.getState().document;
    expect(doc.assemblies).toHaveLength(0);
    expect(doc.nodes).toHaveLength(3);
  });

  it('collapse/expand round-trips the document losslessly (I4)', () => {
    const { a, b } = threeNodes();
    useCanvasStore.getState().gatherSelection([a, b]);
    const assemblyId = useCanvasStore.getState().document.assemblies[0]!.id;
    const before = JSON.stringify(useCanvasStore.getState().document);
    useCanvasStore.getState().setCollapsed(assemblyId, false);
    useCanvasStore.getState().setCollapsed(assemblyId, true);
    expect(JSON.stringify(useCanvasStore.getState().document)).toBe(before);
  });

  it('drill stack pushes, jumps, and clears when the group unpacks', () => {
    const { a, b } = threeNodes();
    useCanvasStore.getState().gatherSelection([a, b]);
    const assemblyId = useCanvasStore.getState().document.assemblies[0]!.id;
    useCanvasStore.getState().drillIn(assemblyId);
    expect(useCanvasStore.getState().drillStack).toEqual([assemblyId]);
    useCanvasStore.getState().drillTo(0);
    expect(useCanvasStore.getState().drillStack).toEqual([]);
    useCanvasStore.getState().drillIn(assemblyId);
    useCanvasStore.getState().unpack(assemblyId);
    expect(useCanvasStore.getState().drillStack).toEqual([]);
  });

  it('gathering a group into a group nests by reference', () => {
    const { a, b, c } = threeNodes();
    useCanvasStore.getState().gatherSelection([a, b]);
    const inner = useCanvasStore.getState().document.assemblies[0]!.id;
    useCanvasStore.getState().gatherSelection([inner, c]);
    const doc = useCanvasStore.getState().document;
    expect(doc.assemblies).toHaveLength(2);
    const outer = doc.assemblies.find((assembly) => assembly.id !== inner)!;
    expect(outer.memberIds.sort()).toEqual([inner, c].sort());
  });
});

describe('workflow: readiness + ownership', () => {
  it('cycleReadiness walks seed -> developing -> ready -> placed -> seed', () => {
    const id = useCanvasStore.getState().spawnAt('note', { x: 0, y: 0 })!;
    const stageOf = () => useCanvasStore.getState().document.nodes[0]!.data['readiness'];
    expect(stageOf()).toBeUndefined(); // absent = seed
    useCanvasStore.getState().cycleReadiness(id);
    expect(stageOf()).toBe('developing');
    useCanvasStore.getState().cycleReadiness(id);
    expect(stageOf()).toBe('ready');
    useCanvasStore.getState().cycleReadiness(id);
    expect(stageOf()).toBe('placed');
    useCanvasStore.getState().cycleReadiness(id);
    expect(stageOf()).toBe('seed');
  });

  it('setOwner writes and clears the tag', () => {
    const id = useCanvasStore.getState().spawnAt('note', { x: 0, y: 0 })!;
    useCanvasStore.getState().setOwner(id, 'Sarah');
    expect(useCanvasStore.getState().document.nodes[0]!.data['owner']).toBe('Sarah');
    useCanvasStore.getState().setOwner(id, '');
    expect('owner' in useCanvasStore.getState().document.nodes[0]!.data).toBe(false);
  });
});

describe('quick capture (Ctrl+K)', () => {
  it('first capture creates the Workbench with the note inside, collapsed', () => {
    useCanvasStore.getState().capture('read that essay about lighthouses');
    const doc = useCanvasStore.getState().document;
    expect(doc.assemblies).toHaveLength(1);
    expect(doc.assemblies[0]!.name).toBe('Workbench');
    expect(doc.assemblies[0]!.collapsed).toBe(true);
    expect(doc.nodes).toHaveLength(1);
    expect(doc.nodes[0]!.type).toBe('note');
    expect(typeof doc.nodes[0]!.data['capturedAt']).toBe('string');
  });

  it('later captures file into the same Workbench', () => {
    useCanvasStore.getState().capture('first thought');
    useCanvasStore.getState().capture('second thought');
    const doc = useCanvasStore.getState().document;
    expect(doc.assemblies).toHaveLength(1);
    expect(doc.assemblies[0]!.memberIds).toHaveLength(2);
    expect(doc.nodes).toHaveLength(2);
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
