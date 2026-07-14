// The baseline face: a plain text body with the auto-fit mirror (rule 13:
// measure the mirror, never the flexing body).

import { useEffect, useRef } from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import type { FaceProps } from './index';

export function DefaultFace({ nodeId, content }: FaceProps) {
  const setNodeContent = useCanvasStore((state) => state.setNodeContent);
  const applyMeasuredHeight = useCanvasStore((state) => state.applyMeasuredHeight);
  const mirrorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = mirrorRef.current;
    if (!element || typeof ResizeObserver === 'undefined') return;
    const chrome = 40; // header + borders; mirror already carries body padding
    const observer = new ResizeObserver(() => {
      applyMeasuredHeight(nodeId, Math.ceil(element.scrollHeight) + chrome);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [nodeId, applyMeasuredHeight]);

  return (
    <div className="canvas-node-body">
      <textarea
        className="canvas-node-content nodrag"
        value={content}
        placeholder="Write here…"
        onChange={(event) => setNodeContent(nodeId, event.target.value)}
      />
      <div className="canvas-node-mirror" ref={mirrorRef} aria-hidden>
        {content || ' '}
        {'\n'}
      </div>
    </div>
  );
}
