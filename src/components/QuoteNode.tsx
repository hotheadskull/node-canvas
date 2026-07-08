import { memo, useCallback } from 'react';
import { Handle, Position, NodeResizer } from '@xyflow/react';
import { Quote, Copy, ExternalLink, User } from 'lucide-react';
import { useStore } from '../store/useStore';
import { RichTextEditor } from './RichTextEditor';

export const QuoteNode = memo(({ id, data, selected }: any) => {
  const updateNodeData = useStore(state => state.updateNodeData);

  const handleCopy = useCallback(() => {
    // Basic text extraction from HTML for clipboard
    const plainText = data.content ? data.content.replace(/<[^>]+>/g, '') : '';
    const author = data.metadata?.author ? `\n- ${data.metadata.author}` : '';
    navigator.clipboard.writeText(`"${plainText}"${author}`);
  }, [data]);

  const updateMetadata = (key: string, value: string) => {
    updateNodeData(id, {
      metadata: { ...(data.metadata || {}), [key]: value }
    });
  };

  return (
    <>
      <NodeResizer minWidth={250} minHeight={150} isVisible={selected} handleClassName="w-3 h-3 bg-[#151518] border-2 border-white rounded transition-transform hover:scale-125" />
      <div className="relative w-full h-full">
        <Handle id="top" type="target" position={Position.Top} className="w-3 h-3 rounded-full border-2 border-[#151518] z-50 transition-transform hover:scale-125 bg-[#facc15] -top-2" />
        
        <div className={`relative w-full h-full flex flex-col bg-[#151518] text-white rounded-md shadow-2xl transition-colors shadow-lg duration-200 overflow-hidden
          ${selected ? 'ring-2 ring-[#facc15]' : 'ring-1 ring-[#854d0e]'}
        `} style={{ 
          boxShadow: selected ? '0 20px 40px rgba(133,77,14,0.3)' : '0 10px 30px rgba(0,0,0,0.5)',
          clipPath: 'polygon(0 0, calc(100% - 20px) 0, 100% 20px, 100% 100%, 0 100%)'
        }}>
          {/* Decorative Folded Corner */}
          <div className="absolute top-0 right-0 w-[20px] h-[20px] bg-[#854d0e] opacity-80" style={{ clipPath: 'polygon(0 100%, 100% 0, 0 0)' }}></div>

          {/* Giant Watermark */}
          <div className="absolute top-4 left-2 opacity-5 pointer-events-none">
            <Quote size={120} />
          </div>
        
          {/* Header */}
          <div className="bg-[#1a1a24]/80 backdrop-blur-sm border-b border-[#2a2a35] px-4 py-2 flex items-center justify-between z-10 relative">
            <div className="flex items-center gap-2 w-full">
              <Quote size={14} className="text-[#facc15]" />
              <input
                type="text"
                className="bg-transparent flex-1 text-sm font-bold text-[#facc15] focus:outline-none min-w-0"
                value={data.label}
                onChange={(e) => updateNodeData(id, { label: e.target.value })}
                placeholder="Quote Title..."
              />
            </div>
            <button onClick={handleCopy} className="text-gray-400 hover:text-white transition-colors cursor-pointer ml-2 flex-shrink-0" title="Copy Quote">
              <Copy size={14} />
            </button>
          </div>

          {/* Quote Body (Rich Text) */}
          <div className="p-4 relative z-10 flex-1 border-l-4 border-[#854d0e] ml-4 my-2 overflow-hidden">
            <RichTextEditor 
              content={data.content || ''} 
              onChange={(html) => updateNodeData(id, { content: html })} 
              textColor="#d1d5db"
            />
          </div>

          {/* Footer / Metadata */}
          <div className="bg-[#16161c] px-4 py-3 border-t border-[#2a2a35] flex flex-col gap-2 relative z-10 mt-auto">
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <User size={12} className="text-[#854d0e] flex-shrink-0" />
              <input
                type="text"
                className="bg-transparent border-b border-transparent focus:border-[#854d0e] focus:outline-none w-full italic"
                value={data.metadata?.author || ''}
                onChange={(e) => updateMetadata('author', e.target.value)}
                placeholder="Author / Speaker..."
              />
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <ExternalLink size={12} className="text-[#854d0e] flex-shrink-0" />
              <input
                type="text"
                className="bg-transparent border-b border-transparent focus:border-[#854d0e] focus:outline-none w-full"
                value={data.metadata?.sourceUrl || ''}
                onChange={(e) => updateMetadata('sourceUrl', e.target.value)}
                placeholder="Source URL or Book Page..."
              />
              {data.metadata?.sourceUrl && data.metadata.sourceUrl.startsWith('http') && (
                <a href={data.metadata.sourceUrl} target="_blank" rel="noreferrer" className="text-[#facc15] hover:underline whitespace-nowrap ml-1">
                  Visit
                </a>
              )}
            </div>
          </div>
        </div>
        
        <Handle id="bottom" type="source" position={Position.Bottom} className="w-3 h-3 rounded-full border-2 border-[#151518] z-50 transition-transform hover:scale-125 bg-[#facc15] -bottom-2" />
      </div>
    </>
  );
});
