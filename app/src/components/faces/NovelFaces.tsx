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
} from '@node-canvas/core';
import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useCanvasStore } from '../../store/canvasStore';
import { LazyRichText } from '../RichText';
import { EXTRACT_TYPES, type FaceProps } from './index';

export function PlantFace({ nodeId, content }: FaceProps) {
  const setNodeContent = useCanvasStore((state) => state.setNodeContent);
  const extractNodeText = useCanvasStore((state) => state.extractNodeText);
  const document = useCanvasStore((state) => state.document);
  const payoffs = useMemo(() => payoffsOf(document, nodeId), [document, nodeId]);
  return (
    <div className="canvas-node-body pair-face" data-face="plant">
      <LazyRichText
        value={content}
        onChange={(html) => setNodeContent(nodeId, html)}
        placeholder="What are you setting up?"
        variant="inline"
        onExtract={(parts, type) => extractNodeText(nodeId, parts, type || 'note')}
        extractTypes={EXTRACT_TYPES}
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
    </div>
  );
}

export function PayoffFace({ nodeId, content }: FaceProps) {
  const setNodeContent = useCanvasStore((state) => state.setNodeContent);
  const extractNodeText = useCanvasStore((state) => state.extractNodeText);
  const document = useCanvasStore((state) => state.document);
  const plants = useMemo(() => plantsResolvedBy(document, nodeId), [document, nodeId]);
  return (
    <div className="canvas-node-body pair-face" data-face="payoff">
      <LazyRichText
        value={content}
        onChange={(html) => setNodeContent(nodeId, html)}
        placeholder="The moment it lands…"
        variant="inline"
        onExtract={(parts, type) => extractNodeText(nodeId, parts, type || 'note')}
        extractTypes={EXTRACT_TYPES}
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
    </div>
  );
}

export function EventFace({ nodeId, content }: FaceProps) {
  const setNodeContent = useCanvasStore((state) => state.setNodeContent);
  const extractNodeText = useCanvasStore((state) => state.extractNodeText);
  const setStoryTime = useCanvasStore((state) => state.setStoryTime);
  const document = useCanvasStore((state) => state.document);
  const storyTime = useCanvasStore((state) => {
    const node = state.document.nodes.find((candidate) => candidate.id === nodeId);
    const value = node?.data['storyTime'];
    return typeof value === 'number' ? value : null;
  });
  const involved = useMemo(() => involvedIn(document, nodeId), [document, nodeId]);
  const timeline = useMemo(() => eventTimeline(document), [document]);

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
      <LazyRichText
        value={content}
        onChange={(html) => setNodeContent(nodeId, html)}
        placeholder="What happens…"
        variant="inline"
        onExtract={(parts, type) => extractNodeText(nodeId, parts, type || 'note')}
        extractTypes={EXTRACT_TYPES}
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
    </div>
  );
}

export function PersonFace({ nodeId, content }: FaceProps) {
  const setNodeContent = useCanvasStore((state) => state.setNodeContent);
  const extractNodeText = useCanvasStore((state) => state.extractNodeText);
  const setNodeField = useCanvasStore((state) => state.setNodeField);
  const document = useCanvasStore((state) => state.document);
  
  const { role, wants, fears, voice, wound } = useCanvasStore(
    useShallow((state) => {
      const node = state.document.nodes.find((candidate) => candidate.id === nodeId);
      return {
        role: (node?.data['role'] as string) ?? '',
        wants: (node?.data['wants'] as string) ?? '',
        fears: (node?.data['fears'] as string) ?? '',
        voice: (node?.data['voice'] as string) ?? '',
        wound: (node?.data['wound'] as string) ?? '',
      };
    })
  );

  const timeline = useMemo(() => eventTimeline(document), [document]);
  const presence = useMemo(() => {
    const eventsWithPerson = new Set(
      document.wires
        .filter((wire) => wire.status === 'live' && wire.source === nodeId && wire.targetPort === 'involves-in')
        .map((wire) => wire.target)
    );
    return timeline.map(entry => ({ ...entry, present: eventsWithPerson.has(entry.nodeId) }));
  }, [document.wires, timeline, nodeId]);

  const span = useMemo(() => {
    if (timeline.length === 0) return null;
    const min = timeline[0]!.storyTime;
    const max = timeline[timeline.length - 1]!.storyTime;
    return { min, range: Math.max(max - min, Number.EPSILON) };
  }, [timeline]);

  // a render HELPER, not a nested component: a component declared inside
  // the render gets a fresh identity every pass, so React would remount
  // the input and drop focus after every keystroke
  const field = (label: string, value: string, key: string) => (
    <label className="person-field-row nodrag" key={key}>
      <span className="person-field-label">{label}</span>
      <input
        className="person-field-input"
        type="text"
        value={value}
        placeholder="—"
        onChange={(e) => setNodeField(nodeId, key, e.target.value)}
      />
    </label>
  );

  return (
    <div className="canvas-node-body person-face" data-face="person">
      <LazyRichText
        value={content}
        onChange={(html) => setNodeContent(nodeId, html)}
        placeholder="Who are they?"
        variant="inline"
        onExtract={(parts, type) => extractNodeText(nodeId, parts, type || 'note')}
        extractTypes={EXTRACT_TYPES}
      />
      <div className="person-fields">
        {field('Role', role, 'role')}
        {field('Wants', wants, 'wants')}
        {field('Fears', fears, 'fears')}
        {field('Voice', voice, 'voice')}
        {field('Wound', wound, 'wound')}
      </div>
      {span && timeline.length > 1 && (
        <svg className="event-timeline person-presence nodrag" viewBox="0 0 300 18" data-event-timeline aria-hidden>
          <line x1="6" y1="9" x2="294" y2="9" className="event-timeline-track" />
          {presence.map((entry) => {
            const x = 6 + ((entry.storyTime - span.min) / span.range) * 288;
            return (
              <circle
                key={entry.nodeId}
                cx={x}
                cy={9}
                r={entry.present ? 4 : 2}
                className={`event-dot ${entry.present ? 'is-self' : ''}`}
                opacity={entry.present ? 1 : 0.3}
              />
            );
          })}
        </svg>
      )}
    </div>
  );
}

