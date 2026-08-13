// ============================================================================
// CITATIONS -- turning a Source node into a formatted reference.
//
// Built for the physics-papers user (design direction, question 12: "50 tabs
// open ... doesn't want to lose information"). The point is not a complete
// CSL implementation; it is that a source typed once comes back correctly
// formatted in whichever style the assignment demands, and that a paper can
// emit its own bibliography without the writer retyping anything.
//
// Everything reads from the node's CUSTOM FIELDS, the same place the plate's
// field editor writes, so there is no parallel citation store to drift.
// Fields are matched case-insensitively by name and every one is optional --
// a half-filled source still formats, just with less in it. A citation that
// silently refuses to render would be worse than one missing its issue
// number.
// ============================================================================

import type { CanvasDocument, CanvasNode, CustomField } from './schema';

export type CitationStyle = 'apa' | 'mla' | 'chicago';

export const CITATION_STYLES: { id: CitationStyle; label: string }[] = [
  { id: 'apa', label: 'APA 7th' },
  { id: 'mla', label: 'MLA 9th' },
  { id: 'chicago', label: 'Chicago' },
];

/** What a Source can carry. Every field optional -- see the header. */
export type SourceRecord = {
  authors: string;
  title: string;
  /** Journal, book, or site the work sits inside. */
  container: string;
  publisher: string;
  year: string;
  volume: string;
  issue: string;
  pages: string;
  edition: string;
  url: string;
  doi: string;
  accessed: string;
};

const FIELD_ALIASES: Record<keyof SourceRecord, string[]> = {
  authors: ['authors', 'author', 'by'],
  title: ['title', 'name'],
  container: ['container', 'journal', 'publication', 'site', 'book', 'in'],
  publisher: ['publisher', 'press'],
  year: ['year', 'date', 'published'],
  volume: ['volume', 'vol'],
  issue: ['issue', 'no', 'number'],
  pages: ['pages', 'page', 'pp'],
  edition: ['edition', 'ed'],
  url: ['url', 'link', 'address'],
  doi: ['doi'],
  accessed: ['accessed', 'retrieved'],
};

function fieldValue(fields: CustomField[], names: string[]): string {
  for (const name of names) {
    const found = fields.find((field) => field.name.trim().toLowerCase() === name);
    if (found === undefined) continue;
    const raw = Array.isArray(found.value) ? found.value.join(', ') : String(found.value ?? '');
    if (raw.trim() !== '') return raw.trim();
  }
  return '';
}

/**
 * Read a Source node into a citation record. Falls back to the node's title
 * when no Title field was filled -- the plate's own heading is what the user
 * already typed, and asking them to type it twice is the kind of friction
 * that makes people keep using tabs instead.
 */
export function sourceRecordOf(node: CanvasNode): SourceRecord {
  const fields = (node.data.fields ?? []) as CustomField[];
  const record = {} as SourceRecord;
  for (const key of Object.keys(FIELD_ALIASES) as (keyof SourceRecord)[]) {
    record[key] = fieldValue(fields, FIELD_ALIASES[key]);
  }
  if (record.title === '') {
    const title = node.data['title'];
    record.title = typeof title === 'string' ? title.trim() : '';
  }
  return record;
}

// ---- authors ---------------------------------------------------------------

type Name = { last: string; first: string };

/**
 * Split a typed author string into names. Accepts what people actually
 * type: semicolons, " and ", or " & " between authors, and either
 * "Last, First" or "First Last" for each one.
 */
export function parseAuthors(input: string): Name[] {
  if (input.trim() === '') return [];
  return input
    .split(/;| and | & /i)
    .map((part) => part.trim())
    .filter((part) => part !== '')
    .map((part) => {
      if (part.includes(',')) {
        const [last = '', first = ''] = part.split(',', 2).map((piece) => piece.trim());
        return { last, first };
      }
      const pieces = part.split(/\s+/);
      if (pieces.length === 1) return { last: pieces[0]!, first: '' };
      return { last: pieces[pieces.length - 1]!, first: pieces.slice(0, -1).join(' ') };
    });
}

/** "Jane Q. Public" -> "J. Q." */
function initials(first: string): string {
  return first
    .split(/\s+/)
    .filter((piece) => piece !== '')
    .map((piece) => `${piece[0]!.toUpperCase()}.`)
    .join(' ');
}

/**
 * Bibliography author lists ALWAYS take a comma before the final
 * conjunction, including the two-name case: the leading name is inverted
 * and already contains a comma, so "Lovelace, Ada, and Grace Hopper" is
 * what keeps the boundary between two people readable.
 */
function joinList(parts: string[], finalJoiner: string): string {
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0]!;
  return `${parts.slice(0, -1).join(', ')}, ${finalJoiner} ${parts[parts.length - 1]}`;
}

/**
 * In-text lists use BARE surnames, so the inversion comma does not apply:
 * "(Lovelace & Hopper, 2024)", not "(Lovelace, & Hopper, 2024)".
 */
function joinPlain(parts: string[], finalJoiner: string): string {
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0]!;
  if (parts.length === 2) return `${parts[0]} ${finalJoiner} ${parts[1]}`;
  return `${parts.slice(0, -1).join(', ')} ${finalJoiner} ${parts[parts.length - 1]}`;
}

function authorsFor(style: CitationStyle, names: Name[]): string {
  if (names.length === 0) return '';
  if (style === 'apa') {
    // APA: every author inverted, initials only, ampersand before the last
    const parts = names.map((name) =>
      name.first ? `${name.last}, ${initials(name.first)}` : name.last,
    );
    return joinList(parts, '&');
  }
  // MLA and Chicago invert ONLY the first author and spell names out
  const [first, ...rest] = names;
  const head = first!.first ? `${first!.last}, ${first!.first}` : first!.last;
  if (rest.length === 0) return head;
  if (style === 'mla' && rest.length > 1) return `${head}, et al.`;
  const tail = rest.map((name) => (name.first ? `${name.first} ${name.last}` : name.last));
  return joinList([head, ...tail], 'and');
}

// ---- formatting ------------------------------------------------------------

/** Join non-empty pieces with a separator, so missing fields leave no gaps. */
function join(pieces: (string | undefined)[], separator: string): string {
  return pieces.filter((piece) => piece !== undefined && piece.trim() !== '').join(separator);
}

/** Titles are wrapped, not styled -- the caller decides italics vs quotes. */
function ensureStop(text: string): string {
  if (text === '') return '';
  return /[.!?]$/.test(text) ? text : `${text}.`;
}

/**
 * Format one source. `italic` wraps the work's title (a journal or book
 * name) so callers can emit markdown asterisks, HTML <em>, or nothing at
 * all for plain text.
 */
export function formatCitation(
  record: SourceRecord,
  style: CitationStyle,
  italic: (text: string) => string = (text) => text,
): string {
  // A source with neither a title nor an author has nothing to cite yet.
  // Formatting it anyway produced a bare "(n.d.)." in the reference list --
  // which reads like a defect. Callers show their own "needs details"
  // prompt instead, and bibliographies simply skip it.
  if (record.title.trim() === '' && record.authors.trim() === '') return '';

  const names = parseAuthors(record.authors);
  const author = authorsFor(style, names);
  const year = record.year || 'n.d.';
  // an article sits inside a container; a book stands alone
  const isArticle = record.container !== '';
  const locator = record.doi !== '' ? `https://doi.org/${record.doi.replace(/^https?:\/\/doi\.org\//, '')}` : record.url;

  // The work's own title: quoted when it sits inside a container, italic
  // when it stands alone. A book's edition rides WITH the title in
  // parentheses -- "Title (2nd ed.)." -- never as a sentence of its own.
  const bare = isArticle ? record.title : italic(record.title);
  const titled =
    !isArticle && record.edition !== '' ? `${bare} (${record.edition})` : bare;
  // Quoted titles carry their stop INSIDE the quotes, so they are already
  // terminated -- running ensureStop over them again produced `."`.`
  const quoted =
    isArticle && style !== 'apa' ? `"${ensureStop(record.title)}"` : ensureStop(titled);

  // With NO author, the title takes the author's place at the front of the
  // entry -- all three manuals do this, and leading with a bare "(n.d.)."
  // reads as a bug.
  const anonymous = author === '';

  if (style === 'apa') {
    const volumeIssue = join(
      [record.volume ? italic(record.volume) : '', record.issue ? `(${record.issue})` : ''],
      '',
    );
    const tail = isArticle
      ? join([italic(record.container), volumeIssue, record.pages], ', ')
      : record.publisher;
    return join(
      anonymous
        ? [ensureStop(titled), `(${year}).`, ensureStop(tail), locator]
        : [ensureStop(author), `(${year}).`, ensureStop(titled), ensureStop(tail), locator],
      ' ',
    ).trim();
  }

  if (style === 'mla') {
    const tail = isArticle
      ? join(
          [
            italic(record.container),
            record.volume ? `vol. ${record.volume}` : '',
            record.issue ? `no. ${record.issue}` : '',
            year,
            record.pages ? `pp. ${record.pages}` : '',
          ],
          ', ',
        )
      : join([record.publisher, year], ', ');
    return join(
      [anonymous ? "" : ensureStop(author), quoted, ensureStop(tail), locator],
      ' ',
    ).trim();
  }

  // Chicago, bibliography entry
  const tail = isArticle
    ? join(
        [
          italic(record.container),
          join([record.volume, record.issue ? `no. ${record.issue}` : ''], ', '),
          `(${year})`,
          record.pages ? `: ${record.pages}` : '',
        ],
        ' ',
      ).replace(' :', ':')
    : join([record.publisher, year], ', ');
  return join(
    [anonymous ? "" : ensureStop(author), quoted, ensureStop(tail), locator],
    ' ',
  ).trim();
}

/** A short in-text pointer: (Ironscribe, 2024) / (Ironscribe 12). */
export function inTextCitation(
  record: SourceRecord,
  style: CitationStyle,
  page?: string,
): string {
  const names = parseAuthors(record.authors);
  const lead =
    names.length === 0
      ? record.title
      : names.length > 2
        ? `${names[0]!.last} et al.`
        : joinPlain(names.map((name) => name.last), style === 'apa' ? '&' : 'and');
  if (style === 'apa') {
    return `(${join([lead, record.year || 'n.d.', page ? `p. ${page}` : ''], ', ')})`;
  }
  // MLA and Chicago author-page
  return `(${join([lead, page ?? ''], ' ')})`;
}

// ---- bibliography ----------------------------------------------------------

/** Every Source node in the document, in bibliography order. */
export function bibliographyEntries(
  document: CanvasDocument,
  style: CitationStyle,
  italic?: (text: string) => string,
): { nodeId: string; text: string }[] {
  return document.nodes
    .filter((node) => node.type === 'source')
    .map((node) => ({
      nodeId: node.id,
      record: sourceRecordOf(node),
    }))
    .map((entry) => ({
      nodeId: entry.nodeId,
      // sort key is the leading author (or title for anonymous works)
      sortKey: (parseAuthors(entry.record.authors)[0]?.last || entry.record.title).toLowerCase(),
      text: formatCitation(entry.record, style, italic),
    }))
    .filter((entry) => entry.text !== '')
    .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
    .map(({ nodeId, text }) => ({ nodeId, text }));
}

/**
 * Everything hanging off a source: the quotes taken from it, the notes
 * written about it, the claims it supports. Reads BOTH plain relationships
 * and typed wires, because under the 2026-08-12 direction a connection may
 * be either and the library must not care which.
 */
export function attachedTo(
  document: CanvasDocument,
  sourceId: string,
): { id: string; type: string; title: string; excerpt: string }[] {
  const neighbours = new Set<string>();
  for (const edge of document.edges) {
    if (edge.source === sourceId) neighbours.add(edge.target);
    if (edge.target === sourceId) neighbours.add(edge.source);
  }
  for (const wire of document.wires) {
    if (wire.status !== 'live') continue;
    if (wire.source === sourceId) neighbours.add(wire.target);
    if (wire.target === sourceId) neighbours.add(wire.source);
  }
  return document.nodes
    .filter((node) => neighbours.has(node.id))
    .map((node) => {
      const title = typeof node.data['title'] === 'string' ? node.data['title'].trim() : '';
      const content = typeof node.data['content'] === 'string' ? node.data['content'] : '';
      return {
        id: node.id,
        type: node.type,
        title,
        // a short readable line, so the library shows what was taken, not
        // just that something was
        excerpt: content
          .replace(/<[^>]*>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 240),
      };
    });
}

/** The reference list as markdown, ready to append to an exported document. */
export function bibliographyMarkdown(
  document: CanvasDocument,
  style: CitationStyle,
): string {
  const entries = bibliographyEntries(document, style, (text) => `*${text}*`);
  if (entries.length === 0) return '';
  const heading = style === 'mla' ? 'Works Cited' : 'References';
  return `## ${heading}\n\n${entries.map((entry) => entry.text).join('\n\n')}\n`;
}
