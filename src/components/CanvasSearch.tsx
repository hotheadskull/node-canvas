import { useState, useEffect } from 'react';
import { useReactFlow } from '@xyflow/react';
import { useStore } from '../store/useStore';

export function CanvasSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const { setCenter } = useReactFlow();
  const nodes = useStore(state => state.nodes);

  useEffect(() => {
    if (query.trim().length === 0) {
      setResults([]);
      return;
    }
    const lowerQuery = query.toLowerCase();
    const matches = nodes.filter(n => 
      (n.data?.label as string || '').toLowerCase().includes(lowerQuery) ||
      (n.data?.content as string || '').toLowerCase().includes(lowerQuery) ||
      (n.data?.manuscript as string || '').toLowerCase().includes(lowerQuery)
    ).slice(0, 5);
    setResults(matches);
  }, [query, nodes]);

  const handleSelect = (node: any) => {
    // Navigate to node center
    const width = node.style?.width ? Number(node.style.width) : 250;
    const height = node.style?.height ? Number(node.style.height) : 150;
    
    setCenter(node.position.x + width / 2, node.position.y + height / 2, { zoom: 1.2, duration: 800 });
    setQuery('');
    setResults([]);
  };

  return (
    <div className="absolute top-4 right-4 z-50 w-64">
      <div className="relative">
        <input 
          type="text" 
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search canvas... 🔍"
          className="w-full bg-[#111114] border-2 border-[#2a2a35] text-white px-4 py-2 rounded-lg shadow-xl outline-none focus:border-[#4c1d95] transition-colors"
        />
        {results.length > 0 && (
          <div className="absolute top-full right-0 mt-2 w-full bg-[#111114] border border-[#2a2a35] rounded-lg shadow-2xl overflow-hidden flex flex-col max-h-[300px] overflow-y-auto">
            {results.map(n => (
              <button 
                key={n.id}
                onClick={() => handleSelect(n)}
                className="text-left px-4 py-2 hover:bg-[#1a1a1f] border-b border-[#2a2a35] last:border-b-0 transition-colors"
              >
                <div className="font-bold text-[#a78bfa] text-sm truncate">{n.data.label || 'Untitled'}</div>
                <div className="text-[10px] text-gray-500 uppercase">{n.type}</div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
