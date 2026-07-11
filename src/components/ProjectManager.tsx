import React, { useState, useRef, useEffect } from 'react';
import { Panel } from '@xyflow/react';
import { useStore } from '../store/useStore';
import { useReactFlow } from '@xyflow/react';
import { invoke } from '@tauri-apps/api/core';
import { Camera, Trash2, RotateCcw, Download, Upload, HelpCircle, PlayCircle, Pencil, ShieldCheck, FolderOpen } from 'lucide-react';

type BackupInfo = { name: string; size_kb: number; modified_secs: number };

export function ProjectManager() {
  const { projects, activeProjectId, setActiveProject, createProject, renameProject, createSnapshot, deleteProject, restoreProject, trashedNodes, restoreNode, exportProjectJSON, importProjectJSON } = useStore();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'workspaces' | 'snapshots' | 'trash' | 'nodes'>('workspaces');
  const [newTitle, setNewTitle] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameTitle, setRenameTitle] = useState('');
  const [backups, setBackups] = useState<BackupInfo[] | null>(null);
  const [showBackupList, setShowBackupList] = useState(false);

  // Refresh the automatic-backup info each time the menu opens
  useEffect(() => {
    if (!isOpen) return;
    invoke<BackupInfo[]>('list_backups')
      .then(setBackups)
      .catch(() => setBackups(null));
  }, [isOpen]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { fitView } = useReactFlow();

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('tutorial-action', { detail: { action: 'workspace-menu', isOpen } }));
  }, [isOpen]);

  const openTutorial = () => {
    setIsOpen(false);
    window.dispatchEvent(new CustomEvent('open-tutorial'));
  };

  const openReference = () => {
    setIsOpen(false);
    window.dispatchEvent(new CustomEvent('open-reference'));
  };

  const handleExport = async () => {
    try {
      const jsonStr = await exportProjectJSON();
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup_${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      await importProjectJSON(content);
      alert('Project imported successfully!');
      setIsOpen(false);
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

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
      <div className="relative" id="workspace-manager-wrapper">
        <button
          id="workspace-manager-btn"
          onClick={() => setIsOpen(!isOpen)}
          className="px-6 py-2 bg-[#1a1a1e]/90 text-[#d4b98c] border border-[#d4b98c]/30 rounded backdrop-blur-md shadow-lg shadow-black/50 font-serif tracking-widest text-sm hover:bg-[#252529] transition-all flex items-center gap-2"
        >
          <span>❖ {activeProject?.title || 'Main Workspace'}</span>
          <span className="text-xs opacity-50">▼</span>
        </button>

        {isOpen && (
          <div id="workspace-dropdown" className="absolute top-full left-1/2 -translate-x-1/2 mt-4 w-[600px] bg-[#1a1a1e]/95 border border-[#d4b98c]/30 rounded-xl backdrop-blur-xl shadow-2xl shadow-black overflow-hidden texture-stone z-[999999]">
            
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
                Versions
              </button>
              <button 
                onClick={() => setActiveTab('trash')}
                className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider ${activeTab === 'trash' ? 'bg-red-900/40 text-red-400' : 'text-gray-500 hover:text-gray-300'}`}
              >
                Workspace Trash
              </button>
              <button 
                onClick={() => setActiveTab('nodes')}
                className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider ${activeTab === 'nodes' ? 'bg-orange-900/40 text-orange-400' : 'text-gray-500 hover:text-gray-300'}`}
              >
                Node Trash
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto custom-scrollbar p-4">
              {activeTab === 'workspaces' && (
                <div className="flex flex-col gap-1">
                  {activeWorkspaces.map(p => (
                    <div key={p.id} className="flex items-center justify-between group">
                      {renamingId === p.id ? (
                        <form
                          className="flex-1 px-4 py-1"
                          onSubmit={async (e) => {
                            e.preventDefault();
                            await renameProject(p.id, renameTitle);
                            setRenamingId(null);
                          }}
                        >
                          <input
                            autoFocus
                            type="text"
                            value={renameTitle}
                            onChange={e => setRenameTitle(e.target.value)}
                            onBlur={() => setRenamingId(null)}
                            onKeyDown={e => { if (e.key === 'Escape') setRenamingId(null); }}
                            className="w-full bg-transparent border-b border-[#d4b98c]/50 text-[#d4b98c] py-1 outline-none text-sm font-serif"
                          />
                        </form>
                      ) : (
                        <button
                          onClick={() => handleSelect(p.id)}
                          onDoubleClick={() => { setRenamingId(p.id); setRenameTitle(p.title); }}
                          className={`flex-1 text-left px-4 py-2 text-sm font-serif rounded transition-colors ${p.id === activeProjectId ? 'bg-[#d4b98c]/20 text-[#d4b98c]' : 'text-gray-400 hover:bg-[#d4b98c]/10'}`}
                        >
                          {p.title}
                        </button>
                      )}
                      <button
                        onClick={() => { setRenamingId(p.id); setRenameTitle(p.title); }}
                        className="p-2 text-gray-600 hover:text-[#d4b98c] opacity-50 group-hover:opacity-100 transition-opacity"
                        title="Rename Workspace"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Move "${p.title}" to the trash? You can restore it from the Trash tab.`)) {
                            deleteProject(p.id);
                          }
                        }}
                        className="p-2 text-gray-600 hover:text-red-400 opacity-50 group-hover:opacity-100 transition-opacity"
                        title="Move Workspace to Trash"
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
                          onClick={() => {
                            if (confirm(`Move the snapshot "${p.title}" to the trash?`)) {
                              deleteProject(p.id);
                            }
                          }}
                          className="p-2 text-gray-600 hover:text-red-400 opacity-50 group-hover:opacity-100 transition-opacity"
                          title="Move Snapshot to Trash"
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

              {activeTab === 'nodes' && (
                <div className="flex flex-col gap-1">
                  {trashedNodes?.map(n => (
                    <div key={n.id} className="flex items-center justify-between bg-orange-900/10 p-2 rounded border border-orange-900/20">
                      <div className="flex flex-col text-left">
                        <span className="text-sm font-serif text-orange-200/70">{n.data.label || 'Untitled Node'}</span>
                        <span className="text-[10px] text-gray-500">{n.type}</span>
                      </div>
                      <button 
                        onClick={async () => {
                          await restoreNode(n.id);
                          // force refresh local view slightly
                          setActiveProject(activeProjectId!);
                        }}
                        className="flex items-center gap-1 text-[10px] uppercase font-bold tracking-widest bg-orange-900/40 hover:bg-orange-800 text-orange-200 px-2 py-1 rounded transition-colors"
                      >
                        <RotateCcw size={12} /> Restore
                      </button>
                    </div>
                  ))}
                  {(!trashedNodes || trashedNodes.length === 0) && <div className="text-center p-4 text-xs text-gray-500">No deleted nodes in this workspace.</div>}
                </div>
              )}
            </div>

            <div className="border-t border-[#d4b98c]/20 p-4 bg-black/40 flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={async () => {
                    await createSnapshot();
                    alert('Version Snapshot saved! You can restore it anytime from the Versions tab.');
                  }}
                  className="flex flex-col items-start p-3 bg-[#d4b98c]/5 hover:bg-[#d4b98c]/10 text-[#d4b98c] rounded border border-[#d4b98c]/20 transition-all text-left"
                >
                  <div className="flex items-center gap-2 font-bold uppercase tracking-widest text-[11px] mb-1">
                    <Camera size={14} /> Save Version Snapshot
                  </div>
                  <span className="text-[10px] text-gray-400 font-sans normal-case tracking-normal">Instantly back up your current canvas state to history.</span>
                </button>

                <button
                  onClick={handleExport}
                  className="flex flex-col items-start p-3 bg-[#d4b98c]/5 hover:bg-[#d4b98c]/10 text-[#d4b98c] rounded border border-[#d4b98c]/20 transition-all text-left"
                >
                  <div className="flex items-center gap-2 font-bold uppercase tracking-widest text-[11px] mb-1">
                    <Download size={14} /> Export to JSON
                  </div>
                  <span className="text-[10px] text-gray-400 font-sans normal-case tracking-normal">Download your entire workspace as a file to share or backup.</span>
                </button>

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-start p-3 bg-[#d4b98c]/5 hover:bg-[#d4b98c]/10 text-[#d4b98c] rounded border border-[#d4b98c]/20 transition-all text-left"
                >
                  <div className="flex items-center gap-2 font-bold uppercase tracking-widest text-[11px] mb-1">
                    <Upload size={14} /> Import Workspace
                  </div>
                  <span className="text-[10px] text-gray-400 font-sans normal-case tracking-normal">Load a previously exported .json universe backup file.</span>
                </button>

                <button
                  onClick={openTutorial}
                  className="flex flex-col items-start p-3 bg-[#d4b98c]/5 hover:bg-[#d4b98c]/10 text-[#d4b98c] rounded border border-[#d4b98c]/20 transition-all text-left"
                >
                  <div className="flex items-center gap-2 font-bold uppercase tracking-widest text-[11px] mb-1">
                    <PlayCircle size={14} /> Replay Tutorial
                  </div>
                  <span className="text-[10px] text-gray-400 font-sans normal-case tracking-normal">Start the guided walkthrough again.</span>
                </button>

                <button
                  onClick={openReference}
                  className="flex flex-col items-start p-3 bg-[#d4b98c]/5 hover:bg-[#d4b98c]/10 text-[#d4b98c] rounded border border-[#d4b98c]/20 transition-all text-left"
                >
                  <div className="flex items-center gap-2 font-bold uppercase tracking-widest text-[11px] mb-1">
                    <HelpCircle size={14} /> Tips & Reference
                  </div>
                  <span className="text-[10px] text-gray-400 font-sans normal-case tracking-normal">Open the guide to node types and mechanics.</span>
                </button>
                <input type="file" accept=".json" className="hidden" ref={fileInputRef} onChange={handleImport} />
                
                {isCreating ? (
                  <form onSubmit={handleCreate} className="p-3 bg-black/60 rounded border border-[#d4b98c]/30 flex flex-col gap-2">
                    <input
                      autoFocus
                      type="text"
                      value={newTitle}
                      onChange={e => setNewTitle(e.target.value)}
                      placeholder="Universe name..."
                      className="w-full bg-transparent border-b border-[#d4b98c]/50 text-[#d4b98c] px-2 py-1 outline-none text-sm font-serif placeholder-[#d4b98c]/30"
                    />
                    <div className="flex gap-2">
                      <button type="submit" className="flex-1 bg-[#d4b98c]/20 hover:bg-[#d4b98c]/30 text-[#d4b98c] py-1 text-xs font-bold rounded transition-colors">Create</button>
                      <button type="button" onClick={() => setIsCreating(false)} className="flex-1 bg-transparent hover:bg-white/5 text-gray-400 py-1 text-xs rounded transition-colors">Cancel</button>
                    </div>
                  </form>
                ) : (
                  <button
                    onClick={() => setIsCreating(true)}
                    className="flex flex-col items-start p-3 bg-[#d4b98c]/5 hover:bg-[#d4b98c]/10 text-[#d4b98c] rounded border border-[#d4b98c]/20 transition-all text-left group"
                  >
                    <div className="flex items-center gap-2 font-bold uppercase tracking-widest text-[11px] mb-1 group-hover:text-white transition-colors">
                      <span className="text-lg leading-none">+</span> Create New Workspace
                    </div>
                    <span className="text-[10px] text-gray-400 font-sans normal-case tracking-normal">Start a completely fresh universe from scratch.</span>
                  </button>
                )}
                
              </div>
              <div className="mt-2 flex flex-col p-3 bg-emerald-900/15 border border-emerald-500/25 rounded gap-2">
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setShowBackupList(v => !v)}
                    className="flex items-center gap-2 min-w-0 text-left"
                    title={showBackupList ? 'Hide the backup list' : 'Show every backup with its date'}
                  >
                    <ShieldCheck size={15} className="text-emerald-400/80 flex-shrink-0" />
                    <span className="text-[11px] text-emerald-100/70 font-sans truncate hover:text-emerald-100 transition-colors">
                      {backups === null
                        ? 'Automatic backups run before every app update.'
                        : backups.length === 0
                          ? 'No automatic backups yet — one is made before every app update.'
                          : `${backups.length} automatic backup${backups.length === 1 ? '' : 's'} · latest ${new Date(backups[0].modified_secs * 1000).toLocaleString()} ${showBackupList ? '▴' : '▾'}`}
                    </span>
                  </button>
                  <button
                    onClick={() => invoke('open_backup_folder').catch(() => {})}
                    className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-widest text-emerald-300 hover:text-white bg-emerald-500/10 hover:bg-emerald-500/25 px-2.5 py-1 rounded transition-colors flex-shrink-0 ml-3"
                    title="Open the folder holding your database and its backups"
                  >
                    <FolderOpen size={12} /> Open Folder
                  </button>
                </div>
                {showBackupList && backups && backups.length > 0 && (
                  <div className="flex flex-col gap-1 max-h-32 overflow-y-auto custom-scrollbar border-t border-emerald-500/15 pt-2">
                    {backups.map(b => (
                      <div key={b.name} className="flex items-center justify-between text-[10px] font-sans px-1">
                        <span className="text-emerald-100/80">
                          {new Date(b.modified_secs * 1000).toLocaleString()}
                        </span>
                        <span className="text-emerald-100/40 ml-3 flex-shrink-0">
                          {b.size_kb >= 1024 ? `${(b.size_kb / 1024).toFixed(1)} MB` : `${Math.max(1, b.size_kb)} KB`}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="p-3 bg-indigo-900/20 border border-indigo-500/30 rounded text-center">
                <span className="text-[11px] text-indigo-200/80 font-sans">
                  💡 <b>Want to export your manuscript?</b> Spawn a <b>Print Node</b> on your canvas to compile and download your writing.
                </span>
              </div>
            </div>
            
          </div>
        )}
      </div>
    </Panel>
  );
}
