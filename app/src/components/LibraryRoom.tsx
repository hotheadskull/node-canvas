// THE LIBRARY -- every source in one place, with what you took from each.
//
// Built for the problem in the design direction's question 12: "he doesn't
// want 50 tabs open, but something that can hold all his sources easily
// without having to tab all over the place or lose information." The canvas
// is where sources live spatially; this is where they live as a LIST, which
// is what you need when the question is "what have I actually got?"
//
// Nothing here edits a document. It reads, formats, and gets out of the way:
// switch citation style, copy one reference or the whole bibliography, click
// a source to fly to it on the canvas.

import {
  attachedTo,
  bibliographyEntries,
  bibliographyMarkdown,
  CITATION_STYLES,
  formatCitation,
  sourceRecordOf,
  type CitationStyle,
} from '@node-canvas/core';
import { Check, Copy, FileText, Library, Quote as QuoteIcon, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useCanvasStore } from '../store/canvasStore';

/** Copy helper that degrades to a no-op rather than throwing in a webview. */
async function copy(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function LibraryRoom() {
  const open = useCanvasStore((state) => state.libraryOpen);
  const setOpen = useCanvasStore((state) => state.setLibraryOpen);
  const document = useCanvasStore((state) => state.document);
  const style = useCanvasStore((state) => state.citationStyle);
  const setStyle = useCanvasStore((state) => state.setCitationStyle);
  const [copied, setCopied] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const sources = useMemo(() => {
    if (!open) return [];
    return document.nodes
      .filter((node) => node.type === 'source')
      .map((node) => {
        const record = sourceRecordOf(node);
        return {
          id: node.id,
          record,
          citation: formatCitation(record, style),
          attached: attachedTo(document, node.id),
        };
      })
      .sort((a, b) => a.citation.localeCompare(b.citation));
  }, [document, style, open]);

  const shown = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (needle === '') return sources;
    return sources.filter(
      (source) =>
        source.citation.toLowerCase().includes(needle) ||
        source.attached.some(
          (item) =>
            item.title.toLowerCase().includes(needle) ||
            item.excerpt.toLowerCase().includes(needle),
        ),
    );
  }, [sources, query]);

  if (!open) return null;

  const flash = (key: string) => {
    setCopied(key);
    window.setTimeout(() => setCopied((current) => (current === key ? null : current)), 1400);
  };

  const totalClips = sources.reduce((sum, source) => sum + source.attached.length, 0);

  return (
    <div className="room-overlay library-room" role="dialog" aria-label="Library" data-library-room>
      <header className="library-head">
        <Library size={16} aria-hidden className="library-head-icon" />
        <h2 className="library-title">Library</h2>
        <span className="library-count" data-library-count>
          {sources.length} {sources.length === 1 ? 'source' : 'sources'}
          {totalClips > 0 ? ` · ${totalClips} attached` : ''}
        </span>

        <input
          className="library-search nodrag"
          type="search"
          placeholder="Search sources and quotes…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          aria-label="Search the library"
        />

        <span className="library-styles" role="radiogroup" aria-label="Citation style">
          {CITATION_STYLES.map((option) => (
            <button
              key={option.id}
              role="radio"
              aria-checked={style === option.id}
              className={style === option.id ? 'is-active' : ''}
              onClick={() => setStyle(option.id as CitationStyle)}
            >
              {option.label}
            </button>
          ))}
        </span>

        <button
          className="library-action"
          disabled={sources.length === 0}
          onClick={async () => {
            if (await copy(bibliographyMarkdown(document, style))) flash('all');
          }}
          title="Copy the whole reference list as markdown"
        >
          {copied === 'all' ? <Check size={12} aria-hidden /> : <Copy size={12} aria-hidden />}
          {copied === 'all' ? 'Copied' : 'Copy bibliography'}
        </button>
        <button className="library-close" aria-label="Close library" onClick={() => setOpen(false)}>
          <X size={16} aria-hidden />
        </button>
      </header>

      <div className="library-body">
        {sources.length === 0 && (
          <p className="library-empty">
            No sources yet. Drop a PDF onto the canvas, or add a Source node and fill in
            its author, title and year — everything here formats itself from those.
          </p>
        )}
        {sources.length > 0 && shown.length === 0 && (
          <p className="library-empty">Nothing matches “{query}”.</p>
        )}

        {shown.map((source) => (
          <article className="library-entry" key={source.id} data-source-entry={source.id}>
            <div className="library-entry-head">
              {/* A source with no title and no author cannot be cited yet;
                  say so plainly rather than printing a hollow "(n.d.)." */}
              {source.citation === '' ? (
                <p className="library-citation is-incomplete">
                  Untitled source — add an author, title and year and it will format here.
                </p>
              ) : (
                <p className="library-citation">{source.citation}</p>
              )}
              <button
                className="library-action is-quiet"
                disabled={source.citation === ''}
                onClick={async () => {
                  if (await copy(source.citation)) flash(source.id);
                }}
                title="Copy this reference"
                aria-label="Copy this reference"
              >
                {copied === source.id ? <Check size={12} aria-hidden /> : <Copy size={12} aria-hidden />}
              </button>
            </div>

            {source.record.url !== '' && (
              <a className="library-link" href={source.record.url} target="_blank" rel="noreferrer">
                {source.record.url}
              </a>
            )}

            {source.attached.length > 0 && (
              <ul className="library-clips">
                {source.attached.map((item) => (
                  <li key={item.id} className={`library-clip is-${item.type}`}>
                    {item.type === 'quote' ? (
                      <QuoteIcon size={11} aria-hidden />
                    ) : (
                      <FileText size={11} aria-hidden />
                    )}
                    <span className="library-clip-body">
                      {item.title !== '' && <b>{item.title}</b>}
                      {item.excerpt !== '' && <span>{item.excerpt}</span>}
                      {item.title === '' && item.excerpt === '' && (
                        <span className="is-empty">(empty {item.type})</span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </article>
        ))}
      </div>

      {sources.length > 0 && (
        <footer className="library-foot">
          <span>
            {bibliographyEntries(document, style).length} formatted in{' '}
            {CITATION_STYLES.find((option) => option.id === style)?.label}
          </span>
          <span className="library-foot-hint">
            Exports of any document can append this list automatically.
          </span>
        </footer>
      )}
    </div>
  );
}
