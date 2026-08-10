import { useCanvasStore } from '../../store/canvasStore';
import type { FaceProps } from './index';

export function SourceFace({ nodeId, title }: FaceProps) {
  const node = useCanvasStore((state) =>
    state.document.nodes.find((n) => n.id === nodeId),
  );
  if (!node) return null;

  const url = node.data['sourceUrl'] as string | undefined;
  const type = node.data['sourceType'] as string | undefined;

  return (
    <div className="plate-body source-face">
      <h3 className="plate-title">{title}</h3>
      {url ? (
        <div className="source-viewer">
          {type?.startsWith('image/') ? (
            <img src={url} alt={title} className="source-image" />
          ) : type === 'application/pdf' ? (
            <iframe src={url} title={title} className="source-pdf" />
          ) : (
            <p className="source-fallback">
              <a href={url} target="_blank" rel="noreferrer">
                Open file
              </a>
            </p>
          )}
        </div>
      ) : (
        <p className="plate-prose is-empty">No source file attached.</p>
      )}
    </div>
  );
}
