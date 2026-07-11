import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Printer, Download } from 'lucide-react';
import { useStore, AppNode } from '../store/useStore';
import { BaseNode } from './BaseNode';
import { compileManuscript, compileBlocks, blocksToHtml } from '../utils/compiler';

export const CompileNode = memo(({ id, data, selected }: NodeProps<AppNode>) => {
  const updateNodeData = useStore(state => state.updateNodeData);
  const setPreviewMarkdown = useStore(state => state.setPreviewMarkdown);
  const edges = useStore(state => state.edges);
  const nodes = useStore(state => state.nodes);

  // Dynamic number of ordered slots (default 3)
  const slotCount: number = typeof data.slotCount === 'number' ? data.slotCount : 3;
  const slots: number[] = Array.from({ length: slotCount }, (_, i) => i + 1);

  const handleAddSlot = () => {
    updateNodeData(id, { slotCount: slotCount + 1 });
  };

  const generateMarkdown = () => {
    return compileManuscript(id, nodes, edges);
  };

  const handlePreview = () => {
    const md = generateMarkdown();
    if (md) setPreviewMarkdown(md);
  };

  const handleDownloadTxt = () => {
    const md = generateMarkdown();
    if (!md) return;
    const blob = new Blob([md], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${data.label || 'manuscript'}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadMd = () => {
    const md = generateMarkdown();
    if (!md) return;
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${data.label || 'manuscript'}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Word opens styled HTML saved as .doc natively -- a real manuscript file
  // for sharing with editors, with zero extra dependencies.
  const handleDownloadWord = () => {
    const blocks = compileBlocks(id, nodes, edges);
    if (blocks.length === 0) return;
    const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"><title>${data.label || 'Manuscript'}</title><style>body { font-family: Georgia, serif; line-height: 1.6; } h1 { text-align: center; } blockquote { font-style: italic; color: #444; }</style></head><body>${blocksToHtml(blocks)}</body></html>`;
    const blob = new Blob(['﻿', html], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${data.label || 'manuscript'}.doc`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadPdf = () => {
    const blocks = compileBlocks(id, nodes, edges);
    if (blocks.length === 0) return;

    // Open a print window which lets the user print to PDF
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert("Please allow popups to print to PDF.");
      return;
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>${data.label || 'Manuscript'}</title>
          <style>
            body { font-family: serif; line-height: 1.6; padding: 2rem; max-width: 800px; margin: 0 auto; color: black; background: white; }
            h1 { text-align: center; font-size: 2em; margin-bottom: 2em; }
            h2 { margin-top: 2em; font-size: 1.5em; border-bottom: 1px solid #ccc; padding-bottom: 0.5em; }
            p { margin-bottom: 1em; }
            blockquote { font-style: italic; color: #444; margin: 1.5em 2em; }
            @media print {
              body { padding: 0; }
              h2 { page-break-before: always; }
            }
          </style>
        </head>
        <body>
          ${blocksToHtml(blocks)}
        </body>
      </html>
    `);
    printWindow.document.close();

    // Wait for content to load before printing
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  return (
    <BaseNode
      id={id}
      data={data}
      selected={selected}
      minWidth={250}
      minHeight={350}
      icon={Printer}
      accentColor="#6366f1"
      headerTitlePlaceholder="COMPILE & EXPORT"
      hasLeftHandle={false}
    >
      {/* Ordered Slots */}
      <div className="flex-1 min-h-0 flex flex-col py-2 relative gap-1.5 overflow-y-auto" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        <div className="absolute inset-y-0 left-6 w-0.5 bg-[#3730a3]/50"></div>
        {slots.map((slot) => {
          const slotEdge = edges.find(e => e.target === id && e.targetHandle === `slot-${slot}`);
          const sourceNode = slotEdge ? nodes.find(n => n.id === slotEdge.source) : undefined;
          return (
            <div key={slot} className="flex items-center px-2 group relative">
              <Handle
                type="target"
                position={Position.Left}
                id={`slot-${slot}`}
                className={`!w-3 !h-3 rounded-full border-2 !border-[#151518] !relative !left-0 !transform-none !top-0 z-10 transition-colors shrink-0
                  ${slotEdge ? '!bg-indigo-400' : '!bg-[#312e81] group-hover:!bg-indigo-600'}
                `}
              />
              <span className="ml-4 text-[10px] font-bold text-indigo-300/50 w-6 shrink-0">
                {String(slot).padStart(2, '0')}
              </span>
              {/* Show WHAT is in the slot, not just that something is */}
              <span className={`text-[9px] ml-1 truncate ${sourceNode ? 'text-indigo-200/80' : 'text-indigo-200/30 uppercase tracking-widest'}`}>
                {sourceNode ? (sourceNode.data.label || 'Untitled') : 'Empty'}
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
      <div className="p-3 bg-[#151518] border-t border-[#2a2a35] flex flex-col gap-2 shrink-0">
        <button 
          onClick={handlePreview}
          className="flex items-center justify-center gap-2 bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 border border-indigo-500/30 px-6 py-1.5 rounded font-bold text-[10px] uppercase tracking-widest transition-all"
        >
          <Download size={12} /> Preview
        </button>
        
        <div className="grid grid-cols-4 gap-1">
          <button
            onClick={handleDownloadTxt}
            className="flex items-center justify-center gap-1 bg-[#2a2a35] hover:bg-[#3f3f4e] text-gray-300 px-2 py-1.5 rounded font-bold text-[9px] uppercase tracking-widest transition-colors"
          >
            TXT
          </button>
          <button
            onClick={handleDownloadMd}
            className="flex items-center justify-center gap-1 bg-[#2a2a35] hover:bg-[#3f3f4e] text-gray-300 px-2 py-1.5 rounded font-bold text-[9px] uppercase tracking-widest transition-colors"
          >
            MD
          </button>
          <button
            onClick={handleDownloadWord}
            className="flex items-center justify-center gap-1 bg-[#2a2a35] hover:bg-blue-900/40 text-gray-300 hover:text-blue-300 px-2 py-1.5 rounded font-bold text-[9px] uppercase tracking-widest transition-colors"
          >
            WORD
          </button>
          <button
            onClick={handleDownloadPdf}
            className="flex items-center justify-center gap-1 bg-[#2a2a35] hover:bg-red-900/40 text-gray-300 hover:text-red-300 px-2 py-1.5 rounded font-bold text-[9px] uppercase tracking-widest transition-colors"
          >
            PDF
          </button>
        </div>
      </div>
    </BaseNode>
  );
});
