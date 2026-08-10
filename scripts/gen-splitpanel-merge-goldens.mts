// One-shot: goldens for the split-panel options (wireBack/keepText) and
// the merge op. Reuses split.golden.json's fixture document.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { splitNode } from '../core/src/split';
import { mergeNodes } from '../core/src/merge';
import { getNodeDef, spineIntakeOf } from '../core/src/registry';
import { DocumentSchema } from '../core/src/schema';

const at = (rel: string) => fileURLToPath(new URL(rel, import.meta.url));
const splitGolden = JSON.parse(readFileSync(at('../core/src/split.golden.json'), 'utf8'));
const fixture = DocumentSchema.parse(splitGolden.before);

function makeIdFactory() {
  let nodes = 0;
  let wires = 0;
  return (prefix: string) => (prefix === 'node' ? `stub_${++nodes}` : `stub_wire_${++wires}`);
}

// give the parent prose so keepText has words to move
const prosed = {
  ...fixture,
  nodes: fixture.nodes.map((node) =>
    node.id === 'node_chapter'
      ? { ...node, data: { ...node.data, content: '<p>The words travel.</p>' } }
      : node,
  ),
};
const stubs = [
  { type: 'section', title: 'Section 01' },
  { type: 'section', title: 'Section 02' },
  { type: 'section', title: 'Section 03' },
];
const keepText = splitNode(prosed, 'node_chapter', stubs, {
  idFactory: makeIdFactory(),
  keepText: true,
});
const noWireBack = splitNode(prosed, 'node_chapter', stubs, {
  idFactory: makeIdFactory(),
  wireBack: false,
});
writeFileSync(
  at('../core/src/split-panel.golden.json'),
  JSON.stringify(
    {
      before: prosed,
      stubs,
      keepText: { after: keepText.document, createdIds: keepText.createdIds },
      noWireBack: { after: noWireBack.document, createdIds: noWireBack.createdIds },
    },
    null,
    2,
  ) + '\n',
  'utf8',
);

// ---- merge fixture: two notes wired into the chapter, one edge, one group
const noteGive = getNodeDef('note')!.ports.find((port) => port.direction === 'give')!.id;
const spine = spineIntakeOf('document')!.id;
const mergeBefore = DocumentSchema.parse({
  ...fixture,
  nodes: [
    ...fixture.nodes,
    { id: 'note_a', type: 'note', position: { x: 700, y: 0 }, size: { width: 300, height: 200 }, data: { title: 'Alpha', content: '<p>Alpha.</p>' } },
    { id: 'note_b', type: 'note', position: { x: 700, y: 300 }, size: { width: 300, height: 200 }, data: { title: 'Beta', content: '<p>Beta.</p>' } },
  ],
  edges: [
    ...fixture.edges,
    { id: 'edge_b', source: 'note_b', target: 'node_chapter' },
  ],
  wires: [
    ...fixture.wires,
    { id: 'wire_a', source: 'note_a', sourcePort: noteGive, target: 'node_chapter', targetPort: spine, status: 'live' },
    { id: 'wire_b', source: 'note_b', sourcePort: noteGive, target: 'node_chapter', targetPort: spine, status: 'live' },
  ],
  assemblies: [
    ...fixture.assemblies,
    { id: 'asm_pair', name: 'Pair', memberIds: ['note_a', 'note_b'], position: { x: 650, y: -60 }, collapsed: false },
  ],
});
const merged = mergeNodes(mergeBefore, 'note_a', ['note_b']);
writeFileSync(
  at('../core/src/merge.golden.json'),
  JSON.stringify(
    {
      before: mergeBefore,
      target: 'note_a',
      others: ['note_b'],
      after: merged.document,
      absorbedIds: merged.absorbedIds,
    },
    null,
    2,
  ) + '\n',
  'utf8',
);
console.log('wrote split-panel.golden.json + merge.golden.json');
