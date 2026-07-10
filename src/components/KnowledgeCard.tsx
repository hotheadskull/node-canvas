import { memo, useState } from 'react';
import { NodeProps, useReactFlow } from '@xyflow/react';
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


export const KnowledgeCard = memo(({ id, data, selected, type }: NodeProps<AppNode>) => {
  const nodeType = type || 'reference';
  const kind = KINDS[nodeType] || KINDS['reference'];
  const Icon = kind.icon;
  
  const updateNodeData = useStore(state => state.updateNodeData);
  const updateNodeType = useStore(state => state.updateNodeType);
  const edges = useStore(state => state.edges);
  const allNodes = useStore(state => state.nodes);
  const { setCenter } = useReactFlow();

  const [activeTab, setActiveTab] = useState<'notes'|'connections'|'arc'>('notes');

  const meta = data.metadata || {};
  const aliases: string = meta.aliases || '';

  // GATHER ALL CONNECTIONS
  const aliasPinIds = allNodes
    .filter(n => n.type === 'alias' && n.data?.metadata?.targetId === id)
    .map(n => n.id);
  const myIds = new Set([id, ...aliasPinIds]);
  const connectedNodes: Record<string, AppNode[]> = {};
  
  for (const e of edges) {
    if (!myIds.has(e.source) && !myIds.has(e.target)) continue;
    const otherId = myIds.has(e.source) ? e.target : e.source;
    const node = allNodes.find(n => n.id === otherId);
    if (!node) continue;
    
    const eType = (e.data as any)?.edgeType || 'references';
    if (!connectedNodes[eType]) connectedNodes[eType] = [];
    if (!connectedNodes[eType].find(n => n.id === node.id)) {
      connectedNodes[eType].push(node);
    }
  }

  const handleJumpToNode = (targetNode: AppNode) => {
    // Offset slightly so it's not hidden behind panels
    setCenter(targetNode.position.x + 100, targetNode.position.y + 100, { zoom: 1.2, duration: 800 });
  };

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
      {/* Aliases Input -- hidden until selected (or filled) so small cards
          keep their body space for actual content */}
      {(selected || aliases.trim().length > 0) && (
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
      )}

      {/* Body Content based on Tab */}
      {activeTab === 'notes' && (
        <div className="flex-1 min-h-0 px-3 py-2 bg-[#1a1a24]/30">
          <RichTextEditor
            content={data.content || ''}
            onChange={(html) => updateNodeData(id, { content: html })}
            textColor="#d1d5db"
            nodeId={id}
          />
        </div>
      )}

      {activeTab === 'connections' && (
        <div className="flex-1 min-h-0 p-3 bg-[#1a1a24]/30 overflow-y-auto flex flex-col gap-3" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {Object.keys(connectedNodes).length === 0 && (
            <div className="text-[10px] text-gray-500 italic text-center mt-4">No connections yet.</div>
          )}
          {Object.entries(connectedNodes).map(([type, nodes]) => {
            const def = EDGE_TYPES[type] || EDGE_TYPES['references'];
            return (
              <div key={type} className="flex flex-col gap-1">
                <span className="text-[9px] uppercase tracking-widest font-bold" style={{ color: def.color }}>
                  {def.label}
                </span>
                <div className="flex flex-col gap-1">
                  {nodes.map(n => (
                    <button 
                      key={n.id} 
                      onClick={(e) => { e.stopPropagation(); handleJumpToNode(n); }}
                      className="text-[10px] px-2 py-1 rounded border bg-black/40 text-left hover:bg-white/10 transition-colors truncate" 
                      style={{ borderColor: def.color, color: '#e5e7eb' }}
                    >
                      {n.data.label || 'Untitled'}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {activeTab === 'arc' && (
        <div className="flex-1 min-h-0 p-3 bg-[#1a1a24]/30 overflow-y-auto flex flex-col gap-3" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          <div>
            <div className="text-[10px] font-bold text-[#ef4444] uppercase tracking-widest mb-1">The Lie (Flaw)</div>
            <textarea
              className="w-full bg-[#151518] border border-[#2a2a35] rounded p-2 text-xs text-red-100/90 resize-none focus:outline-none focus:border-red-500 font-serif transition-colors shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]"
              rows={2}
              value={meta.arcLie || ''}
              onChange={(e) => updateNodeData(id, { metadata: { ...meta, arcLie: e.target.value } })}
              placeholder="What false belief holds them back?"
              onPointerDown={(e) => e.stopPropagation()}
            />
          </div>
          <div>
            <div className="text-[10px] font-bold text-[#10b981] uppercase tracking-widest mb-1">The Truth (Growth)</div>
            <textarea
              className="w-full bg-[#151518] border border-[#2a2a35] rounded p-2 text-xs text-green-100/90 resize-none focus:outline-none focus:border-green-500 font-serif transition-colors shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]"
              rows={2}
              value={meta.arcTruth || ''}
              onChange={(e) => updateNodeData(id, { metadata: { ...meta, arcTruth: e.target.value } })}
              placeholder="What must they realize to succeed?"
              onPointerDown={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}

      {/* Tabs Footer */}
      <div className="flex bg-black/40 border-t border-[#2a2a35] text-[9px] uppercase font-bold tracking-widest text-gray-500 shrink-0">
        <button 
          onClick={() => setActiveTab('notes')} 
          className={`flex-1 py-1.5 hover:bg-white/5 transition-colors ${activeTab === 'notes' ? 'text-white bg-white/10' : ''}`}
        >
          Notes
        </button>
        <button 
          onClick={() => setActiveTab('connections')} 
          className={`flex-1 py-1.5 hover:bg-white/5 transition-colors flex items-center justify-center gap-1 ${activeTab === 'connections' ? 'text-white bg-white/10' : ''}`}
        >
          Links
          {Object.keys(connectedNodes).length > 0 && (
            <span className="bg-[#3b82f6] text-white px-1 rounded-full text-[8px] leading-tight">
              {Object.values(connectedNodes).flat().length}
            </span>
          )}
        </button>
        {nodeType === 'character' && (
          <button 
            onClick={() => setActiveTab('arc')} 
            className={`flex-1 py-1.5 hover:bg-white/5 transition-colors ${activeTab === 'arc' ? 'text-white bg-white/10' : ''}`}
          >
            Arc
          </button>
        )}
      </div>
    </BaseNode>
  );
});
