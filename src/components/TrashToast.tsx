import { useEffect, useState } from 'react';
import { RotateCcw, Trash2 } from 'lucide-react';
import { useStore } from '../store/useStore';

type Toast = { key: number; id: string; label: string; type?: string };

const TOAST_LIFETIME_MS = 4000;

// Every node trashing (toolbar delete, Delete key, deck absorption) fires a
// 'node-trashed' event from the store. This stack makes sure the user SEES
// it happen and can undo it in one click -- the "where did my node go?"
// failure mode should be impossible.
export function TrashToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const restoreNode = useStore(state => state.restoreNode);

  useEffect(() => {
    let counter = 0;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const handleTrashed = (e: any) => {
      const key = ++counter;
      const { id, label, type } = e.detail || {};
      if (!id) return;
      setToasts(prev => [...prev.slice(-2), { key, id, label, type }]);
      timers.push(setTimeout(() => {
        setToasts(prev => prev.filter(t => t.key !== key));
      }, TOAST_LIFETIME_MS));
    };
    window.addEventListener('node-trashed', handleTrashed);
    return () => {
      window.removeEventListener('node-trashed', handleTrashed);
      timers.forEach(clearTimeout);
    };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[10000] flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => (
        <div
          key={t.key}
          className="pointer-events-auto flex items-center gap-3 bg-[#1a1a20]/95 border border-[#a88530]/50 rounded-lg px-4 py-2.5 shadow-2xl shadow-black backdrop-blur-md"
        >
          <Trash2 size={14} className="text-orange-400 flex-shrink-0" />
          <span className="text-xs text-gray-300 font-serif max-w-[260px] truncate">
            "{t.label}" moved to trash
          </span>
          <button
            onClick={async () => {
              setToasts(prev => prev.filter(x => x.key !== t.key));
              await restoreNode(t.id);
            }}
            className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-widest text-[#f0c050] hover:text-white bg-[#f0c050]/10 hover:bg-[#f0c050]/25 px-2.5 py-1 rounded transition-colors flex-shrink-0"
          >
            <RotateCcw size={11} /> Restore
          </button>
        </div>
      ))}
    </div>
  );
}
