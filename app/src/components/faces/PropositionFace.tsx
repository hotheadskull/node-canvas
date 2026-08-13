// Proposition face (sermon pack, user-picked design A): a slim statement
// card -- a verse-reference chip and the assertion itself. Arcs to other
// propositions are wires (their relationship rides the wire chip); the Arc
// group face and Arc room derive the outline. Growth is native (Chunk 17).

import { useCanvasStore } from '../../store/canvasStore';
import { LazyRichText } from '../RichText';
import { EXTRACT_TYPES, type FaceProps } from './index';

export function PropositionFace({ nodeId, content }: FaceProps) {
  const setNodeContent = useCanvasStore((state) => state.setNodeContent);
  const extractNodeText = useCanvasStore((state) => state.extractNodeText);
  const setVerseRef = useCanvasStore((state) => state.setVerseRef);
  const verseRef = useCanvasStore((state) => {
    const node = state.document.nodes.find((candidate) => candidate.id === nodeId);
    const value = node?.data['verseRef'];
    return typeof value === 'string' ? value : '';
  });

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
      <LazyRichText
        value={content}
        onChange={(html) => setNodeContent(nodeId, html)}
        placeholder="One assertion of the text…"
        variant="inline"
        onExtract={(parts, type) => extractNodeText(nodeId, parts, type || 'note')}
        extractTypes={EXTRACT_TYPES}
      />
    </div>
  );
}
