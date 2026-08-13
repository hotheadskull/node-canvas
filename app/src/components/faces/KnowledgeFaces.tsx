// Knowledge faces (pt2 handoff §7): Place, Thing, Question. Like every
// face, they show what the WIRES already know instead of asking for it
// twice -- a Place lists what it contains and where it sits, a Thing
// names who holds it, a Question shows the answer wired into it or
// glows quietly until one arrives.

import { useMemo } from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import { LazyRichText } from '../RichText';
import { EXTRACT_TYPES, type FaceProps } from './index';

function useTitleOf() {
  const nodes = useCanvasStore((state) => state.document.nodes);
  return (id: string) => {
    const node = nodes.find((candidate) => candidate.id === id);
    const title = node && typeof node.data.title === 'string' ? node.data.title.trim() : '';
    return title !== '' ? title : 'Untitled';
  };
}

export function PlaceFace({ nodeId, content }: FaceProps) {
  const document = useCanvasStore((state) => state.document);
  const setNodeContent = useCanvasStore((state) => state.setNodeContent);
  const extractNodeText = useCanvasStore((state) => state.extractNodeText);
  const titleOf = useTitleOf();

  // contains: places wired INTO this one; within: this place's identity
  // feeding another place's Contains -- both directions of nesting
  const { contains, within } = useMemo(() => {
    const live = document.wires.filter((wire) => wire.status === 'live');
    return {
      contains: live.filter(
        (wire) => wire.target === nodeId && wire.targetPort === 'contains-in',
      ),
      within: live.filter(
        (wire) =>
          wire.source === nodeId &&
          wire.sourcePort === 'identity-out' &&
          wire.targetPort === 'contains-in',
      ),
    };
  }, [document.wires, nodeId]);

  return (
    <div className="canvas-node-body place-face" data-face="place">
      {within.length > 0 && (
        <p className="face-derived-line">
          within <strong>{within.map((wire) => titleOf(wire.target)).join(', ')}</strong>
        </p>
      )}
      <LazyRichText
        value={content}
        onChange={(html) => setNodeContent(nodeId, html)}
        placeholder="What is this place…"
        variant="inline"
        onExtract={(parts, type) => extractNodeText(nodeId, parts, type || 'note')}
        extractTypes={EXTRACT_TYPES}
      />
      {contains.length > 0 && (
        <div className="face-chip-band nodrag" data-contains-band>
          <span className="face-band-label">contains</span>
          {contains.map((wire) => (
            <span key={wire.id} className="face-band-chip is-place">
              {titleOf(wire.source)}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function ThingFace({ nodeId, content }: FaceProps) {
  const document = useCanvasStore((state) => state.document);
  const setNodeContent = useCanvasStore((state) => state.setNodeContent);
  const extractNodeText = useCanvasStore((state) => state.extractNodeText);
  const titleOf = useTitleOf();

  const holders = useMemo(
    () =>
      document.wires.filter(
        (wire) =>
          wire.status === 'live' &&
          wire.source === nodeId &&
          wire.sourcePort === 'identity-out' &&
          wire.targetPort === 'possession-in',
      ),
    [document.wires, nodeId],
  );

  return (
    <div className="canvas-node-body thing-face" data-face="thing">
      <LazyRichText
        value={content}
        onChange={(html) => setNodeContent(nodeId, html)}
        placeholder="What is it, and why does it matter…"
        variant="inline"
        onExtract={(parts, type) => extractNodeText(nodeId, parts, type || 'note')}
        extractTypes={EXTRACT_TYPES}
      />
      {holders.length > 0 && (
        <div className="face-chip-band nodrag" data-held-band>
          <span className="face-band-label">held by</span>
          {holders.map((wire) => (
            <span key={wire.id} className="face-band-chip is-person">
              {titleOf(wire.target)}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/** Strip tags for the answer excerpt -- the answering node's content is
 * TipTap HTML. */
function excerptOf(html: string, max = 90): string {
  const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

export function QuestionFace({ nodeId, content }: FaceProps) {
  const document = useCanvasStore((state) => state.document);
  const setNodeContent = useCanvasStore((state) => state.setNodeContent);
  const extractNodeText = useCanvasStore((state) => state.extractNodeText);
  const titleOf = useTitleOf();

  const answer = useMemo(() => {
    const wire = document.wires.find(
      (candidate) =>
        candidate.status === 'live' &&
        candidate.target === nodeId &&
        candidate.targetPort === 'answer-in',
    );
    if (!wire) return null;
    const node = document.nodes.find((candidate) => candidate.id === wire.source);
    const html = node && typeof node.data.content === 'string' ? node.data.content : '';
    return { title: titleOf(wire.source), excerpt: excerptOf(html) };
  }, [document, nodeId, titleOf]);

  return (
    <div className="canvas-node-body question-face" data-face="question">
      <LazyRichText
        value={content}
        onChange={(html) => setNodeContent(nodeId, html)}
        placeholder="What are you asking…"
        variant="inline"
        onExtract={(parts, type) => extractNodeText(nodeId, parts, type || 'note')}
        extractTypes={EXTRACT_TYPES}
      />
      {answer ? (
        <div className="question-answer nodrag" data-answered>
          <span className="question-answer-label">answered by {answer.title}</span>
          {answer.excerpt !== '' && <p className="question-answer-excerpt">{answer.excerpt}</p>}
        </div>
      ) : (
        <p className="question-open nodrag" data-unanswered>
          open — wire an answer into the Answer port
        </p>
      )}
    </div>
  );
}
