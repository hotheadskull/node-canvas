import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { GraphError } from './graph';
import { mergeNodes } from './merge';
import { DocumentSchema, type CanvasDocument } from './schema';

const golden = JSON.parse(readFileSync(new URL('./merge.golden.json', import.meta.url), 'utf8'));
const fixture: CanvasDocument = DocumentSchema.parse(golden.before);

describe('mergeNodes (golden)', () => {
  it('folds same-type nodes into the target: prose appends, wires re-point, groups transfer', () => {
    const result = mergeNodes(fixture, golden.target, golden.others);
    expect(result.absorbedIds).toEqual(golden.absorbedIds);
    expect(result.document).toEqual(DocumentSchema.parse(golden.after));
  });

  it('the merged document still validates and never duplicates a wire', () => {
    const result = mergeNodes(fixture, golden.target, golden.others);
    expect(() => DocumentSchema.parse(result.document)).not.toThrow();
    const keys = result.document.wires.map(
      (wire) => `${wire.source}:${wire.sourcePort}>${wire.target}:${wire.targetPort}`,
    );
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('the target keeps its position and title; the source document is untouched (I5)', () => {
    const before = structuredClone(fixture);
    const result = mergeNodes(fixture, golden.target, golden.others);
    expect(fixture).toEqual(before);
    const target = result.document.nodes.find((node) => node.id === golden.target)!;
    const original = fixture.nodes.find((node) => node.id === golden.target)!;
    expect(target.position).toEqual(original.position);
    expect(target.data.title).toBe(original.data.title);
  });

  it('refuses cross-type merges and self-merges', () => {
    expect(() => mergeNodes(fixture, golden.target, ['node_chapter'])).toThrow(GraphError);
    expect(() => mergeNodes(fixture, golden.target, [golden.target])).toThrow(GraphError);
    expect(() => mergeNodes(fixture, golden.target, [])).toThrow(GraphError);
  });
});
