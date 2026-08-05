import { ReactFlowProvider } from '@xyflow/react';
import { useEffect } from 'react';
import { Canvas } from './Canvas';
import { isTauri } from './persistence/projectFile';
import { useCanvasStore } from './store/canvasStore';

/** The global capture shortcut (Chunk 12's deferred half, unblocked by the
 * Chunk 18 shell): works while the app is in the BACKGROUND -- pressing it
 * fronts the window and opens the palette ready to capture. */
const CAPTURE_SHORTCUT = 'CommandOrControl+Shift+K';

export default function App() {
  const load = useCanvasStore((state) => state.load);
  const persistenceError = useCanvasStore((state) => state.persistenceError);
  const dismissError = useCanvasStore((state) => state.dismissError);

  useEffect(() => {
    load();
    // Saves are debounced; flush the pending one when the page goes away or
    // a quick reload/close would silently drop the last edit (I9).
    const flush = () => useCanvasStore.getState().save();
    window.addEventListener('pagehide', flush);
    window.addEventListener('beforeunload', flush);
    return () => {
      window.removeEventListener('pagehide', flush);
      window.removeEventListener('beforeunload', flush);
    };
  }, [load]);

  useEffect(() => {
    if (!isTauri()) return;
    let cleanup = () => {};
    void (async () => {
      try {
        const { register, unregister } = await import('@tauri-apps/plugin-global-shortcut');
        const { getCurrentWindow } = await import('@tauri-apps/api/window');
        await register(CAPTURE_SHORTCUT, (event) => {
          if (event.state !== 'Pressed') return;
          void (async () => {
            const window_ = getCurrentWindow();
            await window_.show();
            await window_.unminimize();
            await window_.setFocus();
            useCanvasStore.getState().setPaletteOpen(true);
          })();
        });
        cleanup = () => void unregister(CAPTURE_SHORTCUT);
      } catch {
        // The shortcut is polish; the app is fully usable without it (and
        // another app may already own the combination).
      }
    })();
    return () => cleanup();
  }, []);

  return (
    <main data-testid="app-shell" className="app-shell">
      {persistenceError && (
        <div className="error-banner" role="alert">
          <span>{persistenceError}</span>
          <button onClick={dismissError} aria-label="Dismiss">
            ×
          </button>
        </div>
      )}
      <ReactFlowProvider>
        <Canvas />
      </ReactFlowProvider>
    </main>
  );
}
