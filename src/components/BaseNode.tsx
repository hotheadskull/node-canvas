import React, { memo } from 'react';
import { Handle, Position, NodeResizer } from '@xyflow/react';
import { useStore } from '../store/useStore';
import { Settings, Hash } from 'lucide-react';

export interface BaseNodeProps {
  id: string;
  data: any;
  selected: boolean;
  minWidth?: number;
  minHeight?: number;
  icon: React.ElementType;
  accentColor: string;
  headerTitlePlaceholder?: string;
  headerInputClassName?: string;
  showFunction?: boolean;
  showTags?: boolean;
  headerRight?: React.ReactNode;
  hasTopHandle?: boolean;
  hasBottomHandle?: boolean;
  hasLeftHandle?: boolean;
  hasRightHandle?: boolean;
  resizable?: boolean;
  children: React.ReactNode;
}

const FUNC_COLORS: Record<string, string> = {
  none: 'transparent',
  scripture: '#fbbf24', // Amber
  illustration: '#60a5fa', // Blue
  quote: '#a78bfa', // Purple
  application: '#34d399', // Emerald
  transition: '#f472b6', // Pink
};

export const BaseNode = memo(({ 
  id, 
  data, 
  selected, 
  minWidth = 150, 
  minHeight = 100, 
  icon: Icon, 
  accentColor, 
  headerTitlePlaceholder = "TITLE",
  headerInputClassName,
  showFunction = false,
  showTags = false,
  headerRight,
  hasTopHandle = true,
  hasBottomHandle = true,
  hasLeftHandle = true,
  hasRightHandle = true,
  resizable = true,
  children 
}: BaseNodeProps) => {
  const updateNodeData = useStore(state => state.updateNodeData);

  const meta = data.metadata || {};
  const currentFunc = meta.function || 'none';
  const tags = meta.tags || '';

  const updateMetadata = (key: string, value: string) => {
    updateNodeData(id, {
      metadata: { ...meta, [key]: value }
    });
  };

  return (
    <>
      {resizable && (
        <NodeResizer 
          minWidth={minWidth} 
          minHeight={minHeight} 
          isVisible={selected} 
          handleClassName="w-3 h-3 bg-[#151518] border-2 border-white rounded transition-transform hover:scale-125" 
        />
      )}
      <div className="relative w-full h-full">
        {/* Handles */}
        {hasTopHandle && <Handle id="top" type="target" position={Position.Top} className="w-3 h-3 rounded-full border-2 border-[#151518] z-50 transition-transform hover:scale-125" style={{ backgroundColor: accentColor }} />}
        {hasBottomHandle && <Handle id="bottom" type="source" position={Position.Bottom} className="w-3 h-3 rounded-full border-2 border-[#151518] z-50 transition-transform hover:scale-125" style={{ backgroundColor: accentColor }} />}
        {hasLeftHandle && <Handle id="left" type="target" position={Position.Left} className="w-3 h-3 rounded-full border-2 border-[#151518] z-50 transition-transform hover:scale-125" style={{ backgroundColor: accentColor }} />}
        {hasRightHandle && <Handle id="right" type="source" position={Position.Right} className="w-3 h-3 rounded-full border-2 border-[#151518] z-50 transition-transform hover:scale-125" style={{ backgroundColor: accentColor }} />}

        {/* Main Container */}
        <div 
          className="relative w-full h-full flex flex-col bg-[#151518] text-white rounded-md transition-colors duration-200 overflow-hidden border-2"
          style={{ 
            minWidth: `${minWidth}px`,
            minHeight: `${minHeight}px`,
            borderColor: selected ? accentColor : `${accentColor}40`,
            boxShadow: selected ? `0 20px 40px ${accentColor}33` : '0 10px 30px rgba(0,0,0,0.5)'
          }}
        >
          {/* Header */}
          <div 
            className="px-3 py-2 border-b flex items-center justify-between z-10"
            style={{ 
              backgroundColor: `${accentColor}15`,
              borderColor: `${accentColor}40`
            }}
          >
            {/* flex-1 + min-w-0 (NOT w-full): a w-full first child pushed the
                type selector and function pill past the node edge, where
                overflow-hidden clipped them */}
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Icon size={14} style={{ color: accentColor }} className="flex-shrink-0" />
              <input
                type="text"
                className={`bg-transparent flex-1 focus:outline-none min-w-0 ${headerInputClassName || 'text-sm font-bold'}`}
                style={{ color: accentColor }}
                value={data.label || ''}
                onChange={(e) => updateNodeData(id, { label: e.target.value })}
                onPointerDown={(e) => e.stopPropagation()}
                placeholder={headerTitlePlaceholder}
              />
            </div>

            {headerRight}
            {/* Function pill collapses to just its colored dot when the node
                isn't selected -- chrome should never crowd out content */}
            {showFunction && (selected || currentFunc !== 'none') && (
              <div className={`flex items-center ml-2 flex-shrink-0 gap-1 relative group cursor-pointer transition-colors ${selected ? 'border border-[#333] rounded px-1.5 py-0.5 bg-[#1a1a24] hover:border-gray-500' : ''}`}>
                {selected && (
                  <>
                    <Settings size={10} className="text-gray-500" />
                    <select
                      className="bg-transparent text-[10px] text-gray-400 font-bold uppercase tracking-wider outline-none cursor-pointer appearance-none pl-1 pr-2 max-w-[90px]"
                      value={currentFunc}
                      onChange={(e) => updateMetadata('function', e.target.value)}
                      onPointerDown={(e) => e.stopPropagation()}
                    >
                      <option value="none">None</option>
                      <option value="scripture">Scripture</option>
                      <option value="illustration">Illustration</option>
                      <option value="quote">Quote</option>
                      <option value="application">Application</option>
                      <option value="transition">Transition</option>
                    </select>
                  </>
                )}
                {currentFunc !== 'none' && (
                  <div
                    className="w-2 h-2 rounded-full shadow-[0_0_8px_currentColor] flex-shrink-0"
                    style={{ backgroundColor: FUNC_COLORS[currentFunc], color: FUNC_COLORS[currentFunc] }}
                    title={`Function: ${currentFunc}`}
                  />
                )}
              </div>
            )}
          </div>

          {/* Tags row only renders when it has content or the node is selected,
              so small cards keep their body space */}
          {showTags && (selected || tags.trim().length > 0) && (
            <div className="bg-[#1a1a24]/80 px-3 py-1.5 border-b border-[#2a2a35] flex items-center gap-1.5 z-10">
              <Hash size={12} className="text-gray-500 flex-shrink-0" />
              <input
                type="text"
                className="bg-transparent flex-1 text-[10px] font-bold text-gray-400 focus:outline-none placeholder-[#3a3a45] uppercase tracking-widest min-w-0"
                value={tags}
                onChange={(e) => updateMetadata('tags', e.target.value)}
                onPointerDown={(e) => e.stopPropagation()}
                placeholder="TAGS (COMMA SEPARATED)"
              />
            </div>
          )}

          {/* Content Area */}
          <div className="flex-1 flex flex-col relative z-10 overflow-hidden">
            {children}
          </div>
        </div>
      </div>
    </>
  );
});
