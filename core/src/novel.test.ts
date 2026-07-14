import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { hygieneFlags } from './derive';
import { eventTimeline, involvedIn, payoffsOf, plantsResolvedBy, storyTimeOf } from './novel';
import { parseDocument, serializeDocument, type CanvasDocument } from './schema';

const golden = JSON.parse(
  readFileSync(new URL('./novel.golden.json', import.meta.url), 'utf8'),
) as Record<string, unknown> & { document: CanvasDocument };

function loadGoldenDoc(): CanvasDocument {
  const parsed = parseDocument(JSON.stringify(golden.document));
  if (!parsed.ok) throw new Error(`golden document invalid: ${parsed.error}`);
  return parsed.document;
}

describe('novel pack derivations (plant/payoff + story time)', () => {
  it('golden document round-trips byte-exactly (I9/I10)', () => {
    const raw = `${JSON.stringify(golden.document, null, 2)}\n`;
    const parsed = parseDocument(raw);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(serializeDocument(parsed.document)).toBe(raw);
  });

  it('payoffsOf / plantsResolvedBy pin the pairing (golden)', () => {
    const doc = loadGoldenDoc();
    expect(payoffsOf(doc, 'plant-gun')).toEqual(golden['payoffsOfGun']);
    expect(payoffsOf(doc, 'plant-locket')).toEqual(golden['payoffsOfLocket']);
    expect(plantsResolvedBy(doc, 'payoff-shot')).toEqual(golden['plantsResolvedByShot']);
  });

  it('pair titles read live -- renames propagate (castOf rule)', () => {
    const doc = loadGoldenDoc();
    const renamed = {
      ...doc,
      nodes: doc.nodes.map((node) =>
        node.id === 'payoff-shot' ? { ...node, data: { ...node.data, title: 'The bang' } } : node,
      ),
    };
    expect(payoffsOf(renamed, 'plant-gun')[0]!.title).toBe('The bang');
  });

  it('eventTimeline sorts by story time and skips undated events (golden)', () => {
    const doc = loadGoldenDoc();
    expect(eventTimeline(doc)).toEqual(golden['timeline']);
    const undated = doc.nodes.find((node) => node.id === 'event-undated')!;
    expect(storyTimeOf(undated)).toBeNull();
  });

  it('involvedIn reads role labels off the wires (golden)', () => {
    const doc = loadGoldenDoc();
    expect(involvedIn(doc, 'event-wedding')).toEqual(golden['involvedInWedding']);
  });

  it('an unconsumed Plant flags itself even unwired; a paid one does not (golden)', () => {
    const doc = loadGoldenDoc();
    expect(hygieneFlags(doc)).toEqual(golden['hygieneFlags']);
    // paying the locket off clears its flag
    const paid: CanvasDocument = {
      ...doc,
      wires: [
        ...doc.wires,
        {
          id: 'wire-locket-pays',
          source: 'plant-locket',
          sourcePort: 'plant-out',
          target: 'payoff-shot',
          targetPort: 'plants-in',
          status: 'live',
        },
      ],
    };
    expect(hygieneFlags(paid)).toEqual([]);
  });
});
