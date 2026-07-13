// Zustand store: owns the CanvasDocument and calls core ops. It never
// re-implements graph logic (I7) -- every mutation goes through core.

import { create } from 'zustand';
import {
  addNode,
  addPlainEdge,
  computeAutoHeight,
  createEmptyDocument,
  findFreePosition,
  getNodeDef,
  GraphError,
  parseDocument,
  removeNode,
  removePlainEdge,
  serializeDocument,
  spawnNode,
  type CanvasDocument,
  type Rect,
} from '@node-canvas/core';

export const STORAGE_KEY = 'nodecanvas.v2.document';
export const CORRUPT_BACKUP_KEY = 'nodecanvas.v2.document.corrupt-backup';
export const VIEWPORT_KEY = 'nodecanvas.v2.viewport';

export type Viewport = { x: number; y: number; zoom: number };

type CanvasState = {
  document: CanvasDocument;
  /**
   * Persistence problems are surfaced here and rendered as a banner -- never
   * swallowed (I9). null = healthy.
   */
  persistenceError: string | null;
  /** Viewport restored on boot. Never changed programmatically after (I5). */
  initialViewport: Viewport;

  load: () => void;
  save: () => void;
  dismissError: () => void;

  spawnAt: (type: string, desired: { x: number; y: number }) => string | null;
  moveNode: (nodeId: string, position: { x: number; y: number }) => void;
  setNodeTitle: (nodeId: string, title: string) => void;
  setNodeContent: (nodeId: string, content: string) => void;
  applyMeasuredHeight: (nodeId: string, contentHeight: number) => void;
  setOwnedSize: (nodeId: string, width: number, height: number) => void;
  clearOwnedHeight: (nodeId: string) => void;
  deleteNode: (nodeId: string) => void;
  connect: (
    source: string,
    target: string,
    handles?: { sourceHandle?: string; targetHandle?: string },
  ) => void;
  setEdgeLabel: (edgeId: string, label: string) => void;
  deleteEdge: (edgeId: string) => void;
  saveViewport: (viewport: Viewport) => void;
};

function nodeRect(node: CanvasDocument['nodes'][number]): Rect {
  return {
    x: node.position.x,
    y: node.position.y,
    width: node.size?.width ?? 300,
    height: node.size?.height ?? 200,
  };
}

let saveTimer: ReturnType<typeof setTimeout> | undefined;

export const useCanvasStore = create<CanvasState>((set, get) => {
  const commit = (document: CanvasDocument) => {
    set({ document });
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => get().save(), 400);
  };

  /** Wrap a core op: GraphErrors surface as a banner instead of crashing. */
  const tryOp = (op: () => CanvasDocument) => {
    try {
      commit(op());
    } catch (error) {
      if (error instanceof GraphError) {
        set({ persistenceError: error.message });
        return;
      }
      throw error;
    }
  };

  return {
    document: createEmptyDocument('My canvas'),
    persistenceError: null,
    initialViewport: { x: 0, y: 0, zoom: 1 },

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

    spawnAt: (type, desired) => {
      const def = getNodeDef(type);
      if (!def) {
        set({ persistenceError: `Unknown node type "${type}"` });
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

    applyMeasuredHeight: (nodeId, contentHeight) => {
      const doc = get().document;
      const node = doc.nodes.find((candidate) => candidate.id === nodeId);
      if (!node) return;
      const def = getNodeDef(node.type);
      if (def?.sizing !== 'auto-height') return;
      const minHeight = def.size?.height ?? 200;
      const owned = node.data['ownedHeight'];
      const height = computeAutoHeight({
        contentHeight,
        minHeight,
        ...(typeof owned === 'number' ? { ownedHeight: owned } : {}),
      });
      const current = node.size?.height;
      if (current !== undefined && Math.abs(current - height) < 1) return;
      commit({
        ...doc,
        nodes: doc.nodes.map((candidate) =>
          candidate.id === nodeId
            ? { ...candidate, size: { width: candidate.size?.width ?? 300, height } }
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

    saveViewport: (viewport) => {
      try {
        localStorage.setItem(VIEWPORT_KEY, JSON.stringify(viewport));
      } catch {
        // losing viewport prefs is acceptable; losing documents is not
      }
    },
  };
});
