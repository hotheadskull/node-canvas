// The DOCK (pt2 handoff §10) -- a 56px rail on the left edge. Add node
// sits ALONE at the top: the only button that makes something, so it gets
// its own zone, a 38px tile and the strongest fill. Below it the four
// rooms (the canvas is the map; each room is one ordering), then the
// three tools that act on what already exists, then a spacer, then
// project/settings/help. Icons only at rest; a label slides out on hover
// after 400ms (CSS transition-delay). No text ever wraps.
//
// Fit stays a BUTTON -- the only way the viewport ever moves without a
// direct pan/zoom is the user clicking it (I5). Group/Merge are
// selection-contextual and ride in a floating pill bottom-center, where
// their counts can stay readable words.

import { useReactFlow } from '@xyflow/react';
import {
  Boxes,
  Combine,
  Filter,
  Frame,
  GitBranch,
  HelpCircle,
  Import,
  PenLine,
  Plus,
  Search,
  Settings2,
  Trash2,
  Undo2,
  Redo2,
} from 'lucide-react';
import { ProjectLauncher } from './ProjectLauncher';
import { useEffect, useState } from 'react';
import { isTauri } from '../persistence/projectFile';
import { useCanvasStore, type PortLabelMode } from '../store/canvasStore';

type Props = {
  menuOpen: boolean;
  onToggleMenu: () => void;
  selectedCount: number;
  onGather: () => void;
  /** 2+ same-type nodes selected: merge is on offer (0 = hidden). */
  mergeableCount: number;
  onMerge: () => void;
  /** Room targets derived from the selection (null = tile disabled). */
  docTargetId: string | null;
  arcTargetId: string | null;
  focusTargetId: string | null;
};

/** True when the key press belongs to typing, not to the dock. */
function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    target.isContentEditable
  );
}

export function Toolbar({
  menuOpen,
  onToggleMenu,
  selectedCount,
  onGather,
  mergeableCount,
  onMerge,
  docTargetId,
  arcTargetId,
  focusTargetId,
}: Props) {
  const { fitBounds, deleteElements, getNodes, getEdges } = useReactFlow();
  const settings = useCanvasStore((state) => state.settings);
  const setSettings = useCanvasStore((state) => state.setSettings);
  const setTipsOpen = useCanvasStore((state) => state.setTipsOpen);
  const projectFileName = useCanvasStore((state) => state.projectFileName);
  const docRoomId = useCanvasStore((state) => state.docRoomId);
  const arcRoomId = useCanvasStore((state) => state.arcRoomId);
  const editorNodeId = useCanvasStore((state) => state.editorNodeId);
  const setPaletteOpen = useCanvasStore((state) => state.setPaletteOpen);
  const filterPinned = useCanvasStore((state) => state.filterPinned);
  const setFilterPinned = useCanvasStore((state) => state.setFilterPinned);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [launcherOpen, setLauncherOpen] = useState(false);
  const [projectOpen, setProjectOpen] = useState(false);

  const past = useCanvasStore((state) => state.past);
  const future = useCanvasStore((state) => state.future);
  const undo = useCanvasStore((state) => state.undo);
  const redo = useCanvasStore((state) => state.redo);

  const inkMode = useCanvasStore((state) => state.inkMode);
  const setInkMode = useCanvasStore((state) => state.setInkMode);

  const activeRoom: 'canvas' | 'document' | 'arc' | 'focus' =
    docRoomId !== null ? 'document' : arcRoomId !== null ? 'arc' : editorNodeId !== null ? 'focus' : 'canvas';

  const projectAction = (action: () => unknown) => () => {
    setProjectOpen(false);
    void action();
  };

  const toCanvas = () => {
    const store = useCanvasStore.getState();
    store.openDocRoom(null);
    store.openArcRoom(null);
    store.openEditor(null);
  };
  const toDocument = () => {
    if (docTargetId) useCanvasStore.getState().openDocRoom(docTargetId);
  };
  const toArc = () => {
    if (arcTargetId) useCanvasStore.getState().openArcRoom(arcTargetId);
  };
  const toFocus = () => {
    if (focusTargetId) useCanvasStore.getState().openEditor(focusTargetId);
  };

  // Fit computes bounds from the DOCUMENT, not from rendered nodes --
  // onlyRenderVisibleElements culls off-screen nodes from the DOM, and RF's
  // own fitView only fits measured (rendered) nodes, which would make Fit
  // ignore exactly the content the user is trying to get back to.
  const fitAll = () => {
    const doc = useCanvasStore.getState().document;
    const rects = [
      ...doc.nodes.map((node) => ({
        x: node.position.x,
        y: node.position.y,
        width: node.size?.width ?? 300,
        height: node.size?.height ?? 200,
      })),
      ...doc.assemblies.map((assembly) => ({
        x: assembly.position.x,
        y: assembly.position.y,
        width: 260,
        height: 150,
      })),
    ];
    if (rects.length === 0) return;
    const minX = Math.min(...rects.map((rect) => rect.x));
    const minY = Math.min(...rects.map((rect) => rect.y));
    const maxX = Math.max(...rects.map((rect) => rect.x + rect.width));
    const maxY = Math.max(...rects.map((rect) => rect.y + rect.height));
    void fitBounds(
      { x: minX, y: minY, width: maxX - minX, height: maxY - minY },
      { padding: 0.15, duration: 300 },
    );
  };

  // §10 gestures: N add sheet · 1-4 rooms · F filter. Typing never
  // triggers them; modifier chords stay free for the browser/app.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey) {
        if (event.key === 'z') {
          event.preventDefault();
          if (event.shiftKey) {
            redo();
          } else {
            undo();
          }
          return;
        }
      }

      if (event.metaKey || event.ctrlKey || event.altKey) return;

      if (isTyping(event.target)) return;
      switch (event.key) {
        case 'n':
        case 'N':
          onToggleMenu();
          break;
        case '1':
          toCanvas();
          break;
        case '2':
          toDocument();
          break;
        case '3':
          toArc();
          break;
        case '4':
          toFocus();
          break;
        case 'f':
        case 'F':
          if (!event.shiftKey) setFilterPinned(!filterPinned);
          break;
        default:
          return;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onToggleMenu, docTargetId, arcTargetId, focusTargetId, filterPinned, setFilterPinned]);

  const tile = (label: string, shortcut: string) => `${label} (${shortcut})`;

  return (
    <>
      <nav className="dock" aria-label="Dock">
        <div className="toolbar-add">
          <button
            className={`dock-tile dock-add toolbar-button ${menuOpen ? 'is-active' : ''}`}
            onClick={onToggleMenu}
            aria-expanded={menuOpen}
            aria-label="Add node"
            title={tile('Add node', 'N')}
          >
            <Plus size={18} aria-hidden />
            <span className="dock-label">Add node</span>
          </button>
        </div>
        <span className="dock-rule" aria-hidden />
        <button
          className={`dock-tile ${activeRoom === 'canvas' ? 'is-room-active' : ''}`}
          aria-label="Canvas room"
          title={tile('Canvas — the map', '1')}
          onClick={toCanvas}
        >
          <GitBranch size={16} aria-hidden />
          <span className="dock-label">Canvas</span>
        </button>

        <button
          className="dock-tile"
          aria-label="Find"
          title={tile('Find', '⌘K')}
          onClick={() => setPaletteOpen(true)}
        >
          <Search size={16} aria-hidden />
          <span className="dock-label">Find</span>
        </button>
        <button
          className={`dock-tile ${filterPinned ? 'is-active' : ''}`}
          aria-label="Filter"
          title={tile('Filter wires by kind', 'F')}
          onClick={() => setFilterPinned(!filterPinned)}
        >
          <Filter size={16} aria-hidden />
          <span className="dock-label">Filter</span>
        </button>
        <button
          className={`dock-tile ${inkMode ? 'is-active' : ''}`}
          aria-label="Ink"
          title={tile('Ink layer — draw on canvas', 'I')}
          onClick={() => setInkMode(!inkMode)}
        >
          <PenLine size={16} aria-hidden />
          <span className="dock-label">Ink</span>
        </button>
        <span className="dock-rule" aria-hidden />
        <button
          className="dock-tile"
          aria-label="Undo"
          title={tile('Undo', '⌘Z')}
          onClick={undo}
          disabled={past.length === 0}
        >
          <Undo2 size={16} aria-hidden />
          <span className="dock-label">Undo</span>
        </button>
        <button
          className="dock-tile"
          aria-label="Redo"
          title={tile('Redo', '⇧⌘Z')}
          onClick={redo}
          disabled={future.length === 0}
        >
          <Redo2 size={16} aria-hidden />
          <span className="dock-label">Redo</span>
        </button>
        <button
          className={`dock-tile dock-delete ${(selectedCount > 0 || editorNodeId !== null) ? 'is-glowing' : ''}`}
          aria-label="Delete"
          title={tile('Delete selected', 'Del')}
          onClick={() => {
            if (selectedCount > 0) {
              const nodes = getNodes().filter(n => n.selected);
              const edges = getEdges().filter(e => e.selected);
              deleteElements({ nodes, edges });
            } else if (editorNodeId !== null) {
              const node = getNodes().find(n => n.id === editorNodeId);
              if (node) deleteElements({ nodes: [node] });
              useCanvasStore.getState().openEditor(null);
            }
          }}
          disabled={selectedCount === 0 && editorNodeId === null}
        >
          <Trash2 size={16} aria-hidden />
          <span className="dock-label">Delete</span>
        </button>
        <span className="dock-spacer" aria-hidden />
        <button className="dock-tile" aria-label="Fit" title="Fit the view to your nodes" onClick={fitAll}>
          <Frame size={16} aria-hidden />
          <span className="dock-label">Fit</span>
        </button>
        <button
          className={`dock-tile ${projectOpen ? 'is-active' : ''}`}
          title="Project: open, save, export"
          aria-expanded={projectOpen}
          aria-label="Project"
          onClick={() => setProjectOpen((open) => !open)}
        >
          <Import size={16} aria-hidden />
          <span className="dock-label">Project</span>
        </button>
        <button
          className={`dock-tile ${settingsOpen ? 'is-active' : ''}`}
          title="Canvas settings"
          aria-expanded={settingsOpen}
          aria-label="Canvas settings"
          onClick={() => setSettingsOpen((open) => !open)}
        >
          <Settings2 size={16} aria-hidden />
          <span className="dock-label">Settings</span>
        </button>
        <button
          className="dock-tile"
          title="Tips, reference, and the tour"
          aria-label="Help"
          onClick={() => setTipsOpen(true)}
        >
          <HelpCircle size={16} aria-hidden />
          <span className="dock-label">Help</span>
        </button>
      </nav>
      {((selectedCount >= 1) || mergeableCount >= 2) && (
        <div className="selection-actions" role="toolbar" aria-label="Selection actions">
          {selectedCount >= 1 && (
            <button
              className="toolbar-button"
              style={{ color: '#f87171' }}
              title="Delete selected"
              onClick={() => {
                const nodes = getNodes().filter(n => n.selected);
                const edges = getEdges().filter(e => e.selected);
                deleteElements({ nodes, edges });
              }}
            >
              <Trash2 size={15} aria-hidden />
              <span>Delete {selectedCount}</span>
            </button>
          )}
          {selectedCount >= 2 && (
            <button
              className="toolbar-button"
              title="Gather the selected nodes into a group"
              onClick={onGather}
            >
              <Boxes size={15} aria-hidden />
              <span>Group {selectedCount}</span>
            </button>
          )}
          {mergeableCount >= 2 && (
            <button
              className="toolbar-button"
              title="Fold these into the first-selected node — prose appends, wires re-point"
              onClick={onMerge}
            >
              <Combine size={15} aria-hidden />
              <span>Merge {mergeableCount}</span>
            </button>
          )}
        </div>
      )}
      {projectOpen && (
        <div className="settings-popover is-dock" role="dialog" aria-label="Project">
          <p className="settings-title">
            {projectFileName ?? 'Untitled project (browser storage)'}
          </p>
          <div className="settings-column">
            <button onClick={projectAction(() => useCanvasStore.getState().newProject())}>
              New canvas
            </button>
            <button onClick={() => { setLauncherOpen(true); setProjectOpen(false); }}>
              Open project…
            </button>
            <button onClick={projectAction(() => useCanvasStore.getState().saveProject())}>
              {isTauri() ? 'Save' : 'Download a copy (.nodecanvas)'}
            </button>
            {isTauri() && (
              <button onClick={projectAction(() => useCanvasStore.getState().saveProjectAs())}>
                Save as…
              </button>
            )}
            <button
              onClick={projectAction(() => useCanvasStore.getState().exportCanvasImage('png'))}
            >
              Export canvas as PNG
            </button>
            <button
              onClick={projectAction(() => useCanvasStore.getState().exportCanvasImage('svg'))}
            >
              Export canvas as SVG
            </button>
          </div>
        </div>
      )}
      {launcherOpen && (
        <ProjectLauncher onClose={() => setLauncherOpen(false)} />
      )}
      {settingsOpen && (
        <div className="settings-popover is-dock" role="dialog" aria-label="Canvas settings">
          <p className="settings-title">Canvas settings</p>
          <div className="settings-row">
            <span>Density</span>
            <span className="settings-toggle">
              {(['comfortable', 'compact'] as const).map((density) => (
                <button
                  key={density}
                  className={settings.density === density ? 'is-active' : ''}
                  onClick={() => setSettings({ density })}
                >
                  {density === 'comfortable' ? 'Comfy' : 'Compact'}
                </button>
              ))}
            </span>
          </div>
          <div className="settings-row">
            <span>Port labels</span>
            <span className="settings-toggle">
              {(['hover', 'always', 'off'] as PortLabelMode[]).map((mode) => (
                <button
                  key={mode}
                  className={settings.portLabels === mode ? 'is-active' : ''}
                  onClick={() => setSettings({ portLabels: mode })}
                >
                  {mode === 'hover' ? 'Hover' : mode === 'always' ? 'Always' : 'Off'}
                </button>
              ))}
            </span>
          </div>
        </div>
      )}
    </>
  );
}
