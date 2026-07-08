import { memo } from 'react';
import { Handle, Position, NodeResizer } from '@xyflow/react';

export const InfoBoxNode = memo(({ data, selected }: any) => {
  return (
    <>
      <NodeResizer minWidth={300} minHeight={300} isVisible={selected} lineClassName="border-[#d4b98c]" handleClassName="w-3 h-3 bg-[#151518] border-2 border-white rounded transition-transform hover:scale-125" />
      
      <div className="w-full h-full bg-[#1a1a1e]/40 border border-[#d4b98c]/30 rounded-xl backdrop-blur-sm shadow-inner shadow-black/50 p-6 flex flex-col pointer-events-auto">
        <input 
          className="bg-transparent border-b border-[#d4b98c]/30 text-[#d4b98c] text-xl font-serif mb-4 outline-none placeholder-[#d4b98c]/30 w-full"
          defaultValue={data.label || 'New Info Box'}
          placeholder="Info Box Title"
          onPointerDown={(e) => e.stopPropagation()} // Prevents drag when typing
          onChange={(e) => {
            if (data.onChange) data.onChange({ label: e.target.value });
          }}
        />
        
        {/* Handles for explicit connections from the outside */}
        <Handle type="target" position={Position.Left} id="left-in" className="w-3 h-3 rounded-full border-2 border-[#151518] z-50 transition-transform hover:scale-125 bg-[#d4b98c]" />
        <Handle type="source" position={Position.Right} id="right-out" className="w-3 h-3 rounded-full border-2 border-[#151518] z-50 transition-transform hover:scale-125 bg-[#d4b98c]" />
        <Handle type="target" position={Position.Top} id="top-in" className="w-3 h-3 rounded-full border-2 border-[#151518] z-50 transition-transform hover:scale-125 bg-[#d4b98c]" />
        <Handle type="source" position={Position.Bottom} id="bottom-out" className="w-3 h-3 rounded-full border-2 border-[#151518] z-50 transition-transform hover:scale-125 bg-[#d4b98c]" />
      </div>
    </>
  );
});
