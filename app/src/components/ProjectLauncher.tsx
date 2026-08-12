import { useCanvasStore } from '../store/canvasStore';
import { getShortStoryDemo, getAcademicPaperDemo, getFantasyNovelDemo } from '../demoProjects';
import { File, FolderOpen, Wand2, X } from 'lucide-react';

export function ProjectLauncher({ onClose }: { onClose: () => void }) {
  const settings = useCanvasStore((state) => state.settings);
  const openProject = useCanvasStore((state) => state.openProject);
  
  const handleLoadDemo = (type: 'short-story' | 'academic' | 'fantasy') => {
    let doc;
    let title = '';
    switch (type) {
      case 'short-story':
        doc = getShortStoryDemo();
        title = 'Short Story Template';
        break;
      case 'academic':
        doc = getAcademicPaperDemo();
        title = 'Academic Paper Template';
        break;
      case 'fantasy':
        doc = getFantasyNovelDemo();
        title = 'Fantasy Novel Template';
        break;
    }
    
    // We import adopt by calling a store action. 
    // Wait, adopt is private inside canvasStore.ts.
    // I can expose a `loadDocumentObj(doc, name)` action in canvasStore.ts!
    useCanvasStore.getState().loadTemplate(doc, title);
    onClose();
  };

  const handleOpenRecent = (path: string | null) => {
    // To open a recent project, we might need a store action.
    // In Tauri, we can read the file by path. In web, if path is null, we can't open it without FilePicker.
    if (path) {
      useCanvasStore.getState().openRecentProject(path);
    } else {
      useCanvasStore.getState().toast = { message: 'Browser storage projects must be opened via Browse...' };
    }
    onClose();
  };

  return (
    <div className="settings-popover is-dock" style={{ bottom: '50px', left: '10px', width: '300px' }} role="dialog" aria-label="Project Launcher">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <p className="settings-title" style={{ margin: 0 }}>Open Project</p>
        <button className="icon-btn" onClick={onClose}><X size={16} /></button>
      </div>

      <button onClick={() => { openProject(); onClose(); }} style={{ width: '100%', justifyContent: 'flex-start', padding: '10px', marginBottom: '15px' }}>
        <FolderOpen size={16} style={{ marginRight: '8px' }} /> Browse your computer...
      </button>

      <div style={{ marginBottom: '15px' }}>
        <p className="settings-title">Recent Projects</p>
        {(!settings.recentProjects || settings.recentProjects.length === 0) && (
          <p style={{ color: 'var(--text-dim)', fontSize: '0.9em', paddingLeft: '5px' }}>No recent projects</p>
        )}
        {settings.recentProjects?.map((proj) => (
          <button 
            key={`${proj.path}-${proj.name}`}
            onClick={() => handleOpenRecent(proj.path)}
            style={{ width: '100%', justifyContent: 'flex-start', padding: '6px 10px', fontWeight: 'normal' }}
          >
            <File size={14} style={{ marginRight: '8px', opacity: 0.6 }} />
            {proj.name}
          </button>
        ))}
      </div>

      <div>
        <p className="settings-title">Templates & Examples</p>
        <button onClick={() => handleLoadDemo('short-story')} style={{ width: '100%', justifyContent: 'flex-start', padding: '6px 10px', fontWeight: 'normal' }}>
          <Wand2 size={14} style={{ marginRight: '8px', opacity: 0.6 }} /> Short Story
        </button>
        <button onClick={() => handleLoadDemo('academic')} style={{ width: '100%', justifyContent: 'flex-start', padding: '6px 10px', fontWeight: 'normal' }}>
          <Wand2 size={14} style={{ marginRight: '8px', opacity: 0.6 }} /> Academic Paper
        </button>
        <button onClick={() => handleLoadDemo('fantasy')} style={{ width: '100%', justifyContent: 'flex-start', padding: '6px 10px', fontWeight: 'normal' }}>
          <Wand2 size={14} style={{ marginRight: '8px', opacity: 0.6 }} /> Fantasy Novel (Chapter 1)
        </button>
      </div>
    </div>
  );
}
