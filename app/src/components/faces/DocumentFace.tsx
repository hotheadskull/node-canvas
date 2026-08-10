// Compile face for spine nodes (document + manuscript): own text, the
// ordered intake list (wire order IS compile order -- reorder here, the
// compiled work reorders), a live compiled preview, derived cast (names read
// live from Person nodes, so renames propagate), word count, the thread
// hygiene dot, and Split (stubs wired back in, registry presets).

import {
  castOf,
  compile,
  hygieneFlags,
  spineIntakeOf,
  spineWiresInto,
  wordCount,
} from '@node-canvas/core';
import { ArrowDown, ArrowUp, BookOpenText, Eye, EyeOff, Scissors } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import { RichText } from '../RichText';
import { SplitPanel } from '../SplitPanel';
import type { FaceProps } from './index';

export function DocumentFace({ nodeId, content }: FaceProps) {
  const document = useCanvasStore((state) => state.document);
  const setNodeContent = useCanvasStore((state) => state.setNodeContent);
  const reorderIntake = useCanvasStore((state) => state.reorderIntake);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [splitOpen, setSplitOpen] = useState(false);

  const node = document.nodes.find((candidate) => candidate.id === nodeId);
  const intake = node ? spineIntakeOf(node.type) : undefined;
  const intakeWires = useMemo(
    () =>
      node && intake
        ? document.wires.filter(
            (wire) => wire.target === nodeId && wire.targetPort === intake.id,
          )
        : [],
    [document.wires, nodeId, node, intake],
  );
  const liveWireIds = useMemo(
    () => new Set(spineWiresInto(document, nodeId).map((wire) => wire.id)),
    [document, nodeId],
  );
  const compiled = useMemo(() => compile(document, nodeId), [document, nodeId]);
  const cast = useMemo(() => castOf(document, nodeId), [document, nodeId]);
  const flagged = useMemo(
    () => hygieneFlags(document).filter((flag) => flag.nodeId === nodeId),
    [document, nodeId],
  );
  const titleOf = (id: string) => {
    const source = document.nodes.find((candidate) => candidate.id === id);
    const title = source && typeof source.data.title === 'string' ? source.data.title : '';
    return title !== '' ? title : 'Untitled';
  };

  if (!node || !intake) return null;

  return (
    <div className="canvas-node-body document-face" data-face="document">
      <div className="document-own-text">
        <RichText
          value={content}
          onChange={(html) => setNodeContent(nodeId, html)}
          placeholder="Text of this level itself (optional)…"
          variant="inline"
        />
      </div>

      <div className="document-intake nodrag">
        <p className="document-intake-title">
          {intake.label} · wire order
          {flagged.length > 0 && (
            <span
              className="hygiene-dot"
              title={`${flagged.map((flag) => flag.portLabel).join(', ')} intake is empty`}
            />
          )}
        </p>
        {intakeWires.length === 0 && (
          <p className="document-intake-empty">Nothing wired in yet — connect sections, or Split.</p>
        )}
        <ol className="document-intake-list">
          {intakeWires.map((wire, index) => (
            <li
              key={wire.id}
              className={liveWireIds.has(wire.id) ? '' : 'is-tentative-row'}
              data-intake-row={wire.source}
            >
              <span className="intake-row-index">{index + 1}</span>
              <span className="intake-row-title">
                {titleOf(wire.source)}
                {!liveWireIds.has(wire.id) && <em> · waiting</em>}
              </span>
              <button
                className="intake-row-move"
                aria-label={`Move ${titleOf(wire.source)} up`}
                disabled={index === 0}
                onClick={() => reorderIntake(nodeId, intake.id, wire.id, index - 1)}
              >
                <ArrowUp size={12} aria-hidden />
              </button>
              <button
                className="intake-row-move"
                aria-label={`Move ${titleOf(wire.source)} down`}
                disabled={index === intakeWires.length - 1}
                onClick={() => reorderIntake(nodeId, intake.id, wire.id, index + 1)}
              >
                <ArrowDown size={12} aria-hidden />
              </button>
            </li>
          ))}
        </ol>
      </div>

      <div className="document-footer nodrag">
        <span className="document-stat" title="Words in the compiled text">
          <BookOpenText size={12} aria-hidden /> {wordCount(compiled.text)}
        </span>
        {cast.length > 0 && (
          <span className="document-cast" title="Derived from people wired into sections">
            Cast: {cast.map((entry) => entry.name).join(', ')}
          </span>
        )}
        <span className="document-footer-actions">
          <button
            className="document-action"
            aria-expanded={splitOpen}
            onClick={() => setSplitOpen((open) => !open)}
          >
            <Scissors size={12} aria-hidden /> Split
          </button>
          <button
            className="document-action"
            aria-pressed={previewOpen}
            onClick={() => setPreviewOpen((open) => !open)}
          >
            {previewOpen ? <EyeOff size={12} aria-hidden /> : <Eye size={12} aria-hidden />}
            {previewOpen ? 'Hide' : 'Preview'}
          </button>
        </span>
      </div>

      {splitOpen && <SplitPanel nodeId={nodeId} onClose={() => setSplitOpen(false)} />}

      {previewOpen &&
        (compiled.text !== '' ? (
          // compiled text is the user's own TipTap HTML from this document
          <div
            className="document-preview nodrag"
            data-compiled-preview
            dangerouslySetInnerHTML={{ __html: compiled.text }}
          />
        ) : (
          <div className="document-preview nodrag" data-compiled-preview>
            Nothing to compile yet.
          </div>
        ))}
    </div>
  );
}
