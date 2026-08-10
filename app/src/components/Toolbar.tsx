// Compact toolbar, bottom-left (I6). Fit view is a BUTTON -- the only way the
// viewport ever moves without direct pan/zoom is the user clicking it (I5).
// The gear opens canvas settings: density and port-label visibility.

import { useReactFlow } from '@xyflow/react';
import { Boxes, Combine, FolderOpen, Frame, HelpCircle, Plus, Settings2 } from 'lucide-react';
import { useState } from 'react';
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
};

export function Toolbar({
  menuOpen,
  onToggleMenu,
  selectedCount,
  onGather,
  mergeableCount,
  onMerge,
}: Props) {
  const { fitBounds } = useReactFlow();
  const settings = useCanvasStore((state) => state.settings);
  const setSettings = useCanvasStore((state) => state.setSettings);
  const setTipsOpen = useCanvasStore((state) => state.setTipsOpen);
  const projectFileName = useCanvasStore((state) => state.projectFileName);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [projectOpen, setProjectOpen] = useState(false);

  const projectAction = (action: () => unknown) => () => {
    setProjectOpen(false);
    void action();
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

  return (
    <>
      <div className="toolbar-add">
        <button
          className={`toolbar-button primary ${menuOpen ? 'is-active' : ''}`}
          onClick={onToggleMenu}
          aria-expanded={menuOpen}
        >
          <Plus size={16} aria-hidden />
          <span>Add node</span>
        </button>
      </div>
      <div className="toolbar">
      <button
        className="toolbar-button"
        title="Fit the view to your nodes"
        onClick={fitAll}
      >
        <Frame size={15} aria-hidden />
        <span>Fit</span>
      </button>
      {selectedCount >= 2 && (
        <button className="toolbar-button" title="Gather the selected nodes into a group" onClick={onGather}>
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
      <button
        className={`toolbar-button ${projectOpen ? 'is-active' : ''}`}
        title="Project: open, save, export"
        aria-expanded={projectOpen}
        aria-label="Project"
        onClick={() => setProjectOpen((open) => !open)}
      >
        <FolderOpen size={15} aria-hidden />
      </button>
      <button
        className={`toolbar-button ${settingsOpen ? 'is-active' : ''}`}
        title="Canvas settings"
        aria-expanded={settingsOpen}
        aria-label="Canvas settings"
        onClick={() => setSettingsOpen((open) => !open)}
      >
        <Settings2 size={15} aria-hidden />
      </button>
      <button
        className="toolbar-button"
        title="Tips, reference, and the tour"
        aria-label="Help"
        onClick={() => setTipsOpen(true)}
      >
        <HelpCircle size={15} aria-hidden />
      </button>
      {projectOpen && (
        <div className="settings-popover" role="dialog" aria-label="Project">
          <p className="settings-title">
            {projectFileName ?? 'Untitled project (browser storage)'}
          </p>
          <div className="settings-column">
            <button onClick={projectAction(() => useCanvasStore.getState().newProject())}>
              New canvas
            </button>
            <button onClick={projectAction(() => useCanvasStore.getState().openProject())}>
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
      {settingsOpen && (
        <div className="settings-popover" role="dialog" aria-label="Canvas settings">
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
      </div>
    </>
  );
}
