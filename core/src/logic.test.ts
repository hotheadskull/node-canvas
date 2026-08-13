import { describe, expect, it } from 'vitest';
import {
  filterPasses,
  gateVerdict,
  isLogicType,
  logicWiring,
  readableTitle,
  reorderSteps,
  sequenceSteps,
} from './logic';
import { createEmptyDocument, type CanvasDocument } from './schema';

// Flow nodes read PLAIN EDGES (design direction §14): they are portless like
// every other ordinary node, so what is wired in is input and what they feed
// is output. These pin that reading, plus the two derivations that make a
// Sequence and a gate mean something.

function doc(): CanvasDocument {
  const base = createEmptyDocument('logic-fixture');
  return {
    ...base,
    nodes: [
      { id: 'seq', type: 'sequence', position: { x: 0, y: 0 }, data: {} },
      { id: 'a', type: 'note', position: { x: -200, y: 0 }, data: { title: 'Arrival' } },
      { id: 'b', type: 'note', position: { x: 200, y: 0 }, data: { title: 'Departure' } },
      { id: 'c', type: 'person', position: { x: 200, y: 200 }, data: { title: 'Durvain' } },
      { id: 'blank', type: 'note', position: { x: 0, y: 400 }, data: {} },
      { id: 'prose', type: 'note', position: { x: 0, y: 600 }, data: { content: '<p>The river moved beneath the stone.</p>' } },
    ],
    edges: [
      { id: 'e1', source: 'a', target: 'seq' },
      { id: 'e2', source: 'seq', target: 'b' },
      { id: 'e3', source: 'seq', target: 'c', label: 'then' },
    ],
  };
}

describe('flow and logic derivations', () => {
  it('knows which types are flow nodes', () => {
    expect(isLogicType('sequence')).toBe(true);
    expect(isLogicType('filter')).toBe(true);
    expect(isLogicType('note')).toBe(false);
  });

  it('splits plain edges into inputs and outputs, keeping edge labels', () => {
    const wiring = logicWiring(doc(), 'seq');
    expect(wiring.inputs.map((entry) => entry.title)).toEqual(['Arrival']);
    expect(wiring.outputs.map((entry) => entry.title)).toEqual(['Departure', 'Durvain']);
    expect(wiring.outputs[1]?.edgeLabel).toBe('then');
    expect(wiring.inputs[0]?.edgeLabel).toBeUndefined();
  });

  it('names a node by title, else its prose, else its type', () => {
    const document = doc();
    const byId = (id: string) => document.nodes.find((node) => node.id === id)!;
    expect(readableTitle(byId('a'))).toBe('Arrival');
    expect(readableTitle(byId('prose'))).toBe('The river moved beneath the stone.');
    expect(readableTitle(byId('blank'))).toBe('Note');
  });

  it('a Sequence orders everything it touches; stored order wins', () => {
    const base = doc();
    // no stored order: discovery order (inputs first, then outputs)
    expect(sequenceSteps(base, 'seq').map((s) => s.nodeId)).toEqual(['a', 'b', 'c']);

    const ordered: CanvasDocument = {
      ...base,
      nodes: base.nodes.map((node) =>
        node.id === 'seq' ? { ...node, data: { stepOrder: ['c', 'a'] } } : node,
      ),
    };
    // ranked ids lead in their stored order; unranked keep discovery order
    expect(sequenceSteps(ordered, 'seq').map((s) => s.nodeId)).toEqual(['c', 'a', 'b']);
  });

  it('reordering moves one step and never duplicates it', () => {
    expect(reorderSteps(['a', 'b', 'c'], 'c', 0)).toEqual(['c', 'a', 'b']);
    expect(reorderSteps(['a', 'b', 'c'], 'a', 2)).toEqual(['b', 'c', 'a']);
    // out-of-range clamps rather than dropping the step
    expect(reorderSteps(['a', 'b'], 'a', 99)).toEqual(['b', 'a']);
  });

  it('AND wants every input filled; OR wants one; NOT wants none', () => {
    const base = doc();
    const withGate = (type: 'and' | 'or' | 'not', sources: string[]): CanvasDocument => ({
      ...base,
      nodes: [...base.nodes, { id: 'g', type, position: { x: 0, y: 0 }, data: {} }],
      edges: sources.map((source, index) => ({ id: `ge${index}`, source, target: 'g' })),
    });

    // 'a' has a title, 'blank' has nothing
    expect(gateVerdict(withGate('and', ['a', 'blank']), 'g', 'and').satisfied).toBe(false);
    expect(gateVerdict(withGate('and', ['a', 'prose']), 'g', 'and').satisfied).toBe(true);
    expect(gateVerdict(withGate('or', ['a', 'blank']), 'g', 'or').satisfied).toBe(true);
    expect(gateVerdict(withGate('or', ['blank']), 'g', 'or').satisfied).toBe(false);
    expect(gateVerdict(withGate('not', ['blank']), 'g', 'not').satisfied).toBe(true);
    expect(gateVerdict(withGate('not', ['a']), 'g', 'not').satisfied).toBe(false);

    // nothing wired in yet is UNKNOWN, not false -- an empty gate is not a
    // failing gate, and must never read as one
    const empty = gateVerdict(withGate('and', []), 'g', 'and');
    expect(empty.satisfied).toBeNull();
    expect(empty.total).toBe(0);
  });

  it('a Filter with no type set passes everything through', () => {
    const base = doc();
    const withFilter = (filterType?: string): CanvasDocument => ({
      ...base,
      nodes: [
        ...base.nodes,
        {
          id: 'f',
          type: 'filter',
          position: { x: 0, y: 0 },
          data: filterType === undefined ? {} : { filterType },
        },
      ],
      edges: [
        { id: 'fe1', source: 'a', target: 'f' },
        { id: 'fe2', source: 'c', target: 'f' },
      ],
    });

    const open = filterPasses(withFilter(), 'f');
    expect(open.filterType).toBeNull();
    expect(open.kept).toHaveLength(2);
    expect(open.dropped).toHaveLength(0);

    const people = filterPasses(withFilter('person'), 'f');
    expect(people.kept.map((entry) => entry.title)).toEqual(['Durvain']);
    expect(people.dropped.map((entry) => entry.title)).toEqual(['Arrival']);
  });
});
