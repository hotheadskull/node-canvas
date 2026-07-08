import { memo } from 'react';
import { Handle, Position, NodeResizer } from '@xyflow/react';
import { useStore } from '../store/useStore';
import { Crown } from 'lucide-react';

export const MasterNode = memo(({ id, data, selected }: any) => {
  const updateNodeData = useStore(state => state.updateNodeData);

  return (
    <>
      <NodeResizer minWidth={300} minHeight={200} isVisible={selected} handleClassName="w-3 h-3 bg-[#151518] border-2 border-white rounded transition-transform hover:scale-125" />
      <div className={`relative bg-[#0f1115] rounded-xl border-4 transition-colors shadow-lg duration-300 w-full h-full shadow-2xl flex flex-col
      ${selected ? 'border-[#fbbf24] shadow-[0_0_30px_rgba(251,191,36,0.3)] scale-[1.01]' : 'border-[#b45309]'}
    `}>
      <Handle type="target" position={Position.Top} className="w-3 h-3 rounded-full border-2 border-[#151518] z-50 transition-transform hover:scale-125 bg-[#fbbf24] -top-2" />

      {/* Header */}
      <div className="bg-[#b45309]/30 p-4 border-b-2 border-[#b45309] flex items-center justify-center gap-3 rounded-t-lg">
        <Crown size={24} className="text-[#fbbf24]" />
        <input
          type="text"
          className="w-full bg-transparent text-2xl font-serif font-black text-amber-50 focus:outline-none placeholder-amber-700/50 uppercase tracking-widest text-center"
          value={data.label || ''}
          onChange={(e) => updateNodeData(id, { label: e.target.value })}
          placeholder="MASTER PITCH"
        />
      </div>

      {/* Body */}
      <div className="p-6 bg-[#0a0c0f] rounded-b-xl flex-1 flex flex-col gap-4 overflow-y-auto" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        
        <div>
          <div className="text-xs font-bold text-amber-600 uppercase tracking-widest mb-1">Logline</div>
          <textarea
            className="w-full bg-[#151518] border border-[#2a2a35] rounded p-3 text-sm text-amber-100/90 resize-none focus:outline-none focus:border-[#fbbf24] font-serif transition-colors"
            rows={2}
            value={data.logline || ''}
            onChange={(e) => updateNodeData(id, { logline: e.target.value })}
            placeholder="One sentence summary of the entire work..."
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-xs font-bold text-amber-600 uppercase tracking-widest mb-1">Core Theme</div>
            <input
              type="text"
              className="w-full bg-[#151518] border border-[#2a2a35] rounded p-2 text-sm text-amber-100/90 focus:outline-none focus:border-[#fbbf24] transition-colors"
              value={data.theme || ''}
              onChange={(e) => updateNodeData(id, { theme: e.target.value })}
              placeholder="e.g. Redemption"
            />
          </div>
          <div>
            <div className="text-xs font-bold text-amber-600 uppercase tracking-widest mb-1">Target Audience</div>
            <input
              type="text"
              className="w-full bg-[#151518] border border-[#2a2a35] rounded p-2 text-sm text-amber-100/90 focus:outline-none focus:border-[#fbbf24] transition-colors"
              value={data.audience || ''}
              onChange={(e) => updateNodeData(id, { audience: e.target.value })}
              placeholder="e.g. Young Adult Fantasy"
            />
          </div>
        </div>

        <div>
          <div className="text-xs font-bold text-amber-600 uppercase tracking-widest mb-1">Synopsis</div>
          <textarea
            className="w-full bg-[#151518] border border-[#2a2a35] rounded p-3 text-sm text-amber-100/90 resize-none focus:outline-none focus:border-[#fbbf24] font-serif transition-colors flex-1 min-h-[100px]"
            value={data.content || ''}
            onChange={(e) => updateNodeData(id, { content: e.target.value })}
            placeholder="A brief overview of the plot or message..."
          />
        </div>

      </div>

      <Handle type="source" position={Position.Bottom} className="w-3 h-3 rounded-full border-2 border-[#151518] z-50 transition-transform hover:scale-125 bg-[#fbbf24] -bottom-2" />
    </div>
    </>
  );
});
