import { Scissors } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import { LazyRichText } from '../RichText';
import { SplitPanel } from '../SplitPanel';
import type { FaceProps } from './index';

/** The Split affordance rode on the old compile face; these per-type
 * bodies replaced that face, so they carry it themselves -- splitting a
 * manuscript or passage must never become unreachable (spec §9). */
function SplitAction({ nodeId }: { nodeId: string }) {
  const [splitOpen, setSplitOpen] = useState(false);
  return (
    <>
      <div className="document-footer nodrag">
        <span className="document-footer-actions">
          <button
            className="document-action"
            aria-expanded={splitOpen}
            onClick={() => setSplitOpen((open) => !open)}
          >
            <Scissors size={12} aria-hidden /> Split
          </button>
        </span>
      </div>
      {splitOpen && <SplitPanel nodeId={nodeId} onClose={() => setSplitOpen(false)} />}
    </>
  );
}

export function SectionFace({ nodeId, content }: FaceProps) {
  const setNodeContent = useCanvasStore((state) => state.setNodeContent);
  const document = useCanvasStore((state) => state.document);

  const cast = useMemo(() => {
    return document.wires
      .filter((wire) => wire.status === 'live' && wire.target === nodeId && wire.targetPort === 'people-in')
      .map((wire) => {
        const person = document.nodes.find(n => n.id === wire.source);
        return {
          id: wire.source,
          name: typeof person?.data.title === 'string' && person.data.title.trim() !== '' ? person.data.title.trim() : 'Unnamed'
        };
      });
  }, [document.wires, document.nodes, nodeId]);

  return (
    <div className="canvas-node-body section-face" data-face="section">
      {cast.length > 0 && (
        <div className="section-cast-band nodrag">
          {cast.map(person => (
            <span key={person.id} className="section-cast-chip">{person.name}</span>
          ))}
        </div>
      )}
      <LazyRichText
        value={content}
        onChange={(html) => setNodeContent(nodeId, html)}
        placeholder="Write your section here…"
        variant="inline"
      />
    </div>
  );
}
import { castOf, compile } from '@node-canvas/core';

export function ManuscriptFace({ nodeId, content }: FaceProps) {
  const setNodeContent = useCanvasStore((state) => state.setNodeContent);
  const document = useCanvasStore((state) => state.document);
  
  const matrix = useMemo(() => {
    const cast = castOf(document, nodeId);
    const compiled = compile(document, nodeId);
    // Get the spine parts (chapters, sections) to act as columns
    const columns = compiled.sources.map(sourceId => {
      const node = document.nodes.find(n => n.id === sourceId);
      return {
        id: sourceId,
        title: (node && typeof node.data.title === 'string' && node.data.title) ? node.data.title : 'Unnamed',
      };
    });
    
    return { cast, columns };
  }, [document, nodeId]);
  
  return (
    <div className="canvas-node-body manuscript-face" data-face="manuscript">
      {matrix.columns.length > 0 && matrix.cast.length > 0 && (
        <div className="manuscript-matrix nodrag">
          <p className="manuscript-matrix-title">Cast Presence Matrix</p>
          <div className="matrix-grid">
            {matrix.cast.map(person => (
              <div key={person.personId} className="matrix-row">
                <span className="matrix-label" title={person.name}>{person.name}</span>
                <div className="matrix-dots">
                  {matrix.columns.map(col => {
                    const isPresent = person.appearsIn.includes(col.id);
                    return (
                      <div 
                        key={col.id} 
                        className={`matrix-dot ${isPresent ? 'is-present' : ''}`}
                        title={`${person.name} in ${col.title}`}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      <LazyRichText
        value={content}
        onChange={(html) => setNodeContent(nodeId, html)}
        placeholder="Manuscript synopsis or details…"
        variant="inline"
      />
      <SplitAction nodeId={nodeId} />
    </div>
  );
}

export function PassageFace({ nodeId, content }: FaceProps) {
  const setNodeContent = useCanvasStore((state) => state.setNodeContent);
  return (
    <div className="canvas-node-body passage-face" data-face="passage">
      <div className="passage-content">
        <LazyRichText
          value={content}
          onChange={(html) => setNodeContent(nodeId, html)}
          placeholder="Quote or passage prose…"
          variant="inline"
        />
      </div>
      <SplitAction nodeId={nodeId} />
    </div>
  );
}
