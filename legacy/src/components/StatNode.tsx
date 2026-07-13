import { memo } from 'react';
import { NodeProps } from '@xyflow/react';
import { UserCircle, Image as ImageIcon, Plus, Trash2, Activity } from 'lucide-react';
import { useStore, AppNode } from '../store/useStore';
import { RichTextEditor } from './RichTextEditor';
import { BaseNode } from './BaseNode';

export const StatNode = memo(({ id, data, selected }: NodeProps<AppNode>) => {
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
    <BaseNode
      id={id}
      data={data}
      selected={selected}
      minWidth={200}
      minHeight={250}
      icon={Activity}
      accentColor="#22d3ee"
      headerTitlePlaceholder="Entity Name..."
      showFunction={true}
      showTags={true}
    >
      {/* Dossier Image Header */}
      <div className="w-full h-[120px] bg-[#1a1a24] relative group border-b border-[#2a2a35] flex flex-col items-center justify-center">
        {data.metadata?.imageUrl ? (
          <img 
            src={data.metadata.imageUrl} 
            alt="Profile" 
            className="w-full h-full object-cover" 
            onError={(e) => {
              (e.target as HTMLImageElement).src = '';
              updateMetadata({ imageUrl: '' });
            }}
          />
        ) : (
          <div className="flex flex-col items-center text-gray-500 gap-2">
            <UserCircle size={32} className="opacity-50" />
            <span className="text-[10px] uppercase font-bold tracking-wider">No Image</span>
          </div>
        )}

        {/* Hover overlay to change image URL */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-2">
          <ImageIcon size={16} className="text-[#22d3ee] mb-1" />
          <input 
            type="text" 
            placeholder="Paste Image URL..." 
            className="w-full bg-[#151518] border border-[#2a2a35] rounded px-2 py-1 text-[10px] text-center focus:outline-none focus:border-[#22d3ee]"
            value={data.metadata?.imageUrl || ''}
            onChange={(e) => updateMetadata({ imageUrl: e.target.value })}
            onPointerDown={(e) => e.stopPropagation()}
          />
        </div>
      </div>

      {/* Dynamic Key-Value Stats Table */}
      <div className="flex flex-col bg-[#151518]">
        {stats.map((stat, i) => (
          <div key={i} className="flex border-b border-[#1a1a24] group">
            <input
              type="text"
              className="w-1/3 bg-[#16161c] border-r border-[#1a1a24] text-[10px] font-bold text-gray-400 px-2 py-1.5 focus:outline-none focus:bg-[#1a1a24] focus:text-[#22d3ee] uppercase text-right"
              placeholder="Trait"
              value={stat.key}
              onChange={(e) => handleStatChange(i, 'key', e.target.value)}
            />
            <div className="flex-1 flex relative">
              <input
                type="text"
                className="w-full bg-transparent text-xs text-gray-200 px-2 py-1.5 focus:outline-none focus:bg-[#1a1a24]"
                placeholder="Value..."
                value={stat.value}
                onChange={(e) => handleStatChange(i, 'value', e.target.value)}
              />
              <button 
                onClick={() => removeStatRow(i)} 
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 size={10} />
              </button>
            </div>
          </div>
        ))}
        <button 
          onClick={addStatRow} 
          className="my-2 mx-3 py-1 flex items-center justify-center gap-1 text-[9px] uppercase font-bold tracking-wider text-[#164e63] hover:text-[#22d3ee] border border-dashed border-[#164e63] hover:border-[#22d3ee] rounded transition-colors"
        >
          <Plus size={10} /> Add Row
        </button>
      </div>

      {/* Dossier Notes / Bio */}
      <div className="p-3 relative z-10 flex-1 overflow-hidden bg-[#1a1a24]/30 min-h-[60px]">
        <div className="text-[9px] uppercase font-bold text-gray-500 mb-1 tracking-widest border-b border-[#2a2a35] pb-0.5">Dossier Notes</div>
        <RichTextEditor 
          content={data.content || ''} 
          onChange={(html) => updateNodeData(id, { content: html })} 
          textColor="#9ca3af"
          nodeId={id}
        />
      </div>
    </BaseNode>
  );
});
