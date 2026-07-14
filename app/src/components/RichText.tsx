// The ONE rich-text editor (TipTap) used everywhere text is written: inline
// node faces (design A) and the focus overlay (design B). Designs C (side
// drawer) and D (typewriter strip) were liked but deferred -- because every
// surface renders this same component behind openEditor(), adding them later
// is a preference toggle, not a rewrite.

import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Bold, Heading2, Italic, List, TextQuote } from 'lucide-react';
import { useEffect } from 'react';

type Props = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  /** 'inline' = node face (small toolbar on focus); 'focus' = the overlay. */
  variant: 'inline' | 'focus';
  autoFocus?: boolean;
};

export function RichText({ value, onChange, placeholder, variant, autoFocus = false }: Props) {
  const editor = useEditor({
    extensions: [StarterKit],
    ...(value !== '' ? { content: value } : {}),
    autofocus: autoFocus,
    editorProps: {
      attributes: {
        class: `richtext-content richtext-${variant}`,
        ...(placeholder ? { 'data-placeholder': placeholder } : {}),
      },
    },
    onUpdate: ({ editor: instance }) => {
      onChange(instance.isEmpty ? '' : instance.getHTML());
    },
  });

  // External updates (rename propagation, undo, load) write back into the
  // editor -- but never while the user is typing in it.
  useEffect(() => {
    if (!editor || editor.isFocused) return;
    const current = editor.isEmpty ? '' : editor.getHTML();
    if (current !== value) {
      editor.commands.setContent(value !== '' ? value : '', { emitUpdate: false });
    }
  }, [editor, value]);

  if (!editor) return null;

  return (
    <div className={`richtext richtext-wrap-${variant}`}>
      <div className="richtext-toolbar nodrag" role="toolbar" aria-label="Formatting">
        <button
          className={editor.isActive('bold') ? 'is-active' : ''}
          title="Bold (Ctrl+B)"
          aria-label="Bold"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold size={12} aria-hidden />
        </button>
        <button
          className={editor.isActive('italic') ? 'is-active' : ''}
          title="Italic (Ctrl+I)"
          aria-label="Italic"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic size={12} aria-hidden />
        </button>
        <button
          className={editor.isActive('heading', { level: 2 }) ? 'is-active' : ''}
          title="Heading"
          aria-label="Heading"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          <Heading2 size={12} aria-hidden />
        </button>
        <button
          className={editor.isActive('bulletList') ? 'is-active' : ''}
          title="Bullet list"
          aria-label="Bullet list"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List size={12} aria-hidden />
        </button>
        <button
          className={editor.isActive('blockquote') ? 'is-active' : ''}
          title="Quote"
          aria-label="Quote"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          <TextQuote size={12} aria-hidden />
        </button>
      </div>
      <EditorContent editor={editor} className="richtext-editor nodrag" />
    </div>
  );
}
