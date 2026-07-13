// Bottom-center toast with an optional Undo action (commit-dissolve, and
// later deletions). Auto-dismisses; Undo is a real button, not a timer race.

import { useEffect } from 'react';
import { useCanvasStore } from '../store/canvasStore';

export function Toast() {
  const toast = useCanvasStore((state) => state.toast);
  const dismissToast = useCanvasStore((state) => state.dismissToast);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => dismissToast(), 6000);
    return () => clearTimeout(timer);
  }, [toast, dismissToast]);

  if (!toast) return null;
  return (
    <div className="toast" role="status">
      <span>{toast.message}</span>
      {toast.undo && (
        <button className="toast-undo" onClick={toast.undo}>
          Undo
        </button>
      )}
      <button className="toast-close" aria-label="Dismiss" onClick={dismissToast}>
        ×
      </button>
    </div>
  );
}
