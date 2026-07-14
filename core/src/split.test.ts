import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { compile } from './derive';
import { GraphError } from './graph';
import { rectsOverlap, type Rect } from './layout';
import { splitPresetsFor, SPLIT_PRESETS } from './registry';
import { DocumentSchema, type CanvasDocument } from './schema';
import { splitNode } from './split';

const golden = JSON.parse(readFileSync(new URL('./split.golden.json', import.meta.url), 'utf8'));
const fixture: CanvasDocument = DocumentSchema.parse(golden.before);

/** Deterministic id factory matching the golden's stub ids. */
function makeIdFactory() {
  let nodes = 0;
  let wires = 0;
  return (prefix: string) => (prefix === 'node' ? `stub_${++nodes}` : `stub_wire_${++wires}`);
}

describe('splitNode (golden)', () => {
  it('creates stubs below the parent, wired into the spine intake in order', () => {
    const result = splitNode(fixture, 'node_chapter', golden.stubs, { idFactory: makeIdFactory() });
    expect(result.createdIds).toEqual(golden.createdIds);
    expect(result.document).toEqual(DocumentSchema.parse(golden.after));
  });

  it('the parent NEVER moves (I5) and the original document is untouched', () => {
    const before = structuredClone(fixture);
    const result = splitNode(fixture, 'node_chapter', golden.stubs, { idFactory: makeIdFactory() });
    expect(fixture).toEqual(before);
    const parent = result.document.nodes.find((node) => node.id === 'node_chapter')!;
    expect(parent.position).toEqual({ x: 0, y: 0 });
  });

  it('split then compile: stubs contribute in reading order once written', () => {
    const result = splitNode(fixture, 'node_chapter', golden.stubs, { idFactory: makeIdFactory() });
    const written: CanvasDocument = {
      ...result.document,
      nodes: result.document.nodes.map((node) => {
        if (node.id === 'stub_1') return { ...node, data: { ...node.data, content: 'First.' } };
        if (node.id === 'stub_2') return { ...node, data: { ...node.data, content: 'Second.' } };
        return node;
      }),
    };
    expect(compile(written, 'node_chapter').text).toBe('First.\n\nSecond.');
  });

  it('stubs never land on existing nodes (collision-free, property check)', () => {
    const crowded: CanvasDocument = {
      ...fixture,
      nodes: [
        ...fixture.nodes,
        {
          id: 'node_bystander',
          type: 'note',
          position: { x: 0, y: 520 },
          size: { width: 300, height: 220 },
          data: { title: 'In the way' },
        },
      ],
    };
    const result = splitNode(crowded, 'node_chapter', golden.stubs, { idFactory: makeIdFactory() });
    const rects: Rect[] = result.document.nodes.map((node) => ({
      x: node.position.x,
      y: node.position.y,
      width: node.size!.width,
      height: node.size!.height,
    }));
    for (let a = 0; a < rects.length; a++) {
      for (let b = a + 1; b < rects.length; b++) {
        expect(rectsOverlap(rects[a]!, rects[b]!)).toBe(false);
      }
    }
  });

  it('manuscript splits into document stubs (spine in reverse, one level up)', () => {
    const withManuscript: CanvasDocument = {
      ...fixture,
      nodes: [
        ...fixture.nodes,
        {
          id: 'node_ms',
          type: 'manuscript',
          position: { x: 900, y: 0 },
          size: { width: 560, height: 440 },
          data: { title: 'The Book' },
        },
      ],
    };
    const preset = SPLIT_PRESETS.find((candidate) => candidate.id === 'three-chapters')!;
    const result = splitNode(withManuscript, 'node_ms', preset.stubs, { idFactory: makeIdFactory() });
    expect(result.createdIds).toHaveLength(3);
    const wires = result.document.wires.filter((wire) => wire.target === 'node_ms');
    expect(wires.every((wire) => wire.targetPort === 'documents-in' && wire.status === 'live')).toBe(
      true,
    );
  });

  it('guards: no spine intake, unknown stub type, empty stubs', () => {
    const noteDoc: CanvasDocument = {
      ...fixture,
      nodes: [
        {
          id: 'node_note',
          type: 'note',
          position: { x: 0, y: 0 },
          data: { title: 'n' },
        },
      ],
    };
    expect(() => splitNode(noteDoc, 'node_note', golden.stubs)).toThrow(GraphError);
    expect(() =>
      splitNode(fixture, 'node_chapter', [{ type: 'flux', title: 'x' }]),
    ).toThrow(GraphError);
    expect(() => splitNode(fixture, 'node_chapter', [])).toThrow(GraphError);
  });
});

describe('split presets (registry data, I8)', () => {
  it('documents get section presets; manuscripts get chapter stubs; notes get none', () => {
    expect(splitPresetsFor('document').map((preset) => preset.id)).toEqual([
      'three-sections',
      'beat-sheet',
    ]);
    expect(splitPresetsFor('manuscript').map((preset) => preset.id)).toEqual(['three-chapters']);
    expect(splitPresetsFor('note')).toEqual([]);
  });

  it('Toulmin scaffolds a claim through its Supports intake', () => {
    const doc: CanvasDocument = {
      ...fixture,
      nodes: [
        {
          id: 'node_claim',
          type: 'claim',
          position: { x: 0, y: 0 },
          size: { width: 360, height: 240 },
          data: { title: 'Lighthouses reduced wrecks' },
        },
      ],
      wires: [],
    };
    const preset = SPLIT_PRESETS.find((candidate) => candidate.id === 'toulmin')!;
    const result = splitNode(doc, 'node_claim', preset.stubs, {
      intakeId: preset.intake!,
      idFactory: makeIdFactory(),
    });
    expect(result.createdIds).toHaveLength(4);
    const wires = result.document.wires.filter((wire) => wire.target === 'node_claim');
    expect(wires.every((wire) => wire.targetPort === 'supports-in' && wire.status === 'live')).toBe(
      true,
    );
    expect(
      result.document.nodes.filter((node) => node.type === 'note').map((node) => node.data.title),
    ).toEqual(['Grounds', 'Warrant', 'Backing', 'Rebuttal']);
  });

  it('every preset stub type can actually feed its target types', () => {
    for (const preset of SPLIT_PRESETS) {
      for (const forType of preset.forTypes) {
        expect(() => {
          const doc: CanvasDocument = {
            schemaVersion: 1,
            id: 'doc_x',
            name: 'x',
            canvasMode: 'universal',
            createdAt: '2026-01-01T00:00:00.000Z',
            nodes: [
              {
                id: 'node_parent',
                type: forType,
                position: { x: 0, y: 0 },
                data: {},
              },
            ],
            edges: [],
            wires: [],
            assemblies: [],
          };
          splitNode(
            doc,
            'node_parent',
            preset.stubs,
            preset.intake ? { intakeId: preset.intake } : {},
          );
        }).not.toThrow();
      }
    }
  });
});
