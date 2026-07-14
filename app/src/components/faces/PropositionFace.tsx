// Proposition face (sermon pack, user-picked design A): a slim statement
// card -- a verse-reference chip and the assertion itself. Arcs to other
// propositions are wires (their relationship rides the wire chip); the Arc
// group face and Arc room derive the outline. Same auto-fit mirror rule as
// the default face (rule 13: measure the mirror, never the flexing body).

import { stripHtml } from '@node-canvas/core';
import { useEffect, useRef } from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import { RichText } from '../RichText';
import type { FaceProps } from './index';

export function PropositionFace({ nodeId, content }: FaceProps) {
  const setNodeContent = useCanvasStore((state) => state.setNodeContent);
  const setVerseRef = useCanvasStore((state) => state.setVerseRef);
  const applyMeasuredHeight = useCanvasStore((state) => state.applyMeasuredHeight);
  const verseRef = useCanvasStore((state) => {
    const node = state.document.nodes.find((candidate) => candidate.id === nodeId);
    const value = node?.data['verseRef'];
    return typeof value === 'string' ? value : '';
  });
  const mirrorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = mirrorRef.current;
    if (!element || typeof ResizeObserver === 'undefined') return;
    const chrome = 88; // header + verse row + toolbar + borders
    const observer = new ResizeObserver(() => {
      applyMeasuredHeight(nodeId, Math.ceil(element.scrollHeight) + chrome);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [nodeId, applyMeasuredHeight]);

  return (
    <div className="canvas-node-body proposition-face" data-face="proposition">
      <input
        className="proposition-verse nodrag"
        value={verseRef}
        placeholder="v. ref"
        title="Verse or line reference"
        aria-label="Verse reference"
        onChange={(event) => setVerseRef(nodeId, event.target.value)}
      />
      <RichText
        value={content}
        onChange={(html) => setNodeContent(nodeId, html)}
        placeholder="One assertion of the text…"
        variant="inline"
      />
      <div className="canvas-node-mirror" ref={mirrorRef} aria-hidden>
        {stripHtml(content) || ' '}
        {'\n'}
      </div>
    </div>
  );
}
