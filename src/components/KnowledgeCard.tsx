import React, { memo } from 'react';
import { NodeProps } from '@xyflow/react';
import { useStore, AppNode } from '../store/useStore';
import { RichTextEditor } from './RichTextEditor';
import { BaseNode } from './BaseNode';
import { 
  User, 
  MapPin, 
  Shield, 
  CalendarClock, 
  BookOpen, 
  Gem, 
  Lightbulb, 
  Tags
} from 'lucide-react';
import { EDGE_TYPES } from '../utils/edgeTypes';

const SELECTABLE_KINDS = ['character', 'location', 'faction', 'event', 'lore', 'item', 'reference'];

const KINDS: Record<string, any> = {
  character: { label: 'Character', icon: User, color: '#3b82f6' }, // Blue
  location: { label: 'Location', icon: MapPin, color: '#10b981' }, // Green
  faction: { label: 'Faction', icon: Shield, color: '#ef4444' }, // Red
  event: { label: 'Event', icon: CalendarClock, color: '#6366f1' }, // Indigo
  lore: { label: 'Concept', icon: BookOpen, color: '#14b8a6' }, // Teal
  item: { label: 'Item', icon: Gem, color: '#f59e0b' }, // Amber
  reference: { label: 'Idea', icon: Lightbulb, color: '#94a3b8' }, // Slate
  snippet: { label: 'Idea', icon: Lightbulb, color: '#94a3b8' },
  idea: { label: 'Idea', icon: Lightbulb, color: '#94a3b8' },
  citation: { label: 'Citation', icon: BookOpen, color: '#f59e0b' },
};

const WRITING_TYPES = ['document', 'book', 'chapter', 'scene', 'master'];

export const KnowledgeCard = memo(({ id, data, selected, type }: NodeProps<AppNode>) => {
  const nodeType = type || 'reference';
  const kind = KINDS[nodeType] || KINDS['reference'];
  const Icon = kind.icon;
  
  const updateNodeData = useStore(state => state.updateNodeData);
  const updateNodeType = useStore(state => state.updateNodeType);
  const edges = useStore(state => state.edges);
  const allNodes = useStore(state => state.nodes);

  const meta = data.metadata || {};
  const aliases: string = meta.aliases || '';

  // APPEARS IN Logic
  const aliasPinIds = allNodes
    .filter(n => n.type === 'alias' && n.data?.metadata?.targetId === id)
    .map(n => n.id);
  const myIds = new Set([id, ...aliasPinIds]);
  const appearsInGroups: Record<string, AppNode[]> = {};
  
  for (const e of edges) {
    if (!myIds.has(e.source) && !myIds.has(e.target)) continue;
    const otherId = myIds.has(e.source) ? e.target : e.source;
    const node = allNodes.find(n => n.id === otherId);
    if (!node || !WRITING_TYPES.includes(node.type || '')) continue;
    
    const eType = (e.data as any)?.edgeType || 'references';
    if (!appearsInGroups[eType]) appearsInGroups[eType] = [];
    if (!appearsInGroups[eType].find(n => n.id === node.id)) {
      appearsInGroups[eType].push(node);
    }
  }
  const hasAppearsIn = Object.keys(appearsInGroups).length > 0;

  return (
    <BaseNode
      id={id}
      data={data}
      selected={selected}
      minWidth={200}
      minHeight={150}
      icon={Icon}
      accentColor={kind.color}
      showFunction={true}
      showTags={true}
      headerRight={
        <select
          className="text-[10px] text-gray-400 bg-[#1a1a1f] px-1.5 py-1 rounded border border-[#333] flex-shrink-0 cursor-pointer outline-none uppercase font-bold tracking-wider hover:border-gray-500 transition-colors"
          value={SELECTABLE_KINDS.includes(nodeType) ? nodeType : 'reference'}
          onChange={(e) => updateNodeType(id, e.target.value)}
          onPointerDown={(e) => e.stopPropagation()}
        >
          {SELECTABLE_KINDS.map(k => (
            <option key={k} value={k}>{KINDS[k].label}</option>
          ))}
        </select>
      }
    >
      {/* Aliases Input */}
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-[#2a2a35] bg-black/10">
        <Tags size={11} className="text-gray-600 flex-shrink-0" />
        <input
          className="flex-1 min-w-0 bg-transparent text-[10px] text-gray-400 outline-none focus:text-white italic tracking-wide"
          value={aliases}
          onChange={(e) => updateNodeData(id, { metadata: { ...meta, aliases: e.target.value } })}
          onPointerDown={(e) => e.stopPropagation()}
          placeholder="Aliases (comma-separated)"
        />
      </div>

      {/* Body Content */}
      <div className="flex-1 min-h-0 px-3 py-2 bg-[#1a1a24]/30">
        <RichTextEditor
          content={data.content || ''}
          onChange={(html) => updateNodeData(id, { content: html })}
          textColor="#d1d5db"
          nodeId={id}
        />
      </div>

      {/* Appears in Footer */}
      {hasAppearsIn && (
        <div className="px-3 py-2 border-t border-[#2a2a35] bg-black/20 flex flex-col gap-1.5 pointer-events-none">
          {Object.entries(appearsInGroups).map(([type, nodes]) => {
            const def = EDGE_TYPES[type] || EDGE_TYPES['references'];
            return (
              <div key={type} className="flex flex-wrap items-center gap-1">
                <span className="text-[9px] uppercase tracking-widest mr-1" style={{ color: def.color }}>
                  {def.label}
                </span>
                {nodes.slice(0, 5).map(n => (
                  <span key={n.id} className="text-[9px] px-1.5 py-0.5 rounded-full border bg-black/40 truncate max-w-[100px]" style={{ borderColor: def.color, color: '#e5e7eb' }}>
                    {n.data.label || 'Untitled'}
                  </span>
                ))}
                {nodes.length > 5 && <span className="text-[9px] text-gray-500">+{nodes.length - 5}</span>}
              </div>
            );
          })}
        </div>
      )}
    </BaseNode>
  );
});
