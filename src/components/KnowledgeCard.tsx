import { memo } from 'react';
import { Handle, Position, NodeResizer } from '@xyflow/react';
import { useStore, AppNode } from '../store/useStore';
import { RichTextEditor } from './RichTextEditor';
import { User, MapPin, Shield, CalendarClock, BookOpen, Gem, Lightbulb, Tags } from 'lucide-react';

// The unified Tier-2 node: every kind of "knowledge" the writing references.
// One component, one layout -- the kind sets color, icon, and naming so cards
// stay visually distinct without needing separate node implementations.
type Kind = {
  label: string;        // neutral / novel-mode name
  sermonLabel: string;  // sermon-mode name (shown together for clarity)
  icon: any;
  color: string;        // text + accent
  border: string;
  glow: string;
};

export const KINDS: Record<string, Kind> = {
  character: { label: 'Character', sermonLabel: 'Figure', icon: User, color: '#67e8f9', border: '#2d5f6e', glow: 'rgba(34,211,238,0.25)' },
  location: { label: 'Location', sermonLabel: 'Setting', icon: MapPin, color: '#6ee7b7', border: '#10b981', glow: 'rgba(52,211,153,0.25)' },
  faction: { label: 'Faction', sermonLabel: 'Group', icon: Shield, color: '#fca5a5', border: '#6b2626', glow: 'rgba(248,113,113,0.25)' },
  event: { label: 'Event', sermonLabel: 'Moment', icon: CalendarClock, color: '#a5b4fc', border: '#3d3d8c', glow: 'rgba(129,140,248,0.25)' },
  lore: { label: 'Concept', sermonLabel: 'Doctrine', icon: BookOpen, color: '#2dd4bf', border: '#134e4a', glow: 'rgba(45,212,191,0.25)' },
  item: { label: 'Item', sermonLabel: 'Object Lesson', icon: Gem, color: '#fde68a', border: '#8c734b', glow: 'rgba(253,224,71,0.25)' },
  reference: { label: 'Idea', sermonLabel: 'Talking Point', icon: Lightbulb, color: '#cbd5e1', border: '#4a4a55', glow: 'rgba(148,163,184,0.25)' },
  // Legacy type names that map onto the same kinds
  snippet: { label: 'Idea', sermonLabel: 'Talking Point', icon: Lightbulb, color: '#fdba74', border: '#7c4320', glow: 'rgba(251,146,60,0.25)' },
  idea: { label: 'Idea', sermonLabel: 'Talking Point', icon: Lightbulb, color: '#cbd5e1', border: '#4a4a55', glow: 'rgba(148,163,184,0.25)' },
  citation: { label: 'Citation', sermonLabel: 'Citation', icon: BookOpen, color: '#fbbf24', border: '#8c734b', glow: 'rgba(251,191,36,0.25)' },
};

// Which kinds are offered in the type selector (legacy dupes hidden)
const SELECTABLE_KINDS = ['character', 'location', 'faction', 'event', 'lore', 'item', 'reference'];

// Writing-surface types for the "appears in" chips
const WRITING_TYPES = ['document', 'book', 'chapter', 'scene', 'master'];

export const KnowledgeCard = memo(({ id, data, selected, type }: any) => {
  const nodeType = type || 'reference';
  const kind = KINDS[nodeType] || KINDS['reference'];
  const Icon = kind.icon;
  const updateNodeData = useStore(state => state.updateNodeData);
  const updateNodeType = useStore(state => state.updateNodeType);
  const edges = useStore(state => state.edges);
  const allNodes = useStore(state => state.nodes);

  const meta = data.metadata || {};
  const aliases: string = meta.aliases || '';

  // APPEARS IN: the reverse of the writing nodes' cast chips. Includes
  // connections that arrive through alias pins pointing at this card.
  const aliasPinIds = allNodes
    .filter(n => n.type === 'alias' && n.data?.metadata?.targetId === id)
    .map(n => n.id);
  const myIds = new Set([id, ...aliasPinIds]);
  const appearsIn = edges
    .filter(e => myIds.has(e.source) || myIds.has(e.target))
    .map(e => (myIds.has(e.source) ? e.target : e.source))
    .filter((nid, i, arr) => arr.indexOf(nid) === i)
    .map(nid => allNodes.find(n => n.id === nid))
    .filter((n): n is AppNode => !!n && WRITING_TYPES.includes(n.type || ''))
    .slice(0, 5);

  return (
    <>
      <NodeResizer minWidth={200} minHeight={150} isVisible={selected} handleClassName="w-3 h-3 bg-[#151518] border-2 border-white rounded transition-transform hover:scale-125" />
      <div
        className="relative w-full h-full flex flex-col bg-[#151518] rounded-lg border-2 shadow-2xl overflow-hidden"
        style={{
          borderColor: selected ? kind.color : kind.border,
          boxShadow: selected ? `0 0 14px ${kind.glow}` : '0 10px 30px rgba(0,0,0,0.5)',
        }}
      >
        <Handle id="top" type="target" position={Position.Top} style={{ backgroundColor: kind.color }} className="w-3 h-3 rounded-full -top-2 border-2 border-[#151518] z-50 transition-transform hover:scale-125" />
        <Handle id="bottom" type="source" position={Position.Bottom} style={{ backgroundColor: kind.color }} className="w-3 h-3 rounded-full -bottom-2 border-2 border-[#151518] z-50 transition-transform hover:scale-125" />
        <Handle id="left" type="target" position={Position.Left} style={{ backgroundColor: kind.color }} className="w-3 h-3 rounded-full -left-2 border-2 border-[#151518] z-50 transition-transform hover:scale-125" />
        <Handle id="right" type="source" position={Position.Right} style={{ backgroundColor: kind.color }} className="w-3 h-3 rounded-full -right-2 border-2 border-[#151518] z-50 transition-transform hover:scale-125" />

        {/* Header: icon, title, kind selector */}
        <div className="flex items-center gap-2 px-3 py-2 border-b" style={{ borderColor: kind.border, backgroundColor: 'rgba(0,0,0,0.25)' }}>
          <Icon size={14} style={{ color: kind.color }} className="flex-shrink-0" />
          <input
            className="font-bold text-sm tracking-wide truncate bg-transparent outline-none border-b border-transparent focus:border-gray-500 flex-1 min-w-0"
            style={{ color: kind.color }}
            value={data.label}
            onChange={(e) => updateNodeData(id, { label: e.target.value })}
            onPointerDown={(e) => e.stopPropagation()}
            placeholder="Name..."
          />
          <select
            className="text-[10px] text-gray-500 bg-[#1a1a1f] px-1.5 py-1 rounded border flex-shrink-0 cursor-pointer outline-none"
            style={{ borderColor: kind.border }}
            value={SELECTABLE_KINDS.includes(nodeType) ? nodeType : 'reference'}
            onChange={(e) => updateNodeType(id, e.target.value)}
            onPointerDown={(e) => e.stopPropagation()}
          >
            {SELECTABLE_KINDS.map(k => (
              <option key={k} value={k}>{KINDS[k].label} / {KINDS[k].sermonLabel}</option>
            ))}
          </select>
        </div>

        {/* Aliases: alternate names the spiderweb auto-linker also matches */}
        <div className="flex items-center gap-2 px-3 py-1.5 border-b border-[#2a2a35] bg-black/10">
          <Tags size={11} className="text-gray-600 flex-shrink-0" />
          <input
            className="flex-1 min-w-0 bg-transparent text-[11px] text-gray-400 outline-none border-b border-transparent focus:border-gray-600 italic"
            value={aliases}
            onChange={(e) => updateNodeData(id, { metadata: { ...meta, aliases: e.target.value } })}
            onPointerDown={(e) => e.stopPropagation()}
            placeholder="Aliases (comma-separated) — auto-links match these too"
          />
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 px-3 py-2">
          <RichTextEditor
            content={data.content || ''}
            onChange={(html) => updateNodeData(id, { content: html })}
            textColor="#d1d5db"
            nodeId={id}
          />
        </div>

        {/* Appears in: which writing nodes this card is wired into */}
        {appearsIn.length > 0 && (
          <div className="px-3 py-2 border-t border-[#2a2a35] bg-black/20 flex flex-wrap items-center gap-1 pointer-events-none">
            <span className="text-[9px] uppercase tracking-widest text-gray-600 mr-1">Appears in</span>
            {appearsIn.map(n => (
              <span key={n.id} className="text-[9px] px-1.5 py-0.5 rounded-full border border-[#8c734b] text-[#d4b98c] bg-black/40 truncate max-w-[100px]">
                {n.data.label || 'Untitled'}
              </span>
            ))}
          </div>
        )}
      </div>
    </>
  );
});
