import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Printer, Download } from 'lucide-react';
import { useStore, AppNode } from '../store/useStore';
import { BaseNode } from './BaseNode';

export const PrintNode = memo(({ id, data, selected }: NodeProps<AppNode>) => {
  const updateNodeData = useStore(state => state.updateNodeData);
  const setPreviewMarkdown = useStore(state => state.setPreviewMarkdown);
  const edges = useStore(state => state.edges);
  const nodes = useStore(state => state.nodes);

  // Dynamic number of ordered slots (default 3)
  const slotCount = data.slotCount || 3;
  const slots = Array.from({ length: slotCount }, (_, i) => i + 1);

  const handleAddSlot = () => {
    updateNodeData(id, { slotCount: slotCount + 1 });
  };

  const handlePreview = () => {
    const orderedNodes: any[] = [];
    
    slots.forEach(slotNumber => {
      const connectingEdge = edges.find(e => e.target === id && e.targetHandle === `slot-${slotNumber}`);
      if (connectingEdge) {
        const sourceNode = nodes.find(n => n.id === connectingEdge.source);
        if (sourceNode) {
          orderedNodes.push(sourceNode);
        }
      }
    });

    if (orderedNodes.length === 0) {
      alert("No nodes connected to the print slots!");
      return;
    }

    let markdown = `# ${data.label || 'Exported Manuscript'}\n\n`;
    
    orderedNodes.forEach((node, index) => {
      markdown += `## ${node.data.label || `Section ${index + 1}`}\n\n`;
      let text = node.data.content || '';
      text = text.replace(/<p>/g, '').replace(/<\/p>/g, '\n\n');
      text = text.replace(/<br>/g, '\n');
      text = text.replace(/<[^>]*>?/gm, ''); // Strip remaining HTML
      markdown += `${text}\n\n`;
      
      if (node.data.manuscript) {
        markdown += `${node.data.manuscript}\n\n`;
      }
    });

    setPreviewMarkdown(markdown);
  };

  return (
    <BaseNode
      id={id}
      data={data}
      selected={selected}
      minWidth={150}
      minHeight={300}
      icon={Printer}
      accentColor="#6366f1"
      headerTitlePlaceholder="MASTER PRINT"
      hasLeftHandle={false} // Disable default left handle, we use custom slots
    >
      {/* Ordered Slots */}
      <div className="flex-1 flex flex-col py-2 relative gap-1.5 min-h-[100px] overflow-y-auto" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        <div className="absolute inset-y-0 left-6 w-0.5 bg-[#3730a3]/50"></div>
        {slots.map((slot) => {
          const isConnected = edges.some(e => e.target === id && e.targetHandle === `slot-${slot}`);
          return (
            <div key={slot} className="flex items-center px-2 group relative">
              <Handle
                type="target"
                position={Position.Left}
                id={`slot-${slot}`}
                className={`!w-3 !h-3 rounded-full border-2 !border-[#151518] !relative !left-0 !transform-none !top-0 z-10 transition-colors shrink-0
                  ${isConnected ? '!bg-indigo-400' : '!bg-[#312e81] group-hover:!bg-indigo-600'}
                `}
              />
              <span className="ml-4 text-[10px] font-bold text-indigo-300/50 w-6 shrink-0">
                {String(slot).padStart(2, '0')}
              </span>
              <span className="text-[9px] text-indigo-200/30 uppercase tracking-widest ml-1 truncate">
                {isConnected ? 'Linked' : 'Empty'}
              </span>
            </div>
          );
        })}
        <div className="px-6 mt-1">
          <button 
            onClick={handleAddSlot}
            className="text-[9px] text-indigo-400/70 hover:text-indigo-300 uppercase tracking-widest flex items-center gap-1 bg-indigo-900/20 hover:bg-indigo-900/40 px-2 py-0.5 rounded transition-colors"
          >
            + Add Slot
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="p-2 bg-[#151518] border-t border-[#2a2a35] flex justify-center shrink-0">
        <button 
          onClick={handlePreview}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-1.5 rounded-full font-bold text-[10px] uppercase tracking-widest transition-all shadow-[0_0_15px_rgba(79,70,229,0.5)] hover:shadow-[0_0_25px_rgba(99,102,241,0.8)]"
        >
          <Download size={12} /> Preview
        </button>
      </div>
    </BaseNode>
  );
});
