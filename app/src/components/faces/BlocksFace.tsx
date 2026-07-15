// The Document's blocks editor -- the user-designed seamless writing surface
// (docs/design/node-passes/document.md, mockup A "margin lines").
//
// One flowing text column: owned TEXT blocks and embedded passages share the
// same typography. An embed is marked ONLY by a thin margin line -- blue
// while it mirrors its source, amber once forked -- with its source name and
// actions revealed on hover, never sitting between paragraphs. Blocks drag
// to reorder (block order IS compile order); hovering between blocks shows
// a ＋ insert line; each embed row carries a landing handle so a wire can be
// dropped at that exact spot.

import {
  closestCenter,
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Handle, Position, useUpdateNodeInternals } from '@xyflow/react';
import {
  blocksOf,
  castOf,
  compileBlocks,
  embedText,
  splitPresetsFor,
  stripHtml,
  wordCount,
  type DocBlock,
  type EmbedBlock,
} from '@node-canvas/core';
import { GripVertical, Maximize2, Scissors, X } from 'lucide-react';
import { Fragment, useMemo, useState } from 'react';
import { useEffect } from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import { RichText } from '../RichText';
import type { FaceProps } from './index';

function InsertLine({ docId, index }: { docId: string; index: number }) {
  const insertBlockAt = useCanvasStore((state) => state.insertBlockAt);
  return (
    <button
      className="doc-insert nodrag"
      aria-label="Insert a text block here"
      title="Insert a paragraph here"
      onClick={() => insertBlockAt(docId, index)}
    >
      <span className="doc-insert-line" aria-hidden />
    </button>
  );
}

function BlockRow({
  docId,
  block,
  inRoom,
  textBlockCount,
}: {
  docId: string;
  block: DocBlock;
  inRoom: boolean;
  textBlockCount: number;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: block.id,
  });
  const document_ = useCanvasStore((state) => state.document);
  const setBlockText = useCanvasStore((state) => state.setBlockText);
  const editEmbedIn = useCanvasStore((state) => state.editEmbedIn);
  const revertEmbedIn = useCanvasStore((state) => state.revertEmbedIn);
  const applyEmbedIn = useCanvasStore((state) => state.applyEmbedIn);
  const removeBlockIn = useCanvasStore((state) => state.removeBlockIn);
  const [showOriginal, setShowOriginal] = useState(false);

  const style = {
    transform: CSS.Transform.toString(transform),
    ...(transition ? { transition } : {}),
    ...(isDragging ? { opacity: 0.35, zIndex: 30 } : {}),
  };

  if (block.kind === 'text') {
    return (
      <div ref={setNodeRef} style={style} className="doc-block is-text" data-block={block.id}>
        <span className="doc-block-grip nodrag" title="Drag to reorder" {...attributes} {...listeners}>
          <GripVertical size={12} aria-hidden />
        </span>
        {textBlockCount > 1 && (
          <button
            className="doc-block-remove nodrag"
            aria-label="Remove this paragraph block"
            onClick={() => removeBlockIn(docId, block.id)}
          >
            <X size={11} aria-hidden />
          </button>
        )}
        <RichText
          value={block.content}
          onChange={(html) => setBlockText(docId, block.id, html)}
          placeholder="Write…"
          variant="inline"
        />
      </div>
    );
  }

  const embed = block as EmbedBlock;
  const forked = embed.fork !== undefined;
  const wire = document_.wires.find((candidate) => candidate.id === embed.wireId);
  const source = wire
    ? document_.nodes.find((candidate) => candidate.id === wire.source)
    : undefined;
  const sourceTitle =
    source && typeof source.data.title === 'string' && source.data.title.trim() !== ''
      ? source.data.title
      : 'Untitled';

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`doc-block is-embed ${forked ? 'is-forked' : 'is-live'}`}
      data-block={block.id}
      data-embed-state={forked ? 'forked' : 'live'}
    >
      <span className="doc-block-grip nodrag" title="Drag to reorder" {...attributes} {...listeners}>
        <GripVertical size={12} aria-hidden />
      </span>
      <span className="doc-embed-line" aria-hidden />
      {!inRoom && (
        <Handle
          id={`blk:${block.id}`}
          type="source"
          position={Position.Left}
          className="doc-block-handle"
          title="Wires landing here place their content at this spot"
        />
      )}
      {/* NO state-dependent key: remounting on the live->fork flip would
          drop the caret after the FIRST keystroke into a live embed. The
          editor keeps focus; RichText itself syncs external value changes
          (revert/apply) because they happen while it is unfocused. */}
      <RichText
        value={embedText(document_, embed)}
        onChange={(html) => editEmbedIn(docId, block.id, html)}
        placeholder="…"
        variant="inline"
      />
      <span className="doc-embed-tag nodrag" data-embed-tag>
        <span className="doc-embed-source">{sourceTitle}</span>
        {forked ? (
          <>
            <em>edited here — original kept</em>
            <button onClick={() => setShowOriginal((open) => !open)}>
              {showOriginal ? 'hide original' : 'view original'}
            </button>
            <button
              title="Copy this version into the source node (deliberate write-back)"
              onClick={() => applyEmbedIn(docId, block.id)}
            >
              apply to source
            </button>
            <button
              title="Discard this document's version; mirror the source again"
              onClick={() => revertEmbedIn(docId, block.id)}
            >
              revert
            </button>
          </>
        ) : (
          <em>live — mirrors the source</em>
        )}
      </span>
      {showOriginal && forked && source && (
        <div className="doc-embed-original nodrag" data-embed-original>
          {stripHtml(typeof source.data.content === 'string' ? source.data.content : '') ||
            '(source is empty)'}
        </div>
      )}
    </div>
  );
}

export function BlocksEditor({ docId, inRoom = false }: { docId: string; inRoom?: boolean }) {
  const document_ = useCanvasStore((state) => state.document);
  const moveBlockTo = useCanvasStore((state) => state.moveBlockTo);
  const splitNode = useCanvasStore((state) => state.splitNode);
  const openDocRoom = useCanvasStore((state) => state.openDocRoom);
  const [splitOpen, setSplitOpen] = useState(false);

  const blocks = useMemo(() => blocksOf(document_, docId), [document_, docId]);
  const compiled = useMemo(() => compileBlocks(document_, docId), [document_, docId]);
  const cast = useMemo(() => castOf(document_, docId), [document_, docId]);
  const presets = splitPresetsFor('document');
  const textBlockCount = blocks.filter((block) => block.kind === 'text').length;

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const toIndex = blocks.findIndex((block) => block.id === String(over.id));
    if (toIndex !== -1) moveBlockTo(docId, String(active.id), toIndex);
  };

  return (
    <div className="doc-blocks nodrag" data-doc-blocks>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext
          items={blocks.map((block) => block.id)}
          strategy={verticalListSortingStrategy}
        >
          {blocks.map((block, index) => (
            <Fragment key={block.id}>
              <InsertLine docId={docId} index={index} />
              <BlockRow
                docId={docId}
                block={block}
                inRoom={inRoom}
                textBlockCount={textBlockCount}
              />
            </Fragment>
          ))}
          <InsertLine docId={docId} index={blocks.length} />
        </SortableContext>
      </DndContext>

      <footer className="document-footer doc-blocks-footer nodrag">
        <span className="document-stat" title="Words in the document (blocks in order)">
          {wordCount(compiled.text)} words
        </span>
        {cast.length > 0 && (
          <span className="document-cast" title="Derived from people wired into sections">
            Cast: {cast.map((entry) => entry.name).join(', ')}
          </span>
        )}
        <span className="document-footer-actions">
          {presets.length > 0 && (
            <button
              className="document-action"
              aria-expanded={splitOpen}
              onClick={() => setSplitOpen((open) => !open)}
            >
              <Scissors size={12} aria-hidden /> Split
            </button>
          )}
          {!inRoom && (
            <button
              className="document-action"
              title="Write in the full-screen room"
              onClick={() => openDocRoom(docId)}
            >
              <Maximize2 size={12} aria-hidden /> Expand
            </button>
          )}
        </span>
      </footer>

      {splitOpen && (
        <div className="split-menu" role="menu" aria-label="Split presets">
          {presets.map((preset) => (
            <button
              key={preset.id}
              role="menuitem"
              className="split-menu-item"
              onClick={() => {
                splitNode(docId, preset.id);
                setSplitOpen(false);
              }}
            >
              <span>{preset.label}</span>
              <small>{preset.description}</small>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function BlocksFace({ nodeId }: FaceProps) {
  const updateNodeInternals = useUpdateNodeInternals();
  // block set changes = handle set changes -> re-register with RF
  const signature = useCanvasStore((state) =>
    blocksOf(state.document, nodeId)
      .map((block) => block.id)
      .join(','),
  );
  useEffect(() => {
    updateNodeInternals(nodeId);
  }, [signature, nodeId, updateNodeInternals]);
  return (
    <div className="canvas-node-body blocks-face" data-face="document">
      <BlocksEditor docId={nodeId} />
    </div>
  );
}
