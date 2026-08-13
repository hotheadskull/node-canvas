import { describe, expect, it } from 'vitest';
import golden from './infer.golden.json';
import { describeInference, inferConnection } from './infer';
import type { CanvasDocument } from './schema';

// JSON widens the literal unions (mode, wire status) to plain strings, so
// the round-trip needs the unknown hop -- the golden itself is generated
// FROM a typed fixture in scripts/gen-infer-golden.mts.
const fixture = golden.fixture as unknown as CanvasDocument;

// "The connection itself communicates the relationship" (direction §2, user
// decision: infer it). The golden pins WHAT each drag means -- a change here
// changes what the app believes the user said, so it is never edited to
// make a test pass.
describe('connection inference (golden)', () => {
  it('every recorded case still infers the same thing', () => {
    for (const record of golden.results) {
      const inferred = inferConnection(fixture, record.from, record.to);
      expect(inferred, record.case).toEqual(record.inferred);
      expect(inferred ? describeInference(fixture, inferred) : null, record.case).toBe(
        record.describes,
      );
    }
  });

  it('a person dropped on a chapter joins its cast', () => {
    const inferred = inferConnection(fixture, 'node_durvain', 'node_ch1');
    expect(inferred?.targetPort).toBe('people-in');
    expect(inferred?.reversed).toBe(false);
    expect(describeInference(fixture, inferred!)).toBe('People');
  });

  it('a full capacity-one take is skipped, not overwritten', () => {
    // Chapter 1's Setting already holds Deepvault; a second place must land
    // somewhere else or not at all -- never silently replace the first.
    const taken = inferConnection(fixture, 'node_deepvault', 'node_ch1');
    expect(taken?.targetPort).not.toBe('place-in');

    const free = inferConnection(fixture, 'node_deepvault', 'node_ch2');
    expect(free?.targetPort).toBe('place-in');
  });

  it('dragging backwards means the same thing', () => {
    const forward = inferConnection(fixture, 'node_durvain', 'node_ch1');
    const backward = inferConnection(fixture, 'node_ch1', 'node_durvain');
    expect(backward?.reversed).toBe(true);
    // the stored wire is identical whichever way the user dragged
    expect({ ...backward, reversed: false }).toEqual({ ...forward, reversed: false });
  });

  it('portless nodes fall through to a plain relationship', () => {
    expect(inferConnection(fixture, 'node_idea', 'node_theme')).toBeNull();
    expect(inferConnection(fixture, 'node_payoff', 'node_idea')).toBeNull();
  });

  it('a node never infers a connection to itself', () => {
    expect(inferConnection(fixture, 'node_durvain', 'node_durvain')).toBeNull();
  });

  it('is stable: the same drag always reads the same way', () => {
    const once = inferConnection(fixture, 'node_scrap', 'node_book');
    const twice = inferConnection(fixture, 'node_scrap', 'node_book');
    expect(once).toEqual(twice);
  });
});
