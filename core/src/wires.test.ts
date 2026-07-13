import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { addNode, GraphError, removeNode, spawnNode } from './graph';
import { createEmptyDocument, DocumentSchema, type CanvasDocument } from './schema';
import {
  addWire,
  commitTentativeWire,
  createTentativeWire,
  dissolveTentativeWire,
  isValidWire,
  removeWire,
  setWireStoryTime,
  tentativeInboundCount,
} from './wires';

function build(types: string[]) {
  let doc = createEmptyDocument('wires-test');
  const ids: string[] = [];
  for (const type of types) {
    const node = spawnNode(type, { x: ids.length * 600, y: 0 });
    ids.push(node.id);
    doc = addNode(doc, node);
  }
  return { doc, ids };
}

describe('wire validation', () => {
  it('accepts a matching give -> take pair', () => {
    const { doc, ids } = build(['note', 'document']);
    expect(
      isValidWire(doc, {
        source: ids[0]!,
        sourcePort: 'text-out',
        target: ids[1]!,
        targetPort: 'sections-in',
      }),
    ).toEqual({ ok: true });
  });

  const failCase = (
    name: string,
    types: string[],
    spec: (ids: string[]) => Parameters<typeof isValidWire>[1],
    reason: string,
  ) => {
    it(name, () => {
      const { doc, ids } = build(types);
      const result = isValidWire(doc, spec(ids));
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.reason).toBe(reason);
    });
  };

  failCase(
    'rejects missing nodes',
    ['note'],
    (ids) => ({ source: ids[0]!, sourcePort: 'text-out', target: 'ghost', targetPort: 'x' }),
    'unknown-node',
  );
  failCase(
    'rejects self-wiring',
    ['document'],
    (ids) => ({ source: ids[0]!, sourcePort: 'compiled-out', target: ids[0]!, targetPort: 'sections-in' }),
    'self',
  );
  failCase(
    'rejects unknown ports',
    ['note', 'document'],
    (ids) => ({ source: ids[0]!, sourcePort: 'nope-out', target: ids[1]!, targetPort: 'sections-in' }),
    'no-such-port',
  );
  failCase(
    'rejects wiring out of a take (wrong direction)',
    ['document', 'document'],
    (ids) => ({ source: ids[0]!, sourcePort: 'sections-in', target: ids[1]!, targetPort: 'sections-in' }),
    'wrong-direction',
  );
  failCase(
    'rejects kind mismatches (a place is not a person)',
    ['place', 'section'],
    (ids) => ({ source: ids[0]!, sourcePort: 'identity-out', target: ids[1]!, targetPort: 'people-in' }),
    'kind-mismatch',
  );

  it('one give feeds many intakes', () => {
    const { doc, ids } = build(['note', 'document', 'document']);
    let wired = addWire(doc, {
      source: ids[0]!,
      sourcePort: 'text-out',
      target: ids[1]!,
      targetPort: 'sections-in',
    });
    wired = addWire(wired, {
      source: ids[0]!,
      sourcePort: 'text-out',
      target: ids[2]!,
      targetPort: 'sections-in',
    });
    expect(wired.wires).toHaveLength(2);
  });

  it('capacity-one intakes reject a second live wire', () => {
    const { doc, ids } = build(['person', 'section', 'person']);
    const wired = addWire(doc, {
      source: ids[0]!,
      sourcePort: 'identity-out',
      target: ids[1]!,
      targetPort: 'pov-in',
    });
    const result = isValidWire(wired, {
      source: ids[2]!,
      sourcePort: 'identity-out',
      target: ids[1]!,
      targetPort: 'pov-in',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('occupied');
  });

  it('duplicates are rejected', () => {
    const { doc, ids } = build(['note', 'document']);
    const spec = {
      source: ids[0]!,
      sourcePort: 'text-out',
      target: ids[1]!,
      targetPort: 'sections-in',
    };
    const wired = addWire(doc, spec);
    expect(() => addWire(wired, spec)).toThrow(GraphError);
  });
});

describe('tentative wires', () => {
  const golden = JSON.parse(
    readFileSync(new URL('./tentative.golden.json', import.meta.url), 'utf8'),
  ) as { before: unknown; commitWireId: string; after: unknown; dissolvedIds: string[] };

  it('lifecycle matches the golden: commit converts, siblings dissolve', () => {
    const before = DocumentSchema.parse(golden.before);
    const result = commitTentativeWire(before, golden.commitWireId);
    expect(result.document).toEqual(DocumentSchema.parse(golden.after));
    expect(result.dissolvedIds).toEqual(golden.dissolvedIds);
    expect(result.committedId).toBe(golden.commitWireId);
  });

  it('candidates may pile onto a full capacity-one intake, but cannot COMMIT into it', () => {
    const { doc, ids } = build(['person', 'section', 'person']);
    let wired = addWire(doc, {
      source: ids[0]!,
      sourcePort: 'identity-out',
      target: ids[1]!,
      targetPort: 'pov-in',
    });
    wired = createTentativeWire(wired, {
      source: ids[2]!,
      sourcePort: 'identity-out',
      target: ids[1]!,
      targetPort: 'pov-in',
    });
    const tentativeId = wired.wires.find((wire) => wire.status === 'tentative')!.id;
    expect(() => commitTentativeWire(wired, tentativeId)).toThrow(GraphError);
  });

  it('dissolve removes a single candidate; counts feed the waiting badge', () => {
    const { doc, ids } = build(['note', 'document', 'document']);
    let wired = createTentativeWire(doc, {
      source: ids[0]!,
      sourcePort: 'text-out',
      target: ids[1]!,
      targetPort: 'sections-in',
    });
    wired = createTentativeWire(wired, {
      source: ids[0]!,
      sourcePort: 'text-out',
      target: ids[2]!,
      targetPort: 'sections-in',
    });
    expect(tentativeInboundCount(wired, ids[1]!)).toBe(1);
    const first = wired.wires[0]!.id;
    const dissolved = dissolveTentativeWire(wired, first);
    expect(dissolved.wires).toHaveLength(1);
    expect(tentativeInboundCount(dissolved, ids[1]!)).toBe(0);
  });
});

describe('story-time stamps', () => {
  function possessionDoc() {
    const { doc, ids } = build(['thing', 'person']);
    const wired = addWire(doc, {
      source: ids[0]!,
      sourcePort: 'identity-out',
      target: ids[1]!,
      targetPort: 'possession-in',
    });
    return { wired, wireId: wired.wires[0]!.id };
  }

  it('stamps, restamps, and clears', () => {
    const { wired, wireId } = possessionDoc();
    let doc = setWireStoryTime(wired, wireId, 7);
    expect(doc.wires[0]!.storyTime).toBe(7);
    doc = setWireStoryTime(doc, wireId, 9.5);
    expect(doc.wires[0]!.storyTime).toBe(9.5);
    doc = setWireStoryTime(doc, wireId, undefined);
    expect('storyTime' in doc.wires[0]!).toBe(false);
  });

  it('rejects non-finite stamps', () => {
    const { wired, wireId } = possessionDoc();
    expect(() => setWireStoryTime(wired, wireId, Number.NaN)).toThrow(GraphError);
    expect(() => setWireStoryTime(wired, wireId, Infinity)).toThrow(GraphError);
  });
});

describe('graph consistency', () => {
  it('removing a node drops its wires too', () => {
    const { doc, ids } = build(['note', 'document']);
    const wired = addWire(doc, {
      source: ids[0]!,
      sourcePort: 'text-out',
      target: ids[1]!,
      targetPort: 'sections-in',
    });
    const removed = removeNode(wired, ids[0]!);
    expect(removed.wires).toHaveLength(0);
  });

  it('removeWire deletes live wires', () => {
    const { doc, ids } = build(['note', 'document']);
    const wired = addWire(doc, {
      source: ids[0]!,
      sourcePort: 'text-out',
      target: ids[1]!,
      targetPort: 'sections-in',
    });
    expect(removeWire(wired, wired.wires[0]!.id).wires).toHaveLength(0);
  });

  it('wire documents survive a full save/load round-trip', () => {
    const { doc, ids } = build(['thing', 'person']);
    let wired = addWire(doc, {
      source: ids[0]!,
      sourcePort: 'identity-out',
      target: ids[1]!,
      targetPort: 'possession-in',
    });
    wired = setWireStoryTime(wired, wired.wires[0]!.id, 4);
    const reparsed = DocumentSchema.parse(JSON.parse(JSON.stringify(wired))) as CanvasDocument;
    expect(reparsed.wires).toEqual(wired.wires);
  });
});
