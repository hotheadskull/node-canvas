import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Link2 } from 'lucide-react';
import { useStore } from '../store/useStore';

// ALIAS PIN: a tiny title-only node that points at a real node elsewhere on
// the canvas. Wire it into a hub or cluster and the constellation hover
// treats it as a bridge to the real node's whole web. Double-click jumps to
// the target (handled in App).
export const AliasNode = memo(({ id, data, selected }: any) => {
  const allNodes = useStore(state => state.nodes);
  const updateNodeData = useStore(state => state.updateNodeData);

  const meta = data.metadata || {};
  const targetId: string = meta.targetId || '';
  const target = allNodes.find(n => n.id === targetId);

  // Candidates: any real node with a title (no alias-to-alias chains)
  const candidates = allNodes
    .filter(n => n.id !== id && n.type !== 'alias' && (n.data.label || '').trim().length > 0)
    .sort((a, b) => (a.data.label || '').localeCompare(b.data.label || ''));

  const pickTarget = (nid: string) => {
    const picked = allNodes.find(n => n.id === nid);
    updateNodeData(id, {
      // Mirror the target's title so canvas search still finds the pin
      label: picked ? `${picked.data.label}` : '',
      metadata: { ...meta, targetId: nid },
    });
  };

  return (
    <div
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border-2 bg-[#151518]/95 shadow-xl transition-colors ${
        selected ? 'border-[#f0c050]' : 'border-[#a88530]/60'
      }`}
      style={{ boxShadow: selected ? '0 0 12px rgba(240,192,80,0.35)' : '0 4px 12px rgba(0,0,0,0.5)' }}
      title={target ? `Alias of "${target.data.label}" — double-click to jump there` : 'Pick a node to link'}
    >
      <Handle id="top" type="target" position={Position.Top} className="w-2.5 h-2.5 rounded-full -top-1.5 border-2 border-[#151518] bg-[#f0c050] z-50" />
      <Handle id="bottom" type="source" position={Position.Bottom} className="w-2.5 h-2.5 rounded-full -bottom-1.5 border-2 border-[#151518] bg-[#f0c050] z-50" />

      <Link2 size={12} className="text-[#f0c050] flex-shrink-0" />
      <select
        className="bg-transparent text-xs font-bold text-[#d4b98c] outline-none cursor-pointer max-w-[150px] truncate"
        value={targetId}
        onChange={(e) => pickTarget(e.target.value)}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <option value="" className="bg-[#151518]">Link to…</option>
        {candidates.map(n => (
          <option key={n.id} value={n.id} className="bg-[#151518]">
            {n.data.label}
          </option>
        ))}
      </select>
    </div>
  );
});
