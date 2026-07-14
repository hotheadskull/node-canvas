import { describe, expect, it } from 'vitest';
import {
  addNode,
  addPlainEdge,
  createAssembly,
  createEmptyDocument,
  spawnNode,
} from '@node-canvas/core';
import { TUTORIAL_STEPS, type TutorialLatches } from './steps';

const NO_LATCHES: TutorialLatches = { paletteSeen: false };

describe('tutorial steps (performs-action-to-advance predicates)', () => {
  it('ships a coherent tour: first and last steps are manual', () => {
    expect(TUTORIAL_STEPS.length).toBeGreaterThanOrEqual(6);
    expect(TUTORIAL_STEPS[0]!.done).toBeNull();
    expect(TUTORIAL_STEPS[TUTORIAL_STEPS.length - 1]!.done).toBeNull();
    for (const step of TUTORIAL_STEPS) {
      expect(step.title).toBeTruthy();
      expect(step.body).toBeTruthy();
    }
  });

  const stepById = (id: string) => TUTORIAL_STEPS.find((step) => step.id === id)!;

  it('add-node waits for a node; write waits for actual words', () => {
    let doc = createEmptyDocument('tour');
    expect(stepById('add-node').done!(doc, NO_LATCHES)).toBe(false);
    const note = spawnNode('note', { x: 0, y: 0 });
    doc = addNode(doc, note);
    expect(stepById('add-node').done!(doc, NO_LATCHES)).toBe(true);
    expect(stepById('write').done!(doc, NO_LATCHES)).toBe(false);
    // empty HTML doesn't count as writing
    doc = {
      ...doc,
      nodes: doc.nodes.map((node) => ({ ...node, data: { ...node.data, content: '<p></p>' } })),
    };
    expect(stepById('write').done!(doc, NO_LATCHES)).toBe(false);
    doc = {
      ...doc,
      nodes: doc.nodes.map((node) => ({
        ...node,
        data: { ...node.data, content: '<p>a real thought</p>' },
      })),
    };
    expect(stepById('write').done!(doc, NO_LATCHES)).toBe(true);
  });

  it('connect waits for an edge; group waits for an assembly', () => {
    let doc = createEmptyDocument('tour');
    const a = spawnNode('note', { x: 0, y: 0 });
    const b = spawnNode('note', { x: 500, y: 0 });
    doc = addNode(addNode(doc, a), b);
    expect(stepById('second-node').done!(doc, NO_LATCHES)).toBe(true);
    expect(stepById('connect').done!(doc, NO_LATCHES)).toBe(false);
    doc = addPlainEdge(doc, a.id, b.id, {});
    expect(stepById('connect').done!(doc, NO_LATCHES)).toBe(true);
    expect(stepById('group').done!(doc, NO_LATCHES)).toBe(false);
    doc = createAssembly(doc, 'Pair', [a.id, b.id], { x: 0, y: 0 }).document;
    expect(stepById('group').done!(doc, NO_LATCHES)).toBe(true);
  });

  it('palette advances on the latch, not the document', () => {
    const doc = createEmptyDocument('tour');
    expect(stepById('palette').done!(doc, NO_LATCHES)).toBe(false);
    expect(stepById('palette').done!(doc, { paletteSeen: true })).toBe(true);
  });
});
