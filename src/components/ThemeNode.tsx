import { Handle, Position, NodeProps, NodeResizer } from '@xyflow/react';
import { useStore, AppNode } from '../store/useStore';
import { RichTextEditor } from './RichTextEditor';

type Theme = {
  label: string;
  borderColor: string;
  shadowColor: string;
  textColor: string;
  bgColor: string;
  progressColor: string;
};

const THEMES: Record<string, Theme> = {
  document: { label: 'Document', borderColor: '#8c734b', shadowColor: 'rgba(212,185,140,0.3)', textColor: '#d4b98c', bgColor: '#151518', progressColor: '#d4b98c' },
  reference: { label: 'Reference', borderColor: '#3d6b56', shadowColor: 'rgba(52,211,153,0.2)', textColor: '#6ee7b7', bgColor: '#151518', progressColor: '#34d399' },
  citation: { label: 'Citation', borderColor: '#8c734b', shadowColor: 'rgba(251,191,36,0.2)', textColor: '#fbbf24', bgColor: '#151518', progressColor: '#f59e0b' },
  lore: { label: 'Lore', borderColor: '#2d5f6e', shadowColor: 'rgba(34,211,238,0.2)', textColor: '#67e8f9', bgColor: '#151518', progressColor: '#22d3ee' },
  snippet: { label: 'Snippet', borderColor: '#7c4320', shadowColor: 'rgba(251,146,60,0.2)', textColor: '#fdba74', bgColor: '#151518', progressColor: '#fb923c' },

  // Legacy / Backwards compatibility mapping
  book: { label: 'Book', borderColor: '#8c734b', shadowColor: 'rgba(212,185,140,0.3)', textColor: '#d4b98c', bgColor: '#151518', progressColor: '#d4b98c' },
  chapter: { label: 'Chapter', borderColor: '#8c734b', shadowColor: 'rgba(251,191,36,0.2)', textColor: '#fbbf24', bgColor: '#151518', progressColor: '#f59e0b' },
  scene: { label: 'Scene', borderColor: '#7c4320', shadowColor: 'rgba(251,146,60,0.2)', textColor: '#fdba74', bgColor: '#151518', progressColor: '#fb923c' },
  idea: { label: 'Idea', borderColor: '#4a4a55', shadowColor: 'rgba(148,163,184,0.2)', textColor: '#cbd5e1', bgColor: '#151518', progressColor: '#94a3b8' },
  character: { label: 'Character', borderColor: '#2d5f6e', shadowColor: 'rgba(34,211,238,0.2)', textColor: '#67e8f9', bgColor: '#151518', progressColor: '#22d3ee' },
  location: { label: 'Location', borderColor: '#3d6b56', shadowColor: 'rgba(52,211,153,0.2)', textColor: '#6ee7b7', bgColor: '#151518', progressColor: '#34d399' },
  faction: { label: 'Faction', borderColor: '#6b2626', shadowColor: 'rgba(248,113,113,0.2)', textColor: '#fca5a5', bgColor: '#151518', progressColor: '#f87171' },
  event: { label: 'Event', borderColor: '#3d3d8c', shadowColor: 'rgba(129,140,248,0.2)', textColor: '#a5b4fc', bgColor: '#151518', progressColor: '#818cf8' },
  item: { label: 'Item', borderColor: '#8c734b', shadowColor: 'rgba(253,224,71,0.2)', textColor: '#fde68a', bgColor: '#151518', progressColor: '#fbbf24' },
  directory: { label: 'Directory', borderColor: '#7c2d86', shadowColor: 'rgba(232,121,249,0.2)', textColor: '#f0abfc', bgColor: '#151518', progressColor: '#e879f9' },
};

// Knowledge-type nodes shown as "cast" chips on connected writing nodes
const CAST_TYPES = ['character', 'location', 'faction', 'item', 'lore', 'event'];

export function ThemeNode({ id, data, selected, type }: NodeProps<AppNode>) {
  const nodeType = type || 'idea';
  const theme = THEMES[nodeType] || THEMES['idea'];
  const updateNodeData = useStore(state => state.updateNodeData);
  const updateNodeType = useStore(state => state.updateNodeType);
  const setFocusedNode = useStore(state => state.setFocusedNode);
  const edges = useStore(state => state.edges);
  const allNodes = useStore(state => state.nodes);

  const isManuscript = ['document', 'book', 'chapter', 'scene'].includes(nodeType);

  // Word count milestone logic for chapters
  const textContent = nodeType === 'chapter' || nodeType === 'scene' ? (data.manuscript || '') : (data.content || '');
  const wordCount = textContent.split(/\s+/).filter(w => w.length > 0).length;
  const isLeveledUp = (nodeType === 'chapter' || nodeType === 'scene') && wordCount >= 500; // 500 words for level up demo

  // Temporal Degradation (Dusty Ideas)
  const ageMs = Date.now() - (data.updated_at || Date.now());
  const isDusty = ageMs > 60000 && ['idea', 'item'].includes(nodeType);
  const dustFilter = isDusty ? 'url(#dust-filter)' : 'none';

  // Liquid Volume fill percentage
  const fillPercentage = Math.min(100, (wordCount / 500) * 100);

  // CAST CHIPS: writing nodes list their connected knowledge nodes (characters,
  // locations, ...) so connections carry meaning, not just lines.
  const castChips = isManuscript
    ? edges
        .filter(e => e.source === id || e.target === id)
        .map(e => (e.source === id ? e.target : e.source))
        .filter((nid, i, arr) => arr.indexOf(nid) === i)
        .map(nid => allNodes.find(n => n.id === nid))
        .filter((n): n is AppNode => !!n && CAST_TYPES.includes(n.type || ''))
        .slice(0, 6)
    : [];

  let bgClass = '';
  if (['book', 'chapter', 'scene'].includes(nodeType)) bgClass = 'texture-leather';
  else if (['character', 'event', 'faction'].includes(nodeType)) bgClass = 'texture-stone';

  return (
    <div style={{ width: '100%', height: '100%' }} className={data.isFusing ? 'animate-alchemy' : ''}>
      <NodeResizer minWidth={220} minHeight={120} isVisible={selected} handleClassName="w-3 h-3 bg-[#151518] border-2 border-white rounded transition-transform hover:scale-125" />

      {/* Header Badges */}
      {nodeType === 'book' && (
        <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-12 h-12 bg-purple-900 border-2 border-yellow-500 shadow-xl z-20" style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }} />
      )}
      {nodeType === 'character' && (
        <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-12 h-12 bg-cyan-900 border-2 border-cyan-400 rounded-full shadow-[0_0_15px_#06b6d4] z-20" />
      )}
      {nodeType === 'chapter' && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-16 h-8 bg-yellow-900 border-2 border-yellow-500 shadow-xl z-20" style={{ clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 50%, calc(100% - 10px) 100%, 0 100%, 10px 50%)' }} />
      )}
      {nodeType === 'event' && (
        <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-12 h-12 bg-indigo-900 border-2 border-indigo-400 shadow-[0_0_15px_#6366f1] z-20" style={{ clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' }} />
      )}

      {/* Single flat face -- the old 3D flip/scratchpad back was removed: it was
          unwanted, and its rotated backface planes broke pointer hit-testing
          inside the node once wrapper animations were introduced. */}
      <div
        className={`absolute inset-0 p-5 border-2 flex flex-col rounded-lg shadow-2xl ${nodeType === 'region' ? 'rounded-3xl border-dashed bg-opacity-20' : 'bg-opacity-95'} ${bgClass}`}
        style={{
          backgroundColor: bgClass ? undefined : theme.bgColor,
          borderColor: isLeveledUp ? '#fbbf24' : (selected ? theme.progressColor : theme.borderColor),
          boxShadow: isLeveledUp ? '0 0 20px rgba(251, 191, 36, 0.4)' : (selected ? `0 0 10px ${theme.shadowColor}` : 'none'),
        }}
      >
        <div style={{ filter: dustFilter, height: '100%', width: '100%', display: 'flex', flexDirection: 'column' }}>
          {/* Liquid Volume Background */}
          <div
            className="absolute bottom-0 left-0 w-full rounded-b-lg transition-colors shadow-lg duration-1000 ease-in-out opacity-20 pointer-events-none"
            style={{
              height: `${fillPercentage}%`,
              background: isLeveledUp ? 'linear-gradient(to top, #fbbf24, #f59e0b)' : `linear-gradient(to top, ${theme.progressColor}, ${theme.borderColor})`,
              boxShadow: isLeveledUp ? '0 -10px 20px rgba(251, 191, 36, 0.4)' : 'none'
            }}
          />

          <Handle type="target" position={Position.Top} id="top" style={{ backgroundColor: theme.progressColor }} className={`w-3 h-3 rounded-full -top-2 border-2 border-[#151518] z-50 transition-transform hover:scale-125 ${nodeType === 'region' ? 'opacity-0 pointer-events-none' : 'opacity-100'}`} />
          <Handle type="source" position={Position.Bottom} id="bottom" style={{ backgroundColor: theme.progressColor }} className={`w-3 h-3 rounded-full -bottom-2 border-2 border-[#151518] z-50 transition-transform hover:scale-125 ${nodeType === 'region' ? 'opacity-0 pointer-events-none' : 'opacity-100'}`} />
          <Handle type="target" position={Position.Left} id="left" style={{ backgroundColor: theme.progressColor }} className={`w-3 h-3 rounded-full -left-2 border-2 border-[#151518] z-50 transition-transform hover:scale-125 ${nodeType === 'region' ? 'opacity-0 pointer-events-none' : 'opacity-100'}`} />
          <Handle type="source" position={Position.Right} id="right" style={{ backgroundColor: theme.progressColor }} className={`w-3 h-3 rounded-full -right-2 border-2 border-[#151518] z-50 transition-transform hover:scale-125 ${nodeType === 'region' ? 'opacity-0 pointer-events-none' : 'opacity-100'}`} />

          <div className="flex justify-between items-center border-b pb-2 mb-2 z-10 relative" style={{ borderColor: theme.borderColor }}>
            <input
              className="font-bold text-sm uppercase tracking-wider truncate mr-2 bg-transparent outline-none border-b border-transparent focus:border-gray-500 flex-1 min-w-0"
              style={{ color: theme.textColor }}
              value={data.label}
              onChange={(e) => updateNodeData(id, { label: e.target.value })}
              onPointerDown={(e) => e.stopPropagation()}
              placeholder="Node Title"
            />
            <select
              className="text-[10px] text-gray-500 bg-[#1a1a1f] px-2 py-1 rounded border flex-shrink-0 cursor-pointer outline-none"
              style={{ borderColor: theme.borderColor }}
              value={nodeType}
              onChange={(e) => updateNodeType(id, e.target.value)}
              onPointerDown={(e) => e.stopPropagation()}
            >
              {Object.keys(THEMES).map(t => <option key={t} value={t}>{THEMES[t].label}</option>)}
            </select>
          </div>

          <div className={`flex-1 relative z-10 min-h-0 ${nodeType === 'region' ? 'opacity-0' : ''}`}>
            <RichTextEditor
              content={textContent || ''}
              onChange={(html) => {
                if (['document', 'book', 'chapter', 'scene'].includes(nodeType)) {
                  updateNodeData(id, { manuscript: html });
                } else {
                  updateNodeData(id, { content: html });
                }
              }}
              textColor={theme.textColor}
              nodeId={id}
            />
          </div>

          {/* Cast chips: who/what this writing node is connected to */}
          {castChips.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2 z-10 relative pointer-events-none">
              {castChips.map(chip => (
                <span
                  key={chip.id}
                  className="text-[9px] px-1.5 py-0.5 rounded-full border bg-black/40 truncate max-w-[90px]"
                  style={{ color: THEMES[chip.type || 'idea']?.textColor || '#cbd5e1', borderColor: THEMES[chip.type || 'idea']?.borderColor || '#4a4a55' }}
                  title={THEMES[chip.type || 'idea']?.label}
                >
                  {chip.data.label || 'Untitled'}
                </span>
              ))}
            </div>
          )}

          {/* Word Count / Progress */}
          <div className={`mt-2 flex items-center justify-between text-[10px] text-gray-500 z-10 relative pointer-events-none ${nodeType === 'region' ? 'opacity-0' : ''}`}>
            <span>{wordCount} words</span>
            {isLeveledUp && <span className="text-[#fbbf24] font-bold">LEVEL UP!</span>}
          </div>
        </div>

        {/* Warp Focus Button - expand into fullscreen writing mode */}
        {nodeType !== 'region' && (
          <button
            onClick={(e) => { e.stopPropagation(); setFocusedNode(id); }}
            className="absolute bottom-0 right-0 w-8 h-8 rounded-tl-lg bg-black/50 text-white flex items-center justify-center hover:bg-black/80 transition-colors z-20"
            title="Expand (Warp Focus)"
            style={{ borderTop: `1px solid ${theme.borderColor}`, borderLeft: `1px solid ${theme.borderColor}` }}
          >
            ⤢
          </button>
        )}
      </div>

      {/* Adding SVG Filter for Temporal Degradation to the DOM silently */}
      <svg width="0" height="0" style={{ position: 'absolute' }}>
        <filter id="dust-filter">
          <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" result="noise" />
          <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.5 0" in="noise" result="coloredNoise" />
          <feComposite operator="in" in="coloredNoise" in2="SourceGraphic" result="composite" />
          <feBlend mode="multiply" in="composite" in2="SourceGraphic" />
        </filter>
      </svg>
    </div>
  );
}
