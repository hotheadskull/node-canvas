// Zustand store: owns the CanvasDocument and calls core ops. It never
// re-implements graph logic (I7) -- every mutation goes through core.

import { create } from 'zustand';
import {
  addMember,
  addNode,
  addPlainEdge,
  addWire,
  applyEmbedToSource,
  blocksOf,
  editEmbed as editEmbedOp,
  insertTextBlock as insertTextBlockOp,
  materializeBlocks,
  moveBlock as moveBlockOp,
  removeTextBlock as removeTextBlockOp,
  revertEmbed as revertEmbedOp,
  setTextBlockContent,
  commitTentativeWire,
  createAssembly,
  createEmptyDocument,
  createTentativeWire,
  dissolveTentativeWire,
  findFreePosition,
  getNodeDef,
  getPort,
  GraphError,
  moveAssembly,
  parseDocument,
  READINESS_STAGES,
  readinessOf,
  renameAssembly,
  setAssemblyCollapsed,
  unpackAssembly,
  removeNode,
  removePlainEdge,
  removeWire,
  reorderIntakeWire,
  serializeDocument,
  setWireRelation as setWireRelationOp,
  spawnNode,
  splitNode as splitNodeOp,
  SPLIT_PRESETS,
  type CanvasDocument,
  type Rect,
} from '@node-canvas/core';

export const STORAGE_KEY = 'nodecanvas.v2.document';
export const CORRUPT_BACKUP_KEY = 'nodecanvas.v2.document.corrupt-backup';
export const VIEWPORT_KEY = 'nodecanvas.v2.viewport';
export const SETTINGS_KEY = 'nodecanvas.v2.settings';

export type Viewport = { x: number; y: number; zoom: number };
export type PortLabelMode = 'hover' | 'always' | 'off';
export type CanvasSettings = { density: 'comfortable' | 'compact'; portLabels: PortLabelMode };

export type Toast = { message: string; undo?: () => void };

/** RF handle ids that mean "plain relationship edge", not a port. */
export const PLAIN_HANDLES = new Set(['top', 'bottom', 'left', 'right']);

type CanvasState = {
  document: CanvasDocument;
  /**
   * Persistence problems are surfaced here and rendered as a banner -- never
   * swallowed (I9). null = healthy.
   */
  persistenceError: string | null;
  /** Viewport restored on boot. Never changed programmatically after (I5). */
  initialViewport: Viewport;
  settings: CanvasSettings;
  toast: Toast | null;

  load: () => void;
  save: () => void;
  dismissError: () => void;
  dismissToast: () => void;
  setSettings: (settings: Partial<CanvasSettings>) => void;

  spawnAt: (type: string, desired: { x: number; y: number }) => string | null;
  moveNode: (nodeId: string, position: { x: number; y: number }) => void;
  setNodeTitle: (nodeId: string, title: string) => void;
  setNodeContent: (nodeId: string, content: string) => void;
  setNodeAccent: (nodeId: string, accent: string | undefined) => void;
  /**
   * Record the card's REAL rendered height (Chunk 17 anatomy: auto height is
   * the resting state -- CSS grows the card; this only keeps the document's
   * size in sync for layout math). Measurement NEVER feeds back into
   * rendering, so there is no loop and nothing to lag (the v1 rule).
   */
  recordMeasuredHeight: (nodeId: string, height: number) => void;
  setOwnedSize: (nodeId: string, width: number, height: number) => void;
  clearOwnedHeight: (nodeId: string) => void;
  deleteNode: (nodeId: string) => void;

  connect: (
    source: string,
    target: string,
    handles?: { sourceHandle?: string; targetHandle?: string },
  ) => void;
  /** Route a completed RF connection: plain edge, live wire, or tentative. */
  connectFromHandles: (
    source: string,
    sourceHandle: string | null | undefined,
    target: string,
    targetHandle: string | null | undefined,
  ) => void;
  setEdgeLabel: (edgeId: string, label: string) => void;
  deleteEdge: (edgeId: string) => void;
  commitWire: (wireId: string) => void;
  dissolveWire: (wireId: string) => void;
  deleteWire: (wireId: string) => void;
  reorderIntake: (nodeId: string, portId: string, wireId: string, newIndex: number) => void;
  splitNode: (nodeId: string, presetId: string) => void;
  saveViewport: (viewport: Viewport) => void;

  /** The node open in the focus editor overlay (design B); null = closed. */
  editorNodeId: string | null;
  openEditor: (nodeId: string | null) => void;

  // ---- Document blocks (node pass: docs/design/node-passes/document.md) ----
  setBlockText: (docId: string, blockId: string, content: string) => void;
  /** First edit of an embed forks it; the source is never written by typing. */
  editEmbedIn: (docId: string, blockId: string, content: string) => void;
  revertEmbedIn: (docId: string, blockId: string) => void;
  /** The ONLY write-back path: deliberate "apply to source". */
  applyEmbedIn: (docId: string, blockId: string) => void;
  insertBlockAt: (docId: string, index: number) => void;
  removeBlockIn: (docId: string, blockId: string) => void;
  moveBlockTo: (docId: string, blockId: string, index: number) => void;
  /** Wire a give into a document so it LANDS at (before) a specific block. */
  wireIntoBlock: (
    source: string,
    sourcePort: string,
    docId: string,
    beforeBlockId: string,
  ) => void;
  /** "+ Section": spawn a Section already wired into this document's spine. */
  addSectionTo: (docId: string) => void;
  /**
   * Highlight-split (user-designed, the opposite of the spiderweb-in): the
   * selected text MOVES OUT of the document into a new node of `type`; a
   * plain "split" edge remembers where it came from.
   */
  splitSelectionToNode: (
    docId: string,
    blockId: string,
    parts: { extracted: string; remaining: string },
    type: string,
  ) => void;
  /** The document open in the fullscreen writing room; null = closed. */
  docRoomId: string | null;
  openDocRoom: (docId: string | null) => void;

  /** The assembly open in the Arc room overlay (sermon pack); null = closed. */
  arcRoomId: string | null;
  openArcRoom: (assemblyId: string | null) => void;
  arcRoomView: 'arc' | 'phrasing';
  setArcRoomView: (view: 'arc' | 'phrasing') => void;
  /** Set or clear the arc relationship carried by a wire. */
  setWireRelationTo: (wireId: string, relationId: string | undefined) => void;
  /**
   * Re-anchor a proposition: its outgoing arc wires are replaced by one arc
   * to `targetId` carrying `relationId` (null target = un-anchor it).
   */
  setArc: (sourceId: string, targetId: string | null, relationId?: string) => void;
  setVerseRef: (nodeId: string, verseRef: string) => void;
  /** Set or clear (null) an Event's story-time index. */
  setStoryTime: (nodeId: string, storyTime: number | null) => void;
  /** Set or clear ('') a wire's label (e.g. an Involves wire's role). */
  setWireLabel: (wireId: string, label: string) => void;

  cycleReadiness: (nodeId: string) => void;
  setOwner: (nodeId: string, owner: string) => void;

  paletteOpen: boolean;
  setPaletteOpen: (open: boolean) => void;

  /** Onboarding tour + the Tips/Reference panel (Chunk 16). */
  tutorialOpen: boolean;
  setTutorialOpen: (open: boolean) => void;
  tipsOpen: boolean;
  setTipsOpen: (open: boolean) => void;
  /** Quick capture: a note stamped capturedAt, filed into the Workbench. */
  capture: (text: string) => void;

  /** Drill-in stack (UI state, not persisted): assembly ids, outermost first. */
  drillStack: string[];
  drillIn: (assemblyId: string) => void;
  drillTo: (depth: number) => void;
  gatherSelection: (memberIds: string[]) => void;
  unpack: (assemblyId: string) => void;
  setCollapsed: (assemblyId: string, collapsed: boolean) => void;
  moveAssemblyTo: (assemblyId: string, position: { x: number; y: number }) => void;
  renameAssemblyTo: (assemblyId: string, name: string) => void;
};

function nodeRect(node: CanvasDocument['nodes'][number]): Rect {
  return {
    x: node.position.x,
    y: node.position.y,
    width: node.size?.width ?? 300,
    height: node.size?.height ?? 200,
  };
}

/** First take port on the node's type compatible with the given give port. */
export function firstCompatibleTake(
  document: CanvasDocument,
  giveNodeId: string,
  givePortId: string,
  targetNodeId: string,
): string | null {
  const giveNode = document.nodes.find((node) => node.id === giveNodeId);
  const targetNode = document.nodes.find((node) => node.id === targetNodeId);
  if (!giveNode || !targetNode) return null;
  const givePort = getPort(giveNode.type, givePortId);
  const targetDef = getNodeDef(targetNode.type);
  if (!givePort || !targetDef) return null;
  const take = targetDef.ports.find(
    (port) => port.direction === 'take' && port.dataKind === givePort.dataKind,
  );
  return take?.id ?? null;
}

let saveTimer: ReturnType<typeof setTimeout> | undefined;

/**
 * Test hook: cancel a pending debounced save. Real timers cross test
 * boundaries -- a save scheduled by test N would fire during test N+1 and
 * overwrite its freshly seeded localStorage document (a long-lived flake).
 */
export function cancelPendingSave(): void {
  clearTimeout(saveTimer);
}

function loadSettings(): CanvasSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<CanvasSettings>;
      return {
        density: parsed.density === 'compact' ? 'compact' : 'comfortable',
        portLabels: ['hover', 'always', 'off'].includes(parsed.portLabels as string)
          ? (parsed.portLabels as PortLabelMode)
          : 'hover',
      };
    }
  } catch {
    // settings are preferences, not user data; fall back silently
  }
  return { density: 'comfortable', portLabels: 'hover' };
}

export const useCanvasStore = create<CanvasState>((set, get) => {
  const commit = (document: CanvasDocument) => {
    set({ document });
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => get().save(), 400);
  };

  /** Wrap a core op: GraphErrors surface as a banner instead of crashing. */
  // Graph rule refusals ("already connected", "no compatible intake") are
  // NOTICES for the user, not failures -- they show as a quiet toast. The red
  // error banner is reserved for persistence problems (I9).
  const tryOp = (op: () => CanvasDocument) => {
    try {
      commit(op());
    } catch (error) {
      if (error instanceof GraphError) {
        set({ toast: { message: error.message } });
        return;
      }
      throw error;
    }
  };

  return {
    document: createEmptyDocument('My canvas'),
    persistenceError: null,
    initialViewport: { x: 0, y: 0, zoom: 1 },
    settings: loadSettings(),
    toast: null,

    load: () => {
      let viewport: Viewport = { x: 0, y: 0, zoom: 1 };
      try {
        const rawViewport = localStorage.getItem(VIEWPORT_KEY);
        if (rawViewport) viewport = JSON.parse(rawViewport) as Viewport;
      } catch {
        // viewport prefs are not user data; default silently
      }
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw === null) {
        set({ document: createEmptyDocument('My canvas'), initialViewport: viewport });
        return;
      }
      const parsed = parseDocument(raw);
      if (parsed.ok) {
        // I5: positions land exactly as saved; nothing moves them.
        set({ document: parsed.document, initialViewport: viewport, persistenceError: null });
        return;
      }
      // I9: keep the broken payload, tell the user, start fresh -- never
      // silently overwrite what might be recoverable.
      localStorage.setItem(CORRUPT_BACKUP_KEY, raw);
      set({
        document: createEmptyDocument('My canvas'),
        initialViewport: viewport,
        persistenceError: `Saved canvas could not be loaded (${parsed.error}). The unreadable copy was kept under "${CORRUPT_BACKUP_KEY}".`,
      });
    },

    save: () => {
      try {
        localStorage.setItem(STORAGE_KEY, serializeDocument(get().document));
      } catch (error) {
        set({ persistenceError: `Save failed: ${(error as Error).message}` });
      }
    },

    dismissError: () => set({ persistenceError: null }),
    dismissToast: () => set({ toast: null }),

    setSettings: (partial) => {
      const settings = { ...get().settings, ...partial };
      set({ settings });
      try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
      } catch {
        // preferences only
      }
    },

    spawnAt: (type, desired) => {
      const def = getNodeDef(type);
      if (!def) {
        set({ toast: { message: `Unknown node type "${type}"` } });
        return null;
      }
      const size = def.size ?? { width: 300, height: 200 };
      const doc = get().document;
      const position = findFreePosition(doc.nodes.map(nodeRect), desired, size);
      const node = spawnNode(type, position);
      tryOp(() => addNode(doc, node));
      return node.id;
    },

    moveNode: (nodeId, position) => {
      const doc = get().document;
      commit({
        ...doc,
        nodes: doc.nodes.map((node) => (node.id === nodeId ? { ...node, position } : node)),
      });
    },

    setNodeTitle: (nodeId, title) => {
      const doc = get().document;
      commit({
        ...doc,
        nodes: doc.nodes.map((node) =>
          node.id === nodeId ? { ...node, data: { ...node.data, title } } : node,
        ),
      });
    },

    setNodeContent: (nodeId, content) => {
      const doc = get().document;
      commit({
        ...doc,
        nodes: doc.nodes.map((node) =>
          node.id === nodeId ? { ...node, data: { ...node.data, content } } : node,
        ),
      });
    },

    setNodeAccent: (nodeId, accent) => {
      const doc = get().document;
      commit({
        ...doc,
        nodes: doc.nodes.map((node) => {
          if (node.id !== nodeId) return node;
          if (accent === undefined) {
            const { accent: _dropped, ...data } = node.data;
            return { ...node, data };
          }
          return { ...node, data: { ...node.data, accent } };
        }),
      });
    },

    recordMeasuredHeight: (nodeId, height) => {
      const doc = get().document;
      const node = doc.nodes.find((candidate) => candidate.id === nodeId);
      if (!node) return;
      const def = getNodeDef(node.type);
      if (def?.sizing !== 'auto-height') return;
      // user-owned heights are the user's statement -- never overwrite (I5)
      if (typeof node.data['ownedHeight'] === 'number') return;
      const rounded = Math.max(Math.round(height), 60);
      const current = node.size?.height;
      if (current !== undefined && Math.abs(current - rounded) < 2) return;
      commit({
        ...doc,
        nodes: doc.nodes.map((candidate) =>
          candidate.id === nodeId
            ? { ...candidate, size: { width: candidate.size?.width ?? 300, height: rounded } }
            : candidate,
        ),
      });
    },

    setOwnedSize: (nodeId, width, height) => {
      const doc = get().document;
      commit({
        ...doc,
        nodes: doc.nodes.map((node) =>
          node.id === nodeId
            ? {
                ...node,
                size: { width: Math.round(width), height: Math.round(height) },
                data: { ...node.data, ownedHeight: Math.round(height) },
              }
            : node,
        ),
      });
    },

    clearOwnedHeight: (nodeId) => {
      const doc = get().document;
      commit({
        ...doc,
        nodes: doc.nodes.map((node) => {
          if (node.id !== nodeId) return node;
          const { ownedHeight: _dropped, ...data } = node.data;
          return { ...node, data };
        }),
      });
    },

    deleteNode: (nodeId) => tryOp(() => removeNode(get().document, nodeId)),

    connect: (source, target, handles = {}) =>
      tryOp(() => addPlainEdge(get().document, source, target, handles)),

    connectFromHandles: (source, sourceHandle, target, targetHandle) => {
      const sourceIsPort = !!sourceHandle && !PLAIN_HANDLES.has(sourceHandle);
      const targetIsPort = !!targetHandle && !PLAIN_HANDLES.has(targetHandle);
      const doc = get().document;

      const portDirection = (nodeId: string, portId: string) => {
        const node = doc.nodes.find((candidate) => candidate.id === nodeId);
        return node ? getPort(node.type, portId)?.direction : undefined;
      };

      // A drop on a document BLOCK handle: the wire lands at that spot in
      // the prose (document node pass, mockup A).
      if (targetHandle?.startsWith('blk:')) {
        if (sourceIsPort && sourceHandle && portDirection(source, sourceHandle) === 'give') {
          get().wireIntoBlock(source, sourceHandle, target, targetHandle.slice(4));
          return;
        }
        set({ toast: { message: 'Drag from a give star to land content in the document.' } });
        return;
      }

      if (sourceIsPort && targetIsPort) {
        const sourceDir = portDirection(source, sourceHandle);
        const targetDir = portDirection(target, targetHandle);
        if (sourceDir === 'give' && targetDir === 'take') {
          tryOp(() =>
            addWire(doc, { source, sourcePort: sourceHandle, target, targetPort: targetHandle }),
          );
          return;
        }
        if (sourceDir === 'take' && targetDir === 'give') {
          // users drag both directions; a take->give drag is the same wire
          tryOp(() =>
            addWire(doc, { source: target, sourcePort: targetHandle, target: source, targetPort: sourceHandle }),
          );
          return;
        }
        set({ toast: { message: 'Those two ports cannot connect (give must feed take).' } });
        return;
      }

      if (sourceIsPort && !targetIsPort && portDirection(source, sourceHandle) === 'give') {
        // Loose drop from a give onto a node's relationship dot: a CANDIDATE
        // placement -- "this might go here." Tentative wire into the first
        // compatible intake.
        const takePort = firstCompatibleTake(doc, source, sourceHandle, target);
        if (!takePort) {
          set({ toast: { message: 'That node has no intake for this kind of connection.' } });
          return;
        }
        tryOp(() =>
          createTentativeWire(doc, { source, sourcePort: sourceHandle, target, targetPort: takePort }),
        );
        return;
      }

      // everything else is the universal fallback: a plain relationship line (I1)
      tryOp(() =>
        addPlainEdge(doc, source, target, {
          ...(sourceHandle && !sourceIsPort ? { sourceHandle } : {}),
          ...(targetHandle && !targetIsPort ? { targetHandle } : {}),
        }),
      );
    },

    setEdgeLabel: (edgeId, label) => {
      const doc = get().document;
      commit({
        ...doc,
        edges: doc.edges.map((edge) => {
          if (edge.id !== edgeId) return edge;
          if (label === '') {
            const { label: _dropped, ...rest } = edge;
            return rest;
          }
          return { ...edge, label };
        }),
      });
    },

    deleteEdge: (edgeId) => tryOp(() => removePlainEdge(get().document, edgeId)),

    commitWire: (wireId) => {
      const before = get().document;
      try {
        const result = commitTentativeWire(before, wireId);
        commit(result.document);
        if (result.dissolvedIds.length > 0) {
          const count = result.dissolvedIds.length;
          set({
            toast: {
              message: `Committed. ${count} other candidate${count === 1 ? '' : 's'} dissolved.`,
              undo: () => {
                commit(before);
                set({ toast: null });
              },
            },
          });
        }
      } catch (error) {
        if (error instanceof GraphError) {
          set({ toast: { message: error.message } });
          return;
        }
        throw error;
      }
    },

    dissolveWire: (wireId) => tryOp(() => dissolveTentativeWire(get().document, wireId)),

    deleteWire: (wireId) => tryOp(() => removeWire(get().document, wireId)),

    reorderIntake: (nodeId, portId, wireId, newIndex) =>
      tryOp(() => reorderIntakeWire(get().document, nodeId, portId, wireId, newIndex)),

    splitNode: (nodeId, presetId) => {
      const doc = get().document;
      const node = doc.nodes.find((candidate) => candidate.id === nodeId);
      const preset = SPLIT_PRESETS.find((candidate) => candidate.id === presetId);
      if (!node || !preset) {
        set({ toast: { message: `Split preset "${presetId}" not available here` } });
        return;
      }
      tryOp(
        () =>
          splitNodeOp(doc, nodeId, preset.stubs, preset.intake ? { intakeId: preset.intake } : {})
            .document,
      );
    },

    saveViewport: (viewport) => {
      try {
        localStorage.setItem(VIEWPORT_KEY, JSON.stringify(viewport));
      } catch {
        // losing viewport prefs is acceptable; losing documents is not
      }
    },

    editorNodeId: null,
    openEditor: (nodeId) => set({ editorNodeId: nodeId }),

    setBlockText: (docId, blockId, content) =>
      tryOp(() => setTextBlockContent(get().document, docId, blockId, content)),

    editEmbedIn: (docId, blockId, content) =>
      tryOp(() => editEmbedOp(get().document, docId, blockId, content)),

    revertEmbedIn: (docId, blockId) =>
      tryOp(() => revertEmbedOp(get().document, docId, blockId)),

    applyEmbedIn: (docId, blockId) =>
      tryOp(() => applyEmbedToSource(get().document, docId, blockId)),

    insertBlockAt: (docId, index) => tryOp(() => insertTextBlockOp(get().document, docId, index)),

    removeBlockIn: (docId, blockId) =>
      tryOp(() => removeTextBlockOp(get().document, docId, blockId)),

    moveBlockTo: (docId, blockId, index) =>
      tryOp(() => moveBlockOp(get().document, docId, blockId, index)),

    wireIntoBlock: (source, sourcePort, docId, beforeBlockId) => {
      tryOp(() => {
        let doc = addWire(get().document, {
          source,
          sourcePort,
          target: docId,
          targetPort: 'sections-in',
        });
        const newWire = doc.wires[doc.wires.length - 1]!;
        doc = materializeBlocks(doc, docId);
        const blocks = blocksOf(doc, docId);
        const appended = blocks.find(
          (block) => block.kind === 'embed' && block.wireId === newWire.id,
        );
        const toIndex = blocks.findIndex((block) => block.id === beforeBlockId);
        if (appended && toIndex !== -1) {
          doc = moveBlockOp(doc, docId, appended.id, toIndex);
        }
        return doc;
      });
    },

    addSectionTo: (docId) => {
      const doc = get().document;
      const docNode = doc.nodes.find((candidate) => candidate.id === docId);
      const def = getNodeDef('section');
      if (!docNode || !def) return;
      const size = def.size ?? { width: 300, height: 200 };
      const wiredCount = doc.wires.filter(
        (wire) => wire.target === docId && wire.targetPort === 'sections-in',
      ).length;
      // sections FEED the document, so the stub lands off its left gutter --
      // visible right next to the star it's wired into
      const desired = {
        x: docNode.position.x - size.width - 140,
        y: docNode.position.y + wiredCount * 70,
      };
      const position = findFreePosition(doc.nodes.map(nodeRect), desired, size);
      const node = spawnNode('section', position);
      node.data = { ...node.data, title: `Section ${wiredCount + 1}` };
      tryOp(() => {
        let next = addNode(doc, node);
        next = addWire(next, {
          source: node.id,
          sourcePort: 'text-out',
          target: docId,
          targetPort: 'sections-in',
        });
        return materializeBlocks(next, docId);
      });
    },

    splitSelectionToNode: (docId, blockId, parts, type) => {
      const doc = get().document;
      const docNode = doc.nodes.find((candidate) => candidate.id === docId);
      const def = getNodeDef(type);
      if (!docNode || !def) {
        set({ toast: { message: `Cannot split into unknown type "${type}"` } });
        return;
      }
      const clean = (html: string) => html.replace(/<p>\s*<\/p>/g, '').trim();
      const extracted = clean(parts.extracted);
      if (extracted === '') return;
      const size = def.size ?? { width: 300, height: 200 };
      // content fans OUT of the document, so new nodes land off its right
      const desired = {
        x: docNode.position.x + (docNode.size?.width ?? 500) + 140,
        y: docNode.position.y,
      };
      const position = findFreePosition(doc.nodes.map(nodeRect), desired, size);
      const node = spawnNode(type, position);
      node.data = { ...node.data, content: extracted };
      tryOp(() => {
        let next = addNode(doc, node);
        // the highlighted text MOVES OUT (user decision 2026-07-15); the
        // prose around it closes up in place
        next = setTextBlockContent(next, docId, blockId, clean(parts.remaining));
        // a plain gold line remembers the lineage (delete it freely)
        next = addPlainEdge(next, docId, node.id, {});
        const provenance = next.edges[next.edges.length - 1];
        return provenance
          ? {
              ...next,
              edges: next.edges.map((edge) =>
                edge.id === provenance.id ? { ...edge, label: 'split' } : edge,
              ),
            }
          : next;
      });
    },

    docRoomId: null,
    openDocRoom: (docId) => set({ docRoomId: docId }),

    arcRoomId: null,
    openArcRoom: (assemblyId) => set({ arcRoomId: assemblyId }),
    arcRoomView: 'arc',
    setArcRoomView: (view) => set({ arcRoomView: view }),

    setWireRelationTo: (wireId, relationId) =>
      tryOp(() => setWireRelationOp(get().document, wireId, relationId)),

    setArc: (sourceId, targetId, relationId) => {
      tryOp(() => {
        let doc = get().document;
        const outgoing = doc.wires.filter(
          (wire) =>
            wire.source === sourceId && wire.targetPort === 'arc-in' && wire.status === 'live',
        );
        for (const wire of outgoing) {
          doc = removeWire(doc, wire.id);
        }
        if (targetId !== null) {
          doc = addWire(doc, {
            source: sourceId,
            sourcePort: 'prop-out',
            target: targetId,
            targetPort: 'arc-in',
          });
          if (relationId) {
            const added = doc.wires[doc.wires.length - 1]!;
            doc = setWireRelationOp(doc, added.id, relationId);
          }
        }
        return doc;
      });
    },

    setVerseRef: (nodeId, verseRef) => {
      const doc = get().document;
      commit({
        ...doc,
        nodes: doc.nodes.map((node) => {
          if (node.id !== nodeId) return node;
          if (verseRef.trim() === '') {
            const { verseRef: _dropped, ...data } = node.data;
            return { ...node, data };
          }
          return { ...node, data: { ...node.data, verseRef } };
        }),
      });
    },

    paletteOpen: false,
    setPaletteOpen: (open) => set({ paletteOpen: open }),

    tutorialOpen: false,
    setTutorialOpen: (open) => set({ tutorialOpen: open }),
    tipsOpen: false,
    setTipsOpen: (open) => set({ tipsOpen: open }),

    capture: (text) => {
      let doc = get().document;
      // the Workbench is a standing inbox assembly, created on first capture
      let workbench = doc.assemblies.find(
        (assembly) => assembly.name.trim().toLowerCase() === 'workbench',
      );
      try {
        if (!workbench) {
          const rects = doc.nodes.map(nodeRect);
          const spot = findFreePosition(rects, { x: 0, y: -600 }, { width: 300, height: 220 });
          const seedNote = spawnNode('note', spot);
          seedNote.data = {
            title: text.length > 60 ? `${text.slice(0, 57)}…` : text,
            content: `<p>${text}</p>`,
            capturedAt: new Date().toISOString(),
          };
          doc = addNode(doc, seedNote);
          const created = createAssembly(doc, 'Workbench', [seedNote.id], {
            x: spot.x,
            y: spot.y - 40,
          });
          commit(setAssemblyCollapsed(created.document, created.assemblyId, true));
          return;
        }
        const rects = doc.nodes.map(nodeRect);
        const near = findFreePosition(rects, workbench.position, { width: 300, height: 220 });
        const note = spawnNode('note', near);
        note.data = {
          title: text.length > 60 ? `${text.slice(0, 57)}…` : text,
          content: `<p>${text}</p>`,
          capturedAt: new Date().toISOString(),
        };
        doc = addNode(doc, note);
        commit(addMember(doc, workbench.id, note.id));
      } catch (error) {
        if (error instanceof GraphError) {
          set({ toast: { message: error.message } });
          return;
        }
        throw error;
      }
    },

    setStoryTime: (nodeId, storyTime) => {
      if (storyTime !== null && !Number.isFinite(storyTime)) return;
      const doc = get().document;
      commit({
        ...doc,
        nodes: doc.nodes.map((node) => {
          if (node.id !== nodeId) return node;
          if (storyTime === null) {
            const { storyTime: _dropped, ...data } = node.data;
            return { ...node, data };
          }
          return { ...node, data: { ...node.data, storyTime } };
        }),
      });
    },

    setWireLabel: (wireId, label) => {
      const doc = get().document;
      commit({
        ...doc,
        wires: doc.wires.map((wire) => {
          if (wire.id !== wireId) return wire;
          if (label.trim() === '') {
            const { label: _dropped, ...rest } = wire;
            return rest;
          }
          return { ...wire, label };
        }),
      });
    },

    cycleReadiness: (nodeId) => {
      const doc = get().document;
      const node = doc.nodes.find((candidate) => candidate.id === nodeId);
      if (!node) return;
      const current = readinessOf(node);
      const next =
        READINESS_STAGES[(READINESS_STAGES.indexOf(current) + 1) % READINESS_STAGES.length]!;
      commit({
        ...doc,
        nodes: doc.nodes.map((candidate) =>
          candidate.id === nodeId
            ? { ...candidate, data: { ...candidate.data, readiness: next } }
            : candidate,
        ),
      });
    },

    setOwner: (nodeId, owner) => {
      const doc = get().document;
      commit({
        ...doc,
        nodes: doc.nodes.map((node) => {
          if (node.id !== nodeId) return node;
          if (owner.trim() === '') {
            const { owner: _dropped, ...data } = node.data;
            return { ...node, data };
          }
          return { ...node, data: { ...node.data, owner } };
        }),
      });
    },

    drillStack: [],

    drillIn: (assemblyId) =>
      set((state) => ({ drillStack: [...state.drillStack, assemblyId] })),

    drillTo: (depth) => set((state) => ({ drillStack: state.drillStack.slice(0, depth) })),

    gatherSelection: (memberIds) => {
      const doc = get().document;
      const rectOf = (id: string) => {
        const node = doc.nodes.find((candidate) => candidate.id === id);
        if (node) return nodeRect(node);
        const assembly = doc.assemblies.find((candidate) => candidate.id === id);
        return assembly ? { ...assembly.position, width: 260, height: 150 } : null;
      };
      const rects = memberIds.map(rectOf).filter((rect) => rect !== null);
      if (rects.length === 0) return;
      const centroid = {
        x: Math.round(rects.reduce((sum, rect) => sum + rect.x + rect.width / 2, 0) / rects.length),
        y: Math.round(rects.reduce((sum, rect) => sum + rect.y + rect.height / 2, 0) / rects.length),
      };
      try {
        const created = createAssembly(doc, 'New group', memberIds, centroid);
        commit(setAssemblyCollapsed(created.document, created.assemblyId, true));
      } catch (error) {
        if (error instanceof GraphError) {
          set({ toast: { message: error.message } });
          return;
        }
        throw error;
      }
    },

    unpack: (assemblyId) => {
      // leaving a drill view of something that no longer exists
      set((state) => ({
        drillStack: state.drillStack.filter((id) => id !== assemblyId),
      }));
      tryOp(() => unpackAssembly(get().document, assemblyId));
    },

    setCollapsed: (assemblyId, collapsed) =>
      tryOp(() => setAssemblyCollapsed(get().document, assemblyId, collapsed)),

    moveAssemblyTo: (assemblyId, position) =>
      tryOp(() => moveAssembly(get().document, assemblyId, position)),

    renameAssemblyTo: (assemblyId, name) =>
      tryOp(() => renameAssembly(get().document, assemblyId, name)),
  };
});
