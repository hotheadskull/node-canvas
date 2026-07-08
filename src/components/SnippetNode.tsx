import { memo } from 'react';
import { Handle, Position, NodeResizer } from '@xyflow/react';
import { useStore } from '../store/useStore';

export const SnippetNode = memo(({ id, data, selected }: any) => {
  const updateNodeData = useStore(state => state.updateNodeData);

  return (
    <>
      <NodeResizer minWidth={200} minHeight={150} isVisible={selected} handleClassName="w-3 h-3 bg-[#111114] border-2 border-gray-500 rounded" />
      <div style={{ width: '100%', height: '100%' }} className={`relative bg-[#fef08a] rounded shadow-md transition-colors shadow-lg duration-200 w-48 flex flex-col group
      ${selected ? 'shadow-[0_4px_20px_rgba(253,224,71,0.4)] scale-[1.02]' : ''}
    `}>
      <Handle type="target" position={Position.Top} className="w-2 h-2 bg-[#ca8a04] border-0 rounded-full z-50 -top-1 opacity-0 group-hover:opacity-100 transition-opacity" />

      {/* Body */}
      <div className="p-3 flex-1 flex flex-col">
        {/* We use 'label' for snippet content to keep it simple, or 'content' */}
        <textarea
          className="w-full h-full bg-transparent text-sm text-gray-900 resize-none focus:outline-none font-sans leading-snug"
          value={data.content || data.label || ''}
          onChange={(e) => {
             // For snippets, the content IS the label practically, but we'll store in content
             updateNodeData(id, { content: e.target.value });
          }}
          placeholder="Quick thought..."
        />
      </div>

      <Handle type="source" position={Position.Bottom} className="w-2 h-2 bg-[#ca8a04] border-0 rounded-full z-50 -bottom-1 opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
    </>
  );
});
