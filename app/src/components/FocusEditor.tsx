// Design B: the focus overlay. Double-click a writing node and get a real
// writing room -- serif type, live word count, Esc back to the canvas, and
// ArrowLeft/ArrowRight walk the spine siblings in wire order.

import { spineWiresInto, wordCount } from '@node-canvas/core';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useCallback, useEffect, useMemo } from 'react';
import { getNodeDef, nodeLabel } from '@node-canvas/core';
import { CLOSED_DOCUMENT, useCanvasStore } from '../store/canvasStore';
import { RichText } from './RichText';

export function FocusEditor() {
  // Closed editor = zero cost (see CLOSED_DOCUMENT)
  const document_ = useCanvasStore((state) =>
    state.editorNodeId === null ? CLOSED_DOCUMENT : state.document,
  );
  const editorNodeId = useCanvasStore((state) => state.editorNodeId);
  const openEditor = useCanvasStore((state) => state.openEditor);
  const setNodeContent = useCanvasStore((state) => state.setNodeContent);
  const setNodeTitle = useCanvasStore((state) => state.setNodeTitle);
  const setOwner = useCanvasStore((state) => state.setOwner);

  const node = document_.nodes.find((candidate) => candidate.id === editorNodeId);

  // Spine siblings: the other sources feeding the same intake, in wire order.
  const siblings = useMemo(() => {
    if (!node) return [];
    const parentWire = document_.wires.find(
      (wire) => wire.source === node.id && wire.status === 'live',
    );
    if (!parentWire) return [];
    return spineWiresInto(document_, parentWire.target).map((wire) => wire.source);
  }, [document_, node]);
  const index = node ? siblings.indexOf(node.id) : -1;

  const go = useCallback(
    (direction: -1 | 1) => {
      if (index === -1) return;
      const next = siblings[index + direction];
      if (next) openEditor(next);
    },
    [index, siblings, openEditor],
  );

  useEffect(() => {
    if (!node) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') openEditor(null);
      // Alt+arrows so plain arrows keep moving the text caret
      if (event.altKey && event.key === 'ArrowLeft') go(-1);
      if (event.altKey && event.key === 'ArrowRight') go(1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [node, openEditor, go]);

  if (!node) return null;
  const def = getNodeDef(node.type);
  const content = typeof node.data.content === 'string' ? node.data.content : '';
  const title = typeof node.data.title === 'string' ? node.data.title : '';

  return (
    <div className="focus-backdrop" data-focus-editor onClick={() => openEditor(null)}>
      <div className="focus-room" onClick={(event) => event.stopPropagation()}>
        <header className="focus-header">
          <span className="focus-kind" style={{ color: def?.accent }}>
            {def ? nodeLabel(def.type, 'universal') : node.type}
          </span>
          <input
            className="focus-title"
            value={title}
            placeholder="Untitled"
            onChange={(event) => setNodeTitle(node.id, event.target.value)}
          />
          <input
            className="focus-owner"
            value={typeof node.data['owner'] === 'string' ? node.data['owner'] : ''}
            placeholder="owner…"
            title="Who this piece is waiting on (groups roll it up)"
            onChange={(event) => setOwner(node.id, event.target.value)}
          />
          <span className="focus-meta">{wordCount(content)} words</span>
          <button className="focus-close" aria-label="Back to canvas (Esc)" onClick={() => openEditor(null)}>
            <X size={16} aria-hidden />
          </button>
        </header>
        <RichText
          key={node.id}
          value={content}
          onChange={(html) => setNodeContent(node.id, html)}
          placeholder="Write…"
          variant="focus"
          autoFocus
        />
        {siblings.length > 1 && index !== -1 && (
          <footer className="focus-footer">
            <button disabled={index === 0} onClick={() => go(-1)} aria-label="Previous in spine (Alt+←)">
              <ChevronLeft size={14} aria-hidden /> prev
            </button>
            <span>
              {index + 1} / {siblings.length} in spine
            </span>
            <button
              disabled={index === siblings.length - 1}
              onClick={() => go(1)}
              aria-label="Next in spine (Alt+→)"
            >
              next <ChevronRight size={14} aria-hidden />
            </button>
          </footer>
        )}
      </div>
    </div>
  );
}
