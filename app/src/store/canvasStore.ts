// Zustand store: owns the CanvasDocument and calls core ops. It never
// re-implements graph logic (I7) -- every mutation goes through core.

import { create } from 'zustand';
import {
  addNode,
  addPlainEdge,
  addWire,
  commitTentativeWire,
  computeAutoHeight,
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
  renameAssembly,
  setAssemblyCollapsed,
  unpackAssembly,
  removeNode,
  removePlainEdge,
  removeWire,
  reorderIntakeWire,
  serializeDocument,
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
  applyMeasuredHeight: (nodeId: string, contentHeight: number) => void;
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

    connectFromHandles: (source, sourceHandle, target, targetHandle) => {
      const sourceIsPort = !!sourceHandle && !PLAIN_HANDLES.has(sourceHandle);
      const targetIsPort = !!targetHandle && !PLAIN_HANDLES.has(targetHandle);
      const doc = get().document;

      const portDirection = (nodeId: string, portId: string) => {
        const node = doc.nodes.find((candidate) => candidate.id === nodeId);
        return node ? getPort(node.type, portId)?.direction : undefined;
      };

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
        set({ persistenceError: 'Those two ports cannot connect (give must feed take).' });
        return;
      }

      if (sourceIsPort && !targetIsPort && portDirection(source, sourceHandle) === 'give') {
        // Loose drop from a give onto a node's relationship dot: a CANDIDATE
        // placement -- "this might go here." Tentative wire into the first
        // compatible intake.
        const takePort = firstCompatibleTake(doc, source, sourceHandle, target);
        if (!takePort) {
          set({ persistenceError: 'That node has no intake for this kind of connection.' });
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
          set({ persistenceError: error.message });
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
        set({ persistenceError: `Split preset "${presetId}" not available here` });
        return;
      }
      tryOp(() => splitNodeOp(doc, nodeId, preset.stubs).document);
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
          set({ persistenceError: error.message });
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
