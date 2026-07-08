import { memo } from 'react';
import { Handle, Position, NodeResizer } from '@xyflow/react';
import { Printer, Download } from 'lucide-react';
import { useStore } from '../store/useStore';

export const PrintNode = memo(({ id, data, selected }: any) => {
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
    // Collect nodes connected to the left-side handles in order of the handles
    const orderedNodes: any[] = [];
    
    slots.forEach(slotNumber => {
      // Find edge connected to this slot's target handle
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
      // Convert HTML content from RichTextEditor to plain text (very basic) or just dump it
      // A better approach is dumping the HTML and letting standard markdown parsers handle it, or stripping tags
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
    <>
      <NodeResizer minWidth={150} minHeight={400} isVisible={selected} handleClassName="w-3 h-3 bg-[#111114] border-2 border-indigo-500 rounded" />
      <div className={`relative bg-gradient-to-b from-[#1e1b4b] to-[#0f172a] rounded-lg border transition-colors shadow-lg flex flex-col h-full overflow-hidden
        ${selected ? 'border-indigo-400 shadow-[0_0_30px_rgba(99,102,241,0.4)]' : 'border-[#3730a3] shadow-[0_10px_20px_rgba(0,0,0,0.8)]'}
      `}>
        
        {/* Header */}
        <div className="bg-[#312e81]/50 p-4 border-b border-[#3730a3] flex flex-col items-center gap-2">
          <Printer size={24} className="text-indigo-400" />
          <input
            type="text"
            className="w-full bg-transparent text-sm font-bold text-indigo-100 focus:outline-none text-center uppercase tracking-widest"
            value={data.label || ''}
            onChange={(e) => updateNodeData(id, { label: e.target.value })}
            placeholder="MASTER PRINT"
          />
        </div>

        {/* Ordered Slots */}
        <div className="flex-1 flex flex-col py-4 relative gap-2 min-h-0 overflow-y-auto custom-scrollbar">
          <div className="absolute inset-y-0 left-6 w-0.5 bg-[#3730a3]/50"></div>
          {slots.map((slot) => {
            // Check if slot has connection
            const isConnected = edges.some(e => e.target === id && e.targetHandle === `slot-${slot}`);
            return (
              <div key={slot} className="flex items-center px-2 group relative">
                <Handle
                  type="target"
                  position={Position.Left}
                  id={`slot-${slot}`}
                  className={`!w-4 !h-4 !border-2 !border-[#111114] !rounded-full !relative !left-0 !transform-none !top-0 z-10 transition-colors shrink-0
                    ${isConnected ? '!bg-indigo-400' : '!bg-[#312e81] group-hover:!bg-indigo-600'}
                  `}
                />
                <span className="ml-4 text-xs font-bold text-indigo-300/50 w-6 shrink-0">
                  {String(slot).padStart(2, '0')}
                </span>
                <span className="text-[10px] text-indigo-200/30 uppercase tracking-widest ml-2 truncate">
                  {isConnected ? 'Linked' : 'Empty'}
                </span>
              </div>
            );
          })}
          <div className="px-8 mt-2">
            <button 
              onClick={handleAddSlot}
              className="text-[10px] text-indigo-400/70 hover:text-indigo-300 uppercase tracking-widest flex items-center gap-1 bg-indigo-900/20 hover:bg-indigo-900/40 px-2 py-1 rounded transition-colors"
            >
              + Add Slot
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#111114] border-t border-[#3730a3] flex justify-center shrink-0">
          <button 
            onClick={handlePreview}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2 rounded-full font-bold text-xs uppercase tracking-widest transition-all shadow-[0_0_15px_rgba(79,70,229,0.5)] hover:shadow-[0_0_25px_rgba(99,102,241,0.8)]"
          >
            <Download size={14} /> Preview
          </button>
        </div>
      </div>
    </>
  );
});
