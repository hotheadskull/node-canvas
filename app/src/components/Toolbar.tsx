// Compact toolbar, bottom-left (I6). Fit view is a BUTTON -- the only way the
// viewport ever moves without direct pan/zoom is the user clicking it (I5).
// The gear opens canvas settings: density and port-label visibility.

import { useReactFlow } from '@xyflow/react';
import { Boxes, Frame, Plus, Settings2 } from 'lucide-react';
import { useState } from 'react';
import { useCanvasStore, type PortLabelMode } from '../store/canvasStore';

type Props = {
  menuOpen: boolean;
  onToggleMenu: () => void;
  selectedCount: number;
  onGather: () => void;
};

export function Toolbar({ menuOpen, onToggleMenu, selectedCount, onGather }: Props) {
  const { fitView } = useReactFlow();
  const settings = useCanvasStore((state) => state.settings);
  const setSettings = useCanvasStore((state) => state.setSettings);
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <div className="toolbar">
      <button
        className={`toolbar-button primary ${menuOpen ? 'is-active' : ''}`}
        onClick={onToggleMenu}
        aria-expanded={menuOpen}
      >
        <Plus size={16} aria-hidden />
        <span>Add node</span>
      </button>
      <button
        className="toolbar-button"
        title="Fit the view to your nodes"
        onClick={() => void fitView({ padding: 0.2, duration: 300 })}
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
      <button
        className={`toolbar-button ${settingsOpen ? 'is-active' : ''}`}
        title="Canvas settings"
        aria-expanded={settingsOpen}
        aria-label="Canvas settings"
        onClick={() => setSettingsOpen((open) => !open)}
      >
        <Settings2 size={15} aria-hidden />
      </button>
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
  );
}
