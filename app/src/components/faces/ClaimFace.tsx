// The CLAIM face (pt2 handoff §7 "Argument"): the assertion itself, then
// the three derived rows that decide whether it stands -- Supports (the
// spine; the plate pip already flags it while empty), Rebuts (conflict
// red; ANY live rebut marks the whole claim `contested`, §11), and the
// Warrant line. Split stays in the footer so the Toulmin preset remains
// one click away. Everything is derived from wires -- nothing here is
// typed twice.

import { spineWiresInto } from '@node-canvas/core';
import { Scissors } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import { LazyRichText } from '../RichText';
import { SplitPanel } from '../SplitPanel';
import { EXTRACT_TYPES, type FaceProps } from './index';

export function ClaimFace({ nodeId, content }: FaceProps) {
  const document = useCanvasStore((state) => state.document);
  const setNodeContent = useCanvasStore((state) => state.setNodeContent);
  const extractNodeText = useCanvasStore((state) => state.extractNodeText);
  const [splitOpen, setSplitOpen] = useState(false);

  const titleOf = (id: string) => {
    const node = document.nodes.find((candidate) => candidate.id === id);
    const title = node && typeof node.data.title === 'string' ? node.data.title.trim() : '';
    return title !== '' ? title : 'Untitled';
  };

  const { supports, rebuts, warrant } = useMemo(() => {
    const liveInto = (portId: string) =>
      document.wires.filter(
        (wire) => wire.status === 'live' && wire.target === nodeId && wire.targetPort === portId,
      );
    // supports keep WIRE ORDER (supports-in is the spine intake)
    const spineIds = new Set(spineWiresInto(document, nodeId).map((wire) => wire.id));
    return {
      supports: liveInto('supports-in').filter((wire) => spineIds.has(wire.id)),
      rebuts: liveInto('rebuts-in'),
      warrant: liveInto('warrant-in')[0],
    };
  }, [document, nodeId]);

  return (
    <div className="canvas-node-body claim-face" data-face="claim">
      <LazyRichText
        value={content}
        onChange={(html) => setNodeContent(nodeId, html)}
        placeholder="State the claim…"
        variant="inline"
        onExtract={(parts, type) => extractNodeText(nodeId, parts, type || 'note')}
        extractTypes={EXTRACT_TYPES}
      />

      <div className="claim-rows nodrag">
        <div className="claim-row">
          <span className="claim-row-label">Supports</span>
          {supports.length === 0 ? (
            <span className="claim-row-empty">nothing wired in yet</span>
          ) : (
            <span className="claim-row-chips">
              {supports.map((wire) => (
                <span key={wire.id} className="claim-chip is-support">
                  {titleOf(wire.source)}
                </span>
              ))}
            </span>
          )}
        </div>
        {rebuts.length > 0 && (
          <div className="claim-row">
            <span className="claim-row-label">Rebuts</span>
            <span className="claim-row-chips">
              {rebuts.map((wire) => (
                <span key={wire.id} className="claim-chip is-rebut">
                  {titleOf(wire.source)}
                </span>
              ))}
            </span>
          </div>
        )}
        <div className="claim-row">
          <span className="claim-row-label">Warrant</span>
          {warrant ? (
            <span className="claim-warrant">{titleOf(warrant.source)}</span>
          ) : (
            <span className="claim-row-empty">unstated</span>
          )}
        </div>
      </div>

      <div className="claim-footer nodrag">
        {rebuts.length > 0 && (
          <span className="claim-contested" data-contested>
            contested
          </span>
        )}
        <span className="claim-footer-spacer" />
        <button
          className="document-action"
          aria-expanded={splitOpen}
          onClick={() => setSplitOpen((open) => !open)}
        >
          <Scissors size={12} aria-hidden /> Split
        </button>
      </div>

      {splitOpen && <SplitPanel nodeId={nodeId} onClose={() => setSplitOpen(false)} />}
    </div>
  );
}
