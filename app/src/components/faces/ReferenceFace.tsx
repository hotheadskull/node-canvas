import { useCanvasStore } from '../../store/canvasStore';
import type { FaceProps } from './index';
import { LocateFixed } from 'lucide-react';

export function ReferenceFace({ nodeId, content }: FaceProps) {
  const doc = useCanvasStore((state) => state.document);
  const setNodeContent = useCanvasStore((state) => state.setNodeContent);
  const node = doc.nodes.find(n => n.id === nodeId);
  
  // Find the target node
  const targetId = node?.data.fields?.find(f => f.type === 'reference')?.value as string | undefined || content;
  const targetNode = doc.nodes.find(n => n.id === targetId || n.data.title === targetId);

  const targetTitle = targetNode?.data.title || targetId;

  return (
    <div className="canvas-node-body canvas-node-reference">
      <div className="reference-pill">
        <LocateFixed size={12} className="reference-icon" />
        {targetTitle ? (
          <span className="reference-title">{targetTitle}</span>
        ) : (
          <select 
            className="reference-select nodrag"
            value=""
            onChange={(e) => setNodeContent(nodeId, e.target.value)}
          >
            <option value="" disabled>Select target...</option>
            {doc.nodes.filter(n => n.id !== nodeId && n.data.title).map(n => (
              <option key={n.id} value={n.id}>{n.data.title}</option>
            ))}
          </select>
        )}
      </div>
    </div>
  );
}
