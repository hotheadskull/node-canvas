import { memo, useCallback } from 'react';
import { NodeProps } from '@xyflow/react';
import { Quote, Copy, ExternalLink, User } from 'lucide-react';
import { useStore, AppNode } from '../store/useStore';
import { RichTextEditor } from './RichTextEditor';
import { BaseNode } from './BaseNode';

export const QuoteNode = memo(({ id, data, selected }: NodeProps<AppNode>) => {
  const updateNodeData = useStore(state => state.updateNodeData);

  const handleCopy = useCallback(() => {
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
    <BaseNode
      id={id}
      data={data}
      selected={selected}
      minWidth={200}
      minHeight={150}
      icon={Quote}
      accentColor="#facc15"
      headerTitlePlaceholder="Quote Title..."
      showFunction={true}
      showTags={true}
      headerRight={
        <button onClick={handleCopy} className="text-gray-400 hover:text-white transition-colors cursor-pointer ml-2 flex-shrink-0" title="Copy Quote">
          <Copy size={12} />
        </button>
      }
    >
      {/* Giant Watermark */}
      <div className="absolute top-4 left-2 opacity-5 pointer-events-none z-0">
        <Quote size={80} />
      </div>

      {/* Quote Body (Rich Text) */}
      <div className="p-3 relative z-10 flex-1 border-l-4 border-[#854d0e] ml-3 my-2 overflow-hidden bg-[#1a1a24]/50">
        <RichTextEditor 
          content={data.content || ''} 
          onChange={(html) => updateNodeData(id, { content: html })} 
          textColor="#d1d5db"
          nodeId={id}
        />
      </div>

      {/* Footer / Metadata */}
      <div className="bg-[#16161c] px-3 py-2 border-t border-[#2a2a35] flex flex-col gap-1.5 relative z-10 mt-auto">
        <div className="flex items-center gap-2 text-[10px] text-gray-400">
          <User size={10} className="text-[#854d0e] flex-shrink-0" />
          <input
            type="text"
            className="bg-transparent border-b border-transparent focus:border-[#854d0e] focus:outline-none w-full italic tracking-wide"
            value={data.metadata?.author || ''}
            onChange={(e) => updateMetadata('author', e.target.value)}
            placeholder="Author / Speaker..."
          />
        </div>
        <div className="flex items-center gap-2 text-[10px] text-gray-400">
          <ExternalLink size={10} className="text-[#854d0e] flex-shrink-0" />
          <input
            type="text"
            className="bg-transparent border-b border-transparent focus:border-[#854d0e] focus:outline-none w-full tracking-wide"
            value={data.metadata?.sourceUrl || ''}
            onChange={(e) => updateMetadata('sourceUrl', e.target.value)}
            placeholder="Source URL or Book Page..."
          />
          {data.metadata?.sourceUrl && data.metadata.sourceUrl.startsWith('http') && (
            <a href={data.metadata.sourceUrl} target="_blank" rel="noreferrer" className="text-[#facc15] hover:underline whitespace-nowrap ml-1 font-bold uppercase">
              Visit
            </a>
          )}
        </div>
      </div>
    </BaseNode>
  );
});
