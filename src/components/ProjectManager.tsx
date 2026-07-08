import React, { useState } from 'react';
import { Panel } from '@xyflow/react';
import { useStore } from '../store/useStore';
import { useReactFlow } from '@xyflow/react';
import { Camera, Trash2, RotateCcw } from 'lucide-react';

export function ProjectManager() {
  const { projects, activeProjectId, setActiveProject, createProject, createSnapshot, deleteProject, restoreProject } = useStore();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'workspaces' | 'snapshots' | 'trash'>('workspaces');
  const [newTitle, setNewTitle] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const { fitView } = useReactFlow();

  const handleSelect = async (id: string) => {
    await setActiveProject(id);
    setIsOpen(false);
    setTimeout(() => fitView({ duration: 800 }), 100);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newTitle.trim()) {
      await createProject(newTitle.trim());
      setNewTitle('');
      setIsCreating(false);
      setIsOpen(false);
      setTimeout(() => fitView({ duration: 800 }), 100);
    }
  };

  const activeProject = projects.find(p => p.id === activeProjectId);

  const activeWorkspaces = projects.filter(p => !p.deleted_at && !p.snapshot_of);
  const snapshots = projects.filter(p => !p.deleted_at && p.snapshot_of);
  const trashedProjects = projects.filter(p => p.deleted_at);

  return (
    <Panel position="top-center" className="z-50 pointer-events-auto">
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="px-6 py-2 bg-[#1a1a1e]/90 text-[#d4b98c] border border-[#d4b98c]/30 rounded backdrop-blur-md shadow-lg shadow-black/50 font-serif tracking-widest text-sm hover:bg-[#252529] transition-all flex items-center gap-2"
        >
          <span>❖ {activeProject?.title || 'Main Workspace'}</span>
          <span className="text-xs opacity-50">▼</span>
        </button>

        {isOpen && (
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-[400px] bg-[#1a1a1e]/95 border border-[#d4b98c]/30 rounded backdrop-blur-xl shadow-2xl shadow-black overflow-hidden texture-stone z-50">
            
            <div className="flex border-b border-[#d4b98c]/20">
              <button 
                onClick={() => setActiveTab('workspaces')}
                className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider ${activeTab === 'workspaces' ? 'bg-[#d4b98c]/20 text-[#d4b98c]' : 'text-gray-500 hover:text-gray-300'}`}
              >
                Workspaces
              </button>
              <button 
                onClick={() => setActiveTab('snapshots')}
                className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider ${activeTab === 'snapshots' ? 'bg-[#d4b98c]/20 text-[#d4b98c]' : 'text-gray-500 hover:text-gray-300'}`}
              >
                Version History
              </button>
              <button 
                onClick={() => setActiveTab('trash')}
                className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider ${activeTab === 'trash' ? 'bg-red-900/40 text-red-400' : 'text-gray-500 hover:text-gray-300'}`}
              >
                Recycle Bin
              </button>
            </div>

            <div className="max-h-64 overflow-y-auto custom-scrollbar p-2">
              {activeTab === 'workspaces' && (
                <div className="flex flex-col gap-1">
                  {activeWorkspaces.map(p => (
                    <div key={p.id} className="flex items-center justify-between group">
                      <button
                        onClick={() => handleSelect(p.id)}
                        className={`flex-1 text-left px-4 py-2 text-sm font-serif rounded transition-colors ${p.id === activeProjectId ? 'bg-[#d4b98c]/20 text-[#d4b98c]' : 'text-gray-400 hover:bg-[#d4b98c]/10'}`}
                      >
                        {p.title}
                      </button>
                      <button 
                        onClick={() => deleteProject(p.id)}
                        className="p-2 text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Delete Workspace"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'snapshots' && (
                <div className="flex flex-col gap-1">
                  {snapshots.map(p => {
                    const original = projects.find(op => op.id === p.snapshot_of);
                    return (
                      <div key={p.id} className="flex items-center justify-between group">
                        <button
                          onClick={() => handleSelect(p.id)}
                          className={`flex-1 flex flex-col text-left px-4 py-2 text-sm font-serif rounded transition-colors ${p.id === activeProjectId ? 'bg-[#d4b98c]/20 text-[#d4b98c]' : 'text-gray-400 hover:bg-[#d4b98c]/10'}`}
                        >
                          <span>{p.title}</span>
                          <span className="text-[10px] text-gray-500 font-sans">Snapshot of: {original?.title || 'Unknown'}</span>
                        </button>
                        <button 
                          onClick={() => deleteProject(p.id)}
                          className="p-2 text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Delete Snapshot"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    );
                  })}
                  {snapshots.length === 0 && <div className="text-center p-4 text-xs text-gray-500">No snapshots created yet.</div>}
                </div>
              )}

              {activeTab === 'trash' && (
                <div className="flex flex-col gap-1">
                  {trashedProjects.map(p => (
                    <div key={p.id} className="flex items-center justify-between bg-red-900/10 p-2 rounded border border-red-900/20">
                      <span className="text-sm font-serif text-gray-400">{p.title}</span>
                      <button 
                        onClick={() => restoreProject(p.id)}
                        className="flex items-center gap-1 text-[10px] uppercase font-bold tracking-widest bg-red-900/40 hover:bg-red-800 text-red-200 px-2 py-1 rounded transition-colors"
                      >
                        <RotateCcw size={12} /> Restore
                      </button>
                    </div>
                  ))}
                  {trashedProjects.length === 0 && <div className="text-center p-4 text-xs text-gray-500">Recycle Bin is empty.</div>}
                </div>
              )}
            </div>

            <div className="border-t border-[#d4b98c]/20 p-2 flex flex-col gap-2">
              <button
                onClick={async () => {
                  await createSnapshot();
                  alert('Version created! Check the Version History tab.');
                }}
                className="w-full flex items-center justify-center gap-2 p-2 bg-[#d4b98c]/10 hover:bg-[#d4b98c]/20 text-[#d4b98c] rounded text-xs font-bold uppercase tracking-widest transition-colors"
              >
                <Camera size={14} /> Save Version
              </button>

              {isCreating ? (
                <form onSubmit={handleCreate} className="p-2 bg-black/40 rounded border border-[#d4b98c]/20">
                  <input
                    autoFocus
                    type="text"
                    value={newTitle}
                    onChange={e => setNewTitle(e.target.value)}
                    placeholder="New project name..."
                    className="w-full bg-transparent border-b border-[#d4b98c]/50 text-[#d4b98c] px-2 py-1 outline-none text-sm font-serif mb-2 placeholder-[#d4b98c]/30"
                  />
                  <div className="flex gap-2">
                    <button type="submit" className="flex-1 bg-[#d4b98c]/20 hover:bg-[#d4b98c]/30 text-[#d4b98c] py-1 text-xs rounded transition-colors">Create</button>
                    <button type="button" onClick={() => setIsCreating(false)} className="flex-1 bg-transparent hover:bg-white/5 text-gray-400 py-1 text-xs rounded transition-colors">Cancel</button>
                  </div>
                </form>
              ) : (
                <button
                  onClick={() => setIsCreating(true)}
                  className="w-full p-2 text-xs text-gray-400 hover:text-white hover:bg-white/5 rounded transition-colors uppercase tracking-widest text-center"
                >
                  + New Workspace
                </button>
              )}
            </div>
            
          </div>
        )}
      </div>
    </Panel>
  );
}
