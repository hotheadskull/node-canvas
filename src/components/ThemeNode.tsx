import React from 'react';
import { NodeProps } from '@xyflow/react';
import { useStore, AppNode } from '../store/useStore';
import { RichTextEditor } from './RichTextEditor';
import { BaseNode } from './BaseNode';
import { Book, FileText, Clapperboard, Library, File } from 'lucide-react';

const WRITING_TYPES = ['document', 'book', 'chapter', 'scene', 'story'];

const ICONS: Record<string, any> = {
  document: File,
  book: Book,
  chapter: FileText,
  scene: Clapperboard,
  story: Library,
};

const COLORS: Record<string, string> = {
  document: '#9ca3af',
  book: '#f59e0b',
  chapter: '#3b82f6',
  scene: '#ec4899',
  story: '#8b5cf6',
};

// Knowledge-type nodes shown as "cast" chips on connected writing nodes
const CAST_TYPES = ['character', 'location', 'faction', 'item', 'lore', 'event', 'quote', 'reference', 'snippet', 'idea'];

export function ThemeNode({ id, data, selected, type }: NodeProps<AppNode>) {
  const nodeType = type || 'document';
  const Icon = ICONS[nodeType] || File;
  const accentColor = COLORS[nodeType] || '#9ca3af';
  
  const updateNodeData = useStore(state => state.updateNodeData);
  const updateNodeType = useStore(state => state.updateNodeType);
  const setFocusedNode = useStore(state => state.setFocusedNode);
  const edges = useStore(state => state.edges);
  const allNodes = useStore(state => state.nodes);

  const textContent = data.manuscript || data.content || '';
  const wordCount = textContent.split(/\s+/).filter((w: string) => w.length > 0).length;

  const isLeveledUp = (nodeType === 'chapter' || nodeType === 'scene') && wordCount >= 500;
  const fillPercentage = Math.min(100, (wordCount / 500) * 100);

  const castChips = edges
    .filter(e => e.source === id || e.target === id)
    .map(e => (e.source === id ? e.target : e.source))
    .map(nid => {
      const n = allNodes.find(x => x.id === nid);
      if (n?.type === 'alias' && (n.data as any)?.metadata?.targetId) {
        return allNodes.find(x => x.id === (n.data as any).metadata.targetId);
      }
      return n;
    })
    .filter((n): n is AppNode => !!n && CAST_TYPES.includes(n.type || ''))
    .filter((n, i, arr) => arr.findIndex(x => x.id === n.id) === i)
    .slice(0, 6);

  return (
    <BaseNode
      id={id}
      data={data}
      selected={selected}
      minWidth={280}
      minHeight={200}
      icon={Icon}
      accentColor={accentColor}
      showFunction={true}
      showTags={true}
      headerRight={
        <select
          className="text-[10px] text-gray-400 bg-[#1a1a1f] px-1.5 py-1 rounded border border-[#333] flex-shrink-0 cursor-pointer outline-none uppercase font-bold tracking-wider hover:border-gray-500 transition-colors"
          value={nodeType}
          onChange={(e) => updateNodeType(id, e.target.value)}
          onPointerDown={(e) => e.stopPropagation()}
        >
          {WRITING_TYPES.map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      }
    >
      {/* Liquid Volume Background */}
      <div
        className="absolute bottom-0 left-0 w-full transition-colors duration-1000 ease-in-out opacity-10 pointer-events-none z-0"
        style={{
          height: `${fillPercentage}%`,
          background: isLeveledUp ? 'linear-gradient(to top, #fbbf24, #f59e0b)' : `linear-gradient(to top, ${accentColor}, ${accentColor}40)`,
        }}
      />

      <div className="flex-1 flex flex-col relative z-10 overflow-hidden bg-black/20 p-2">
        <RichTextEditor
          content={textContent}
          onChange={(html) => {
            if (['document', 'book', 'chapter', 'scene'].includes(nodeType)) {
              updateNodeData(id, { manuscript: html });
            } else {
              updateNodeData(id, { content: html });
            }
          }}
          textColor="#e5e7eb"
          nodeId={id}
        />
      </div>

      {castChips.length > 0 && (
        <div className="flex flex-wrap gap-1 p-2 bg-[#1a1a24]/50 border-t border-[#2a2a35] z-10 relative pointer-events-none">
          {castChips.map(chip => (
            <span
              key={chip.id}
              className="text-[9px] px-1.5 py-0.5 rounded-full border bg-black/40 truncate max-w-[90px] text-gray-300 border-gray-600"
            >
              {chip.data.label || 'Untitled'}
            </span>
          ))}
        </div>
      )}

      <div className="bg-[#151518] border-t border-[#2a2a35] px-3 py-1.5 flex items-center justify-between z-10 relative">
        <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{wordCount} words</span>
        <button
          onClick={(e) => { e.stopPropagation(); setFocusedNode(id); }}
          className="text-[10px] text-[#3b82f6] hover:text-[#60a5fa] transition-colors uppercase font-bold tracking-widest"
          title="Focus Writing Mode"
        >
          Expand
        </button>
      </div>
    </BaseNode>
  );
}
