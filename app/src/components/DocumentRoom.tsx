// The Document's earned fullscreen: the SAME blocks editor, given the whole
// screen (user decision: no unique shape -- the document earns the room).
// Esc or backdrop returns to the canvas; everything edits the real document.

import { compileBlocks, wordCount } from '@node-canvas/core';
import { Minimize2 } from 'lucide-react';
import { useEffect } from 'react';
import { useCanvasStore } from '../store/canvasStore';
import { BlocksEditor } from './faces/BlocksFace';

export function DocumentRoom() {
  const document_ = useCanvasStore((state) => state.document);
  const docRoomId = useCanvasStore((state) => state.docRoomId);
  const openDocRoom = useCanvasStore((state) => state.openDocRoom);
  const setNodeTitle = useCanvasStore((state) => state.setNodeTitle);

  const node = document_.nodes.find((candidate) => candidate.id === docRoomId);

  useEffect(() => {
    if (!node) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') openDocRoom(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [node, openDocRoom]);

  if (!node) return null;
  const title = typeof node.data.title === 'string' ? node.data.title : '';
  const compiled = compileBlocks(document_, node.id);

  return (
    <div className="focus-backdrop" data-doc-room onClick={() => openDocRoom(null)}>
      <div className="focus-room doc-room" onClick={(event) => event.stopPropagation()}>
        <header className="focus-header">
          <input
            className="focus-title"
            value={title}
            placeholder="Untitled"
            onChange={(event) => setNodeTitle(node.id, event.target.value)}
          />
          <span className="focus-meta">{wordCount(compiled.text)} words</span>
          <button
            className="focus-close"
            aria-label="Back to canvas (Esc)"
            onClick={() => openDocRoom(null)}
          >
            <Minimize2 size={16} aria-hidden />
          </button>
        </header>
        <div className="doc-room-scroll">
          <BlocksEditor docId={node.id} inRoom />
        </div>
      </div>
    </div>
  );
}
