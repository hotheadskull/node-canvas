import { memo } from 'react';
import { Handle, Position, NodeResizer } from '@xyflow/react';
import { useStore } from '../store/useStore';
import { Layers, ChevronLeft, ChevronRight, Inbox } from 'lucide-react';

export const DeckNode = memo(({ id, data, selected }: any) => {
  const updateNodeData = useStore(state => state.updateNodeData);

  const cards = data.cards || [];
  const activeIndex = data.activeIndex || 0;

  const handlePrev = () => {
    if (activeIndex > 0) {
      updateNodeData(id, { activeIndex: activeIndex - 1 });
    }
  };

  const handleNext = () => {
    if (activeIndex < cards.length - 1) {
      updateNodeData(id, { activeIndex: activeIndex + 1 });
    }
  };

  const activeCard = cards[activeIndex];

  return (
    <>
      <NodeResizer minWidth={200} minHeight={150} isVisible={selected} handleClassName="w-3 h-3 bg-[#151518] border-2 border-white rounded transition-transform hover:scale-125" />
      <div style={{ width: '100%', height: '100%' }} className={`relative bg-[#0f1115] rounded-xl border-2 transition-colors shadow-lg duration-300 w-72 shadow-2xl flex flex-col
      ${selected ? 'border-[#f43f5e] shadow-[0_0_20px_rgba(244,63,94,0.3)]' : 'border-[#881337]'}
    `}>
      {/* Decorative stacked card effect behind */}
      {cards.length > 1 && (
        <div className="absolute top-1 left-1 w-full h-full border-2 border-[#881337] rounded-xl -z-10 bg-[#0f1115]" />
      )}
      {cards.length > 2 && (
        <div className="absolute top-2 left-2 w-full h-full border-2 border-[#881337] rounded-xl -z-20 bg-[#0f1115]" />
      )}

      <Handle type="target" position={Position.Top} className="w-3 h-3 rounded-full border-2 border-[#151518] z-50 transition-transform hover:scale-125 bg-[#f43f5e] -top-2" />

      {/* Header */}
      <div className="bg-[#881337]/30 p-2 border-b-2 border-[#881337] flex items-center justify-between rounded-t-lg">
        <div className="flex items-center gap-2">
          <Layers size={16} className="text-[#f43f5e]" />
          <input
            type="text"
            className="w-32 bg-transparent text-sm font-bold text-rose-100 focus:outline-none placeholder-rose-900 uppercase tracking-widest"
            value={data.label || ''}
            onChange={(e) => updateNodeData(id, { label: e.target.value })}
            placeholder="IDEA DECK"
          />
        </div>
        
        {/* Navigation */}
        {cards.length > 0 && (
          <div className="flex items-center gap-2 bg-[#151518] rounded-full px-2 py-1 border border-[#881337]">
            <button 
              onClick={handlePrev} 
              disabled={activeIndex === 0}
              className={`hover:text-[#f43f5e] transition-colors ${activeIndex === 0 ? 'text-gray-700 cursor-not-allowed' : 'text-gray-300'}`}
            >
              <ChevronLeft size={14} />
            </button>
            <span className="text-[10px] font-bold text-rose-200 w-8 text-center">
              {activeIndex + 1} / {cards.length}
            </span>
            <button 
              onClick={handleNext} 
              disabled={activeIndex === cards.length - 1}
              className={`hover:text-[#f43f5e] transition-colors ${activeIndex === cards.length - 1 ? 'text-gray-700 cursor-not-allowed' : 'text-gray-300'}`}
            >
              <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="p-4 bg-[#0a0c0f] rounded-b-xl flex flex-col justify-center relative">
        
        {cards.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-gray-600 gap-2 opacity-50 py-4">
            <Inbox size={32} />
            <div className="text-xs font-bold uppercase tracking-widest text-center">Drag & Drop Ideas Here</div>
          </div>
        ) : (
          <div className="flex flex-col h-full w-full">
            <div className="text-sm font-bold text-rose-300 mb-2 border-b border-rose-900/30 pb-1">
              {activeCard.label || 'Untitled Card'}
            </div>
            <div className="text-sm text-gray-300 font-serif leading-relaxed whitespace-pre-wrap">
              {activeCard.content || 'No content...'}
            </div>
          </div>
        )}

      </div>

      <Handle type="source" position={Position.Bottom} className="w-3 h-3 rounded-full border-2 border-[#151518] z-50 transition-transform hover:scale-125 bg-[#f43f5e] -bottom-2" />
    </div>
    </>
  );
});
