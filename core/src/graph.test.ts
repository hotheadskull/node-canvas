import { describe, expect, it } from 'vitest';
import {
  addNode,
  addPlainEdge,
  GraphError,
  removeNode,
  removePlainEdge,
  spawnNode,
} from './graph';
import { NODE_TYPE_DEFS, getNodeDef } from './registry';
import { createEmptyDocument } from './schema';

function docWithNodes(types: string[]) {
  let doc = createEmptyDocument('test');
  const ids: string[] = [];
  for (const type of types) {
    const node = spawnNode(type, { x: ids.length * 500, y: 0 });
    ids.push(node.id);
    doc = addNode(doc, node);
  }
  return { doc, ids };
}

describe('spawnNode', () => {
  it('uses the registry spawn size', () => {
    const node = spawnNode('section', { x: 10, y: 20 });
    expect(node.size).toEqual(getNodeDef('section')!.size);
    expect(node.position).toEqual({ x: 10, y: 20 });
    expect(node.id).toMatch(/^node_/);
  });

  it('rejects unregistered types (I8)', () => {
    expect(() => spawnNode('flux-capacitor', { x: 0, y: 0 })).toThrow(GraphError);
  });
});

describe('plain edges always work (I1)', () => {
  it('connects EVERY pair of registered types with zero setup', () => {
    const types = NODE_TYPE_DEFS.map((def) => def.type);
    for (const a of types) {
      for (const b of types) {
        const { doc, ids } = docWithNodes([a, b]);
        const connected = addPlainEdge(doc, ids[0]!, ids[1]!);
        expect(connected.edges).toHaveLength(1);
      }
    }
  });

  it('rejects self-connections', () => {
    const { doc, ids } = docWithNodes(['note']);
    expect(() => addPlainEdge(doc, ids[0]!, ids[0]!)).toThrow(GraphError);
  });

  it('rejects duplicates in either orientation', () => {
    const { doc, ids } = docWithNodes(['note', 'person']);
    const once = addPlainEdge(doc, ids[0]!, ids[1]!);
    expect(() => addPlainEdge(once, ids[0]!, ids[1]!)).toThrow(GraphError);
    expect(() => addPlainEdge(once, ids[1]!, ids[0]!)).toThrow(GraphError);
  });

  it('carries an optional label', () => {
    const { doc, ids } = docWithNodes(['person', 'title']);
    const connected = addPlainEdge(doc, ids[0]!, ids[1]!, { label: 'wrote' });
    expect(connected.edges[0]!.label).toBe('wrote');
  });

  it('persists which handles the user attached to (v1 F7-10a lesson)', () => {
    const { doc, ids } = docWithNodes(['person', 'title']);
    const connected = addPlainEdge(doc, ids[0]!, ids[1]!, {
      sourceHandle: 'top',
      targetHandle: 'bottom',
    });
    expect(connected.edges[0]!.sourceHandle).toBe('top');
    expect(connected.edges[0]!.targetHandle).toBe('bottom');
  });
});

describe('node removal keeps the graph consistent', () => {
  it('removes attached edges with the node', () => {
    const { doc, ids } = docWithNodes(['note', 'person', 'place']);
    let connected = addPlainEdge(doc, ids[0]!, ids[1]!);
    connected = addPlainEdge(connected, ids[1]!, ids[2]!);
    const removed = removeNode(connected, ids[1]!);
    expect(removed.nodes).toHaveLength(2);
    expect(removed.edges).toHaveLength(0);
  });

  it('operations never mutate the input document', () => {
    const { doc, ids } = docWithNodes(['note', 'person']);
    const before = structuredClone(doc);
    addPlainEdge(doc, ids[0]!, ids[1]!);
    removeNode(doc, ids[0]!);
    expect(doc).toEqual(before);
  });
});

describe('guards', () => {
  it('rejects duplicate node ids', () => {
    const { doc } = docWithNodes(['note']);
    const dupe = structuredClone(doc.nodes[0]!);
    expect(() => addNode(doc, dupe)).toThrow(GraphError);
  });

  it('rejects removing missing nodes and edges', () => {
    const { doc } = docWithNodes(['note']);
    expect(() => removeNode(doc, 'node_ghost')).toThrow(GraphError);
    expect(() => removePlainEdge(doc, 'edge_ghost')).toThrow(GraphError);
  });
});
