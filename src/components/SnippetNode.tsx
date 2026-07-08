import { memo } from 'react';
import { Handle, Position, NodeResizer } from '@xyflow/react';
import { useStore } from '../store/useStore';

export const SnippetNode = memo(({ id, data, selected }: any) => {
  const updateNodeData = useStore(state => state.updateNodeData);

  return (
    <>
      <NodeResizer minWidth={200} minHeight={150} isVisible={selected} lineClassName="border-[#34d399]" handleClassName="w-3 h-3 bg-[#151518] border border-white rounded transition-transform hover:scale-125" />
      <div style={{ width: '100%', height: '100%' }} className={`relative bg-[#151518] border border-[#2a2a35] rounded-xl shadow-2xl flex flex-col group transition-all duration-200
      ${selected ? 'shadow-[0_0_15px_rgba(52,211,153,0.3)] border-[#34d399]' : 'hover:border-[#34d399]/50'}
    `}>
      <Handle type="target" position={Position.Top} className="w-3 h-3 rounded-full border border-[#151518] z-50 transition-transform hover:scale-125 bg-[#34d399] -top-2" />

      {/* Header */}
      <div className="px-3 py-2 bg-gradient-to-r from-[#064e3b]/30 to-transparent border-b border-[#2a2a35] rounded-t-xl flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-widest font-bold text-[#34d399] flex items-center gap-1.5">
          <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
          Idea
        </span>
      </div>

      {/* Body */}
      <div className="p-3 flex-1 flex flex-col">
        {/* We use 'content' for snippet text to map with 'reference' data format */}
        <textarea
          className="w-full h-full bg-transparent text-sm text-gray-300 resize-none outline-none font-sans leading-snug custom-scrollbar placeholder-[#2a2a35]"
          value={data.content || ''}
          onChange={(e) => {
             updateNodeData(id, { content: e.target.value });
          }}
          placeholder="Capture a quick thought..."
        />
      </div>

      <Handle type="source" position={Position.Bottom} className="w-3 h-3 rounded-full border border-[#151518] z-50 transition-transform hover:scale-125 bg-[#34d399] -bottom-2" />
    </div>
    </>
  );
});
