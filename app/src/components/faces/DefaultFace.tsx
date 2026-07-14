// The baseline face: rich text in the node (design A) with the auto-fit
// mirror (rule 13: measure the mirror, never the flexing body). The mirror
// mirrors the STRIPPED text at the same typography, so its height tracks the
// prose without depending on the node's own box.

import { stripHtml } from '@node-canvas/core';
import { useEffect, useRef } from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import { RichText } from '../RichText';
import type { FaceProps } from './index';

export function DefaultFace({ nodeId, content }: FaceProps) {
  const setNodeContent = useCanvasStore((state) => state.setNodeContent);
  const applyMeasuredHeight = useCanvasStore((state) => state.applyMeasuredHeight);
  const mirrorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = mirrorRef.current;
    if (!element || typeof ResizeObserver === 'undefined') return;
    const chrome = 64; // header + toolbar + borders
    const observer = new ResizeObserver(() => {
      applyMeasuredHeight(nodeId, Math.ceil(element.scrollHeight) + chrome);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [nodeId, applyMeasuredHeight]);

  return (
    <div className="canvas-node-body">
      <RichText
        value={content}
        onChange={(html) => setNodeContent(nodeId, html)}
        placeholder="Write here…"
        variant="inline"
      />
      <div className="canvas-node-mirror" ref={mirrorRef} aria-hidden>
        {stripHtml(content) || ' '}
        {'\n'}
      </div>
    </div>
  );
}
