import { memo } from 'react';
import { Handle, Position, NodeResizer } from '@xyflow/react';
import { Network, Minimize2, Maximize2 } from 'lucide-react';
import { useStore } from '../store/useStore';

export const HubNode = memo(({ id, data, selected }: any) => {
  const updateNodeData = useStore(state => state.updateNodeData);
  const edges = useStore(state => state.edges);
  
  const isCollapsed = data.metadata?.isCollapsed || false;
  
  // Count how many items are connected to this hub (as a target or source)
  const connectedCount = edges.filter(e => e.source === id || e.target === id).length;

  const toggleCollapse = () => {
    updateNodeData(id, {
      metadata: { ...(data.metadata || {}), isCollapsed: !isCollapsed }
    });
  };

  return (
    <>
      <NodeResizer minWidth={200} minHeight={150} isVisible={selected} handleClassName="w-3 h-3 bg-[#151518] border-2 border-white rounded transition-transform hover:scale-125" />
      <div className={`relative flex items-center justify-center text-white transition-colors shadow-lg duration-300
      ${selected ? 'scale-[1.05]' : ''}
    `} style={{ 
      width: '100%', 
      height: '100%',
      filter: selected ? 'drop-shadow(0 0 20px rgba(168,85,247,0.6))' : 'drop-shadow(0 10px 15px rgba(0,0,0,0.8))',
    }}>
      {/* Outer Clip Path (Acts as the Border) */}
      <div 
        className="absolute inset-0 transition-colors"
        style={{ 
          backgroundColor: selected ? '#a855f7' : isCollapsed ? '#7e22ce' : '#4c1d95',
          clipPath: 'polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)'
        }}
      />

      {/* Inner Clip Path (Acts as the Background) */}
      <div 
        className="absolute transition-colors"
        style={{
          top: '2px', left: '2px', right: '2px', bottom: '2px',
          background: isCollapsed 
            ? 'linear-gradient(135deg, #2a1145 0%, #111114 100%)' 
            : 'linear-gradient(135deg, #16161c 0%, #111114 100%)',
          clipPath: 'polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)'
        }}
      />
      
      {/* 4-way Handles on the very edges */}
      <Handle id="top" type="target" position={Position.Top} className="w-3 h-3 rounded-full border-2 border-[#151518] z-50 transition-transform hover:scale-125 bg-[#a855f7]" />
      <Handle id="bottom" type="source" position={Position.Bottom} className="w-3 h-3 rounded-full border-2 border-[#151518] z-50 transition-transform hover:scale-125 bg-[#a855f7]" />
      <Handle id="left" type="target" position={Position.Left} className="w-3 h-3 rounded-full border-2 border-[#151518] z-50 transition-transform hover:scale-125 bg-[#a855f7]" />
      <Handle id="right" type="source" position={Position.Right} className="w-3 h-3 rounded-full border-2 border-[#151518] z-50 transition-transform hover:scale-125 bg-[#a855f7]" />

      {/* 4-way Diagonal Handles to prevent edges from clipping through the corners */}
      <Handle id="top-left" type="target" position={Position.Top} className="w-3 h-3 rounded-full border-2 border-[#151518] z-50 transition-transform hover:scale-125 bg-[#a855f7]" style={{ left: '18px', top: '12px' }} />
      <Handle id="top-right" type="target" position={Position.Top} className="w-3 h-3 rounded-full border-2 border-[#151518] z-50 transition-transform hover:scale-125 bg-[#a855f7]" style={{ left: '102px', top: '12px' }} />
      <Handle id="bottom-left" type="source" position={Position.Bottom} className="w-3 h-3 rounded-full border-2 border-[#151518] z-50 transition-transform hover:scale-125 bg-[#a855f7]" style={{ left: '18px', bottom: '12px' }} />
      <Handle id="bottom-right" type="source" position={Position.Bottom} className="w-3 h-3 rounded-full border-2 border-[#151518] z-50 transition-transform hover:scale-125 bg-[#a855f7]" style={{ left: '102px', bottom: '12px' }} />

      <div className="flex flex-col items-center justify-center p-2 text-center z-10 w-full h-full gap-2">
        <Network size={20} className={isCollapsed ? 'text-[#a855f7]' : 'text-gray-500'} />
        
        <input
          type="text"
          className="bg-transparent text-[10px] font-bold text-gray-300 focus:outline-none w-full text-center uppercase tracking-widest"
          value={data.label}
          onChange={(e) => updateNodeData(id, { label: e.target.value })}
          placeholder="HUB NAME"
        />

        <button 
          onClick={toggleCollapse}
          className={`flex items-center justify-center w-8 h-8 rounded-full border transition-colors shadow-lg ${
            isCollapsed 
              ? 'bg-[#a855f7] border-[#d8b4fe] text-white shadow-[0_0_15px_#a855f7]' 
              : 'bg-[#1a1a24] border-[#4c1d95] text-gray-400 hover:text-white hover:border-[#a855f7]'
          }`}
          title={isCollapsed ? "Expand Canvas" : "Collapse Canvas"}
        >
          {isCollapsed ? <Maximize2 size={14} /> : <Minimize2 size={14} />}
        </button>
        
        {isCollapsed && connectedCount > 0 && (
          <div className="absolute -top-1 -right-1 bg-[#d8b4fe] text-[#4c1d95] text-[10px] font-bold px-1.5 py-0.5 rounded-full">
            {connectedCount}
          </div>
        )}
      </div>
    </div>
    </>
  );
});
