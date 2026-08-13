// Regenerates citation.golden.json. Run: npx tsx scripts/gen-citation-golden.mts
import { writeFileSync } from 'fs';
import { join } from 'path';
import {
  bibliographyMarkdown,
  formatCitation,
  inTextCitation,
  sourceRecordOf,
  type CitationStyle,
} from '../core/src/citation';
import type { CanvasDocument, CanvasNode } from '../core/src/schema';

const field = (name: string, value: string) => ({
  id: `f_${name}`,
  name,
  type: 'text' as const,
  value,
});

function source(id: string, title: string, fields: [string, string][]): CanvasNode {
  return {
    id,
    type: 'source',
    position: { x: 0, y: 0 },
    data: { title, fields: fields.map(([name, value]) => field(name, value)) },
  } as CanvasNode;
}

const nodes: CanvasNode[] = [
  // journal article, three authors, DOI
  source('node_hawking', 'Particle Creation by Black Holes', [
    ['Authors', 'Hawking, Stephen W.; Penrose, Roger; Ellis, George'],
    ['Journal', 'Communications in Mathematical Physics'],
    ['Year', '1975'],
    ['Volume', '43'],
    ['Issue', '3'],
    ['Pages', '199-220'],
    ['DOI', '10.1007/BF02345020'],
  ]),
  // book, one author, edition + publisher
  source('node_kuhn', 'The Structure of Scientific Revolutions', [
    ['Author', 'Thomas S. Kuhn'],
    ['Publisher', 'University of Chicago Press'],
    ['Year', '1962'],
    ['Edition', '2nd ed.'],
  ]),
  // two authors, no year, web
  source('node_web', 'Notes on Canvas Interfaces', [
    ['Authors', 'Ada Lovelace and Grace Hopper'],
    ['Site', 'Interface Review'],
    ['URL', 'https://example.org/canvas'],
  ]),
  // anonymous, title only -- the half-filled case that must still format
  source('node_bare', 'An Untitled Pamphlet', []),
];

const document: CanvasDocument = {
  schemaVersion: 2,
  id: 'doc_cite',
  name: 'Citation fixture',
  mode: 'universal',
  nodes,
  edges: [],
  wires: [],
  assemblies: [],
};

const styles: CitationStyle[] = ['apa', 'mla', 'chicago'];
const results = nodes.map((node) => {
  const record = sourceRecordOf(node);
  return {
    nodeId: node.id,
    record,
    formatted: Object.fromEntries(
      styles.map((style) => [style, formatCitation(record, style)]),
    ),
    inText: Object.fromEntries(
      styles.map((style) => [style, inTextCitation(record, style, '12')]),
    ),
  };
});

writeFileSync(
  join(process.cwd(), 'core/src/citation.golden.json'),
  JSON.stringify(
    {
      document,
      results,
      bibliography: Object.fromEntries(
        styles.map((style) => [style, bibliographyMarkdown(document, style)]),
      ),
    },
    null,
    2,
  ) + '\n',
);
console.log(`citation.golden.json regenerated: ${results.length} sources x ${styles.length} styles`);
