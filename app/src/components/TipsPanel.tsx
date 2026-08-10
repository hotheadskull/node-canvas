// Tips & reference panel, opened from the ? button. Static reference for the
// interaction grammar plus the tour replay. An overlay (not a docked sidebar)
// so the canvas keeps every pixel when it's closed (I6).

import { X } from 'lucide-react';
import { useEffect } from 'react';
import { useCanvasStore } from '../store/canvasStore';

export function TipsPanel() {
  const open = useCanvasStore((state) => state.tipsOpen);
  const setOpen = useCanvasStore((state) => state.setTipsOpen);
  const setTutorialOpen = useCanvasStore((state) => state.setTutorialOpen);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, setOpen]);

  if (!open) return null;

  return (
    <div className="focus-backdrop" data-tips-panel onClick={() => setOpen(false)}>
      <div className="tips-panel" onClick={(event) => event.stopPropagation()}>
        <header className="tips-header">
          <strong>Tips &amp; reference</strong>
          <button
            className="tips-replay"
            onClick={() => {
              setOpen(false);
              setTutorialOpen(true);
            }}
          >
            Replay the tour
          </button>
          <button className="focus-close" aria-label="Close (Esc)" onClick={() => setOpen(false)}>
            <X size={16} aria-hidden />
          </button>
        </header>
        <div className="tips-body">
          <section>
            <h3>Three kinds of connection</h3>
            <ul>
              <li>
                <strong>Plain line</strong> — drag the diamond at the top of a side rail to any node. Works between
                everything, zero setup. Click its chip to label or delete.
              </li>
              <li>
                <strong>Data wire</strong> — drag a glowing give star (right rail) into a matching
                take star (left rail). Compatible stars glow green while you drag.
              </li>
              <li>
                <strong>Tentative</strong> — drop a give star on a node's plain dot: a dashed
                "this might go here". Commit one candidate and its siblings dissolve (with Undo).
              </li>
            </ul>
          </section>
          <section>
            <h3>Shortcuts</h3>
            <ul>
              <li><strong>Ctrl+K</strong> — jump to any node, or capture a thought into the Workbench</li>
              <li><strong>Double-click a node</strong> — it grows in place for writing; Esc returns (documents open their room)</li>
              <li><strong>Shift+F</strong> (or the Focus button) — the full writing room, no canvas</li>
              <li><strong>Alt+← / Alt+→</strong> — walk sibling sections inside the focus room</li>
              <li><strong>Ctrl-click</strong> — multi-select; then Group N in the toolbar</li>
              <li><strong>Delete</strong> — remove the selected node, line, or wire</li>
            </ul>
          </section>
          <section>
            <h3>Groups</h3>
            <ul>
              <li>Collapse/expand is lossless — members come back exactly where they were.</li>
              <li>Open drills into a group on its own canvas (breadcrumbs, top-left).</li>
              <li>Unpack dissolves the group; the nodes always survive.</li>
              <li>Zoom far out and collapsed groups become stars. Double-click one to dive.</li>
            </ul>
          </section>
          <section>
            <h3>Nudges, never blocks</h3>
            <ul>
              <li>An amber pip on a port slot means the node wants something there — a plant with
                no payoff, a claim with empty supports, a document serving no thread. Nothing is
                ever locked.</li>
              <li>The readiness ring (left of a node's header) cycles seed → developing → ready →
                placed. Groups roll it up.</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
