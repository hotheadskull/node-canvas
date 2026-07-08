import { memo } from 'react';
import { Handle, Position, NodeResizer } from '@xyflow/react';
import { useStore } from '../store/useStore';
import { BookOpen, Map, Users, Sparkles, Shield, Cpu } from 'lucide-react';

const CATEGORIES = [
  { id: 'history', label: 'History', icon: BookOpen, color: 'text-amber-400' },
  { id: 'location', label: 'Location', icon: Map, color: 'text-emerald-400' },
  { id: 'faction', label: 'Faction', icon: Users, color: 'text-rose-400' },
  { id: 'magic', label: 'Magic', icon: Sparkles, color: 'text-purple-400' },
  { id: 'military', label: 'Military', icon: Shield, color: 'text-red-500' },
  { id: 'tech', label: 'Technology', icon: Cpu, color: 'text-cyan-400' }
];

export const LoreNode = memo(({ id, data, selected }: any) => {
  const updateNodeData = useStore(state => state.updateNodeData);

  const activeCategory = CATEGORIES.find(c => c.id === (data.category || 'history')) || CATEGORIES[0];
  const Icon = activeCategory.icon;

  return (
    <>
      <NodeResizer minWidth={200} minHeight={150} isVisible={selected} handleClassName="w-3 h-3 bg-[#151518] border-2 border-white rounded transition-transform hover:scale-125" />
      <div style={{ width: '100%', height: '100%' }} className={`relative bg-[#0f1115] rounded-lg border-2 transition-colors shadow-lg duration-300 shadow-2xl flex flex-col
      ${selected ? 'border-[#22d3ee] shadow-[0_0_20px_rgba(34,211,238,0.3)]' : 'border-[#164e63]'}
    `}>
      {/* Target Handle */}
      <Handle type="target" position={Position.Top} className="w-3 h-3 rounded-full border-2 border-[#151518] z-50 transition-transform hover:scale-125 bg-[#22d3ee] -top-2" />

      {/* Header */}
      <div className="bg-[#164e63]/30 p-2 border-b-2 border-[#164e63] flex flex-col gap-2 rounded-t-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon size={16} className={activeCategory.color} />
            <select
              value={data.category || 'history'}
              onChange={(e) => updateNodeData(id, { category: e.target.value })}
              className="bg-transparent text-xs font-bold uppercase tracking-wider text-gray-300 focus:outline-none cursor-pointer"
            >
              {CATEGORIES.map(c => (
                <option key={c.id} value={c.id} className="bg-[#0f1115]">{c.label}</option>
              ))}
            </select>
          </div>
        </div>
        
        <input
          type="text"
          className="w-full bg-transparent text-lg font-serif font-bold text-cyan-50 focus:outline-none placeholder-cyan-900"
          value={data.label}
          onChange={(e) => updateNodeData(id, { label: e.target.value })}
          placeholder="Lore Title..."
        />
      </div>

      {/* Body */}
      <div className="p-3 bg-[#0a0c0f] rounded-b-lg flex-1">
        <textarea
          className="w-full h-full bg-transparent text-sm text-cyan-100/70 resize-none focus:outline-none font-serif leading-relaxed"
          value={data.content || ''}
          onChange={(e) => updateNodeData(id, { content: e.target.value })}
          placeholder="Write the secrets of the world here..."
        />
      </div>

      {/* Source Handle */}
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 rounded-full border-2 border-[#151518] z-50 transition-transform hover:scale-125 bg-[#22d3ee] -bottom-2" />
    </div>
    </>
  );
});
