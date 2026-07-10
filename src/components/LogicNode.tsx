import { memo } from 'react';
import { NodeProps } from '@xyflow/react';
import { Link2, Plus, X, ArrowDown } from 'lucide-react';
import { useStore, AppNode } from '../store/useStore';
import { BaseNode } from './BaseNode';

export const LogicNode = memo(({ id, data, selected }: NodeProps<AppNode>) => {
  const updateNodeData = useStore(state => state.updateNodeData);

  const premises: string[] = Array.isArray(data.premises) ? data.premises : [''];
  const conclusion: string = typeof data.conclusion === 'string' ? data.conclusion : '';

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
    <BaseNode
      id={id}
      data={data}
      selected={selected}
      minWidth={180}
      minHeight={200}
      icon={Link2}
      accentColor="#3b82f6"
      headerTitlePlaceholder="LOGIC CHAIN"
      showFunction={true}
      showTags={true}
    >
      <div className="p-3 bg-[#1a1a24]/30 flex-1 min-h-0 flex flex-col gap-2 overflow-y-auto" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        
        {/* Premises */}
        <div className="flex flex-col gap-1">
          {premises.map((premise: string, i: number) => (
            <div key={i} className="flex flex-col items-center">
              <div className="relative w-full h-full flex flex-col group">
                <div className="absolute left-2 top-1.5 text-[9px] font-bold text-blue-600">P{i + 1}</div>
                <textarea
                  className="w-full bg-[#151518] border border-[#2a2a35] rounded p-1.5 pl-6 text-xs text-blue-50 resize-none focus:outline-none focus:border-[#3b82f6] transition-colors"
                  rows={2}
                  value={premise}
                  onChange={(e) => updatePremise(i, e.target.value)}
                  placeholder="Enter premise..."
                />
                {premises.length > 1 && (
                  <button 
                    onClick={() => removePremise(i)}
                    className="absolute right-1 top-1.5 text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X size={10} />
                  </button>
                )}
              </div>
              
              {/* Arrow linking to next step */}
              <div className="flex items-center justify-center h-3 text-[#1e3a8a] my-0.5">
                <ArrowDown size={10} />
              </div>
            </div>
          ))}

          <button 
            onClick={addPremise}
            className="w-full py-1 border border-dashed border-[#1e3a8a] text-[#3b82f6] rounded text-[9px] font-bold uppercase tracking-wider flex items-center justify-center gap-1 hover:bg-[#1e3a8a]/20 transition-colors mt-1"
          >
            <Plus size={10} /> Add Step
          </button>
        </div>

        {/* Conclusion */}
        <div className="mt-2 pt-3 border-t border-[#1e3a8a]/50 relative flex-1 flex flex-col min-h-[60px]">
          <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-[#0a0c0f] px-2 text-[9px] font-bold text-[#3b82f6] uppercase tracking-widest border border-[#1e3a8a] rounded-full">
            Conclusion
          </div>
          <textarea
            className="w-full bg-[#151518] border border-[#3b82f6]/50 rounded p-2 text-xs font-bold text-white resize-none focus:outline-none focus:border-[#3b82f6] transition-colors shadow-[inset_0_0_10px_rgba(59,130,246,0.1)] flex-1 min-h-[50px]"
            value={conclusion}
            onChange={(e) => updateNodeData(id, { conclusion: e.target.value })}
            placeholder="Therefore..."
          />
        </div>

      </div>
    </BaseNode>
  );
});
