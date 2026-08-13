import { ReactRenderer } from '@tiptap/react';
import tippy, { type Instance as TippyInstance } from 'tippy.js';
import { useCanvasStore } from '../store/canvasStore';
import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';

/** What the list exposes to the suggestion plugin's key handling. */
type MentionListHandle = { onKeyDown: (props: { event: KeyboardEvent }) => boolean };

// The suggestion list component rendered by Tippy
const MentionList = forwardRef<MentionListHandle, any>((props, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const selectItem = (index: number) => {
    const item = props.items[index];
    if (item) {
      props.command({ id: item.id, label: item.title });
    }
  };

  const upHandler = () => {
    setSelectedIndex((selectedIndex + props.items.length - 1) % props.items.length);
  };

  const downHandler = () => {
    setSelectedIndex((selectedIndex + 1) % props.items.length);
  };

  const enterHandler = () => {
    selectItem(selectedIndex);
  };

  useEffect(() => setSelectedIndex(0), [props.items]);

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }: any) => {
      if (event.key === 'ArrowUp') {
        upHandler();
        return true;
      }
      if (event.key === 'ArrowDown') {
        downHandler();
        return true;
      }
      if (event.key === 'Enter') {
        enterHandler();
        return true;
      }
      return false;
    },
  }));

  return (
    <div className="mention-dropdown">
      {props.items.length ? (
        props.items.map((item: any, index: number) => (
          <button
            className={`mention-item ${index === selectedIndex ? 'is-selected' : ''}`}
            key={item.id}
            onClick={() => selectItem(index)}
          >
            {item.title || 'Untitled Node'}
          </button>
        ))
      ) : (
        <div className="mention-item is-empty">No nodes found</div>
      )}
    </div>
  );
});
MentionList.displayName = 'MentionList';

export const getMentionSuggestion = () => {
  return {
    items: ({ query }: { query: string }) => {
      // Access the canvas store directly for suggestions
      const state = useCanvasStore.getState();
      // only nodes the user actually named can be linked by name -- an
      // untitled node would insert a blank chip with nothing to read
      return state.document.nodes
        .filter((node) => {
          const title = node.data.title?.trim();
          return title !== undefined && title !== '' && title.toLowerCase().includes(query.toLowerCase());
        })
        .slice(0, 5)
        .map((node) => ({ id: node.id, title: node.data.title!.trim() }));
    },

    render: () => {
      let component: ReactRenderer;
      let popup: TippyInstance[];

      return {
        onStart: (props: any) => {
          component = new ReactRenderer(MentionList, {
            props,
            editor: props.editor,
          });

          if (!props.clientRect) return;

          popup = tippy('body', {
            getReferenceClientRect: props.clientRect,
            appendTo: () => document.body,
            content: component.element,
            showOnCreate: true,
            interactive: true,
            trigger: 'manual',
            placement: 'bottom-start',
          });
        },

        onUpdate(props: any) {
          component.updateProps(props);
          if (!props.clientRect) return;
          popup[0]?.setProps({
            getReferenceClientRect: props.clientRect,
          });
        },

        onKeyDown(props: any) {
          if (props.event.key === 'Escape') {
            popup[0]?.hide();
            return true;
          }
          return (component.ref as MentionListHandle | null)?.onKeyDown(props) ?? false;
        },

        onExit() {
          popup[0]?.destroy();
          component.destroy();
        },
      };
    },
  };
};
