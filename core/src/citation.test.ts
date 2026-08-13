import { describe, expect, it } from 'vitest';
import golden from './citation.golden.json';
import {
  bibliographyEntries,
  bibliographyMarkdown,
  formatCitation,
  inTextCitation,
  parseAuthors,
  sourceRecordOf,
  type CitationStyle,
} from './citation';
import type { CanvasDocument, CanvasNode } from './schema';

const document = golden.document as unknown as CanvasDocument;
const styles: CitationStyle[] = ['apa', 'mla', 'chicago'];

// A citation that is subtly wrong is worse than one that is missing: it
// ships into someone's coursework. The golden pins every style for every
// fixture source, so a formatting change has to be looked at on purpose.
describe('citations (golden)', () => {
  it('every source still formats identically in all three styles', () => {
    for (const record of golden.results) {
      const node = document.nodes.find((candidate) => candidate.id === record.nodeId)!;
      const parsed = sourceRecordOf(node);
      expect(parsed, record.nodeId).toEqual(record.record);
      for (const style of styles) {
        expect(formatCitation(parsed, style), `${record.nodeId} ${style}`).toBe(
          record.formatted[style as keyof typeof record.formatted],
        );
        expect(inTextCitation(parsed, style, '12'), `${record.nodeId} ${style} in-text`).toBe(
          record.inText[style as keyof typeof record.inText],
        );
      }
    }
  });

  it('bibliographies match the pinned markdown', () => {
    for (const style of styles) {
      expect(bibliographyMarkdown(document, style)).toBe(
        golden.bibliography[style as keyof typeof golden.bibliography],
      );
    }
  });
});

describe('author parsing takes what people actually type', () => {
  it('accepts semicolons, "and", and "&" between names', () => {
    expect(parseAuthors('Hawking, Stephen; Penrose, Roger')).toHaveLength(2);
    expect(parseAuthors('Ada Lovelace and Grace Hopper')).toHaveLength(2);
    expect(parseAuthors('Ada Lovelace & Grace Hopper')).toHaveLength(2);
  });

  it('reads both "Last, First" and "First Last"', () => {
    expect(parseAuthors('Kuhn, Thomas S.')[0]).toEqual({ last: 'Kuhn', first: 'Thomas S.' });
    expect(parseAuthors('Thomas S. Kuhn')[0]).toEqual({ last: 'Kuhn', first: 'Thomas S.' });
  });

  it('survives a single mononym', () => {
    expect(parseAuthors('Aristotle')[0]).toEqual({ last: 'Aristotle', first: '' });
  });
});

describe('the rules that bite in real papers', () => {
  const record = (fields: Record<string, string>) =>
    sourceRecordOf({
      id: 'n',
      type: 'source',
      position: { x: 0, y: 0 },
      data: {
        title: '',
        fields: Object.entries(fields).map(([name, value]) => ({
          id: name,
          name,
          type: 'text' as const,
          value,
        })),
      },
    } as CanvasNode);

  it('two authors keep the comma before the conjunction', () => {
    const two = record({ Authors: 'Lovelace, Ada; Hopper, Grace', Title: 'X', Publisher: 'P', Year: '2020' });
    expect(formatCitation(two, 'apa')).toContain('Lovelace, A., & Hopper, G.');
    expect(formatCitation(two, 'mla')).toContain('Lovelace, Ada, and Grace Hopper');
  });

  it('but an in-text pointer does NOT (bare surnames, no inversion)', () => {
    const two = record({ Authors: 'Lovelace, Ada; Hopper, Grace', Title: 'X', Year: '2020' });
    expect(inTextCitation(two, 'apa')).toBe('(Lovelace & Hopper, 2020)');
    expect(inTextCitation(two, 'mla', '7')).toBe('(Lovelace and Hopper 7)');
  });

  it('three or more authors collapse to et al. in text', () => {
    const many = record({ Authors: 'A, One; B, Two; C, Three', Title: 'X', Year: '1999' });
    expect(inTextCitation(many, 'apa')).toBe('(A et al., 1999)');
  });

  it('a quoted title is not double-punctuated', () => {
    const article = record({ Authors: 'Kuhn, Thomas', Title: 'On Paradigms', Journal: 'Mind', Year: '1962' });
    expect(formatCitation(article, 'mla')).toContain('"On Paradigms."');
    expect(formatCitation(article, 'mla')).not.toContain('".');
  });

  it('an edition rides with the title, not as its own sentence', () => {
    const book = record({ Authors: 'Kuhn, Thomas', Title: 'Structure', Edition: '2nd ed.', Publisher: 'UCP', Year: '1962' });
    expect(formatCitation(book, 'apa')).toContain('Structure (2nd ed.). UCP.');
  });

  it('with no author the TITLE leads -- never a bare "(n.d.)"', () => {
    const anon = record({ Title: 'A Pamphlet' });
    for (const style of styles) {
      expect(formatCitation(anon, style).startsWith('A Pamphlet'), style).toBe(true);
    }
  });

  it('a missing year becomes n.d. rather than an empty gap', () => {
    const undated = record({ Authors: 'Kuhn, Thomas', Title: 'X', Publisher: 'P' });
    expect(formatCitation(undated, 'apa')).toContain('(n.d.)');
  });

  it('a DOI wins over a bare URL and is normalised to a link', () => {
    const both = record({ Title: 'X', DOI: '10.1/abc', URL: 'https://example.org' });
    expect(formatCitation(both, 'apa')).toContain('https://doi.org/10.1/abc');
    expect(formatCitation(both, 'apa')).not.toContain('example.org');
  });

  it('an already-linkified DOI is not double-prefixed', () => {
    const linky = record({ Title: 'X', DOI: 'https://doi.org/10.1/abc' });
    expect(formatCitation(linky, 'apa')).toContain('https://doi.org/10.1/abc');
    expect(formatCitation(linky, 'apa')).not.toContain('doi.org/https');
  });

  it('a source with nothing but a title still produces something usable', () => {
    expect(formatCitation(record({ Title: 'Untitled' }), 'apa')).toBe('Untitled. (n.d.).');
  });

  it('field names are matched loosely (Journal, Publication, Site all work)', () => {
    for (const name of ['Journal', 'Publication', 'Site', 'Container']) {
      const r = record({ Title: 'T', [name]: 'The Container', Year: '2020' });
      expect(formatCitation(r, 'apa'), name).toContain('The Container');
    }
  });

  it('bibliography sorts by leading author surname', () => {
    const entries = bibliographyEntries(document, 'apa');
    const keys = entries.map((entry) => entry.text.slice(0, 6).toLowerCase());
    expect([...keys]).toEqual([...keys].sort());
  });

  it('an empty document produces no reference list at all', () => {
    const empty = { ...document, nodes: [] };
    expect(bibliographyMarkdown(empty, 'apa')).toBe('');
  });
});
