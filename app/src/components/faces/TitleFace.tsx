// Title face (user spec): the node IS its words -- text displays as big as
// the box allows, scaling with the node via CSS container queries. The user
// sizes the box; the words fill it. No auto-fit mirror: the box is the
// user's statement of how big this idea is.

import { useCanvasStore } from '../../store/canvasStore';
import type { FaceProps } from './index';

export function TitleFace({ nodeId, title }: FaceProps) {
  const setNodeTitle = useCanvasStore((state) => state.setNodeTitle);
  return (
    <div className="canvas-node-body title-face" data-face="title">
      <textarea
        className="title-face-input nodrag"
        value={title}
        placeholder="The big idea…"
        onChange={(event) => setNodeTitle(nodeId, event.target.value)}
      />
    </div>
  );
}
