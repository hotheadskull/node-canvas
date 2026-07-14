// Novel-pack rich faces (user-picked design 3): each node earns a small
// dashboard. Plant lists its payoffs (amber "none yet" -- the orphan flag is
// the point); Payoff lists what it resolves; Event shows story time, who's
// involved (role labels read off the wires), and where it sits on the mini
// timeline of every dated event. All derived live from core (I7).

import {
  eventTimeline,
  involvedIn,
  payoffsOf,
  plantsResolvedBy,
  stripHtml,
} from '@node-canvas/core';
import { useEffect, useMemo, useRef } from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import { RichText } from '../RichText';
import type { FaceProps } from './index';

/** Rule 13: auto-fit measures a hidden mirror, never the flexing body. */
function useAutoFitMirror(nodeId: string, chrome: number) {
  const mirrorRef = useRef<HTMLDivElement>(null);
  const applyMeasuredHeight = useCanvasStore((state) => state.applyMeasuredHeight);
  useEffect(() => {
    const element = mirrorRef.current;
    if (!element || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => {
      applyMeasuredHeight(nodeId, Math.ceil(element.scrollHeight) + chrome);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [nodeId, chrome, applyMeasuredHeight]);
  return mirrorRef;
}

export function PlantFace({ nodeId, content }: FaceProps) {
  const setNodeContent = useCanvasStore((state) => state.setNodeContent);
  const document = useCanvasStore((state) => state.document);
  const payoffs = useMemo(() => payoffsOf(document, nodeId), [document, nodeId]);
  const mirrorRef = useAutoFitMirror(nodeId, 96);
  return (
    <div className="canvas-node-body pair-face" data-face="plant">
      <RichText
        value={content}
        onChange={(html) => setNodeContent(nodeId, html)}
        placeholder="What are you setting up?"
        variant="inline"
      />
      <div className="pair-list nodrag" data-pair-list>
        {payoffs.length === 0 ? (
          <p className="pair-none">Payoffs — none yet</p>
        ) : (
          <>
            <p className="pair-kicker">Pays off in</p>
            {payoffs.map((entry) => (
              <p key={entry.nodeId} className="pair-row">
                · {entry.title}
              </p>
            ))}
          </>
        )}
      </div>
      <div className="canvas-node-mirror" ref={mirrorRef} aria-hidden>
        {stripHtml(content) || ' '}
        {'\n'}
        {payoffs.map((entry) => entry.title).join('\n')}
      </div>
    </div>
  );
}

export function PayoffFace({ nodeId, content }: FaceProps) {
  const setNodeContent = useCanvasStore((state) => state.setNodeContent);
  const document = useCanvasStore((state) => state.document);
  const plants = useMemo(() => plantsResolvedBy(document, nodeId), [document, nodeId]);
  const mirrorRef = useAutoFitMirror(nodeId, 96);
  return (
    <div className="canvas-node-body pair-face" data-face="payoff">
      <RichText
        value={content}
        onChange={(html) => setNodeContent(nodeId, html)}
        placeholder="The moment it lands…"
        variant="inline"
      />
      <div className="pair-list nodrag" data-pair-list>
        {plants.length === 0 ? (
          <p className="pair-none">Resolves — wire in the plants it pays off</p>
        ) : (
          <>
            <p className="pair-kicker">Resolves</p>
            {plants.map((entry) => (
              <p key={entry.nodeId} className="pair-row">
                · {entry.title}
              </p>
            ))}
          </>
        )}
      </div>
      <div className="canvas-node-mirror" ref={mirrorRef} aria-hidden>
        {stripHtml(content) || ' '}
        {'\n'}
        {plants.map((entry) => entry.title).join('\n')}
      </div>
    </div>
  );
}

export function EventFace({ nodeId, content }: FaceProps) {
  const setNodeContent = useCanvasStore((state) => state.setNodeContent);
  const setStoryTime = useCanvasStore((state) => state.setStoryTime);
  const document = useCanvasStore((state) => state.document);
  const storyTime = useCanvasStore((state) => {
    const node = state.document.nodes.find((candidate) => candidate.id === nodeId);
    const value = node?.data['storyTime'];
    return typeof value === 'number' ? value : null;
  });
  const involved = useMemo(() => involvedIn(document, nodeId), [document, nodeId]);
  const timeline = useMemo(() => eventTimeline(document), [document]);
  const mirrorRef = useAutoFitMirror(nodeId, 118);

  const span = useMemo(() => {
    if (timeline.length === 0) return null;
    const min = timeline[0]!.storyTime;
    const max = timeline[timeline.length - 1]!.storyTime;
    return { min, range: Math.max(max - min, Number.EPSILON) };
  }, [timeline]);

  return (
    <div className="canvas-node-body event-face" data-face="event">
      <div className="event-time-row nodrag">
        <label>
          story time
          <input
            className="event-time-input"
            type="number"
            step="any"
            value={storyTime ?? ''}
            placeholder="—"
            aria-label="Story time"
            onChange={(event) =>
              setStoryTime(
                nodeId,
                event.target.value === '' ? null : Number(event.target.value),
              )
            }
          />
        </label>
      </div>
      <RichText
        value={content}
        onChange={(html) => setNodeContent(nodeId, html)}
        placeholder="What happens…"
        variant="inline"
      />
      {involved.length > 0 && (
        <p className="event-involves nodrag" data-event-involves>
          {involved.map((entry) => (
            <span key={entry.personId} className="event-person-chip">
              {entry.name}
              {entry.role ? ` · ${entry.role}` : ''}
            </span>
          ))}
        </p>
      )}
      {span && timeline.length > 1 && storyTime !== null && (
        <svg className="event-timeline nodrag" viewBox="0 0 300 18" data-event-timeline aria-hidden>
          <line x1="6" y1="9" x2="294" y2="9" className="event-timeline-track" />
          {timeline.map((entry) => {
            const x = 6 + ((entry.storyTime - span.min) / span.range) * 288;
            const isSelf = entry.nodeId === nodeId;
            return (
              <circle
                key={entry.nodeId}
                cx={x}
                cy={9}
                r={isSelf ? 5 : 3}
                className={isSelf ? 'event-dot is-self' : 'event-dot'}
              />
            );
          })}
        </svg>
      )}
      <div className="canvas-node-mirror" ref={mirrorRef} aria-hidden>
        {stripHtml(content) || ' '}
        {'\n'}
        {involved.map((entry) => entry.name).join(' ')}
      </div>
    </div>
  );
}
