import { Scissors } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import { LazyRichText } from '../RichText';
import { SplitPanel } from '../SplitPanel';
import { EXTRACT_TYPES, type FaceProps } from './index';

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
  const extractNodeText = useCanvasStore((state) => state.extractNodeText);
  const document = useCanvasStore((state) => state.document);

  const titleOf = (id: string) => {
    const node = document.nodes.find((candidate) => candidate.id === id);
    const title = node && typeof node.data.title === 'string' ? node.data.title.trim() : '';
    return title !== '' ? title : 'Unnamed';
  };

  const cast = useMemo(() => {
    return document.wires
      .filter((wire) => wire.status === 'live' && wire.target === nodeId && wire.targetPort === 'people-in')
      .map((wire) => ({ id: wire.source, name: titleOf(wire.source) }));
  }, [document.wires, document.nodes, nodeId]);

  // the scene sub-line (§11 novel scene, v1): POV and setting read from
  // the pov-in / place-in wires -- shown only once either is wired
  const scene = useMemo(() => {
    const wireInto = (portId: string) =>
      document.wires.find(
        (wire) => wire.status === 'live' && wire.target === nodeId && wire.targetPort === portId,
      );
    const pov = wireInto('pov-in');
    const setting = wireInto('place-in');
    return {
      pov: pov ? titleOf(pov.source) : null,
      setting: setting ? titleOf(setting.source) : null,
    };
  }, [document.wires, document.nodes, nodeId]);

  return (
    <div className="canvas-node-body section-face" data-face="section">
      {(scene.pov !== null || scene.setting !== null) && (
        <p className="face-derived-line" data-scene-line>
          {scene.pov !== null && (
            <>
              POV <strong>{scene.pov}</strong>
            </>
          )}
          {scene.pov !== null && scene.setting !== null && ' · '}
          {scene.setting !== null && (
            <>
              @ <strong>{scene.setting}</strong>
            </>
          )}
        </p>
      )}
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
        onExtract={(parts, type) => extractNodeText(nodeId, parts, type || 'note')}
        extractTypes={EXTRACT_TYPES}
      />
    </div>
  );
}
import { castOf, compile } from '@node-canvas/core';

export function ManuscriptFace({ nodeId, content }: FaceProps) {
  const setNodeContent = useCanvasStore((state) => state.setNodeContent);
  const extractNodeText = useCanvasStore((state) => state.extractNodeText);
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
        onExtract={(parts, type) => extractNodeText(nodeId, parts, type || 'note')}
        extractTypes={EXTRACT_TYPES}
      />
      <SplitAction nodeId={nodeId} />
    </div>
  );
}

export function PassageFace({ nodeId, content }: FaceProps) {
  const setNodeContent = useCanvasStore((state) => state.setNodeContent);
  const extractNodeText = useCanvasStore((state) => state.extractNodeText);
  return (
    <div className="canvas-node-body passage-face" data-face="passage">
      <div className="passage-content">
        <LazyRichText
          value={content}
          onChange={(html) => setNodeContent(nodeId, html)}
          placeholder="Quote or passage prose…"
          variant="inline"
          onExtract={(parts, type) => extractNodeText(nodeId, parts, type || 'note')}
          extractTypes={EXTRACT_TYPES}
        />
      </div>
      <SplitAction nodeId={nodeId} />
    </div>
  );
}
