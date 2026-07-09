import { useEffect, useMemo, useRef, useState } from 'react';
import { useReactFlow } from '@xyflow/react';
import { Search, CornerDownLeft } from 'lucide-react';
import { useStore, AppNode } from '../store/useStore';

const stripHtml = (s: string) => s.replace(/<[^>]+>/g, ' ');

type Result = {
  node: AppNode;
  score: number;
  snippet: string;
};

// Ctrl/Cmd+K palette: fuzzy search across titles, content, tags, and aliases;
// Enter warps the camera to the picked node.
export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const nodes = useStore(state => state.nodes);
  const generateDemoProject = useStore(state => state.generateDemoProject);
  const { setCenter } = useReactFlow();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIndex(0);
      // Focus after the overlay mounts
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const results = useMemo<Result[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      // Empty query: most recently touched nodes first
      return nodes
        .slice()
        .sort((a, b) => (b.data.updated_at || 0) - (a.data.updated_at || 0))
        .slice(0, 8)
        .map(node => ({ node, score: 0, snippet: '' }));
    }

    // '#tag' filters by the tags field
    const tagQuery = q.startsWith('#') ? q.slice(1) : null;
    const terms = (tagQuery ?? q).split(/\s+/).filter(Boolean);

    const scored: Result[] = [];
    for (const node of nodes) {
      const title = (node.data.label || '').toLowerCase();
      const meta = (node.data as any).metadata || {};
      const tags = String(meta.tags || '').toLowerCase();
      const aliases = String(meta.aliases || '').toLowerCase();
      const body = stripHtml(`${node.data.content || ''} ${node.data.manuscript || ''} ${node.data.notes || ''}`).toLowerCase();

      if (tagQuery !== null) {
        if (terms.every(t => tags.includes(t))) {
          scored.push({ node, score: 10, snippet: meta.tags || '' });
        }
        continue;
      }

      const haystack = `${title} ${aliases} ${tags} ${body}`;
      if (!terms.every(t => haystack.includes(t))) continue;

      let score = 0;
      for (const t of terms) {
        if (title.startsWith(t)) score += 30;
        else if (title.includes(t)) score += 20;
        if (aliases.includes(t)) score += 12;
        if (tags.includes(t)) score += 10;
        if (body.includes(t)) score += 3;
      }

      // Short snippet around the first body hit
      let snippet = '';
      const hit = body.indexOf(terms[0]);
      if (hit >= 0) {
        snippet = body.slice(Math.max(0, hit - 24), hit + 44).trim();
        if (hit > 24) snippet = '…' + snippet;
      }
      scored.push({ node, score, snippet });
    }
    return scored.sort((a, b) => b.score - a.score).slice(0, 8);
  }, [query, nodes]);

  const jumpTo = (node: AppNode) => {
    const w = ((node.measured as any)?.width ?? (node.style as any)?.width ?? 300) as number;
    const h = ((node.measured as any)?.height ?? (node.style as any)?.height ?? 200) as number;
    setCenter(node.position.x + w / 2, node.position.y + h / 2, { zoom: 1, duration: 700 });
    onClose();
  };

  if (!open) return null;

  return (
    <div className="absolute inset-0 z-[110] bg-black/60 backdrop-blur-sm flex items-start justify-center pt-[18vh]" onClick={onClose}>
      <div className="command-palette" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 px-4 py-3 border-b border-[#2a2a35]">
          <Search size={15} className="text-[#f0c050] flex-shrink-0" />
          <input
            ref={inputRef}
            className="flex-1 bg-transparent text-sm text-gray-100 outline-none placeholder-gray-600"
            placeholder="Jump to a node… (#tag to filter by tag)"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0); }}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIndex(i => Math.min(i + 1, results.length - 1)); }
              else if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIndex(i => Math.max(i - 1, 0)); }
              else if (e.key === 'Enter') { 
                if (query.trim() === '> demo') {
                  generateDemoProject();
                  onClose();
                } else if (results[selectedIndex]) { 
                  jumpTo(results[selectedIndex].node); 
                }
              }
              else if (e.key === 'Escape') { onClose(); }
            }}
          />
          <kbd className="text-[9px] text-gray-600 border border-[#2a2a35] rounded px-1.5 py-0.5">ESC</kbd>
        </div>
        <div className="max-h-[320px] overflow-y-auto py-1">
          {results.length === 0 && query.trim() !== '> demo' && (
            <div className="px-4 py-6 text-center text-xs text-gray-600">No matching nodes</div>
          )}
          {query.trim() === '> demo' && (
            <div className="px-4 py-6 text-center text-xs text-yellow-500">Press ENTER to generate demo project</div>
          )}
          {results.map((r, i) => (
            <button
              key={r.node.id}
              className={`palette-item ${i === selectedIndex ? 'is-selected' : ''}`}
              onMouseEnter={() => setSelectedIndex(i)}
              onClick={() => jumpTo(r.node)}
            >
              <span className="palette-type">{r.node.type || 'node'}</span>
              <span className="flex-1 truncate text-left">{r.node.data.label || 'Untitled'}</span>
              {r.snippet && <span className="palette-snippet truncate">{r.snippet}</span>}
              {i === selectedIndex && <CornerDownLeft size={12} className="text-gray-600 flex-shrink-0" />}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
