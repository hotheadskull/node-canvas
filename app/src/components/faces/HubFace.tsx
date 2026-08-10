// The Hub face (pt2 handoff §7): the container that COLLECTS. Members
// stay on the canvas -- the hub only lists them, grouped by the dataKind
// of what each one gives (the color law: hue from the port, never the
// type). Wire a node into Subject and the hub speaks for it.
// Everything here is derived live from the document (I7 stays in core's
// court: this face only reads).

import { DATA_KIND_STYLES, getPort, type DataKind } from '@node-canvas/core';
import { useMemo } from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import { LazyRichText } from '../RichText';
import type { FaceProps } from './index';

type RosterEntry = { nodeId: string; title: string; kind: DataKind };

export function HubFace({ nodeId, content }: FaceProps) {
  const setNodeContent = useCanvasStore((state) => state.setNodeContent);
  const document = useCanvasStore((state) => state.document);

  const { roster, subject } = useMemo(() => {
    const entries: RosterEntry[] = [];
    let subjectTitle: { title: string; kind: DataKind } | null = null;
    for (const wire of document.wires) {
      if (wire.target !== nodeId || wire.status !== 'live') continue;
      const member = document.nodes.find((node) => node.id === wire.source);
      if (!member) continue;
      const kind = getPort(member.type, wire.sourcePort)?.dataKind ?? 'any';
      const title = member.data.title?.trim() || 'Untitled';
      if (wire.targetPort === 'holds-in') {
        entries.push({ nodeId: member.id, title, kind });
      } else if (wire.targetPort === 'subject-in') {
        subjectTitle = { title, kind };
      }
    }
    const groups = new Map<DataKind, RosterEntry[]>();
    for (const entry of entries) {
      const list = groups.get(entry.kind) ?? [];
      list.push(entry);
      groups.set(entry.kind, list);
    }
    return { roster: [...groups.entries()], subject: subjectTitle };
  }, [document, nodeId]);

  return (
    <div className="canvas-node-body hub-face" data-face="hub">
      {subject !== null && (
        <p
          className="hub-subject"
          style={{ color: DATA_KIND_STYLES[subject.kind].hue }}
          data-hub-subject
        >
          speaks for {subject.title}
        </p>
      )}
      <LazyRichText
        value={content}
        onChange={(html) => setNodeContent(nodeId, html)}
        placeholder="What is this collection for?"
        variant="inline"
      />
      <div className="hub-roster nodrag" data-hub-roster>
        {roster.length === 0 ? (
          <p className="pair-none">Holds — wire nodes in; they stay on the canvas</p>
        ) : (
          roster.map(([kind, members]) => (
            <div key={kind} className="hub-roster-group">
              <p className="pair-kicker">
                {kind} · {members.length}
              </p>
              <div className="hub-roster-chips">
                {members.map((member) => {
                  const hue = DATA_KIND_STYLES[member.kind].hue;
                  return (
                    <span
                      key={member.nodeId}
                      className="face-chip"
                      style={{
                        color: hue,
                        background: `color-mix(in srgb, ${hue} 10%, transparent)`,
                        borderColor: `color-mix(in srgb, ${hue} 24%, transparent)`,
                      }}
                      title={member.kind}
                    >
                      {member.title}
                    </span>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
