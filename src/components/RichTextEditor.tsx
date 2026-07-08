import { useEditor, EditorContent } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import StarterKit from '@tiptap/starter-kit';
import { useEffect } from 'react';

type RichTextEditorProps = {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  textColor?: string;
};

export function RichTextEditor({ content, onChange, textColor = '#e5e7eb' }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [StarterKit],
    content,
    editorProps: {
      attributes: {
        class: 'prose prose-sm prose-invert max-w-none focus:outline-none min-h-full leading-relaxed',
        style: `color: ${textColor}; cursor: text;`,
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      // Don't update if it's the exact same to avoid cursor jumping
      if (editor.getText() === '' && content === '') return;
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  if (!editor) return null;

  return (
    <div className="w-full h-full relative cursor-text group tiptap-wrapper overflow-y-auto overflow-x-hidden" onPointerDown={e => e.stopPropagation()}>
      {editor && (
        <BubbleMenu editor={editor} className="flex bg-[#1a1a24] border border-[#3f3f46] rounded-md shadow-2xl overflow-hidden p-1 gap-1 pointer-events-auto">
          <button
            onClick={(e) => { e.preventDefault(); editor.chain().focus().toggleBold().run(); }}
            className={`px-2 py-1 text-xs rounded font-bold ${editor.isActive('bold') ? 'bg-[#d4b98c] text-black' : 'text-gray-300 hover:bg-[#3f3f46]'}`}
          >
            B
          </button>
          <button
            onClick={(e) => { e.preventDefault(); editor.chain().focus().toggleItalic().run(); }}
            className={`px-2 py-1 text-xs rounded italic ${editor.isActive('italic') ? 'bg-[#d4b98c] text-black' : 'text-gray-300 hover:bg-[#3f3f46]'}`}
          >
            I
          </button>
          <button
            onClick={(e) => { e.preventDefault(); editor.chain().focus().toggleHeading({ level: 3 }).run(); }}
            className={`px-2 py-1 text-xs rounded font-serif ${editor.isActive('heading', { level: 3 }) ? 'bg-[#d4b98c] text-black' : 'text-gray-300 hover:bg-[#3f3f46]'}`}
          >
            H
          </button>
        </BubbleMenu>
      )}
      <EditorContent editor={editor} className="h-full w-full" />
    </div>
  );
}
