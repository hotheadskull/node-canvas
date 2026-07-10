import { useState, useRef, useEffect } from 'react';
import { CanvasMode, NodeTier, TIER_TITLES, menuNodesForTier } from '../nodes/registry';

type CreateNodeMenuProps = {
  onCreate: (type: string, label: string) => void;
};

const MODES: CanvasMode[] = ['novel', 'sermon', 'universal'];
const TIERS: NodeTier[] = ['writing', 'knowledge', 'structure'];

// The menu is generated from src/nodes/registry.ts -- to add a node type,
// add a registry entry (and a component mapping in App.tsx); no menu edits.
export function CreateNodeMenu({ onCreate }: CreateNodeMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<CanvasMode>(() =>
    (localStorage.getItem('canvasMode') as CanvasMode) || 'novel'
  );
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const pickMode = (m: CanvasMode) => {
    setMode(m);
    localStorage.setItem('canvasMode', m);
  };

  const handleCreate = (type: string, label: string) => {
    onCreate(type, label);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-4 py-2 bg-[#9333ea] text-white text-sm font-bold rounded shadow-[0_0_15px_rgba(147,51,234,0.3)] hover:bg-[#a855f7] hover:shadow-[0_0_20px_rgba(168,85,247,0.5)] transition-all flex items-center gap-2"
      >
        <span>+ Add Node</span>
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}><polyline points="6 9 12 15 18 9"></polyline></svg>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-64 bg-[#111114] border border-[#2a2a35] rounded shadow-2xl z-50 flex flex-col overflow-hidden max-h-[80vh] overflow-y-auto custom-scrollbar">

          {/* Mode Toggle */}
          <div className="flex p-2 bg-[#1a1a1f] border-b border-[#2a2a35] gap-1">
            {MODES.map(m => (
              <button
                key={m}
                onClick={() => pickMode(m)}
                className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded ${mode === m ? 'bg-[#9333ea] text-white' : 'text-gray-500 hover:text-gray-300'}`}
              >
                {m}
              </button>
            ))}
          </div>

          {TIERS.map(tier => (
            <div key={tier}>
              <div className="text-[10px] uppercase font-bold text-gray-500 bg-[#1a1a1f] px-3 py-1.5 border-y border-[#2a2a35]">
                {TIER_TITLES[tier]}
              </div>
              {menuNodesForTier(tier).map(def => (
                <button
                  key={def.type}
                  onClick={() => handleCreate(def.type, def.labels[mode])}
                  className="text-left px-4 py-2 hover:bg-[#1a1a1f] transition-colors border-l-2 border-transparent w-full group"
                  style={{ borderLeftColor: 'transparent' }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderLeftColor = def.accent; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderLeftColor = 'transparent'; }}
                >
                  <div className="text-sm" style={{ color: def.accent }}>{def.labels[mode]}</div>
                  <div className="text-[10px] text-gray-500 group-hover:text-gray-400 mt-0.5 leading-tight">
                    {def.descriptions[mode]}
                  </div>
                </button>
              ))}
            </div>
          ))}

        </div>
      )}
    </div>
  );
}
