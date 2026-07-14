import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  castOf,
  compile,
  deriveFace,
  hygieneFlags,
  readinessOf,
  rollupReadiness,
  wordCount,
} from './derive';
import { reorderIntakeWire } from './wires';
import { DocumentSchema, type CanvasDocument } from './schema';

const golden = JSON.parse(readFileSync(new URL('./derive.golden.json', import.meta.url), 'utf8'));
const fixture: CanvasDocument = DocumentSchema.parse(golden.fixture);

describe('compile (golden: wire-order concatenation up the spine)', () => {
  it('chapter compiles own text then sections in wire order; tentative wires never compile', () => {
    expect(compile(fixture, 'node_chapter')).toEqual(golden.compileChapter);
  });

  it('REORDERING THE WIRES REORDERS THE CHAPTER (the worked example)', () => {
    const reordered = reorderIntakeWire(fixture, 'node_chapter', 'sections-in', 'wire_scene-b', 0);
    expect(compile(reordered, 'node_chapter')).toEqual(golden.compileChapterAfterReorder);
    // and the original document is untouched (pure ops)
    expect(compile(fixture, 'node_chapter')).toEqual(golden.compileChapter);
  });

  it('manuscript compiles one level up through the chapter', () => {
    expect(compile(fixture, 'node_manuscript')).toEqual(golden.compileManuscript);
  });

  it('a cycle is flagged, not an infinite loop', () => {
    const withCycle: CanvasDocument = {
      ...fixture,
      wires: [
        ...fixture.wires,
        {
          id: 'wire_cycle',
          source: 'node_manuscript',
          sourcePort: 'compiled-out',
          target: 'node_chapter',
          targetPort: 'sections-in',
          status: 'live',
        },
      ],
    };
    const result = compile(withCycle, 'node_manuscript');
    expect(result.cycles).toContain('node_manuscript');
    expect(result.text).toContain('The storm broke at midnight.');
  });

  it('word count rolls up from the compiled text', () => {
    expect(wordCount(compile(fixture, 'node_chapter').text)).toBe(14);
    expect(wordCount('')).toBe(0);
    expect(wordCount('  one   two  ')).toBe(2);
  });

  it('word count sees words, never markup (TipTap HTML content)', () => {
    expect(wordCount('<p>Bob <strong>climbed</strong> the stairs.</p>')).toBe(4);
    expect(wordCount('<p></p>')).toBe(0);
    expect(wordCount('<h2>Storm</h2><p>Inside &amp; out</p>')).toBe(4);
  });
});

describe('castOf (golden: rename Bob -> Robert propagates)', () => {
  it('derives the cast from people wired into spine sections', () => {
    expect(castOf(fixture, 'node_chapter')).toEqual(golden.castOfChapter);
  });

  it('RENAMING THE PERSON PROPAGATES because names derive by reference', () => {
    const renamed: CanvasDocument = {
      ...fixture,
      nodes: fixture.nodes.map((node) =>
        node.id === 'node_bob' ? { ...node, data: { ...node.data, title: 'Robert' } } : node,
      ),
    };
    expect(castOf(renamed, 'node_chapter')).toEqual(golden.castOfChapterAfterRename);
  });

  it('the manuscript sees the cast through two spine levels', () => {
    expect(castOf(fixture, 'node_manuscript')).toEqual(golden.castOfChapter);
  });
});

describe('deriveFace (golden)', () => {
  it('categorizes member counts with universal labels', () => {
    expect(deriveFace(fixture, fixture.nodes.map((node) => node.id))).toEqual(
      golden.deriveFaceAll,
    );
  });

  it('ignores unknown ids', () => {
    expect(deriveFace(fixture, ['node_ghost'])).toEqual([]);
  });
});

describe('readiness (golden rollup)', () => {
  it('defaults to seed and rolls up with least-advanced overall', () => {
    const staged: CanvasDocument = {
      ...fixture,
      nodes: fixture.nodes.map((node) => {
        if (node.id === 'node_scene-a') return { ...node, data: { ...node.data, readiness: 'ready' } };
        if (node.id === 'node_scene-b')
          return { ...node, data: { ...node.data, readiness: 'developing' } };
        return node;
      }),
    };
    expect(readinessOf(staged.nodes.find((node) => node.id === 'node_scene-a')!)).toBe('ready');
    expect(readinessOf(staged.nodes.find((node) => node.id === 'node_bob')!)).toBe('seed');
    expect(rollupReadiness(staged, staged.nodes.map((node) => node.id))).toEqual(
      golden.readinessRollup,
    );
  });

  it('an empty set is seed with zero total', () => {
    expect(rollupReadiness(fixture, []).overall).toBe('seed');
  });
});

describe('hygiene flags (golden)', () => {
  it('wired spine nodes with empty thread intakes flag themselves', () => {
    expect(hygieneFlags(fixture)).toEqual(golden.hygieneFlags);
  });

  it('port-free canvases NEVER flag (I2: ports are opt-in)', () => {
    const portFree: CanvasDocument = { ...fixture, wires: [] };
    expect(hygieneFlags(portFree)).toEqual([]);
  });
});

describe('reorderIntakeWire guards', () => {
  it('clamps out-of-range targets and no-ops on same index', () => {
    const clamped = reorderIntakeWire(fixture, 'node_chapter', 'sections-in', 'wire_scene-a', 99);
    const intake = clamped.wires.filter(
      (wire) => wire.target === 'node_chapter' && wire.targetPort === 'sections-in',
    );
    expect(intake.map((wire) => wire.id)).toEqual(['wire_scene-b', 'wire_tentative', 'wire_scene-a']);
    expect(reorderIntakeWire(fixture, 'node_chapter', 'sections-in', 'wire_scene-a', 0)).toBe(
      fixture,
    );
  });

  it('rejects wires that are not on the intake', () => {
    expect(() =>
      reorderIntakeWire(fixture, 'node_chapter', 'sections-in', 'wire_bob-a', 0),
    ).toThrow();
  });
});
