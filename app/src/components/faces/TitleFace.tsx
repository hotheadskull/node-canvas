// Title face (user spec): the node IS its words -- text displays as big as
// the box allows, scaling with the node via CSS container queries. The user
// sizes the box; the words fill it. No auto-fit mirror: the box is the
// user's statement of how big this idea is.
//
// Big Idea (sermon pack, rich-faces design): once Subject/Complement are
// wired in, the face derives the exegetical statement live -- the big words
// stay the homiletical phrasing. Unwired titles show nothing extra (I2).

import { bigIdeaOf } from '@node-canvas/core';
import { useMemo } from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import type { FaceProps } from './index';

export function TitleFace({ nodeId, title }: FaceProps) {
  const setNodeTitle = useCanvasStore((state) => state.setNodeTitle);
  const document = useCanvasStore((state) => state.document);
  const bigIdea = useMemo(() => bigIdeaOf(document, nodeId), [document, nodeId]);
  const wired = bigIdea.subject !== null || bigIdea.complement !== null;
  return (
    <div className="canvas-node-body title-face" data-face="title">
      <textarea
        className="title-face-input nodrag"
        value={title}
        placeholder="The big idea…"
        onChange={(event) => setNodeTitle(nodeId, event.target.value)}
      />
      {wired && (
        <div className="big-idea nodrag" data-big-idea>
          {bigIdea.exegetical !== null ? (
            <p title="Derived from the wired Subject and Complement">
              <span className="big-idea-kicker">Exegetical</span> {bigIdea.exegetical}
            </p>
          ) : (
            <p>
              <span className="big-idea-kicker">
                {bigIdea.subject === null ? 'Subject missing' : 'Complement missing'}
              </span>{' '}
              {bigIdea.subject ?? bigIdea.complement}
            </p>
          )}
          {title.trim() !== '' && bigIdea.exegetical !== null && (
            <p title="Your phrasing of it — the words above">
              <span className="big-idea-kicker">Homiletical</span> {title}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
