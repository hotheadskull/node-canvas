import { memo } from 'react';
import { Handle, Position, NodeResizer } from '@xyflow/react';
import { useStore } from '../store/useStore';
import { Link2, Plus, X, ArrowDown } from 'lucide-react';

export const LogicNode = memo(({ id, data, selected }: any) => {
  const updateNodeData = useStore(state => state.updateNodeData);

  const premises = data.premises || [''];
  const conclusion = data.conclusion || '';

  const addPremise = () => {
    updateNodeData(id, { premises: [...premises, ''] });
  };

  const removePremise = (index: number) => {
    const newPremises = [...premises];
    newPremises.splice(index, 1);
    updateNodeData(id, { premises: newPremises });
  };

  const updatePremise = (index: number, text: string) => {
    const newPremises = [...premises];
    newPremises[index] = text;
    updateNodeData(id, { premises: newPremises });
  };

  return (
    <>
      <NodeResizer minWidth={250} minHeight={200} isVisible={selected} handleClassName="w-3 h-3 bg-[#151518] border-2 border-white rounded transition-transform hover:scale-125" />
      <div className={`relative bg-[#0f1115] rounded-lg border-2 transition-colors shadow-lg duration-300 w-full h-full shadow-2xl flex flex-col
      ${selected ? 'border-[#3b82f6] shadow-[0_0_20px_rgba(59,130,246,0.3)]' : 'border-[#1e3a8a]'}
    `}>
      <Handle type="target" position={Position.Top} className="w-3 h-3 rounded-full border-2 border-[#151518] z-50 transition-transform hover:scale-125 bg-[#3b82f6] -top-2" />

      {/* Header */}
      <div className="bg-[#1e3a8a]/30 p-3 border-b-2 border-[#1e3a8a] flex items-center gap-2 rounded-t-lg">
        <Link2 size={16} className="text-[#3b82f6]" />
        <input
          type="text"
          className="w-full bg-transparent text-sm font-bold text-blue-100 focus:outline-none placeholder-blue-800 uppercase tracking-widest"
          value={data.label || ''}
          onChange={(e) => updateNodeData(id, { label: e.target.value })}
          placeholder="LOGIC CHAIN"
        />
      </div>

      {/* Body */}
      <div className="p-4 bg-[#0a0c0f] rounded-b-lg flex-1 flex flex-col gap-3 overflow-y-auto" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        
        {/* Premises */}
        <div className="flex flex-col gap-2">
          {premises.map((premise: string, i: number) => (
            <div key={i} className="flex flex-col gap-1 items-center">
              <div className="relative w-full h-full flex flex-col">
                <div className="absolute left-2 top-2 text-[10px] font-bold text-blue-600">P{i + 1}</div>
                <textarea
                  className="w-full bg-[#151518] border border-[#2a2a35] rounded p-2 pl-7 text-sm text-blue-50 resize-none focus:outline-none focus:border-[#3b82f6] transition-colors"
                  rows={2}
                  value={premise}
                  onChange={(e) => updatePremise(i, e.target.value)}
                  placeholder="Enter premise..."
                />
                {premises.length > 1 && (
                  <button 
                    onClick={() => removePremise(i)}
                    className="absolute right-2 top-2 text-gray-500 hover:text-red-400"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
              
              {/* Arrow linking to next step */}
              <div className="flex items-center justify-center h-4 text-[#1e3a8a]">
                <ArrowDown size={14} />
              </div>
            </div>
          ))}

          <button 
            onClick={addPremise}
            className="w-full py-1.5 border border-dashed border-[#1e3a8a] text-[#3b82f6] rounded text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1 hover:bg-[#1e3a8a]/20 transition-colors"
          >
            <Plus size={12} /> Add Step
          </button>
        </div>

        {/* Conclusion */}
        <div className="mt-2 pt-4 border-t border-[#1e3a8a]/50 relative">
          <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-[#0a0c0f] px-2 text-[10px] font-bold text-[#3b82f6] uppercase tracking-widest border border-[#1e3a8a] rounded-full">
            Conclusion
          </div>
          <textarea
            className="w-full bg-[#151518] border border-[#3b82f6]/50 rounded p-3 text-sm font-bold text-white resize-none focus:outline-none focus:border-[#3b82f6] transition-colors shadow-[inset_0_0_10px_rgba(59,130,246,0.1)] flex-1 min-h-[80px]"
            value={conclusion}
            onChange={(e) => updateNodeData(id, { conclusion: e.target.value })}
            placeholder="Therefore..."
          />
        </div>

      </div>

      <Handle type="source" position={Position.Bottom} className="w-3 h-3 rounded-full border-2 border-[#151518] z-50 transition-transform hover:scale-125 bg-[#3b82f6] -bottom-2" />
    </div>
    </>
  );
});
