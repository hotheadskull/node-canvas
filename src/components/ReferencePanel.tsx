import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';

const TIPS_DATA = [
  // Mechanics & Features
  { category: 'Mechanics', title: 'Spiderweb Auto-Linking', desc: 'Typing another node\'s exact title (or alias) inside a node\'s text editor automatically creates a subtle golden link to it. The more you mention it, the stronger and thicker the link grows.' },
  { category: 'Mechanics', title: 'Warp Focus (Fullscreen)', desc: 'Click the ⤢ button in the top right of any writing node to enter a distraction-free fullscreen editor. Press Esc or the close button to return to the canvas.' },
  { category: 'Mechanics', title: 'Anchor + Anchor Check', desc: 'Click the anchor icon on a node to pin it as your governing idea (like a Core Premise). The Anchor Check toggle in the toolbar dims everything that doesn\'t trace back to it through the connection graph.' },
  { category: 'Mechanics', title: 'Orphan Widget', desc: 'The dashed pill floating on the canvas shows nodes that have no connections. Click it to jump directly to any disconnected node.' },
  { category: 'Mechanics', title: 'Command Palette', desc: 'Press Ctrl+K (or Cmd+K) to open the fuzzy search palette and instantly jump to any node by typing its title.' },
  { category: 'Mechanics', title: 'Edge Tension', desc: 'When you drag connected nodes far apart, the connecting line changes color and stretches thin to show stress, rather than breaking.' },
  { category: 'Mechanics', title: 'Connection Spark', desc: 'A one-time particle burst fires when a new edge is successfully drawn between two nodes.' },
  { category: 'Mechanics', title: 'Snapshots', desc: 'Manual save-points for a whole workspace, separate from the ongoing autosave. Accessible in the Workspace Manager.' },
  { category: 'Mechanics', title: 'Edge Settings', desc: 'Click a selected connection line to change its relationship type (e.g., Supports, Contradicts) and add a custom text label to the line.' },
  
  // Writing Surfaces
  { category: 'Writing Surfaces', title: 'Main Concept / Core Premise', desc: 'The overarching idea connecting your project. Typically the node you set as your Anchor.' },
  { category: 'Writing Surfaces', title: 'Document / Chapter', desc: 'A large, expansive writing canvas with a full rich-text editor for major sections of your work.' },
  { category: 'Writing Surfaces', title: 'Section / Scene', desc: 'A smaller text block for distinct beats, points, or subsets of a larger document.' },
  
  // Knowledge Cards
  { category: 'Knowledge Cards', title: 'Person / Character', desc: 'People, figures, and organizations. Adding "Aliases" in this node lets the Spiderweb Auto-Linker recognize their alternate names.' },
  { category: 'Knowledge Cards', title: 'Location / Setting', desc: 'Places, environments, and historical contexts.' },
  { category: 'Knowledge Cards', title: 'Concept / Lore', desc: 'Deep dives into specific topics, rules, exegesis, or worldbuilding elements.' },
  { category: 'Knowledge Cards', title: 'Object / Item', desc: 'Important physical items, artifacts, or object lessons.' },
  { category: 'Knowledge Cards', title: 'Reference / Quote', desc: 'External references, key verses, quotes, and source material.' },
  { category: 'Knowledge Cards', title: 'Quick Note', desc: 'A stray thought or scratchpad that is not yet fully developed.' },

  // Structure & Flow
  { category: 'Structure', title: 'Hub / Plot Nexus', desc: 'A structural node. Wire multiple nodes into a Hub, and you can collapse the Hub to visually hide the entire cluster and clean up your canvas.' },
  { category: 'Structure', title: 'Sequence / Timeline', desc: 'A linear track for planning things chronologically. Drop nodes into the sequence to order them.' },
  { category: 'Structure', title: 'Logic Map', desc: 'A structured layout for mapping causality, arguments, or step-by-step logic.' },
  
  // Special & Universal
  { category: 'Special', title: 'Tension / Crucible', desc: 'A node specifically designed to hold two opposing ideas, characters, or truths together to forge a resolution.' },
  { category: 'Universal', title: 'Quick-Link Pin (Alias)', desc: 'A tiny floating shortcut that bridges to a real node elsewhere on the canvas. Hovering a Pin lights up the same constellation web as the real node.' },
  { category: 'Universal', title: 'Progress Checklist', desc: 'A simple checkbox list for tracking tasks and completion.' },
  { category: 'Universal', title: 'Group Zone', desc: 'A visual, resizable backdrop container to organize and label a cluster of nodes.' },
  { category: 'Universal', title: 'The Deck', desc: 'A specialized node where you can drag and drop other idea nodes to literally "stack" them together like a deck of cards.' },
  { category: 'Universal', title: 'Compile & Export', desc: 'Wire multiple writing nodes into this Compile node in a specific order to stitch their text together and export as a single document.' },
];

export function ReferencePanel() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleOpen = () => {
      setOpen(true);
      setQuery('');
    };

    window.addEventListener('open-reference', handleOpen);
    return () => window.removeEventListener('open-reference', handleOpen);
  }, []);

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return TIPS_DATA;

    const terms = q.split(/\s+/).filter(Boolean);
    const scored = TIPS_DATA.map(tip => {
      const haystack = `${tip.title} ${tip.desc} ${tip.category}`.toLowerCase();
      if (!terms.every(t => haystack.includes(t))) return null;

      let score = 0;
      for (const t of terms) {
        if (tip.title.toLowerCase().startsWith(t)) score += 30;
        else if (tip.title.toLowerCase().includes(t)) score += 20;
        if (tip.category.toLowerCase().includes(t)) score += 10;
        if (tip.desc.toLowerCase().includes(t)) score += 5;
      }
      return { ...tip, score };
    }).filter(Boolean) as (typeof TIPS_DATA[0] & { score: number })[];

    return scored.sort((a, b) => b.score - a.score);
  }, [query]);

  if (!open) return null;

  return (
    <div className="absolute inset-0 z-[110] bg-black/60 backdrop-blur-sm flex items-start justify-center pt-[18vh]" onClick={() => setOpen(false)}>
      <div className="w-[600px] max-w-[90vw] bg-[#111114] border border-[#d4b98c]/30 rounded-xl shadow-2xl flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 px-4 py-3 border-b border-[#2a2a35]">
          <Search size={15} className="text-[#f0c050] flex-shrink-0" />
          <input
            ref={inputRef}
            className="flex-1 bg-transparent text-sm font-serif text-[#d4b98c] outline-none placeholder-[#d4b98c]/30"
            placeholder="Search mechanics and node types..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setOpen(false);
            }}
          />
          <button onClick={() => setOpen(false)} className="text-gray-500 hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>
        
        <div className="max-h-[50vh] overflow-y-auto p-2 custom-scrollbar">
          {results.length === 0 ? (
            <div className="text-center p-8 text-sm text-gray-500">No results found.</div>
          ) : (
            <div className="flex flex-col gap-1">
              {results.map((tip, i) => (
                <div key={i} className="p-3 hover:bg-white/5 rounded transition-colors border border-transparent hover:border-white/10">
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-[10px] uppercase font-bold tracking-widest text-[#9333ea]">{tip.category}</span>
                    <span className="text-sm font-bold text-[#d4b98c]">{tip.title}</span>
                  </div>
                  <div className="text-xs text-gray-400 leading-relaxed">
                    {tip.desc}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
