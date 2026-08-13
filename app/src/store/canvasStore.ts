// Zustand store: owns the CanvasDocument and calls core ops. It never
// re-implements graph logic (I7) -- every mutation goes through core.

import { create } from 'zustand';
import {
  addMember,
  addNode,
  addPlainEdge,
  addWire,
  describeInference,
  inferConnection,
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
  createId,
  createTentativeWire,
  dissolveTentativeWire,
  findFreePosition,
  getNodeDef,
  getPort,
  GraphError,
  exportFileStem,
  exportMarkdown,
  exportPlainText,
  loadDocument,
  moveAssembly,
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
  mergeNodes,
  splitNode as splitNodeOp,
  SPLIT_PRESETS,
  type CanvasDocument,
  type Rect,
} from '@node-canvas/core';
import { projectIO, PROJECT_EXTENSION } from '../persistence/projectFile';
import { renderCanvasImage, type CanvasImageFormat } from '../persistence/canvasImage';

/** Stable sentinel for CLOSED overlays: subscribing to the real document
 * re-renders on every keystroke; a closed room/editor/tour subscribes to
 * this constant instead and costs nothing until it opens. */
export const CLOSED_DOCUMENT = createEmptyDocument('__closed__');

export const STORAGE_KEY = 'nodecanvas.v2.document';
export const CORRUPT_BACKUP_KEY = 'nodecanvas.v2.document.corrupt-backup';
export const VIEWPORT_KEY = 'nodecanvas.v2.viewport';
export const SETTINGS_KEY = 'nodecanvas.v2.settings';
export const PROJECT_PATH_KEY = 'nodecanvas.v2.projectPath';
/** Where the previous canvas goes when New/Open replaces it (undo's source). */
export const PREVIOUS_DOCUMENT_KEY = 'nodecanvas.v2.document.previous';

export type Viewport = { x: number; y: number; zoom: number };
export type PortLabelMode = 'hover' | 'always' | 'off';
export type RecentProject = { name: string; path: string | null; date: number };
export type CanvasSettings = { density: 'comfortable' | 'compact'; portLabels: PortLabelMode; recentProjects?: RecentProject[] };

export type SplitPanelConfig = {
  type: string;
  count: number;
  titleMode: 'numbered' | 'blank' | 'paste';
  pastedTitles?: string[];
  wireBack: boolean;
  keepText: boolean;
};
export type CustomSplitPreset = { id: string; label: string; config: SplitPanelConfig };

const CUSTOM_PRESETS_KEY = 'nodecanvas.v2.splitPresets';

function loadCustomPresets(): CustomSplitPreset[] {
  try {
    const raw = localStorage.getItem(CUSTOM_PRESETS_KEY);
    if (raw === null) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as CustomSplitPreset[]) : [];
  } catch {
    return [];
  }
}

export type Toast = { message: string; undo?: () => void };

/** RF handle ids that mean "plain relationship edge", not a port.
 * 'in'/'out' are the UNIVERSAL ports every standard plate shows (design
 * direction 2026-08-12 §2): "ordinary connections should stay simple by
 * default". They are not registry ports, so without them here `getPort`
 * looks up an id that cannot exist and the drop is refused. */
export const PLAIN_HANDLES = new Set(['top', 'bottom', 'left', 'right', 'in', 'out']);

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
  past: CanvasDocument[];
  future: CanvasDocument[];
  undo: () => void;
  redo: () => void;

  load: () => void;
  save: () => void;
  dismissError: () => void;
  dismissToast: () => void;
  setSettings: (settings: Partial<CanvasSettings>) => void;

  // ---- File-per-project persistence (Chunk 18) ----
  /** Absolute path of the bound .nodecanvas file (Tauri only). null = the
   * canvas lives purely in browser storage. */
  projectPath: string | null;
  /** Display name of the project file; survives browser opens (no path). */
  projectFileName: string | null;
  /** True while a canvas image export temporarily disables visibility
   * culling so off-screen nodes render into the picture. */
  exportingCanvas: boolean;
  newProject: () => void;
  openProject: () => Promise<void>;
  loadTemplate: (doc: CanvasDocument, title: string) => void;
  openRecentProject: (path: string) => Promise<void>;
  /** Write the bound file now; falls back to Save As when unbound. */
  saveProject: () => Promise<void>;
  saveProjectAs: () => Promise<void>;
  /** Export one compile-face node's work as Markdown or plain text. */
  exportNode: (nodeId: string, format: 'markdown' | 'text') => Promise<void>;
  exportCanvasImage: (format: CanvasImageFormat) => Promise<void>;

  spawnAt: (type: string, desired: { x: number; y: number }) => string | null;
  moveNode: (nodeId: string, position: { x: number; y: number }) => void;
  setNodeTitle: (nodeId: string, title: string) => void;
  setNodeContent: (nodeId: string, content: string) => void;
  setNodeAccent: (nodeId: string, accent: string | undefined) => void;
  setNodeField: (nodeId: string, field: string, value: unknown) => void;
  addCustomField: (nodeId: string, field: import('../components/CanvasNode').CustomField) => void;
  updateCustomField: (nodeId: string, fieldId: string, value: any) => void;
  removeCustomField: (nodeId: string, fieldId: string) => void;
  extractNodeText: (nodeId: string, parts: { extracted: string; remaining: string }, type: string) => void;

  // ---- Ink Layer ----
  inkMode: boolean;
  setInkMode: (mode: boolean) => void;
  inkColor: string;
  setInkColor: (color: string) => void;
  inkSize: number;
  setInkSize: (size: number) => void;
  inkEraserMode: boolean;
  setInkEraserMode: (mode: boolean) => void;
  currentStroke: { points: [number, number, number][] } | null;
  startStroke: (point: [number, number, number]) => void;
  updateStroke: (point: [number, number, number]) => void;
  endStroke: () => void;
  eraseAt: (x: number, y: number) => void;
  clearInk: () => void;

  /** Per-node gutter swap (user, 2026-08-10): intake and output trade
   * sides so a node can face its partners -- the grammar stays fixed,
   * the odd node flips. Stored in node.data (passthrough). */
  toggleNodeFlipped: (nodeId: string) => void;
  /** Drag-time broadcast: "nodeId:portId" for every port the wire being
   * dragged could legally land on. Session only; null = no drag. */
  connectCandidates: ReadonlySet<string> | null;
  setConnectCandidates: (candidates: ReadonlySet<string> | null) => void;
  /** Density filter (Observatory §6): the data kinds currently RESOLVED.
   * null = no filter, everything draws. Session only. */
  wireFilter: ReadonlySet<string> | null;
  setWireFilter: (kinds: ReadonlySet<string> | null) => void;
  /** Dock Filter tool (spec §10): pin the filter bar open below its
   * automatic 4-wire threshold. Session only. */
  filterPinned: boolean;
  setFilterPinned: (pinned: boolean) => void;
  /** Observatory collapse (spec §2): sticky, user-controlled, persisted in
   * node.data. 'rolled-up' is the assembly state and stays derived. */
  toggleNodeCollapsed: (nodeId: string) => void;
  setAllCollapsed: (collapsed: boolean) => void;
  /** Zoom below 45% RENDERS everything collapsed but must never overwrite
   * the stored per-node value -- this session flag is the borrow. */
  zoomBorrow: boolean;
  setZoomBorrow: (on: boolean) => void;
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
  /** The split panel (Observatory §9): count/type/titles/wire-back/keep-text
   * resolved into stubs; presets are just pre-filled configs. */
  splitWithConfig: (nodeId: string, config: SplitPanelConfig) => void;
  /** User-saved panel configs (localStorage; registry presets stay in core). */
  customPresets: CustomSplitPreset[];
  saveCustomPreset: (label: string, config: SplitPanelConfig) => void;
  /** Merge (approved 2026-08-10): fold same-type nodes into the first. */
  mergeSelection: (targetId: string, otherIds: string[]) => void;
  saveViewport: (viewport: Viewport) => void;

  /** The node open in the focus editor overlay (design B); null = closed. */
  editorNodeId: string | null;
  openEditor: (nodeId: string | null) => void;

  /** Observatory §10: the plate grown IN PLACE to the open state. SESSION
   * only -- never persisted, never a document write (I5: the stored size
   * and position are untouched; only the rendered width borrows 736px). */
  openNodeId: string | null;
  setOpenNode: (nodeId: string | null) => void;

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
  extractBrainstormTopic: (
    nodeId: string,
    topic: { id: string; type: string; title: string; content: string },
  ) => void;
  saveTemplate: (nodeIds: string[], name: string, description?: string) => void;
  spawnTemplate: (templateId: string, position: { x: number, y: number }) => void;
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

export function loadSettings(): CanvasSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<CanvasSettings> & { v?: number };
      let portLabels: PortLabelMode = ['hover', 'always', 'off'].includes(
        parsed.portLabels as string,
      )
        ? (parsed.portLabels as PortLabelMode)
        : 'hover';
      // v2 migration (user, 2026-08-10, superseding their own earlier
      // call): a stored pre-v2 'always' was the OLD DEFAULT, not a
      // choice -- it becomes 'hover' once. An Always picked in Settings
      // after this saves with v:2 and sticks.
      if (parsed.v === undefined && portLabels === 'always') portLabels = 'hover';
      return {
        density: parsed.density === 'compact' ? 'compact' : 'comfortable',
        portLabels,
      };
    }
  } catch {
    // settings are preferences, not user data; fall back silently
  }
  // labels rest HIDDEN; the one under your pointer names itself (user,
  // 2026-08-10: "not have the names until you hover over it") -- the
  // colored slots carry the vocabulary at rest, Settings offers Always
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
      const currentDoc = get().document;
      const newDoc = op();
      if (currentDoc !== newDoc) {
        set((state) => ({
          past: [...state.past, state.document],
          future: []
        }));
        commit(newDoc);
      }
    } catch (error) {
      if (error instanceof GraphError) {
        set({ toast: { message: error.message } });
        return;
      }
      throw error;
    }
  };

  /** Swap the whole canvas (New/Open). The outgoing document is stashed
   * under PREVIOUS_DOCUMENT_KEY and offered back through an Undo toast, the
   * file binding is updated, and the write happens NOW -- no debounce window
   * in which the swap could be lost. */
  const adopt = (
    document: CanvasDocument,
    binding: { path: string | null; fileName: string | null; toastMessage: string },
  ) => {
    const previous = {
      document: get().document,
      projectPath: get().projectPath,
      projectFileName: get().projectFileName,
    };
    try {
      localStorage.setItem(PREVIOUS_DOCUMENT_KEY, serializeDocument(previous.document));
    } catch {
      // the stash is belt-and-braces; the Undo toast still holds the object
    }
    clearTimeout(saveTimer);
    const rebindPath = (path: string | null) => {
      try {
        if (path !== null) localStorage.setItem(PROJECT_PATH_KEY, path);
        else localStorage.removeItem(PROJECT_PATH_KEY);
      } catch {
        // path rebinding is a convenience, not user data
      }
    };
    set({
      document,
      projectPath: binding.path,
      projectFileName: binding.fileName,
      persistenceError: null,
      past: [],
      future: [],
      toast: {
        message: binding.toastMessage,
        undo: () => {
          set({ ...previous, toast: null });
          rebindPath(previous.projectPath);
          get().save();
        },
      },
    });
    rebindPath(binding.path);

    if (binding.fileName && binding.fileName !== 'Untitled project (browser storage)' && binding.fileName !== 'My canvas') {
      const currentRecent = get().settings.recentProjects || [];
      const nextRecent = currentRecent.filter(p => (binding.path ? p.path !== binding.path : p.name !== binding.fileName));
      nextRecent.unshift({ name: binding.fileName, path: binding.path, date: Date.now() });
      if (nextRecent.length > 10) nextRecent.length = 10;
      get().setSettings({ recentProjects: nextRecent });
    }

    get().save();
  };

  return {
    document: createEmptyDocument('My canvas'),
    past: [],
    future: [],
    undo: () => {
      const state = get();
      if (state.past.length === 0) return;
      const newPast = [...state.past];
      const previous = newPast.pop()!;
      set({ past: newPast, future: [state.document, ...state.future] });
      commit(previous);
    },
    redo: () => {
      const state = get();
      if (state.future.length === 0) return;
      const newFuture = [...state.future];
      const next = newFuture.shift()!;
      set({ past: [...state.past, state.document], future: newFuture });
      commit(next);
    },
    persistenceError: null,
    initialViewport: { x: 0, y: 0, zoom: 1 },
    settings: loadSettings(),
    toast: null,
    projectPath: null,
    projectFileName: null,
    exportingCanvas: false,

    inkMode: false,
    inkColor: '#f1f1f2',
    inkSize: 4,
    inkEraserMode: false,
    currentStroke: null,
    setInkMode: (mode) => set({ inkMode: mode }),
    setInkColor: (color) => set({ inkColor: color, inkEraserMode: false }),
    setInkSize: (size) => set({ inkSize: size }),
    setInkEraserMode: (mode) => set({ inkEraserMode: mode }),
    startStroke: (point) => set({ currentStroke: { points: [point] } }),
    updateStroke: (point) =>
      set((state) => {
        if (!state.currentStroke) return state;
        return {
          currentStroke: { points: [...state.currentStroke.points, point] },
        };
      }),
    endStroke: () => {
      tryOp(() => {
        const state = get();
        if (!state.currentStroke || state.currentStroke.points.length === 0) return state.document;
        
        const newStroke = {
          id: `stroke_${Math.random().toString(36).substring(2, 9)}`,
          color: state.inkColor,
          size: state.inkSize,
          points: state.currentStroke.points,
        };

        const document = {
          ...state.document,
          ink: [...(state.document.ink || []), newStroke],
        };
        set({ currentStroke: null });
        return document;
      });
    },
    clearInk: () => {
      tryOp(() => {
        const document = { ...get().document, ink: [] };
        return document;
      });
    },
    eraseAt: (x, y) => {
      tryOp(() => {
        const state = get();
        if (!state.document.ink || state.document.ink.length === 0) return state.document;
        
        const ERASER_RADIUS = 25;
        const ERASER_RADIUS_SQ = ERASER_RADIUS * ERASER_RADIUS;
        const newInk = [];
        let changed = false;

        for (const stroke of state.document.ink) {
          let currentSegment: [number, number, number][] = [];
          
          for (const pt of stroke.points) {
            const dx = pt[0] - x;
            const dy = pt[1] - y;
            if (dx * dx + dy * dy <= ERASER_RADIUS_SQ) {
              changed = true;
              if (currentSegment.length > 0) {
                newInk.push({ ...stroke, id: crypto.randomUUID(), points: currentSegment });
                currentSegment = [];
              }
            } else {
              currentSegment.push(pt);
            }
          }
          
          if (currentSegment.length === stroke.points.length) {
            newInk.push(stroke);
          } else if (currentSegment.length > 0) {
            newInk.push({ ...stroke, id: crypto.randomUUID(), points: currentSegment });
          }
        }
        
        if (!changed) return state.document;
        return { ...state.document, ink: newInk };
      });
    },

    load: () => {
      let viewport: Viewport = { x: 0, y: 0, zoom: 1 };
      try {
        const rawViewport = localStorage.getItem(VIEWPORT_KEY);
        if (rawViewport) viewport = JSON.parse(rawViewport) as Viewport;
      } catch {
        // viewport prefs are not user data; default silently
      }
      // Re-bind the project file from the last session. Only a real path is
      // worth restoring, and only the desktop shell has one.
      let projectPath: string | null = null;
      let projectFileName: string | null = null;
      const storedPath = localStorage.getItem(PROJECT_PATH_KEY);
      if (storedPath && projectIO.isTauri()) {
        projectPath = storedPath;
        projectFileName = storedPath.split(/[\\/]/).pop() ?? storedPath;
      }
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw === null) {
        set({
          document: createEmptyDocument('My canvas'),
          initialViewport: viewport,
          projectPath,
          projectFileName,
        });
        return;
      }
      const parsed = loadDocument(raw);
      if (parsed.ok) {
        if (parsed.migrated) {
          // Backup-before-migrate: the original bytes are preserved BEFORE
          // the debounced save can overwrite them with the migrated shape.
          const backupKey = `nodecanvas.v2.document.backup-v${parsed.fromVersion}`;
          localStorage.setItem(backupKey, raw);
          set({
            toast: {
              message: `Canvas upgraded from schema v${parsed.fromVersion} -- the original is kept in browser storage`,
            },
          });
        }
        // I5: positions land exactly as saved; nothing moves them.
        set({
          document: parsed.document,
          initialViewport: viewport,
          persistenceError: null,
          projectPath,
          projectFileName,
        });
        return;
      }
      // I9: keep the broken payload, tell the user, start fresh -- never
      // silently overwrite what might be recoverable.
      localStorage.setItem(CORRUPT_BACKUP_KEY, raw);
      set({
        document: createEmptyDocument('My canvas'),
        initialViewport: viewport,
        projectPath,
        projectFileName,
        persistenceError: `Saved canvas could not be loaded (${parsed.error}). The unreadable copy was kept under "${CORRUPT_BACKUP_KEY}".`,
      });
    },

    save: () => {
      let raw: string;
      try {
        raw = serializeDocument(get().document);
      } catch (error) {
        set({ persistenceError: `Save failed: ${(error as Error).message}` });
        return;
      }
      try {
        localStorage.setItem(STORAGE_KEY, raw);
      } catch (error) {
        set({ persistenceError: `Save failed: ${(error as Error).message}` });
      }
      // The bound project file receives every auto-save too -- the file IS
      // the project; browser storage is just the crash-safe working copy.
      const path = get().projectPath;
      if (path !== null && projectIO.isTauri()) {
        void projectIO.writeProjectFile(path, raw).catch((error: unknown) => {
          set({
            persistenceError: `Could not write "${path}": ${(error as Error).message}`,
          });
        });
      }
    },

    dismissError: () => set({ persistenceError: null }),
    dismissToast: () => set({ toast: null }),

    setSettings: (partial) => {
      const settings = { ...get().settings, ...partial };
      set({ settings });
      try {
        // v:2 marks post-migration saves -- an explicit Always sticks
        localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...settings, v: 2 }));
      } catch {
        // preferences only
      }
    },

    // ---- File-per-project persistence (Chunk 18) ------------------------
    // adopt() is the one door for swapping the whole canvas (New/Open): it
    // stashes the outgoing document with an Undo toast, rebinds the project
    // path, and writes through immediately -- no debounce window in which a
    // crash could lose the swap.

    newProject: () => {
      adopt(createEmptyDocument('My canvas'), {
        path: null,
        fileName: null,
        toastMessage: 'Started a new canvas',
      });
    },

    openProject: async () => {
      const picked = await projectIO.pickProjectFile();
      if (!picked) return;
      const parsed = loadDocument(picked.raw);
      if (!parsed.ok) {
        set({
          persistenceError: `Could not open "${picked.fileName}": ${parsed.error}`,
        });
        return;
      }
      let migrationNote = '';
      if (parsed.migrated) {
        try {
          const backupLocation = await projectIO.writePreMigrationBackup(
            picked.path,
            picked.raw,
            parsed.fromVersion,
          );
          migrationNote = ` (upgraded from schema v${parsed.fromVersion}; original kept at ${backupLocation})`;
        } catch (error) {
          // No backup, no migration-overwrite: leave the file unbound so
          // nothing auto-saves over the original (I9).
          set({
            persistenceError: `Could not back up "${picked.fileName}" before upgrading it: ${(error as Error).message}. The file was NOT opened.`,
          });
          return;
        }
      }
      adopt(parsed.document, {
        path: picked.path,
        fileName: picked.fileName,
        toastMessage: `Opened "${picked.fileName}"${migrationNote}`,
      });
    },

    loadTemplate: (doc: CanvasDocument, title: string) => {
      adopt(doc, {
        path: null,
        fileName: title,
        toastMessage: `Loaded template: ${title}`,
      });
    },

    openRecentProject: async (path: string) => {
      if (!projectIO.isTauri()) return;
      try {
        const { readTextFile } = await import('@tauri-apps/plugin-fs');
        const raw = await readTextFile(path);
        const fileName = path.split(/[\\/]/).pop() || path;
        
        const parsed = loadDocument(raw);
        if (!parsed.ok) {
          set({ persistenceError: `Could not open "${fileName}": ${parsed.error}` });
          return;
        }
        
        adopt(parsed.document, {
          path,
          fileName,
          toastMessage: `Opened "${fileName}"`,
        });
      } catch (err) {
        set({ persistenceError: `Could not read file at ${path}: ${(err as Error).message}` });
      }
    },

    saveProject: async () => {
      const path = get().projectPath;
      if (path === null || !projectIO.isTauri()) {
        await get().saveProjectAs();
        return;
      }
      get().save();
      set({ toast: { message: `Saved "${get().projectFileName ?? path}"` } });
    },

    saveProjectAs: async () => {
      let raw: string;
      try {
        raw = serializeDocument(get().document);
      } catch (error) {
        set({ persistenceError: `Save failed: ${(error as Error).message}` });
        return;
      }
      const suggested = `${exportFileStem(get().document.name)}.${PROJECT_EXTENSION}`;
      if (!projectIO.isTauri()) {
        projectIO.downloadFile(suggested, raw);
        set({
          toast: {
            message: 'Downloaded a copy. The browser keeps working from local storage.',
          },
        });
        return;
      }
      const path = await projectIO.pickSavePath(suggested);
      if (path === null) return;
      try {
        await projectIO.writeProjectFile(path, raw);
      } catch (error) {
        set({ persistenceError: `Could not write "${path}": ${(error as Error).message}` });
        return;
      }
      const fileName = path.split(/[\\/]/).pop() ?? path;
      set({ projectPath: path, projectFileName: fileName });
      try {
        localStorage.setItem(PROJECT_PATH_KEY, path);
      } catch {
        // rebinding on next boot is a convenience, not user data
      }
      set({ toast: { message: `Saved "${fileName}" -- it stays in sync as you work` } });
    },

    exportNode: async (nodeId, format) => {
      const doc = get().document;
      const { markdown, title } = exportMarkdown(doc, nodeId);
      const contents = format === 'markdown' ? markdown : exportPlainText(doc, nodeId);
      const extension = format === 'markdown' ? 'md' : 'txt';
      const fileName = `${exportFileStem(title)}.${extension}`;
      if (!projectIO.isTauri()) {
        projectIO.downloadFile(fileName, contents, 'text/plain;charset=utf-8');
        set({ toast: { message: `Exported "${fileName}"` } });
        return;
      }
      const path = await projectIO.pickSavePath(fileName);
      if (path === null) return;
      try {
        await projectIO.writeProjectFile(path, contents);
        set({ toast: { message: `Exported "${path.split(/[\\/]/).pop()}"` } });
      } catch (error) {
        set({ persistenceError: `Export failed: ${(error as Error).message}` });
      }
    },

    exportCanvasImage: async (format) => {
      // Disable visibility culling so off-screen nodes render, give React a
      // frame to mount them, capture, then restore -- the flag round-trips
      // even if rendering throws.
      set({ exportingCanvas: true });
      try {
        await new Promise((resolve) => setTimeout(resolve, 50));
        const image = await renderCanvasImage(get().document, format);
        if (image === null) {
          set({ toast: { message: 'Nothing on the canvas to export yet' } });
          return;
        }
        const stem = exportFileStem(get().document.name);
        const fileName = `${stem}.${format}`;
        if (!projectIO.isTauri()) {
          const anchor = document.createElement('a');
          anchor.href = image.dataUrl;
          anchor.download = fileName;
          anchor.click();
          set({ toast: { message: `Exported "${fileName}"` } });
          return;
        }
        const path = await projectIO.pickSavePath(fileName);
        if (path === null) return;
        if (format === 'svg') {
          const svgText = decodeURIComponent(image.dataUrl.slice(image.dataUrl.indexOf(',') + 1));
          await projectIO.writeProjectFile(path, svgText);
        } else {
          const { writeFile } = await import('@tauri-apps/plugin-fs');
          const base64 = image.dataUrl.slice(image.dataUrl.indexOf(',') + 1);
          const binary = atob(base64);
          const bytes = new Uint8Array(binary.length);
          for (let index = 0; index < binary.length; index++) {
            bytes[index] = binary.charCodeAt(index);
          }
          await writeFile(path, bytes);
        }
        set({ toast: { message: `Exported "${path.split(/[\\/]/).pop()}"` } });
      } catch (error) {
        set({ persistenceError: `Canvas export failed: ${(error as Error).message}` });
      } finally {
        set({ exportingCanvas: false });
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

    toggleNodeFlipped: (nodeId) => {
      const doc = get().document;
      commit({
        ...doc,
        nodes: doc.nodes.map((node) => {
          if (node.id !== nodeId) return node;
          if (node.data['flipped'] === true) {
            const { flipped: _dropped, ...data } = node.data;
            return { ...node, data };
          }
          return { ...node, data: { ...node.data, flipped: true } };
        }),
      });
    },

    connectCandidates: null,
    setConnectCandidates: (candidates) => set({ connectCandidates: candidates }),

    wireFilter: null,
    setWireFilter: (kinds) => set({ wireFilter: kinds }),
    filterPinned: false,
    setFilterPinned: (pinned) => set({ filterPinned: pinned }),

    toggleNodeCollapsed: (nodeId) => {
      const doc = get().document;
      commit({
        ...doc,
        nodes: doc.nodes.map((node) => {
          if (node.id !== nodeId) return node;
          if (node.data['collapsed'] === 'collapsed') {
            const { collapsed: _dropped, ...data } = node.data;
            return { ...node, data };
          }
          return { ...node, data: { ...node.data, collapsed: 'collapsed' } };
        }),
      });
    },

    setAllCollapsed: (collapsed) => {
      const doc = get().document;
      commit({
        ...doc,
        nodes: doc.nodes.map((node) => {
          if (collapsed) {
            return node.data['collapsed'] === 'collapsed'
              ? node
              : { ...node, data: { ...node.data, collapsed: 'collapsed' } };
          }
          if (node.data['collapsed'] === undefined) return node;
          const { collapsed: _dropped, ...data } = node.data;
          return { ...node, data };
        }),
      });
    },

    zoomBorrow: false,
    setZoomBorrow: (on) => {
      if (get().zoomBorrow !== on) set({ zoomBorrow: on });
    },

    recordMeasuredHeight: (nodeId, height) => {
      const doc = get().document;
      const node = doc.nodes.find((candidate) => candidate.id === nodeId);
      if (!node) return;
      const def = getNodeDef(node.type);
      if (def?.sizing !== 'auto-height') return;
      // A user-dragged height is a FLOOR, not a lock (user decision
      // 2026-08-12, question 2: "grow even if touched"). The card measures
      // at least that tall because min-height holds it there, so recording
      // what was measured respects the drag AND lets content grow past it.
      const floor = typeof node.data['ownedHeight'] === 'number' ? node.data['ownedHeight'] : 0;
      const rounded = Math.max(Math.round(height), floor, 60);
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

      // The universal path (user decision 2026-08-12, question 1: "infer
      // it"). A drag between two plates used to mean only "these are
      // related". Now the app READS it: a Person onto a Chapter is cast, a
      // Place is the setting, a Note into a Document is a section of it.
      // The reading is announced, because an inference the user cannot see
      // is indistinguishable from a bug -- and Ctrl+Z takes it back.
      const inferred = inferConnection(doc, source, target);
      if (inferred) {
        const role = describeInference(doc, inferred);
        tryOp(() =>
          addWire(doc, {
            source: inferred.source,
            sourcePort: inferred.sourcePort,
            target: inferred.target,
            targetPort: inferred.targetPort,
          }),
        );
        const targetTitle = doc.nodes.find((node) => node.id === inferred.target)?.data['title'];
        const named = typeof targetTitle === 'string' && targetTitle.trim() !== ''
          ? ` of ${targetTitle.trim()}`
          : '';
        set({ toast: { message: `Connected as ${role}${named}` } });
        return;
      }

      // No typed reading exists, so it stays a plain relationship line --
      // always legal, zero setup (I1).
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

    splitWithConfig: (nodeId, config) => {
      const doc = get().document;
      const label = getNodeDef(config.type)?.labels.universal ?? config.type;
      const titles =
        config.titleMode === 'paste'
          ? (config.pastedTitles ?? []).map((title) => title.trim()).filter((title) => title !== '')
          : Array.from({ length: Math.max(1, config.count) }, (_, index) =>
              config.titleMode === 'numbered'
                ? `${label} ${String(index + 1).padStart(2, '0')}`
                : '',
            );
      if (titles.length === 0) {
        set({ toast: { message: 'Nothing to split into — give it at least one title' } });
        return;
      }
      tryOp(
        () =>
          splitNodeOp(
            doc,
            nodeId,
            titles.map((title) => ({ type: config.type, title })),
            { wireBack: config.wireBack, keepText: config.keepText },
          ).document,
      );
    },

    customPresets: loadCustomPresets(),
    saveCustomPreset: (label, config) => {
      const next = [
        ...get().customPresets,
        { id: `custom_${Date.now().toString(36)}`, label, config },
      ];
      set({ customPresets: next });
      try {
        localStorage.setItem(CUSTOM_PRESETS_KEY, JSON.stringify(next));
      } catch {
        // preset prefs, not user data
      }
    },

    mergeSelection: (targetId, otherIds) => {
      const doc = get().document;
      const target = doc.nodes.find((node) => node.id === targetId);
      tryOp(() => mergeNodes(doc, targetId, otherIds).document);
      if (target) {
        const title = typeof target.data.title === 'string' && target.data.title !== ''
          ? target.data.title
          : 'the first selected node';
        set({ toast: { message: `${otherIds.length + 1} nodes folded into ${title}` } });
      }
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
    openNodeId: null,
    setOpenNode: (nodeId) => set({ openNodeId: nodeId }),

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

    extractBrainstormTopic: (nodeId, topic) => {
      const doc = get().document;
      const docNode = doc.nodes.find((candidate) => candidate.id === nodeId);
      const def = getNodeDef(topic.type);
      if (!docNode || !def) {
        set({ toast: { message: `Cannot extract into unknown type "${topic.type}"` } });
        return;
      }
      
      const size = def.size ?? { width: 300, height: 220 };
      const desired = {
        x: docNode.position.x + (docNode.size?.width ?? 500) + 140,
        y: docNode.position.y,
      };
      const position = findFreePosition(doc.nodes.map(nodeRect), desired, size);
      const node = spawnNode(topic.type, position);
      
      node.data = { ...node.data, title: topic.title, content: topic.content };
      
      tryOp(() => {
        let next = addNode(doc, node);
        // wire it back to the brainstorm node's generic ideas-out port
        next = addWire(next, {
          source: nodeId,
          sourcePort: 'ideas-out',
          target: node.id,
          targetPort: def.ports.find((p) => p.direction === 'take')?.id ?? 'notes-in',
        });
        
        // delete topic from master node
        const topics = (docNode.data.topics as any[]) || [];
        next = {
          ...next,
          nodes: next.nodes.map((n) =>
            n.id === nodeId
              ? { ...n, data: { ...n.data, topics: topics.filter((t) => t.id !== topic.id) } }
              : n
          ),
        };
        return next;
      });
    },

    saveTemplate: (nodeIds, name, description) => {
      const doc = get().document;
      
      const nodes = doc.nodes.filter(n => nodeIds.includes(n.id));
      const edges = doc.edges.filter(e => nodeIds.includes(e.source) && nodeIds.includes(e.target));
      const wires = doc.wires.filter(w => nodeIds.includes(w.source) && nodeIds.includes(w.target));
      
      if (nodes.length === 0) {
        set({ toast: { message: 'No nodes selected to save as template.' } });
        return;
      }

      const template = {
        id: createId('tpl'),
        name,
        // description is optional in the schema: an explicit undefined is
        // not assignable under exactOptionalPropertyTypes
        ...(description ? { description } : {}),
        nodes,
        edges,
        wires,
      };

      tryOp(() => {
        const templates = [...(doc.templates ?? []), template];
        return { ...doc, templates };
      });
      set({ toast: { message: `Template "${name}" saved.` } });
    },

    spawnTemplate: (templateId, position) => {
      const doc = get().document;
      const template = doc.templates?.find(t => t.id === templateId);
      if (!template) return;
      if (template.nodes.length === 0) return;
      
      const idMap = new Map<string, string>();
      // anchor on the template's TOP-LEFT corner, not on nodes[0] -- the
      // first node in the array is rarely the top-left one, and using it
      // would drop the copy at a surprising offset from the cursor
      const origin = {
        x: Math.min(...template.nodes.map((node) => node.position.x)),
        y: Math.min(...template.nodes.map((node) => node.position.y)),
      };

      const newNodes = template.nodes.map((node) => {
        const newId = createId('node');
        idMap.set(node.id, newId);
        return {
          ...node,
          id: newId,
          position: {
            x: position.x + (node.position.x - origin.x),
            y: position.y + (node.position.y - origin.y),
          },
        };
      });

      const newEdges = template.edges.map((edge) => ({
        ...edge,
        id: createId('edge'),
        source: idMap.get(edge.source)!,
        target: idMap.get(edge.target)!,
      }));

      const newWires = template.wires.map((wire) => ({
        ...wire,
        id: createId('wire'),
        source: idMap.get(wire.source)!,
        target: idMap.get(wire.target)!,
      }));
      
      tryOp(() => {
        return {
          ...doc,
          nodes: [...doc.nodes, ...newNodes],
          edges: [...doc.edges, ...newEdges],
          wires: [...doc.wires, ...newWires],
        };
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

    setNodeField: (nodeId, field, value) => {
      const doc = get().document;
      commit({
        ...doc,
        nodes: doc.nodes.map((node) => {
          if (node.id !== nodeId) return node;
          return { ...node, data: { ...node.data, [field]: value } };
        }),
      });
    },

    addCustomField: (nodeId, field) => {
      const doc = get().document;
      commit({
        ...doc,
        nodes: doc.nodes.map((node) => {
          if (node.id !== nodeId) return node;
          const fields = node.data.fields || [];
          return { ...node, data: { ...node.data, fields: [...fields, field] } };
        }),
      });
    },

    updateCustomField: (nodeId, fieldId, value) => {
      const doc = get().document;
      commit({
        ...doc,
        nodes: doc.nodes.map((node) => {
          if (node.id !== nodeId) return node;
          const fields = node.data.fields || [];
          return { 
            ...node, 
            data: { 
              ...node.data, 
              fields: fields.map(f => f.id === fieldId ? { ...f, value } : f) 
            } 
          };
        }),
      });
    },

    removeCustomField: (nodeId, fieldId) => {
      const doc = get().document;
      commit({
        ...doc,
        nodes: doc.nodes.map((node) => {
          if (node.id !== nodeId) return node;
          const fields = node.data.fields || [];
          return { 
            ...node, 
            data: { 
              ...node.data, 
              fields: fields.filter(f => f.id !== fieldId) 
            } 
          };
        }),
      });
    },

    extractNodeText: (nodeId, parts, type) => {
      const state = get();
      const doc = state.document;
      const sourceNode = doc.nodes.find(n => n.id === nodeId);
      if (!sourceNode) return;

      const position = findFreePosition(
        doc.nodes.map(nodeRect), 
        { x: sourceNode.position.x + 350, y: sourceNode.position.y }, 
        { width: 300, height: 200 }
      );
      
      const newNode = spawnNode(type || sourceNode.type || 'note', position);
      newNode.data.content = parts.extracted;

      let nextDoc = doc;
      try {
        nextDoc = addNode(nextDoc, newNode);
        nextDoc = {
          ...nextDoc,
          nodes: nextDoc.nodes.map((n) =>
            n.id === nodeId ? { ...n, data: { ...n.data, content: parts.remaining } } : n
          ),
        };
        nextDoc = addWire(nextDoc, {
          source: sourceNode.id,
          sourcePort: 'out',
          target: newNode.id,
          targetPort: 'in',
        });
        commit(nextDoc);
      } catch (err) {
        set({ toast: { message: `Extraction failed: ${err instanceof Error ? err.message : String(err)}` } });
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
