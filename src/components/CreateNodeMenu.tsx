import { useState, useRef, useEffect } from 'react';

type CreateNodeMenuProps = {
  onCreate: (type: string, label: string) => void;
};

export function CreateNodeMenu({ onCreate }: CreateNodeMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<'novel' | 'sermon'>('novel');
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

  const handleCreate = (type: string, label: string) => {
    onCreate(type, label);
    setIsOpen(false);
  };

  const MenuItem = ({ type, title, description, colorClass, borderClass }: any) => (
    <button 
      onClick={() => handleCreate(type, title)} 
      className={`text-left px-4 py-2 hover:bg-[#1a1a1f] transition-colors border-l-2 border-transparent ${borderClass} group w-full`}
    >
      <div className={`text-sm ${colorClass}`}>{title}</div>
      <div className="text-[10px] text-gray-500 group-hover:text-gray-400 mt-0.5 leading-tight">{description}</div>
    </button>
  );

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
          <div className="flex p-2 bg-[#1a1a1f] border-b border-[#2a2a35]">
            <button 
              onClick={() => setMode('novel')}
              className={`flex-1 py-1.5 text-xs font-bold uppercase tracking-wider rounded ${mode === 'novel' ? 'bg-[#9333ea] text-white' : 'text-gray-500 hover:text-gray-300'}`}
            >
              Novel
            </button>
            <button 
              onClick={() => setMode('sermon')}
              className={`flex-1 py-1.5 text-xs font-bold uppercase tracking-wider rounded ${mode === 'sermon' ? 'bg-[#9333ea] text-white' : 'text-gray-500 hover:text-gray-300'}`}
            >
              Sermon
            </button>
          </div>

          <div className="text-[10px] uppercase font-bold text-gray-500 bg-[#1a1a1f] px-3 py-1.5 border-b border-[#2a2a35]">Primary Nodes</div>
          {mode === 'novel' ? (
            <>
              <MenuItem type="master" title="Master Pitch" description="The core logline and synopsis" colorClass="text-[#fbbf24]" borderClass="hover:border-[#b45309]" />
              <MenuItem type="document" title="Chapter" description="Main writing canvas with full editor" colorClass="text-[#a78bfa]" borderClass="hover:border-[#4c1d95]" />
            </>
          ) : (
            <>
              <MenuItem type="master" title="Master Topic" description="Core message and thesis" colorClass="text-[#fbbf24]" borderClass="hover:border-[#b45309]" />
              <MenuItem type="document" title="Sermon Manuscript" description="Main writing canvas with full editor" colorClass="text-[#a78bfa]" borderClass="hover:border-[#4c1d95]" />
            </>
          )}
          
          <div className="text-[10px] uppercase font-bold text-gray-500 bg-[#1a1a1f] px-3 py-1.5 border-y border-[#2a2a35]">Secondary Nodes</div>
          {mode === 'novel' ? (
            <>
              <MenuItem type="reference" title="Idea" description="Basic short-form text node" colorClass="text-[#34d399]" borderClass="hover:border-[#064e3b]" />
              <MenuItem type="stat" title="Stat Sheet / Profile" description="Dossiers for characters or locations" colorClass="text-[#22d3ee]" borderClass="hover:border-[#164e63]" />
              <MenuItem type="sequence" title="Timeline Track" description="Plan story beats chronologically" colorClass="text-[#a855f7]" borderClass="hover:border-[#4c1d95]" />
              <MenuItem type="logic" title="Logic Chain" description="Map out plots and causality" colorClass="text-[#3b82f6]" borderClass="hover:border-[#1e3a8a]" />
              <MenuItem type="lore" title="Lore Fragment" description="Worldbuilding notes and history" colorClass="text-[#22d3ee]" borderClass="hover:border-[#164e63]" />
              <MenuItem type="item" title="Relic / Artifact" description="Track important items and lore" colorClass="text-[#10b981]" borderClass="hover:border-[#065f46]" />
            </>
          ) : (
            <>
              <MenuItem type="reference" title="Talking Point" description="Basic short-form text node" colorClass="text-[#34d399]" borderClass="hover:border-[#064e3b]" />
              <MenuItem type="stat" title="Biblical Figure Profile" description="Dossiers for people or context" colorClass="text-[#22d3ee]" borderClass="hover:border-[#164e63]" />
              <MenuItem type="sequence" title="Sermon Flow / Outline" description="Plan out points sequentially" colorClass="text-[#a855f7]" borderClass="hover:border-[#4c1d95]" />
              <MenuItem type="logic" title="Argument Map" description="Map out premises to conclusions" colorClass="text-[#3b82f6]" borderClass="hover:border-[#1e3a8a]" />
              <MenuItem type="lore" title="Theological Concept" description="Exegesis and deep dives" colorClass="text-[#22d3ee]" borderClass="hover:border-[#164e63]" />
              <MenuItem type="item" title="Object Lesson" description="Track parables or objects" colorClass="text-[#10b981]" borderClass="hover:border-[#065f46]" />
            </>
          )}
          
          <MenuItem type="task" title="Task Checklist" description="Track progress on action items" colorClass="text-[#fb923c]" borderClass="hover:border-[#9a3412]" />
          <MenuItem type="quote" title="Quote Reference" description="Save specific quotes and sources" colorClass="text-[#facc15]" borderClass="hover:border-[#854d0e]" />
          
          <div className="text-[10px] uppercase font-bold text-gray-500 bg-[#1a1a1f] px-3 py-1.5 border-y border-[#2a2a35]">Structure</div>
          {mode === 'novel' ? (
            <MenuItem type="hub" title="Plot Nexus" description="Wire to nodes to collapse/hide them" colorClass="text-[#a855f7]" borderClass="hover:border-[#4c1d95]" />
          ) : (
            <MenuItem type="hub" title="Concept Hub" description="Wire to nodes to collapse/hide them" colorClass="text-[#a855f7]" borderClass="hover:border-[#4c1d95]" />
          )}
          <MenuItem type="group" title="Group Zone" description="A visual container to group nodes" colorClass="text-[#a855f7]" borderClass="hover:border-[#4c1d95]" />
          <MenuItem type="deck" title="The Deck" description="Drop idea nodes here to stack them" colorClass="text-[#f43f5e]" borderClass="hover:border-[#881337]" />
          <MenuItem type="print" title="Master Print Node" description="Connect nodes in order to export" colorClass="text-[#6366f1]" borderClass="hover:border-[#3730a3]" />

        </div>
      )}
    </div>
  );
}
