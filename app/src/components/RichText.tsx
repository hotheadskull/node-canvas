// The ONE rich-text editor (TipTap) used everywhere text is written: inline
// node faces (design A) and the focus overlay (design B). Designs C (side
// drawer) and D (typewriter strip) were liked but deferred -- because every
// surface renders this same component behind openEditor(), adding them later
// is a preference toggle, not a rewrite.

import { EditorContent, useEditor, useEditorState } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { DOMSerializer } from '@tiptap/pm/model';
import { Bold, Heading2, Italic, List, Scissors, TextQuote } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

export type BoundaryDirection = 'up' | 'down' | 'left' | 'right';
export type ExtractParts = { extracted: string; remaining: string };

type Props = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  /** 'inline' = node face (small toolbar on focus); 'focus' = the overlay. */
  variant: 'inline' | 'focus';
  autoFocus?: boolean;
  /**
   * Called when an arrow key would leave this editor (caret already at its
   * first/last line or very start/end). Return true to claim the keystroke --
   * the blocks editor uses this to walk the caret across block boundaries,
   * so the document arrows like ONE text, not many little boxes.
   */
  onBoundary?: (direction: BoundaryDirection) => boolean;
  /**
   * Highlight-split: when text is selected, a Split control appears in the
   * toolbar. Picking a type hands the selection (and what remains around it)
   * to the caller, which moves it out into a new node.
   */
  onExtract?: (parts: ExtractParts, type: string) => void;
  extractTypes?: { type: string; label: string }[];
};

export function RichText({
  value,
  onChange,
  placeholder,
  variant,
  autoFocus = false,
  onBoundary,
  onExtract,
  extractTypes = [],
}: Props) {
  // editorProps close over creation-time values; a ref keeps them current.
  const boundaryRef = useRef(onBoundary);
  boundaryRef.current = onBoundary;
  const [splitOpen, setSplitOpen] = useState(false);

  const editor = useEditor({
    extensions: [StarterKit],
    ...(value !== '' ? { content: value } : {}),
    autofocus: autoFocus,
    editorProps: {
      attributes: {
        class: `richtext-content richtext-${variant}`,
        ...(placeholder ? { 'data-placeholder': placeholder } : {}),
      },
      // Arrow keys at the edge of this editor hand the caret to the
      // neighboring block (user bug: "the arrow keys dont work between
      // any of the sections").
      handleKeyDown: (view, event) => {
        const handler = boundaryRef.current;
        if (!handler) return false;
        if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return false;
        // Key-repeat (holding an arrow key): the previous press's caret move
        // lives only in the DOM until ProseMirror's observer syncs it. Flush
        // first, or the edge test lags one step behind and the walk stalls.
        (view as unknown as { domObserver?: { flush(): void } }).domObserver?.flush();
        const { state } = view;
        if (!state.selection.empty) return false;
        const { $from } = state.selection;
        const inFirstBlock = $from.index(0) === 0;
        const inLastBlock = $from.index(0) === state.doc.childCount - 1;
        const atEdge = (direction: BoundaryDirection) => {
          try {
            return view.endOfTextblock(direction);
          } catch {
            return false; // jsdom has no layout; real browsers always resolve
          }
        };
        if (event.key === 'ArrowUp' && inFirstBlock && atEdge('up')) return handler('up');
        if (event.key === 'ArrowDown' && inLastBlock && atEdge('down')) return handler('down');
        if (event.key === 'ArrowLeft' && inFirstBlock && atEdge('left')) return handler('left');
        if (event.key === 'ArrowRight' && inLastBlock && atEdge('right')) return handler('right');
        return false;
      },
    },
    onUpdate: ({ editor: instance }) => {
      onChange(instance.isEmpty ? '' : instance.getHTML());
    },
  });

  // Selection-aware toolbar state (TipTap 3 doesn't re-render on every
  // transaction by default, so subscribe explicitly).
  const hasSelection = useEditorState({
    editor,
    selector: (ctx) => (ctx.editor ? !ctx.editor.state.selection.empty : false),
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

  useEffect(() => {
    if (!hasSelection) setSplitOpen(false);
  }, [hasSelection]);

  if (!editor) return null;

  const runExtract = (type: string) => {
    if (!onExtract) return;
    const { from, to } = editor.state.selection;
    if (from === to) return;
    const serializer = DOMSerializer.fromSchema(editor.schema);
    const htmlOf = (node: typeof editor.state.doc) => {
      const container = window.document.createElement('div');
      container.appendChild(serializer.serializeFragment(node.content));
      return container.innerHTML;
    };
    // cut() closes partial nodes -> the selection as valid standalone HTML;
    // a delete transaction rejoins the prose around it exactly the way
    // pressing Backspace would (mid-paragraph splits don't leave a break).
    const parts: ExtractParts = {
      extracted: htmlOf(editor.state.doc.cut(from, to)),
      remaining: htmlOf(editor.state.tr.delete(from, to).doc),
    };
    setSplitOpen(false);
    // Blur first: the remaining text arrives as an external value update,
    // and those only sync while the editor is unfocused (by design).
    editor.commands.blur();
    onExtract(parts, type);
  };

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
        {onExtract && extractTypes.length > 0 && hasSelection && (
          <span className="richtext-split">
            <button
              className={`richtext-split-btn ${splitOpen ? 'is-active' : ''}`}
              title="Split the highlighted text into its own node"
              aria-label="Split selection into a node"
              aria-expanded={splitOpen}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => setSplitOpen((open) => !open)}
            >
              <Scissors size={12} aria-hidden /> Split
            </button>
            {splitOpen && (
              <span className="richtext-split-picker" role="menu" aria-label="Split into">
                {extractTypes.map((entry) => (
                  <button
                    key={entry.type}
                    role="menuitem"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => runExtract(entry.type)}
                  >
                    {entry.label}
                  </button>
                ))}
              </span>
            )}
          </span>
        )}
      </div>
      <EditorContent editor={editor} className="richtext-editor nodrag" />
    </div>
  );
}
