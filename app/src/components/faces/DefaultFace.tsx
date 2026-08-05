// The baseline face: rich text in the node. Growth is free under the Tab
// Card anatomy (Chunk 17): the card has no inline height unless the user
// owns it, so CSS grows it with the text natively -- the V1 rule. No
// mirrors, no measurement (CanvasNode records real heights for layout math).

import { useCanvasStore } from '../../store/canvasStore';
import { LazyRichText } from '../RichText';
import type { FaceProps } from './index';

export function DefaultFace({ nodeId, content }: FaceProps) {
  const setNodeContent = useCanvasStore((state) => state.setNodeContent);
  return (
    <div className="canvas-node-body">
      <LazyRichText
        value={content}
        onChange={(html) => setNodeContent(nodeId, html)}
        placeholder="Write here…"
        variant="inline"
      />
    </div>
  );
}
