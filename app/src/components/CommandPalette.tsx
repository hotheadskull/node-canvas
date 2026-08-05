// Ctrl/Cmd+K: jump anywhere, or capture a thought without breaking flow.
// Typing filters nodes (fuzzy-ish: every word must appear in title/type);
// Enter jumps to the highlighted node; the last row always offers "capture
// as a note in the Workbench" with whatever was typed.
//
// The Tauri global-shortcut capture window (works while the app is in the
// background) lands when the Tauri shell chunk wires the desktop build.

import { useReactFlow } from '@xyflow/react';
import { CornerDownLeft, FileDown, Inbox, Search } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { getNodeDef, nodeLabel, stripHtml } from '@node-canvas/core';
import { useCanvasStore } from '../store/canvasStore';

type PaletteCommand = { id: string; label: string; run: () => unknown };

export function matchesQuery(haystack: string, query: string): boolean {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const text = haystack.toLowerCase();
  return words.every((word) => text.includes(word));
}

export function CommandPalette() {
  const document_ = useCanvasStore((state) => state.document);
  const paletteOpen = useCanvasStore((state) => state.paletteOpen);
  const setPaletteOpen = useCanvasStore((state) => state.setPaletteOpen);
  const capture = useCanvasStore((state) => state.capture);
  const { setCenter } = useReactFlow();
  const [query, setQuery] = useState('');
  const [highlighted, setHighlighted] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setPaletteOpen(!useCanvasStore.getState().paletteOpen);
        setQuery('');
        setHighlighted(0);
      }
      if (event.key === 'Escape' && useCanvasStore.getState().paletteOpen) {
        setPaletteOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setPaletteOpen]);

  useEffect(() => {
    if (paletteOpen) inputRef.current?.focus();
  }, [paletteOpen]);

  const matches = useMemo(() => {
    if (query.trim() === '') return document_.nodes.slice(0, 8);
    return document_.nodes
      .filter((node) => {
        const title = typeof node.data.title === 'string' ? node.data.title : '';
        const content = typeof node.data.content === 'string' ? stripHtml(node.data.content) : '';
        const kind = getNodeDef(node.type)?.labels.universal ?? node.type;
        return matchesQuery(`${title} ${kind} ${content}`, query);
      })
      .slice(0, 8);
  }, [document_.nodes, query]);

  // Project/export commands surface only once the user types -- the empty
  // palette stays a jump list. Compile-face nodes each offer their own
  // Markdown/plain-text export, named by title.
  const commands = useMemo<PaletteCommand[]>(() => {
    if (query.trim() === '') return [];
    const store = useCanvasStore.getState();
    const list: PaletteCommand[] = [
      { id: 'project-new', label: 'New canvas', run: () => store.newProject() },
      { id: 'project-open', label: 'Open project…', run: () => store.openProject() },
      { id: 'project-save', label: 'Save project', run: () => store.saveProject() },
      { id: 'project-save-as', label: 'Save project as…', run: () => store.saveProjectAs() },
      { id: 'export-png', label: 'Export canvas as PNG', run: () => store.exportCanvasImage('png') },
      { id: 'export-svg', label: 'Export canvas as SVG', run: () => store.exportCanvasImage('svg') },
    ];
    for (const node of document_.nodes) {
      const def = getNodeDef(node.type);
      if (!def?.ports.some((port) => port.spine)) continue;
      const title = typeof node.data.title === 'string' && node.data.title !== ''
        ? node.data.title
        : 'Untitled';
      list.push({
        id: `export-md-${node.id}`,
        label: `Export "${title}" as Markdown`,
        run: () => store.exportNode(node.id, 'markdown'),
      });
      list.push({
        id: `export-txt-${node.id}`,
        label: `Export "${title}" as plain text`,
        run: () => store.exportNode(node.id, 'text'),
      });
    }
    return list.filter((command) => matchesQuery(command.label, query)).slice(0, 6);
  }, [document_.nodes, query]);

  // rows: matches, commands, then the capture action (always when typed)
  const rowCount = matches.length + commands.length + (query.trim() !== '' ? 1 : 0);

  const jumpTo = (nodeId: string) => {
    const node = document_.nodes.find((candidate) => candidate.id === nodeId);
    if (!node) return;
    const width = node.size?.width ?? 300;
    const height = node.size?.height ?? 200;
    // jumping is the explicit action the user asked for (I5-compatible)
    void setCenter(node.position.x + width / 2, node.position.y + height / 2, {
      zoom: 1,
      duration: 350,
    });
    setPaletteOpen(false);
  };

  const doCapture = () => {
    if (query.trim() === '') return;
    capture(query.trim());
    setPaletteOpen(false);
  };

  const runCommand = (command: PaletteCommand) => {
    setPaletteOpen(false);
    void command.run();
  };

  const activate = (index: number) => {
    if (index < matches.length) jumpTo(matches[index]!.id);
    else if (index < matches.length + commands.length) {
      runCommand(commands[index - matches.length]!);
    } else doCapture();
  };

  if (!paletteOpen) return null;

  return (
    <div className="palette-backdrop" data-palette onClick={() => setPaletteOpen(false)}>
      <div className="palette" onClick={(event) => event.stopPropagation()}>
        <div className="palette-input-row">
          <Search size={14} aria-hidden />
          <input
            ref={inputRef}
            className="palette-input"
            value={query}
            placeholder="Jump to anything, or type a thought to capture…"
            onChange={(event) => {
              setQuery(event.target.value);
              setHighlighted(0);
            }}
            onKeyDown={(event) => {
              if (event.key === 'ArrowDown') {
                event.preventDefault();
                setHighlighted((index) => Math.min(index + 1, rowCount - 1));
              } else if (event.key === 'ArrowUp') {
                event.preventDefault();
                setHighlighted((index) => Math.max(index - 1, 0));
              } else if (event.key === 'Enter' && rowCount > 0) {
                activate(highlighted);
              }
            }}
          />
        </div>
        <ul className="palette-results">
          {matches.map((node, index) => {
            const def = getNodeDef(node.type);
            const title = typeof node.data.title === 'string' && node.data.title !== ''
              ? node.data.title
              : 'Untitled';
            return (
              <li key={node.id}>
                <button
                  className={`palette-row ${index === highlighted ? 'is-highlighted' : ''}`}
                  onMouseEnter={() => setHighlighted(index)}
                  onClick={() => jumpTo(node.id)}
                >
                  <span className="palette-row-dot" style={{ background: def?.accent }} />
                  <span className="palette-row-title">{title}</span>
                  <span className="palette-row-kind">
                    {def ? nodeLabel(def.type, 'universal') : node.type}
                  </span>
                </button>
              </li>
            );
          })}
          {commands.map((command, commandIndex) => {
            const index = matches.length + commandIndex;
            return (
              <li key={command.id}>
                <button
                  className={`palette-row ${index === highlighted ? 'is-highlighted' : ''}`}
                  onMouseEnter={() => setHighlighted(index)}
                  onClick={() => runCommand(command)}
                >
                  <FileDown size={13} aria-hidden />
                  <span className="palette-row-title">{command.label}</span>
                </button>
              </li>
            );
          })}
          {query.trim() !== '' && (
            <li>
              <button
                className={`palette-row palette-capture ${highlighted === matches.length + commands.length ? 'is-highlighted' : ''}`}
                onMouseEnter={() => setHighlighted(matches.length + commands.length)}
                onClick={doCapture}
              >
                <Inbox size={13} aria-hidden />
                <span className="palette-row-title">
                  Capture “{query.trim()}” in the Workbench
                </span>
                <CornerDownLeft size={12} aria-hidden />
              </button>
            </li>
          )}
          {rowCount === 0 && <li className="palette-empty">Nothing here yet — type to capture.</li>}
        </ul>
      </div>
    </div>
  );
}
