import { memo } from 'react';
import { Handle, Position, NodeResizer } from '@xyflow/react';
import { UserCircle, Image as ImageIcon, Plus, Trash2 } from 'lucide-react';
import { useStore } from '../store/useStore';
import { RichTextEditor } from './RichTextEditor';

export const StatNode = memo(({ id, data, selected }: any) => {
  const updateNodeData = useStore(state => state.updateNodeData);

  const stats: { key: string, value: string }[] = data.metadata?.stats || [];

  const updateMetadata = (newMetadata: any) => {
    updateNodeData(id, {
      metadata: { ...(data.metadata || {}), ...newMetadata }
    });
  };

  const handleStatChange = (index: number, field: 'key' | 'value', val: string) => {
    const newStats = [...stats];
    newStats[index][field] = val;
    updateMetadata({ stats: newStats });
  };

  const addStatRow = () => {
    updateMetadata({ stats: [...stats, { key: '', value: '' }] });
  };

  const removeStatRow = (index: number) => {
    const newStats = stats.filter((_, i) => i !== index);
    updateMetadata({ stats: newStats });
  };

  return (
    <>
      <NodeResizer minWidth={280} minHeight={300} isVisible={selected} handleClassName="w-3 h-3 bg-[#111114] border-2 border-[#22d3ee] rounded" />
      <div className="relative w-full h-full">
        <Handle id="top" type="target" position={Position.Top} className="w-3 h-3 bg-[#22d3ee] border-2 border-[#111114] rounded-full z-50 -top-2" />
        
        <div className={`relative w-full h-full flex flex-col bg-[#111114] text-white rounded-md shadow-2xl transition-colors shadow-lg duration-200 overflow-hidden border
        ${selected ? 'border-[#22d3ee] scale-[1.01]' : 'border-[#164e63]'}
      `} style={{ 
        boxShadow: selected ? '0 20px 40px rgba(34,211,238,0.2)' : '0 10px 30px rgba(0,0,0,0.5)',
      }}>
      
      {/* Dossier Image Header */}
      <div className="w-full h-[200px] bg-[#1a1a24] relative group border-b border-[#2a2a35] flex flex-col items-center justify-center">
        {data.metadata?.imageUrl ? (
          <img 
            src={data.metadata.imageUrl} 
            alt="Profile" 
            className="w-full h-full object-cover" 
            onError={(e) => {
              // If image fails to load, reset it
              (e.target as HTMLImageElement).src = '';
              updateMetadata({ imageUrl: '' });
            }}
          />
        ) : (
          <div className="flex flex-col items-center text-gray-500 gap-2">
            <UserCircle size={48} className="opacity-50" />
            <span className="text-xs uppercase font-bold tracking-wider">No Image</span>
          </div>
        )}

        {/* Hover overlay to change image URL */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-4">
          <ImageIcon size={24} className="text-[#22d3ee] mb-2" />
          <input 
            type="text" 
            placeholder="Paste Image URL..." 
            className="w-full bg-[#111114] border border-[#2a2a35] rounded px-2 py-1 text-xs text-center focus:outline-none focus:border-[#22d3ee]"
            value={data.metadata?.imageUrl || ''}
            onChange={(e) => updateMetadata({ imageUrl: e.target.value })}
            onPointerDown={(e) => e.stopPropagation()}
          />
        </div>
      </div>

      {/* Profile Title */}
      <div className="bg-[#16161c] px-4 py-3 border-b border-[#2a2a35]">
        <input
          type="text"
          className="bg-transparent text-lg font-bold text-[#22d3ee] focus:outline-none w-full uppercase tracking-wide text-center"
          value={data.label}
          onChange={(e) => updateNodeData(id, { label: e.target.value })}
          placeholder="Entity Name..."
        />
      </div>

      {/* Dynamic Key-Value Stats Table */}
      <div className="flex flex-col bg-[#111114]">
        {stats.map((stat, i) => (
          <div key={i} className="flex border-b border-[#1a1a24] group">
            <input
              type="text"
              className="w-1/3 bg-[#16161c] border-r border-[#1a1a24] text-xs font-bold text-gray-400 px-3 py-2 focus:outline-none focus:bg-[#1a1a24] focus:text-[#22d3ee] uppercase text-right"
              placeholder="Trait"
              value={stat.key}
              onChange={(e) => handleStatChange(i, 'key', e.target.value)}
            />
            <div className="flex-1 flex relative">
              <input
                type="text"
                className="w-full bg-transparent text-xs text-gray-200 px-3 py-2 focus:outline-none focus:bg-[#1a1a24]"
                placeholder="Value..."
                value={stat.value}
                onChange={(e) => handleStatChange(i, 'value', e.target.value)}
              />
              <button 
                onClick={() => removeStatRow(i)} 
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 size={12} />
              </button>
            </div>
          </div>
        ))}
        <button 
          onClick={addStatRow} 
          className="w-full py-1.5 flex items-center justify-center gap-1 text-[10px] uppercase font-bold tracking-wider text-[#164e63] hover:text-[#22d3ee] hover:bg-[#16161c] transition-colors"
        >
          <Plus size={12} /> Add Attribute
        </button>
      </div>

      {/* Dossier Notes / Bio */}
      <div className="p-4 relative z-10 flex-1 overflow-hidden bg-[#1a1a24]/30">
        <div className="text-[10px] uppercase font-bold text-gray-500 mb-2 tracking-widest border-b border-[#2a2a35] pb-1">Dossier Notes</div>
        <RichTextEditor 
          content={data.content || ''} 
          onChange={(html) => updateNodeData(id, { content: html })} 
          textColor="#9ca3af"
        />
      </div>
      </div>
        <Handle id="bottom" type="source" position={Position.Bottom} className="w-3 h-3 bg-[#22d3ee] border-2 border-[#111114] rounded-full z-50 -bottom-2" />
      </div>
    </>
  );
});
