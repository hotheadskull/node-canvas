import { useEditor, EditorContent } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import StarterKit from '@tiptap/starter-kit';
import Mention from '@tiptap/extension-mention';
import tippy, { Instance as TippyInstance } from 'tippy.js';
import { useEffect, useMemo } from 'react';
import { useStore } from '../store/useStore';

type RichTextEditorProps = {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  textColor?: string;
  // The canvas node this editor lives in; enables @-mention linking
  nodeId?: string;
};

type MentionItem = { id: string; label: string };

// Builds the @-mention suggestion config: a lightweight DOM dropdown anchored
// with tippy. Picking a node inserts the mention AND draws a spiderweb link
// from this node to the mentioned one.
function buildSuggestion(nodeId?: string) {
  return {
    char: '@',
    items: ({ query }: { query: string }): MentionItem[] => {
      const { nodes } = useStore.getState();
      return nodes
        .filter(n => n.id !== nodeId && (n.data.label || '').trim().length > 0)
        .filter(n => (n.data.label || '').toLowerCase().includes(query.toLowerCase()))
        .slice(0, 6)
        .map(n => ({ id: n.id, label: n.data.label }));
    },
    command: ({ editor, range, props }: any) => {
      editor
        .chain()
        .focus()
        .insertContentAt(range, [
          { type: 'mention', attrs: { id: props.id, label: props.label } },
          { type: 'text', text: ' ' },
        ])
        .run();
      if (nodeId) {
        useStore.getState().linkNodes(nodeId, props.id);
      }
    },
    render: () => {
      let popup: TippyInstance[] = [];
      let el: HTMLDivElement;
      let items: MentionItem[] = [];
      let selectedIndex = 0;
      let command: (item: MentionItem) => void = () => {};

      const renderItems = () => {
        el.innerHTML = '';
        if (items.length === 0) {
          const empty = document.createElement('div');
          empty.className = 'mention-empty';
          empty.textContent = 'No matching nodes';
          el.appendChild(empty);
          return;
        }
        items.forEach((item, i) => {
          const btn = document.createElement('button');
          btn.className = 'mention-item' + (i === selectedIndex ? ' is-selected' : '');
          btn.textContent = item.label;
          btn.addEventListener('mousedown', (e) => {
            e.preventDefault();
            command(item);
          });
          el.appendChild(btn);
        });
      };

      return {
        onStart: (props: any) => {
          el = document.createElement('div');
          el.className = 'mention-dropdown';
          items = props.items;
          command = (item) => props.command(item);
          selectedIndex = 0;
          renderItems();
          popup = tippy('body', {
            getReferenceClientRect: props.clientRect,
            appendTo: () => document.body,
            content: el,
            showOnCreate: true,
            interactive: true,
            trigger: 'manual',
            placement: 'bottom-start',
            arrow: false,
          });
        },
        onUpdate: (props: any) => {
          items = props.items;
          command = (item) => props.command(item);
          if (selectedIndex >= items.length) selectedIndex = 0;
          renderItems();
          popup[0]?.setProps({ getReferenceClientRect: props.clientRect });
        },
        onKeyDown: (props: any) => {
          if (props.event.key === 'ArrowDown') {
            selectedIndex = items.length ? (selectedIndex + 1) % items.length : 0;
            renderItems();
            return true;
          }
          if (props.event.key === 'ArrowUp') {
            selectedIndex = items.length ? (selectedIndex - 1 + items.length) % items.length : 0;
            renderItems();
            return true;
          }
          if (props.event.key === 'Enter') {
            if (items[selectedIndex]) command(items[selectedIndex]);
            return true;
          }
          if (props.event.key === 'Escape') {
            popup[0]?.hide();
            return true;
          }
          return false;
        },
        onExit: () => {
          popup[0]?.destroy();
        },
      };
    },
  };
}

export function RichTextEditor({ content, onChange, textColor = '#e5e7eb', nodeId }: RichTextEditorProps) {
  const extensions = useMemo(() => [
    StarterKit,
    Mention.configure({
      HTMLAttributes: { class: 'mention' },
      suggestion: buildSuggestion(nodeId),
    }),
  ], [nodeId]);

  const editor = useEditor({
    extensions,
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
