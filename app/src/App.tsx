import { ReactFlowProvider } from '@xyflow/react';
import { useEffect } from 'react';
import { Canvas } from './Canvas';
import { useCanvasStore } from './store/canvasStore';

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
