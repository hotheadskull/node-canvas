import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  ARC_RELATIONS,
  arcOutline,
  arcRelationsByFamily,
  bigIdeaOf,
  getArcRelation,
  isArcWire,
} from './arcs';
import { GraphError } from './graph';
import { parseDocument, serializeDocument, type CanvasDocument } from './schema';
import { setWireRelation } from './wires';
import { splitNode } from './split';
import { SPLIT_PRESETS } from './registry';

const golden = JSON.parse(
  readFileSync(new URL('./arcs.golden.json', import.meta.url), 'utf8'),
) as {
  document: CanvasDocument;
  outline: unknown;
  bigIdea: unknown;
};

function loadGoldenDoc(): CanvasDocument {
  const parsed = parseDocument(JSON.stringify(golden.document));
  if (!parsed.ok) throw new Error(`golden document invalid: ${parsed.error}`);
  return parsed.document;
}

describe('arc relationships (sermon pack)', () => {
  it('ships exactly the 18 relationships, each in a family', () => {
    expect(ARC_RELATIONS).toHaveLength(18);
    const ids = ARC_RELATIONS.map((relation) => relation.id);
    expect(new Set(ids).size).toBe(18);
    for (const relation of ARC_RELATIONS) {
      expect(relation.code).toBeTruthy();
      expect(relation.label).toBeTruthy();
      expect(relation.hint).toBeTruthy();
    }
    const grouped = arcRelationsByFamily();
    expect(grouped.flatMap((group) => group.relations)).toHaveLength(18);
    expect(grouped.map((group) => group.family)).toEqual([
      'coordinating',
      'restatement',
      'distinct',
      'adversative',
    ]);
  });

  it('wire.relation survives a byte-exact save/load round-trip (I9/I10)', () => {
    const raw = `${JSON.stringify(golden.document, null, 2)}\n`;
    const parsed = parseDocument(raw);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(serializeDocument(parsed.document)).toBe(raw);
  });

  it('derives the outline pinned in the golden (levels, anchors, main points)', () => {
    const doc = loadGoldenDoc();
    const assembly = doc.assemblies.find((candidate) => candidate.id === 'asm-arc')!;
    const outline = arcOutline(doc, assembly.memberIds);
    expect(JSON.parse(JSON.stringify(outline))).toEqual(golden.outline);
  });

  it('coordinating relations join equals; subordinating relations indent', () => {
    const doc = loadGoldenDoc();
    const outline = arcOutline(doc, ['prop-main', 'prop-ground', 'prop-exp', 'prop-coord']);
    const byId = new Map(outline.entries.map((entry) => [entry.nodeId, entry]));
    expect(byId.get('prop-coord')!.level).toBe(0); // series -> same level as main
    expect(byId.get('prop-ground')!.level).toBe(1); // ground -> one deeper
    expect(byId.get('prop-exp')!.level).toBe(2); // chained subordination
  });

  it('an arc cycle never hangs: cycle members become main points', () => {
    const doc = loadGoldenDoc();
    const cycled = setWireRelation(
      {
        ...doc,
        wires: doc.wires.map((wire) =>
          wire.id === 'wire-exp'
            ? { ...wire, source: 'prop-exp', target: 'prop-ground' }
            : wire,
        ).concat({
          id: 'wire-cycle',
          source: 'prop-ground',
          sourcePort: 'prop-out',
          target: 'prop-exp',
          targetPort: 'arc-in',
          status: 'live',
        }),
      },
      'wire-cycle',
      'ground',
    );
    // prop-ground's FIRST outgoing arc is still wire-ground (to prop-main),
    // so force the cycle: outline over just the two cycled props
    const outline = arcOutline(cycled, ['prop-exp', 'prop-ground']);
    expect(outline.entries).toHaveLength(2);
    for (const entry of outline.entries) {
      expect(Number.isFinite(entry.level)).toBe(true);
    }
  });

  it('setWireRelation validates ids and clears with undefined', () => {
    const doc = loadGoldenDoc();
    expect(getArcRelation('ground')?.family).toBe('distinct');
    const cleared = setWireRelation(doc, 'wire-ground', undefined);
    expect(cleared.wires.find((wire) => wire.id === 'wire-ground')?.relation).toBeUndefined();
    const swapped = setWireRelation(doc, 'wire-ground', 'inference');
    expect(swapped.wires.find((wire) => wire.id === 'wire-ground')?.relation).toBe('inference');
    expect(() => setWireRelation(doc, 'wire-ground', 'not-a-relation')).toThrow(GraphError);
    expect(() => setWireRelation(doc, 'ghost', 'ground')).toThrow(GraphError);
  });

  it('isArcWire: only live prop->prop wires into an arc intake', () => {
    const doc = loadGoldenDoc();
    const arcWire = doc.wires.find((wire) => wire.id === 'wire-ground')!;
    const bigIdeaWire = doc.wires.find((wire) => wire.id === 'wire-subject')!;
    expect(isArcWire(doc, arcWire)).toBe(true);
    expect(isArcWire(doc, bigIdeaWire)).toBe(false);
  });

  it('derives the Big Idea from wired Subject + Complement (golden)', () => {
    const doc = loadGoldenDoc();
    expect(JSON.parse(JSON.stringify(bigIdeaOf(doc, 'title-1')))).toEqual(golden.bigIdea);
    // unwired title derives nothing (I2: opt-in)
    expect(bigIdeaOf({ ...doc, wires: [] }, 'title-1')).toEqual({
      subject: null,
      complement: null,
      exegetical: null,
    });
  });

  it('Passage → Propositions split preset wires prop stubs into props-in', () => {
    const doc = loadGoldenDoc();
    const preset = SPLIT_PRESETS.find((candidate) => candidate.id === 'passage-propositions')!;
    expect(preset.forTypes).toContain('passage');
    let counter = 0;
    const result = splitNode(doc, 'passage-1', preset.stubs, {
      ...(preset.intake ? { intakeId: preset.intake } : {}),
      idFactory: (prefix) => `${prefix}-split-${counter++}`,
    });
    expect(result.createdIds).toHaveLength(3);
    for (const id of result.createdIds) {
      const node = result.document.nodes.find((candidate) => candidate.id === id)!;
      expect(node.type).toBe('proposition');
      const wire = result.document.wires.find((candidate) => candidate.source === id)!;
      expect(wire.sourcePort).toBe('prop-out');
      expect(wire.target).toBe('passage-1');
      expect(wire.targetPort).toBe('props-in');
      expect(wire.status).toBe('live');
    }
    // the split result still validates and serializes (I9)
    expect(() => serializeDocument(result.document)).not.toThrow();
  });
});
