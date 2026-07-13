import { memo, useEffect } from 'react';
import { Handle, Position, NodeProps, useUpdateNodeInternals } from '@xyflow/react';
import { Swords, ArrowRightToLine, Plus, Trash2 } from 'lucide-react';
import { useStore, AppNode } from '../store/useStore';
import { BaseNode } from './BaseNode';

export const CrucibleNode = memo(({ id, data, selected }: NodeProps<AppNode>) => {
  const updateNodeData = useStore(state => state.updateNodeData);
  const edges = useStore(state => state.edges);
  const nodes = useStore(state => state.nodes);

  // Dynamic number of ordered input slots (default 3)
  const slotCount: number = typeof data.slotCount === 'number' ? data.slotCount : 3;
  const slots: number[] = Array.from({ length: slotCount }, (_, i) => i + 1);

  // Slot handles are created dynamically -- React Flow must re-measure them
  // when "Add Factor" grows the list or connections to new slots silently
  // fail (same class of bug as compile slots and sequence beats).
  const updateNodeInternals = useUpdateNodeInternals();
  useEffect(() => {
    updateNodeInternals(id);
  }, [id, slotCount, updateNodeInternals]);
  const resolution: string = typeof data.resolution === 'string' ? data.resolution : '';
  const participantData: Record<string, string> = (data.participantData as Record<string, string>) || {};

  const handleAddSlot = () => {
    updateNodeData(id, { slotCount: slotCount + 1 });
  };

  const handleRemoveSlot = () => {
    if (slotCount > 1) {
      updateNodeData(id, { slotCount: slotCount - 1 });
    }
  };

  const handleParticipantChange = (slotId: string, val: string) => {
    updateNodeData(id, {
      participantData: { ...participantData, [slotId]: val }
    });
  };

  const pushToScene = () => {
    // Find output edge
    const outEdge = edges.find(e => e.source === id && e.sourceHandle === 'crucible-out');
    if (!outEdge) {
      alert("No scene connected to the output socket!");
      return;
    }
    
    const targetNode = nodes.find(n => n.id === outEdge.target);
    if (!targetNode || targetNode.type !== 'scene') {
      alert("Output socket must be connected to a Scene node!");
      return;
    }

    // Build the text to insert
    let textToInsert = `<p><strong>--- CRUCIBLE CONFLICT ---</strong></p>`;
    
    slots.forEach(slot => {
      const connectingEdge = edges.find(e => e.target === id && e.targetHandle === `slot-${slot}`);
      const participantText = participantData[`slot-${slot}`] || '';
      
      let participantName = `Participant ${slot}`;
      if (connectingEdge) {
        const sourceNode = nodes.find(n => n.id === connectingEdge.source);
        if (sourceNode) participantName = sourceNode.data.label as string || participantName;
      }
      
      textToInsert += `<p><strong>${participantName}'s Goal/Factor:</strong> ${participantText}</p>`;
    });

    if (resolution) {
      textToInsert += `<p><strong>Resolution:</strong> ${resolution}</p>`;
    }
    
    textToInsert += `<p><strong>-------------------------</strong></p><p></p>`;

    // Scene nodes EDIT and DISPLAY `manuscript` (falling back to content
    // only when manuscript is empty) -- appending to `content` made the
    // pushed conflict invisible on any scene that already had text.
    const existingText = targetNode.data.manuscript || targetNode.data.content || '';
    updateNodeData(targetNode.id, {
      manuscript: existingText + textToInsert
    });
    
    alert(`Conflict pushed to Scene: ${targetNode.data.label || 'Untitled'}`);
  };

  return (
    <BaseNode
      id={id}
      data={data}
      selected={selected}
      minWidth={350}
      minHeight={400}
      icon={Swords}
      accentColor="#ef4444"
      headerTitlePlaceholder="CRUCIBLE CONFLICT"
      hasLeftHandle={false} // Disable default left handle, we use custom slots
    >
      <div className="flex-1 min-h-0 flex flex-col p-3 relative gap-3 overflow-y-auto" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        
        <div className="text-[10px] uppercase font-bold text-red-500/80 tracking-widest text-center border-b border-red-900/30 pb-2 mb-1">
          Conflict Factors & Goals
        </div>

        {/* Input Slots */}
        <div className="flex flex-col gap-3 relative pl-3">
          <div className="absolute inset-y-0 left-0 w-0.5 bg-red-900/30"></div>
          {slots.map((slot) => {
            const isConnected = edges.some(e => e.target === id && e.targetHandle === `slot-${slot}`);
            let participantName = `Participant / Factor ${slot}`;
            if (isConnected) {
              const connectingEdge = edges.find(e => e.target === id && e.targetHandle === `slot-${slot}`);
              const sourceNode = nodes.find(n => n.id === connectingEdge?.source);
              if (sourceNode) participantName = sourceNode.data.label as string || participantName;
            }

            return (
              <div key={slot} className="flex flex-col group relative bg-[#1a1a24] p-2 rounded border border-[#2a2a35] focus-within:border-red-500/50 transition-colors">
                <Handle
                  type="target"
                  position={Position.Left}
                  id={`slot-${slot}`}
                  className={`!w-3 !h-3 rounded-full border-2 !border-[#151518] !absolute !-left-4 !top-4 z-10 transition-colors
                    ${isConnected ? '!bg-red-500' : '!bg-[#451a1a] group-hover:!bg-red-700'}
                  `}
                />
                
                <div className="text-[9px] font-bold text-red-300/70 uppercase tracking-widest mb-1 truncate flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-red-500 shadow-[0_0_5px_rgba(239,68,68,0.8)]' : 'bg-red-900/50'}`}></span>
                  {participantName}
                </div>
                
                <textarea
                  className="w-full bg-[#151518] border border-[#2a2a35] rounded p-2 text-xs text-red-100/90 resize-none focus:outline-none focus:border-red-500/50 font-serif transition-colors shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]"
                  rows={2}
                  value={participantData[`slot-${slot}`] || ''}
                  onChange={(e) => handleParticipantChange(`slot-${slot}`, e.target.value)}
                  placeholder={isConnected ? `What does ${participantName} want or cause here?` : "Goal, motivation, or complication..."}
                />
              </div>
            );
          })}
        </div>

        <div className="flex justify-between items-center px-1 mt-1">
          <button 
            onClick={handleAddSlot}
            className="text-[9px] text-red-400/70 hover:text-red-300 uppercase tracking-widest flex items-center gap-1 bg-red-900/20 hover:bg-red-900/40 px-2 py-1 rounded transition-colors"
          >
            <Plus size={10} /> Add Factor
          </button>
          {slotCount > 1 && (
            <button 
              onClick={handleRemoveSlot}
              className="text-[9px] text-red-400/70 hover:text-red-300 uppercase tracking-widest flex items-center gap-1 bg-red-900/20 hover:bg-red-900/40 px-2 py-1 rounded transition-colors"
            >
              <Trash2 size={10} /> Remove
            </button>
          )}
        </div>

        <div className="mt-4 pt-4 border-t border-[#2a2a35]">
           <div className="text-[10px] uppercase font-bold text-amber-500/80 tracking-widest mb-2 flex items-center gap-2">
              Resolution / Fallout
           </div>
           <textarea
              className="w-full bg-[#151518] border border-[#2a2a35] rounded p-2 text-xs text-amber-100/90 resize-none focus:outline-none focus:border-amber-500/50 font-serif transition-colors shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]"
              rows={3}
              value={resolution}
              onChange={(e) => updateNodeData(id, { resolution: e.target.value })}
              placeholder="How does this conflict resolve? Who wins, who loses, and what changes?"
            />
        </div>
      </div>

      {/* Footer / Output */}
      <div className="p-3 bg-[#151518] border-t border-[#2a2a35] flex justify-between items-center shrink-0 relative">
        <button 
          onClick={pushToScene}
          className="flex-1 flex justify-center items-center gap-2 bg-red-600/20 hover:bg-red-600/40 text-red-300 border border-red-500/30 px-4 py-2 rounded font-bold text-[10px] uppercase tracking-widest transition-all"
        >
          <ArrowRightToLine size={12} /> Push Text to Scene
        </button>
        
        <Handle 
          type="source"
          position={Position.Right}
          id="crucible-out"
          className="!w-4 !h-4 !rounded-full !border-2 !border-[#151518] !bg-red-500 hover:!bg-red-400 hover:!scale-125 !transition-all"
        />
      </div>
    </BaseNode>
  );
});
