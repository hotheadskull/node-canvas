import { memo } from 'react';
import { NodeResizer } from '@xyflow/react';
import { useStore } from '../store/useStore';
import { Layers, GripHorizontal } from 'lucide-react';

export const GroupNode = memo(({ id, data, selected }: any) => {
  const updateNodeData = useStore(state => state.updateNodeData);

  return (
    <>
      <NodeResizer 
        color="#a855f7" 
        isVisible={selected} 
        minWidth={200} 
        minHeight={200}
        handleStyle={{ width: 10, height: 10, borderRadius: '50%', border: '2px solid #111114' }}
        lineStyle={{ border: '1px solid #a855f7' }}
      />
      
      <div 
        className={`relative w-full h-full flex flex-col rounded border transition-colors
          ${selected ? 'border-[#a855f7]' : 'border-[#2a2a35]'}
        `}
        style={{
          // Must match the NodeResizer minimums above -- when this was 400px
          // the resize frame could shrink to 200 while the card refused to
          // follow, recreating the frame-bigger-than-card glitch.
          minWidth: '200px',
          minHeight: '200px',
          // A very faint translucent background so it acts as a zone
          background: 'radial-gradient(circle at center, rgba(26,26,36,0.5) 0%, rgba(17,17,20,0.8) 100%)',
          backdropFilter: 'blur(2px)',
        }}
      >
        {/* Art Deco Corners */}
        <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-[#a855f7] opacity-50" />
        <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-[#a855f7] opacity-50" />
        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-[#a855f7] opacity-50" />
        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-[#a855f7] opacity-50" />

        {/* Title Header */}
        <div className="flex items-center gap-2 px-4 py-2 opacity-80 border-b border-[#2a2a35] bg-[#16161c]/50 custom-drag-handle cursor-grab active:cursor-grabbing">
          <GripHorizontal size={14} className="text-[#a855f7] opacity-50 hover:opacity-100 flex-shrink-0" />
          <Layers size={14} className="text-[#a855f7]" />
          <input
            type="text"
            className="bg-transparent text-sm font-bold text-gray-300 focus:outline-none w-full tracking-widest uppercase"
            value={data.label}
            onChange={(e) => updateNodeData(id, { label: e.target.value })}
            placeholder="GROUP ZONE"
          />
        </div>
        
        {/* Empty body to hold nodes visually */}
        <div className="flex-1 w-full h-full pointer-events-none" />
      </div>
    </>
  );
});
