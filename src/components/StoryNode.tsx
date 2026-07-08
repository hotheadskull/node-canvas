import { Handle, Position, NodeProps, NodeResizer } from '@xyflow/react';
import { AppNode } from '../store/useStore';

export function StoryNode({ data, selected }: NodeProps<AppNode>) {
  return (
    <>
      <NodeResizer minWidth={200} minHeight={150} isVisible={selected} handleClassName="w-3 h-3 bg-[#151518] border-2 border-white rounded transition-transform hover:scale-125" />
      <div style={{ width: '100%', height: '100%' }} 
      className={`relative p-4 bg-[#151518] border-2 rounded-xl shadow-lg transition-transform hover:-translate-y-1 ${
        selected ? 'border-[#fbbf24] shadow-[0_0_15px_rgba(251,191,36,0.3)]' : 'border-[#2a2a35]'
      }`}
    >
      <Handle type="target" position={Position.Top} className="w-3 h-3 rounded-full border-2 border-[#151518] z-50 transition-transform hover:scale-125 bg-[#9333ea]" />
      
      <div className="flex flex-col gap-2">
        <div className="flex justify-between items-center border-b border-[#2a2a35] pb-2">
          <span className="font-bold text-sm text-[#fbbf24] uppercase tracking-wider">{data.label}</span>
          <span className="text-[10px] text-gray-500 bg-[#1a1a1f] px-2 py-1 rounded">Level 1</span>
        </div>
        
        <div className="text-gray-300 text-xs leading-relaxed min-h-[40px]">
          {data.content || "Double click to edit lore..."}
        </div>
        
        {/* Progress Bar (Gamified UI Element) */}
        <div className="w-full bg-[#1a1a1f] h-1.5 rounded-full mt-2 overflow-hidden">
          <div 
            className="bg-[#9333ea] h-full transition-colors shadow-lg duration-500" 
            style={{ width: `${Math.min(((data.content?.length || 0) / 50) * 100, 100)}%` }} 
          />
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} className="w-3 h-3 rounded-full border-2 border-[#151518] z-50 transition-transform hover:scale-125 bg-[#9333ea]" />
    </div>
    </>
  );
}
