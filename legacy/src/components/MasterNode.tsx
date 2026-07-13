import { memo } from 'react';
import { NodeProps } from '@xyflow/react';
import { useStore, AppNode } from '../store/useStore';
import { Crown } from 'lucide-react';
import { BaseNode } from './BaseNode';

export const MasterNode = memo(({ id, data, selected }: NodeProps<AppNode>) => {
  const updateNodeData = useStore(state => state.updateNodeData);
  const mode = useStore(state => state.mode);

  const logline: string = typeof data.logline === 'string' ? data.logline : '';
  const theme: string = typeof data.theme === 'string' ? data.theme : '';
  const audience: string = typeof data.audience === 'string' ? data.audience : '';

  let pitchLabel = "MAIN CONCEPT";
  let loglineLabel = "Core Idea";
  let loglinePlaceholder = "The core concept connecting this project...";
  let leftLabel = "Core Theme";
  let leftPlaceholder = "e.g. Technology";
  let rightLabel = "Target Audience";
  let rightPlaceholder = "e.g. Stakeholders";
  let synopsisLabel = "Summary";
  let synopsisPlaceholder = "A brief overview...";

  if (mode === 'novel') {
    pitchLabel = "MASTER PITCH";
    loglineLabel = "Logline";
    loglinePlaceholder = "One sentence summary of the entire work...";
    leftLabel = "Core Theme";
    leftPlaceholder = "e.g. Redemption";
    rightLabel = "Target Audience";
    rightPlaceholder = "e.g. Young Adult Fantasy";
    synopsisLabel = "Synopsis";
    synopsisPlaceholder = "A brief overview of the plot...";
  } else if (mode === 'sermon') {
    pitchLabel = "BIG IDEA";
    loglineLabel = "Core Message";
    loglinePlaceholder = "The single sentence every point must serve...";
    leftLabel = "Key Passage";
    leftPlaceholder = "e.g. John 3:16";
    rightLabel = "Target Congregation";
    rightPlaceholder = "e.g. Youth Ministry";
    synopsisLabel = "Sermon Outline";
    synopsisPlaceholder = "A brief overview of the flow...";
  }

  return (
    <BaseNode
      id={id}
      data={data}
      selected={selected}
      minWidth={350}
      minHeight={200}
      icon={Crown}
      accentColor="#fbbf24"
      headerInputClassName="text-2xl font-serif font-black uppercase text-center w-full"
      headerTitlePlaceholder={pitchLabel}
      showFunction={false}
      showTags={false}
    >
      {/* Body */}
      <div className="p-4 bg-[#1a1a24]/30 flex-1 min-h-0 flex flex-col gap-4 overflow-y-auto" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        
        <div>
          <div className="text-[10px] font-bold text-amber-600 uppercase tracking-widest mb-1">{loglineLabel}</div>
          <textarea
            className="w-full bg-[#151518] border border-[#2a2a35] rounded p-3 text-sm text-amber-100/90 resize-none focus:outline-none focus:border-[#fbbf24] font-serif transition-colors shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]"
            rows={2}
            value={logline}
            onChange={(e) => updateNodeData(id, { logline: e.target.value })}
            placeholder={loglinePlaceholder}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-[10px] font-bold text-amber-600 uppercase tracking-widest mb-1">{leftLabel}</div>
            <input
              type="text"
              className="w-full bg-[#151518] border border-[#2a2a35] rounded p-2 text-sm text-amber-100/90 focus:outline-none focus:border-[#fbbf24] transition-colors shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]"
              value={theme}
              onChange={(e) => updateNodeData(id, { theme: e.target.value })}
              placeholder={leftPlaceholder}
            />
          </div>
          <div>
            <div className="text-[10px] font-bold text-amber-600 uppercase tracking-widest mb-1">{rightLabel}</div>
            <input
              type="text"
              className="w-full bg-[#151518] border border-[#2a2a35] rounded p-2 text-sm text-amber-100/90 focus:outline-none focus:border-[#fbbf24] transition-colors shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]"
              value={audience}
              onChange={(e) => updateNodeData(id, { audience: e.target.value })}
              placeholder={rightPlaceholder}
            />
          </div>
        </div>

        <div className="flex-1 flex flex-col min-h-[100px]">
          <div className="text-[10px] font-bold text-amber-600 uppercase tracking-widest mb-1">{synopsisLabel}</div>
          <textarea
            className="w-full flex-1 bg-[#151518] border border-[#2a2a35] rounded p-3 text-sm text-amber-100/90 resize-none focus:outline-none focus:border-[#fbbf24] font-serif transition-colors shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]"
            value={data.content || ''}
            onChange={(e) => updateNodeData(id, { content: e.target.value })}
            placeholder={synopsisPlaceholder}
          />
        </div>

      </div>
    </BaseNode>
  );
});
