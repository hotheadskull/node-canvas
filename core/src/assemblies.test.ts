import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  addMember,
  createAssembly,
  deleteAssembly,
  displayEndpoint,
  duplicateAssembly,
  hiddenIds,
  memberNodeIds,
  removeMember,
  setAssemblyCollapsed,
  unpackAssembly,
} from './assemblies';
import { deriveFace } from './derive';
import { GraphError, removeNode } from './graph';
import { DocumentSchema, serializeDocument, type CanvasDocument } from './schema';

const golden = JSON.parse(
  readFileSync(new URL('./assemblies.golden.json', import.meta.url), 'utf8'),
);
const fixture: CanvasDocument = DocumentSchema.parse(golden.fixture);

const ids = (prefix: string) => {
  let count = 0;
  void prefix;
  return () => `asm_test-${++count}`;
};

describe('I3 -- assemblies are references, never copies', () => {
  it('a node can belong to multiple assemblies at once (castle: court AND guild)', () => {
    expect(memberNodeIds(fixture, 'asm_court')).toContain('node_castle');
    expect(memberNodeIds(fixture, 'asm_guild')).toContain('node_castle');
    // and the document still has exactly ONE castle node
    expect(fixture.nodes.filter((node) => node.data.title === 'Castle')).toHaveLength(1);
  });

  it('duplicating an assembly duplicates the REFERENCE LIST, zero nodes (golden)', () => {
    const result = duplicateAssembly(fixture, 'asm_guild', ids('asm'));
    expect(result.document.nodes).toHaveLength(fixture.nodes.length); // untouched
    const copy = result.document.assemblies.find(
      (assembly) => assembly.id === result.assemblyId,
    )!;
    expect(copy.memberIds).toEqual(['node_smith', 'node_forge', 'node_castle']);
    expect(copy.name).toBe('The Guild (copy)');
  });

  it('deleting an assembly never deletes member nodes', () => {
    const after = deleteAssembly(fixture, 'asm_guild');
    expect(after.nodes).toHaveLength(fixture.nodes.length);
    // parents drop the reference
    expect(after.assemblies.find((assembly) => assembly.id === 'asm_town')!.memberIds).toEqual([
      'asm_court',
    ]);
  });

  it('unpack is delete-the-group-keep-everything', () => {
    const after = unpackAssembly(fixture, 'asm_town');
    expect(after.nodes).toHaveLength(fixture.nodes.length);
    expect(after.assemblies.map((assembly) => assembly.id)).toEqual([
      'asm_court',
      'asm_guild',
      'asm_kingdom',
    ]);
    expect(
      after.assemblies.find((assembly) => assembly.id === 'asm_kingdom')!.memberIds,
    ).toEqual([]);
  });

  it('removing a member removes only the reference', () => {
    const after = removeMember(fixture, 'asm_guild', 'node_castle');
    expect(after.nodes.some((node) => node.id === 'node_castle')).toBe(true);
    expect(memberNodeIds(after, 'asm_court')).toContain('node_castle');
  });
});

describe('I4 -- collapse/expand is a lossless round-trip', () => {
  it('collapse then expand reproduces the document BYTE-EXACTLY, 3 levels deep', () => {
    const original = serializeDocument(fixture);
    let doc = fixture;
    // collapse inner -> middle -> outer, then expand outer -> middle -> inner
    doc = setAssemblyCollapsed(doc, 'asm_court', true);
    doc = setAssemblyCollapsed(doc, 'asm_town', true);
    doc = setAssemblyCollapsed(doc, 'asm_kingdom', true);
    doc = setAssemblyCollapsed(doc, 'asm_kingdom', false);
    doc = setAssemblyCollapsed(doc, 'asm_town', false);
    doc = setAssemblyCollapsed(doc, 'asm_court', false);
    expect(serializeDocument(doc)).toBe(original);
  });

  it('collapsing hides transitive members and nested faces (golden)', () => {
    const collapsed = setAssemblyCollapsed(fixture, 'asm_town', true);
    expect([...hiddenIds(collapsed)].sort()).toEqual([...golden.hiddenWhenTownCollapsed].sort());
    // the outsider node and the kingdom face stay visible
    expect(hiddenIds(collapsed).has('node_outsider')).toBe(false);
    expect(hiddenIds(collapsed).has('asm_kingdom')).toBe(false);
  });

  it('boundary connections DRAW to the outermost collapsed face, storage unchanged (golden)', () => {
    const collapsed = setAssemblyCollapsed(fixture, 'asm_town', true);
    expect(displayEndpoint(collapsed, 'node_king')).toBe(
      golden.displayEndpointOfKingWhenTownCollapsed,
    );
    // nested collapse: outermost wins
    const doubly = setAssemblyCollapsed(collapsed, 'asm_kingdom', true);
    expect(displayEndpoint(doubly, 'node_king')).toBe('asm_kingdom');
    // stored edge untouched
    expect(doubly.edges[0]).toEqual(fixture.edges[0]);
  });
});

describe('face-proxy stability (the Blender node-group lesson)', () => {
  it('deleting an inner node: faces survive, external connections intact (golden)', () => {
    const after = removeNode(fixture, 'node_castle');
    const court = after.assemblies.find((assembly) => assembly.id === 'asm_court')!;
    const guild = after.assemblies.find((assembly) => assembly.id === 'asm_guild')!;
    expect(court.memberIds).toEqual(golden.afterDeleteCastle.courtMembers);
    expect(guild.memberIds).toEqual(golden.afterDeleteCastle.guildMembers);
    expect(after.edges.some((edge) => edge.target === 'asm_town')).toBe(
      golden.afterDeleteCastle.externalEdgeSurvives,
    );
    // the resulting document still validates (I9)
    expect(() => serializeDocument(after)).not.toThrow();
  });
});

describe('derivations over membership', () => {
  it('transitive member nodes through nesting (golden)', () => {
    expect(memberNodeIds(fixture, 'asm_town').sort()).toEqual(
      [...golden.memberNodeIdsOfTown].sort(),
    );
  });

  it('the face counts members by type through nesting (golden)', () => {
    expect(deriveFace(fixture, memberNodeIds(fixture, 'asm_town'))).toEqual(
      golden.faceCountsOfTown,
    );
  });
});

describe('guards', () => {
  it('rejects membership cycles at every depth', () => {
    expect(() => addMember(fixture, 'asm_court', 'asm_court')).toThrow(GraphError);
    expect(() => addMember(fixture, 'asm_court', 'asm_town')).toThrow(GraphError);
    expect(() => addMember(fixture, 'asm_court', 'asm_kingdom')).toThrow(GraphError);
  });

  it('rejects unknown members', () => {
    expect(() => createAssembly(fixture, 'x', ['node_ghost'], { x: 0, y: 0 })).toThrow(
      GraphError,
    );
  });

  it('the schema itself rejects membership cycles on load (I9)', () => {
    const doc = JSON.parse(JSON.stringify(golden.fixture));
    doc.assemblies[0].memberIds.push('asm_town'); // court would contain town contains court
    const result = DocumentSchema.safeParse(doc);
    expect(result.success).toBe(false);
  });
});
