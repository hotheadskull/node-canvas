import { memo } from 'react';
import { NodeProps } from '@xyflow/react';
import { useStore, AppNode } from '../store/useStore';
import { Layers, ChevronLeft, ChevronRight, Inbox } from 'lucide-react';
import { BaseNode } from './BaseNode';

export const DeckNode = memo(({ id, data, selected }: NodeProps<AppNode>) => {
  const updateNodeData = useStore(state => state.updateNodeData);

  const meta = data.metadata || {};
  const cards = meta.cards || [];
  const activeIndex = meta.activeIndex || 0;

  const handlePrev = () => {
    if (activeIndex > 0) {
      updateNodeData(id, { metadata: { ...meta, activeIndex: activeIndex - 1 } });
    }
  };

  const handleNext = () => {
    if (activeIndex < cards.length - 1) {
      updateNodeData(id, { metadata: { ...meta, activeIndex: activeIndex + 1 } });
    }
  };

  const activeCard = cards[activeIndex];

  return (
    <BaseNode
      id={id}
      data={data}
      selected={selected}
      minWidth={200}
      minHeight={150}
      icon={Layers}
      accentColor="#f43f5e"
      headerTitlePlaceholder="IDEA DECK"
      showFunction={true}
      showTags={true}
      headerRight={
        cards.length > 0 && (
          <div className="flex items-center gap-1 bg-black/30 rounded border border-[#881337] px-1 ml-2">
            <button 
              onClick={handlePrev} 
              disabled={activeIndex === 0}
              className={`hover:text-[#f43f5e] transition-colors ${activeIndex === 0 ? 'text-gray-700 cursor-not-allowed' : 'text-gray-300'}`}
            >
              <ChevronLeft size={12} />
            </button>
            <span className="text-[9px] font-bold text-rose-200 w-6 text-center">
              {activeIndex + 1}/{cards.length}
            </span>
            <button 
              onClick={handleNext} 
              disabled={activeIndex === cards.length - 1}
              className={`hover:text-[#f43f5e] transition-colors ${activeIndex === cards.length - 1 ? 'text-gray-700 cursor-not-allowed' : 'text-gray-300'}`}
            >
              <ChevronRight size={12} />
            </button>
          </div>
        )
      }
    >
      {/* Visual Stack Effect */}
      {cards.length > 1 && (
        <div className="absolute top-0 right-0 w-4 h-full bg-[#881337]/20 border-l border-[#881337] z-0" />
      )}

      {/* Body */}
      <div className="p-3 bg-[#1a1a24]/30 flex-1 flex flex-col justify-center relative z-10">
        {cards.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-gray-600 gap-2 opacity-50 py-4">
            <Inbox size={24} />
            <div className="text-[10px] font-bold uppercase tracking-widest text-center">Drag Ideas Here</div>
          </div>
        ) : (
          <div className="flex flex-col h-full w-full">
            <div className="text-xs font-bold text-rose-300 mb-1 border-b border-rose-900/30 pb-1 truncate">
              {activeCard.label || 'Untitled Card'}
            </div>
            <div className="text-[10px] text-gray-300 font-serif leading-relaxed whitespace-pre-wrap overflow-y-auto min-h-[40px] max-h-[100px]" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              {activeCard.content || 'No content...'}
            </div>
          </div>
        )}
      </div>
    </BaseNode>
  );
});
