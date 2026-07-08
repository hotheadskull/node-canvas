import { Handle, Position, NodeProps, NodeResizer } from '@xyflow/react';
import { AppNode } from '../store/useStore';

export function LocationNode({ data, selected }: NodeProps<AppNode>) {
  return (
    <>
      <NodeResizer minWidth={200} minHeight={150} isVisible={selected} handleClassName="w-3 h-3 bg-[#111114] border-2 border-gray-500 rounded" />
      <div style={{ width: '100%', height: '100%' }} 
      className={`relative p-4 bg-[#111114] border-2 rounded-lg shadow-lg transition-transform hover:-translate-y-1 ${
        selected ? 'border-[#10b981] shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'border-[#064e3b]'
      }`}
    >
      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-[#10b981]" />
      
      <div className="flex flex-col gap-2">
        <div className="flex justify-between items-center border-b border-[#064e3b] pb-2">
          <span className="font-bold text-sm text-[#34d399] uppercase tracking-wider">{data.label}</span>
          <span className="text-[10px] text-gray-500 bg-[#1a1a1f] px-2 py-1 rounded border border-[#064e3b]">Location</span>
        </div>
        
        <div className="text-gray-300 text-xs leading-relaxed min-h-[40px]">
          {data.content || "Describe this region..."}
        </div>
        
        {/* Progress Bar */}
        <div className="w-full bg-[#1a1a1f] h-1.5 rounded-full mt-2 overflow-hidden border border-[#064e3b]">
          <div 
            className="bg-[#10b981] h-full transition-colors shadow-lg duration-500" 
            style={{ width: `${Math.min(((data.content?.length || 0) / 50) * 100, 100)}%` }} 
          />
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-[#10b981]" />
    </div>
    </>
  );
}
