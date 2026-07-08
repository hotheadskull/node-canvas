import { memo, useRef, useState } from 'react';
import { Handle, Position, useReactFlow, NodeResizer } from '@xyflow/react';
import { Plus, Trash2, GripHorizontal } from 'lucide-react';
import { useStore } from '../store/useStore';

export const SequenceNode = memo(({ id, data, selected }: any) => {
  const updateNodeData = useStore(state => state.updateNodeData);
  const { getZoom } = useReactFlow();
  
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragState, setDragState] = useState({ isDragging: false, draggedIndex: -1, dragOverIndex: -1, startX: 0, currentX: 0 });

  const beats: { id: string, title: string, subtitle: string }[] = data.metadata?.beats || [];

  const updateMetadata = (newMetadata: any) => {
    updateNodeData(id, {
      metadata: { ...(data.metadata || {}), ...newMetadata }
    });
  };

  const handleBeatChange = (index: number, field: 'title' | 'subtitle', val: string) => {
    const newBeats = [...beats];
    newBeats[index] = { ...newBeats[index], [field]: val };
    updateMetadata({ beats: newBeats });
  };

  const addBeat = () => {
    updateMetadata({ 
      beats: [...beats, { id: `beat-${crypto.randomUUID().slice(0,6)}`, title: 'New Beat', subtitle: '' }] 
    });
  };

  const removeBeat = (index: number) => {
    const newBeats = beats.filter((_, i) => i !== index);
    updateMetadata({ beats: newBeats });
  };

  const handlePointerDown = (e: React.PointerEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.button !== 0) return;

    const startX = e.clientX;
    setDragState({ isDragging: true, draggedIndex: index, dragOverIndex: index, startX, currentX: startX });

    const handlePointerMove = (moveEvt: PointerEvent) => {
      if (!containerRef.current) return;
      const currentX = moveEvt.clientX;
      const zoom = getZoom();
      
      const rect = containerRef.current.getBoundingClientRect();
      const localX = (moveEvt.clientX - rect.left) / zoom;
      
      const slotWidth = 156; // 140px width + 16px gap
      let newHoverIndex = Math.floor(localX / slotWidth);
      newHoverIndex = Math.max(0, Math.min(beats.length - 1, newHoverIndex));
      
      setDragState(prev => ({
        ...prev,
        currentX,
        dragOverIndex: newHoverIndex
      }));
    };

    const handlePointerUp = () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      
      setDragState(prev => {
        if (prev.draggedIndex !== -1 && prev.dragOverIndex !== -1 && prev.draggedIndex !== prev.dragOverIndex) {
          setTimeout(() => {
            const newBeats = [...beats];
            const [moved] = newBeats.splice(prev.draggedIndex, 1);
            newBeats.splice(prev.dragOverIndex, 0, moved);
            updateMetadata({ beats: newBeats });
          }, 0);
        }
        return { isDragging: false, draggedIndex: -1, dragOverIndex: -1, startX: 0, currentX: 0 };
      });
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  return (
    <>
      <NodeResizer minWidth={400} minHeight={200} isVisible={selected} handleClassName="w-3 h-3 bg-[#111114] border-2 border-gray-500 rounded" />
      <div className="relative w-full h-full flex flex-col">
        <Handle id="top" type="target" position={Position.Top} className="w-3 h-3 bg-[#a855f7] border-2 border-[#111114] rounded-full z-50 -top-2" />
        
        <div className={`relative flex flex-col bg-[#111114] text-white rounded-md shadow-2xl transition-colors shadow-lg duration-200 border w-full h-full
          ${selected ? 'border-[#a855f7] scale-[1.01]' : 'border-[#4c1d95]'}
        `} style={{ 
          boxShadow: selected ? '0 20px 40px rgba(168,85,247,0.2)' : '0 10px 30px rgba(0,0,0,0.5)'
        }}>
          {/* Title Header */}
          <div className="bg-[#16161c] px-4 py-2 border-b border-[#2a2a35] flex items-center justify-between">
            <input
              type="text"
              className="bg-transparent text-sm font-bold text-[#a855f7] focus:outline-none w-[300px] tracking-wide uppercase"
              value={data.label}
              onChange={(e) => updateNodeData(id, { label: e.target.value })}
              placeholder="Sequence / Timeline Name..."
            />
            <button 
              onClick={addBeat} 
              className="flex items-center gap-1 text-[10px] uppercase font-bold text-[#4c1d95] hover:text-[#a855f7] transition-colors"
            >
              <Plus size={14} /> Add Beat
            </button>
          </div>

          {/* Horizontal Axis & Beats */}
          <div className="flex-1 relative flex items-center px-6 py-8 overflow-x-auto bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjEiIGZpbGw9IiMzMzMiLz48L3N2Zz4=')]">
            {/* The Central Line */}
            <div className="absolute left-0 right-0 h-1 bg-[#2a2a35] top-1/2 -translate-y-1/2 z-0" style={{ width: Math.max(800, beats.length * 160 + 100) + 'px' }} />

            <div ref={containerRef} className="flex items-center gap-4 relative z-10 select-none min-w-max">
              {beats.map((beat: any, i: number) => {
                const isDraggingThis = dragState.isDragging && dragState.draggedIndex === i;
                const zoom = getZoom();
                
                let translateX = 0;
                if (isDraggingThis) {
                  translateX = (dragState.currentX - dragState.startX) / zoom;
                } else if (dragState.isDragging) {
                  if (i > dragState.draggedIndex && i <= dragState.dragOverIndex) {
                    translateX = -156;
                  } else if (i < dragState.draggedIndex && i >= dragState.dragOverIndex) {
                    translateX = 156;
                  }
                }

                return (
                  <div 
                    key={beat.id} 
                    className="relative flex items-center transition-transform duration-200 ease-out"
                    style={{ 
                      transform: `translateX(${translateX}px)`,
                      transitionDuration: isDraggingThis ? '0ms' : '200ms',
                      zIndex: isDraggingThis ? 50 : 10
                    }}
                  >
                    <div 
                      className={`nodrag relative group flex flex-col w-[140px] bg-[#1a1a24] border border-[#2a2a35] rounded shadow-lg hover:border-[#a855f7] transition-colors
                        ${isDraggingThis ? 'border-[#a855f7] shadow-[0_10px_30px_rgba(168,85,247,0.3)] scale-[1.05]' : ''}
                      `}
                    >
                      <div 
                        onPointerDown={(e) => handlePointerDown(e, i)}
                        className="absolute -top-6 left-1/2 -translate-x-1/2 flex items-center justify-center w-8 h-5 bg-[#1a1a24] border border-[#2a2a35] rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing text-gray-500 hover:text-white"
                        title="Drag to reorder"
                      >
                        <GripHorizontal size={14} />
                      </div>
                      <button 
                        onClick={() => removeBeat(i)} 
                        className="absolute -top-2 -right-2 bg-[#111114] border border-[#2a2a35] rounded-full p-1 text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity z-20"
                      >
                        <Trash2 size={12} />
                      </button>

                      <div className="p-2 flex flex-col gap-1">
                        <input
                          type="text"
                          className="bg-transparent text-xs font-bold text-gray-200 focus:outline-none w-full text-center uppercase"
                          placeholder="Beat Title"
                          value={beat.title}
                          onChange={(e) => handleBeatChange(i, 'title', e.target.value)}
                        />
                        <input
                          type="text"
                          className="bg-transparent text-[10px] text-gray-400 focus:outline-none w-full text-center italic"
                          placeholder="Subtitle / Event..."
                          value={beat.subtitle}
                          onChange={(e) => handleBeatChange(i, 'subtitle', e.target.value)}
                        />
                      </div>
                      <Handle 
                        type="source" 
                        position={Position.Bottom} 
                        id={`beat-${beat.id}`}
                        className="w-4 h-4 bg-[#111114] border-2 border-[#a855f7] bottom-[-10px] cursor-crosshair z-30" 
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        <Handle id="bottom" type="source" position={Position.Bottom} className="w-3 h-3 bg-[#4ade80] border-2 border-[#111114] rounded-full z-50 -bottom-2" />
      </div>
    </>
  );
});
