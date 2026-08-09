// The Arc room (user-picked design B): a dedicated workspace for arcing a
// passage. The group's propositions stack vertically in reading order;
// bracket arcs on the right carry the relationship codes; the Arc | Phrasing
// toggle swaps the brackets for the auto-indented outline. Everything edits
// the REAL nodes and wires -- the canvas face shows the same derivation.
//
// Layout contract: rows are fixed-height so the bracket geometry is plain
// arithmetic (interaction rule 16: hover/content changes never move layout).

import {
  arcOutline,
  arcRelationsByFamily,
  getArcRelation,
  memberNodeIds,
  stripHtml,
} from '@node-canvas/core';
import { X } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { CLOSED_DOCUMENT, useCanvasStore } from '../store/canvasStore';
import { RichText } from './RichText';

const ROW_HEIGHT = 84;
const ARC_FAMILIES = arcRelationsByFamily();

export function ArcRoom() {
  // Closed room = zero cost (see CLOSED_DOCUMENT)
  const document_ = useCanvasStore((state) =>
    state.arcRoomId === null ? CLOSED_DOCUMENT : state.document,
  );
  const arcRoomId = useCanvasStore((state) => state.arcRoomId);
  const openArcRoom = useCanvasStore((state) => state.openArcRoom);
  const setNodeContent = useCanvasStore((state) => state.setNodeContent);
  const setVerseRef = useCanvasStore((state) => state.setVerseRef);
  const setArc = useCanvasStore((state) => state.setArc);
  const setWireRelationTo = useCanvasStore((state) => state.setWireRelationTo);
  const view = useCanvasStore((state) => state.arcRoomView);
  const setView = useCanvasStore((state) => state.setArcRoomView);

  const assembly = document_.assemblies.find((candidate) => candidate.id === arcRoomId);
  const outline = useMemo(
    () => (assembly ? arcOutline(document_, memberNodeIds(document_, assembly.id)) : null),
    [document_, assembly],
  );

  useEffect(() => {
    if (!assembly) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') openArcRoom(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [assembly, openArcRoom]);

  if (!assembly || !outline) return null;

  const rowIndex = new Map(outline.entries.map((entry, index) => [entry.nodeId, index]));
  const maxLevel = Math.max(0, ...outline.entries.map((entry) => entry.level));
  const bracketWidth = 48 + maxLevel * 22;

  const nodeOf = (id: string) => document_.nodes.find((candidate) => candidate.id === id);
  const shortText = (id: string) => {
    const node = nodeOf(id);
    const content =
      node && typeof node.data.content === 'string' ? stripHtml(node.data.content).trim() : '';
    const label = content !== '' ? content : 'Untitled proposition';
    return label.length > 42 ? `${label.slice(0, 39)}…` : label;
  };
  const outgoingWireOf = (id: string) =>
    document_.wires.find(
      (wire) => wire.source === id && wire.targetPort === 'arc-in' && wire.status === 'live',
    );

  return (
    <div className="focus-backdrop arc-room-backdrop" data-arc-room onClick={() => openArcRoom(null)}>
      <div className="arc-room" onClick={(event) => event.stopPropagation()}>
        <header className="arc-room-header">
          <span className="arc-room-title">Arc room — {assembly.name || 'Unnamed group'}</span>
          <span className="arc-room-toggle" role="tablist">
            <button
              role="tab"
              aria-selected={view === 'arc'}
              className={view === 'arc' ? 'is-active' : ''}
              onClick={() => setView('arc')}
            >
              Arc
            </button>
            <button
              role="tab"
              aria-selected={view === 'phrasing'}
              className={view === 'phrasing' ? 'is-active' : ''}
              onClick={() => setView('phrasing')}
            >
              Phrasing
            </button>
          </span>
          <span className="arc-room-stats">
            {outline.mainPointIds.length} main point{outline.mainPointIds.length === 1 ? '' : 's'}
          </span>
          <button
            className="focus-close"
            aria-label="Back to canvas (Esc)"
            onClick={() => openArcRoom(null)}
          >
            <X size={16} aria-hidden />
          </button>
        </header>

        <div className="arc-room-body">
          <div
            className="arc-room-rows"
            style={{ paddingRight: view === 'arc' ? `${bracketWidth}px` : '0' }}
          >
            {outline.entries.map((entry) => {
              const node = nodeOf(entry.nodeId);
              if (!node) return null;
              const wire = outgoingWireOf(entry.nodeId);
              const verse = typeof node.data['verseRef'] === 'string' ? node.data['verseRef'] : '';
              const content = typeof node.data.content === 'string' ? node.data.content : '';
              return (
                <div
                  key={entry.nodeId}
                  className={`arc-row ${entry.level === 0 ? 'is-main' : ''}`}
                  style={{
                    height: `${ROW_HEIGHT}px`,
                    paddingLeft: view === 'phrasing' ? `${entry.level * 32}px` : '0',
                  }}
                  data-arc-row={entry.nodeId}
                >
                  <input
                    className="proposition-verse"
                    value={verse}
                    placeholder="v. ref"
                    aria-label="Verse reference"
                    onChange={(event) => setVerseRef(entry.nodeId, event.target.value)}
                  />
                  <div className="arc-row-text">
                    <RichText
                      value={content}
                      onChange={(html) => setNodeContent(entry.nodeId, html)}
                      placeholder="One assertion of the text…"
                      variant="inline"
                    />
                  </div>
                  <div className="arc-row-controls">
                    <label>
                      serves
                      <select
                        aria-label={`Anchor for ${shortText(entry.nodeId)}`}
                        value={entry.anchorId ?? ''}
                        onChange={(event) =>
                          setArc(
                            entry.nodeId,
                            event.target.value === '' ? null : event.target.value,
                            entry.relationId,
                          )
                        }
                      >
                        <option value="">— (main point)</option>
                        {outline.entries
                          .filter((candidate) => candidate.nodeId !== entry.nodeId)
                          .map((candidate) => (
                            <option key={candidate.nodeId} value={candidate.nodeId}>
                              {shortText(candidate.nodeId)}
                            </option>
                          ))}
                      </select>
                    </label>
                    {entry.anchorId && wire && (
                      <label>
                        as
                        <select
                          aria-label={`Relationship for ${shortText(entry.nodeId)}`}
                          value={entry.relationId ?? ''}
                          onChange={(event) =>
                            setWireRelationTo(
                              wire.id,
                              event.target.value === '' ? undefined : event.target.value,
                            )
                          }
                        >
                          <option value="">relationship…</option>
                          {ARC_FAMILIES.map((group) => (
                            <optgroup key={group.family} label={group.label}>
                              {group.relations.map((relation) => (
                                <option key={relation.id} value={relation.id}>
                                  {relation.code} · {relation.label}
                                </option>
                              ))}
                            </optgroup>
                          ))}
                        </select>
                      </label>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {view === 'arc' && (
            <svg
              className="arc-room-brackets"
              width={bracketWidth}
              height={outline.entries.length * ROW_HEIGHT}
              aria-hidden
            >
              {outline.entries.map((entry) => {
                if (!entry.anchorId) return null;
                const from = rowIndex.get(entry.nodeId);
                const to = rowIndex.get(entry.anchorId);
                if (from === undefined || to === undefined) return null;
                const y1 = from * ROW_HEIGHT + ROW_HEIGHT / 2;
                const y2 = to * ROW_HEIGHT + ROW_HEIGHT / 2;
                const x = 10 + Math.max(0, entry.level - 1) * 22;
                const relation = entry.relationId ? getArcRelation(entry.relationId) : undefined;
                return (
                  <g key={entry.nodeId}>
                    <path
                      d={`M 0 ${y1} H ${x + 8} V ${y2} H 0`}
                      fill="none"
                      className="arc-bracket"
                    />
                    <text x={x + 12} y={(y1 + y2) / 2 + 4} className="arc-bracket-code">
                      {relation?.code ?? '?'}
                    </text>
                  </g>
                );
              })}
            </svg>
          )}
        </div>
      </div>
    </div>
  );
}
