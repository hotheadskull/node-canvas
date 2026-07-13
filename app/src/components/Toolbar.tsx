// Compact toolbar, bottom-left (I6). Fit view is a BUTTON -- the only way the
// viewport ever moves without direct pan/zoom is the user clicking it (I5).

import { useReactFlow } from '@xyflow/react';
import { Frame, Plus } from 'lucide-react';

type Props = {
  menuOpen: boolean;
  onToggleMenu: () => void;
};

export function Toolbar({ menuOpen, onToggleMenu }: Props) {
  const { fitView } = useReactFlow();
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
    </div>
  );
}
