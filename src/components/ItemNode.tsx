import { memo } from 'react';
import { Handle, Position, NodeResizer } from '@xyflow/react';
import { useStore } from '../store/useStore';
import { Gem } from 'lucide-react';

export const ItemNode = memo(({ id, data, selected }: any) => {
  const updateNodeData = useStore(state => state.updateNodeData);

  return (
    <>
      <NodeResizer minWidth={200} minHeight={150} isVisible={selected} handleClassName="w-3 h-3 bg-[#151518] border-2 border-white rounded transition-transform hover:scale-125" />
      <div style={{ width: '100%', height: '100%' }} className={`relative bg-[#0f1115] rounded-lg border-2 transition-colors shadow-lg duration-300 shadow-2xl flex flex-col
      ${selected ? 'border-[#10b981] shadow-[0_0_20px_rgba(16,185,129,0.3)]' : 'border-[#065f46]'}
    `}>
      <Handle type="target" position={Position.Top} className="w-3 h-3 rounded-full border-2 border-[#151518] z-50 transition-transform hover:scale-125 bg-[#10b981] -top-2" />

      {/* Header */}
      <div className="bg-[#065f46]/30 p-3 border-b-2 border-[#065f46] flex items-center gap-2 rounded-t-lg">
        <Gem size={16} className="text-[#10b981]" />
        <input
          type="text"
          className="w-full bg-transparent text-lg font-serif font-bold text-emerald-50 focus:outline-none placeholder-emerald-900"
          value={data.label || ''}
          onChange={(e) => updateNodeData(id, { label: e.target.value })}
          placeholder="Artifact Name"
        />
      </div>

      {/* Body */}
      <div className="p-4 bg-[#0a0c0f] rounded-b-lg flex flex-col gap-4">
        
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-1">Origin</div>
            <input
              type="text"
              className="w-full bg-[#151518] border border-[#2a2a35] rounded p-2 text-xs text-emerald-100/80 focus:outline-none focus:border-[#10b981] transition-colors"
              value={data.origin || ''}
              onChange={(e) => updateNodeData(id, { origin: e.target.value })}
              placeholder="Where is it from?"
            />
          </div>
          <div>
            <div className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-1">Current Location</div>
            <input
              type="text"
              className="w-full bg-[#151518] border border-[#2a2a35] rounded p-2 text-xs text-emerald-100/80 focus:outline-none focus:border-[#10b981] transition-colors"
              value={data.location || ''}
              onChange={(e) => updateNodeData(id, { location: e.target.value })}
              placeholder="Who has it now?"
            />
          </div>
        </div>

        <div>
          <div className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-1">Significance / Power</div>
          <textarea
            className="w-full bg-[#151518] border border-[#2a2a35] rounded p-2 text-xs text-emerald-100/80 resize-none focus:outline-none focus:border-[#10b981] transition-colors"
            rows={2}
            value={data.significance || ''}
            onChange={(e) => updateNodeData(id, { significance: e.target.value })}
            placeholder="What makes it special?"
          />
        </div>
        
        <div>
          <div className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-1">Rules & Limitations</div>
          <textarea
            className="w-full bg-[#151518] border border-[#2a2a35] rounded p-2 text-xs text-emerald-100/80 resize-none focus:outline-none focus:border-[#10b981] transition-colors"
            rows={2}
            value={data.rules || ''}
            onChange={(e) => updateNodeData(id, { rules: e.target.value })}
            placeholder="How can it be broken or misused?"
          />
        </div>

      </div>

      <Handle type="source" position={Position.Bottom} className="w-3 h-3 rounded-full border-2 border-[#151518] z-50 transition-transform hover:scale-125 bg-[#10b981] -bottom-2" />
    </div>
    </>
  );
});
