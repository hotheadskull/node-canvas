// Regenerates infer.golden.json from the fixture below. Run with:
//   npx tsx scripts/gen-infer-golden.mts
// Written via fs.writeFileSync, NOT a shell redirect -- PowerShell's `>`
// adds a BOM and the golden then fails to parse.
import { writeFileSync } from 'fs';
import { join } from 'path';
import { inferConnection, describeInference } from '../core/src/infer';
import type { CanvasDocument } from '../core/src/schema';

const fixture: CanvasDocument = {
  schemaVersion: 2,
  id: 'doc_infer',
  name: 'Inference fixture',
  mode: 'novel',
  nodes: [
    { id: 'node_durvain', type: 'person', position: { x: 0, y: 0 }, data: { title: 'Durvain' } },
    { id: 'node_deepvault', type: 'place', position: { x: 0, y: 200 }, data: { title: 'Deepvault' } },
    { id: 'node_ch1', type: 'section', position: { x: 400, y: 0 }, data: { title: 'Chapter 1' } },
    { id: 'node_ch2', type: 'section', position: { x: 400, y: 300 }, data: { title: 'Chapter 2' } },
    { id: 'node_book', type: 'document', position: { x: 800, y: 0 }, data: { title: 'The Book' } },
    { id: 'node_scrap', type: 'note', position: { x: 0, y: 400 }, data: { title: 'A thought' } },
    { id: 'node_payoff', type: 'payoff', position: { x: 0, y: 600 }, data: { title: 'The reveal' } },
    { id: 'node_idea', type: 'idea', position: { x: 0, y: 800 }, data: { title: 'What if' } },
    { id: 'node_theme', type: 'theme', position: { x: 200, y: 800 }, data: { title: 'Memory' } },
  ],
  edges: [],
  // Chapter 1's Setting (capacity one) is ALREADY taken -- a second place
  // must not squeeze in, and must fall through to the next candidate.
  wires: [
    {
      id: 'wire_setting',
      source: 'node_deepvault',
      sourcePort: 'place-out',
      target: 'node_ch1',
      targetPort: 'place-in',
      status: 'live',
    },
  ],
  assemblies: [],
};

const cases: { name: string; from: string; to: string }[] = [
  { name: 'person into a chapter is cast', from: 'node_durvain', to: 'node_ch1' },
  { name: 'place into a free chapter is the setting', from: 'node_deepvault', to: 'node_ch2' },
  { name: 'place into a chapter whose setting is taken', from: 'node_deepvault', to: 'node_ch1' },
  { name: 'note into a document is a section of it', from: 'node_scrap', to: 'node_book' },
  { name: 'chapter into a document', from: 'node_ch1', to: 'node_book' },
  { name: 'dragged backwards: chapter onto the person', from: 'node_ch1', to: 'node_durvain' },
  { name: 'payoff has no gives and the idea no takes', from: 'node_payoff', to: 'node_idea' },
  { name: 'two portless nodes stay a plain relationship', from: 'node_idea', to: 'node_theme' },
  { name: 'a node onto itself never infers', from: 'node_durvain', to: 'node_durvain' },
];

const results = cases.map((testCase) => {
  const inferred = inferConnection(fixture, testCase.from, testCase.to);
  return {
    case: testCase.name,
    from: testCase.from,
    to: testCase.to,
    inferred,
    describes: inferred ? describeInference(fixture, inferred) : null,
  };
});

writeFileSync(
  join(process.cwd(), 'core/src/infer.golden.json'),
  JSON.stringify({ fixture, results }, null, 2) + '\n',
);
console.log(`infer.golden.json regenerated: ${results.length} cases`);
