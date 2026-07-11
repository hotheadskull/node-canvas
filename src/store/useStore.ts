import { create } from 'zustand';
import {
  Connection,
  Edge,
  EdgeChange,
  Node,
  NodeChange,
  addEdge,
  OnNodesChange,
  OnEdgesChange,
  OnConnect,
  applyNodeChanges,
  applyEdgeChanges,
  reconnectEdge,
} from '@xyflow/react';
import { initDb } from '../db';
import { nodes as nodesTable, edges as edgesTable, projects as projectsTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { DEFAULT_EDGE_TYPE, EDGE_TYPES } from '../utils/edgeTypes';
import { nodeSpawnConfig } from '../nodes/registry';

// Style for a node loaded from the DB: stored size wins, otherwise the
// registry default for its type (so old nodes pick up new defaults), plus
// the type's z-order (groups behind, alias pins in front).
// React Flow requires parent nodes to appear BEFORE their children in the
// nodes array. DB rows come back in insertion order, and a group is usually
// created AFTER the nodes that get dropped into it -- without this sort,
// nesting breaks on every reload (children ignore their group or render at
// the wrong coordinates).
const sortParentsFirst = <T extends { id: string; parentId?: string }>(list: T[]): T[] => {
  const byId = new Map(list.map(n => [n.id, n]));
  const placed = new Set<string>();
  const out: T[] = [];
  const place = (n: T) => {
    if (placed.has(n.id)) return;
    placed.add(n.id); // mark before recursing so a corrupt cycle can't loop
    const parent = n.parentId ? byId.get(n.parentId) : undefined;
    if (parent) place(parent);
    out.push(n);
  };
  list.forEach(place);
  return out;
};

// A restored node can point at a parent that is still in the trash. React
// Flow cannot render a child whose parent is absent, so detach it and convert
// its parent-relative coords to absolute by walking the parent chain through
// ALL rows we have (trashed parents included).
const resolveDanglingParents = (allRows: any[], activeRows: any[]): any[] => {
  const byId = new Map(allRows.map((r: any) => [r.id, r]));
  const activeIds = new Set(activeRows.map((r: any) => r.id));
  return activeRows.map((r: any) => {
    if (!r.parent_id || activeIds.has(r.parent_id)) return r;
    let x = r.x_position, y = r.y_position;
    let pid: string | null = r.parent_id;
    let guard = 0;
    while (pid && !activeIds.has(pid) && guard++ < 20) {
      const p = byId.get(pid);
      if (!p) { pid = null; break; }
      x += p.x_position; y += p.y_position;
      pid = p.parent_id;
    }
    return { ...r, parent_id: pid && activeIds.has(pid) ? pid : null, x_position: x, y_position: y };
  });
};

const loadedNodeStyle = (n: any) => {
  const spawn = nodeSpawnConfig(n.node_type);
  return {
    // Stored size wins (dimension column, then legacy metadata from the
    // auto-layout feature), otherwise the registry default for the type
    width: n.width ?? n.metadata?.width ?? spawn.width,
    height: n.height ?? n.metadata?.height ?? spawn.height,
    zIndex: spawn.zIndex,
  };
};

export type AppNode = Node & {
  data: { label: string; content?: string; manuscript?: string; notes?: string; metadata?: any; updated_at?: number };
};

export type Project = {
  id: string;
  title: string;
  updated_at?: number;
  deleted_at?: number;
  snapshot_of?: string;
};

// A reversible canvas action. Text edits are NOT tracked here -- TipTap's own
// history handles Ctrl+Z inside editors. This stack covers canvas operations
// (moves, adds, deletes, connections); undo/redo re-run the normal persisting
// actions so the DB stays in sync automatically.
export type HistoryEntry = {
  undo: () => void | Promise<void>;
  redo: () => void | Promise<void>;
};

export type AppState = {
  projects: Project[];
  activeProjectId: string | null;
  mode: 'universal' | 'novel' | 'sermon';
  nodes: AppNode[];
  trashedNodes: AppNode[];
  edges: Edge[];
  isLoading: boolean;
  error: string | null;
  saveError: string | null;
  clearSaveError: () => void;
  reportSaveError: (action: string, e: unknown) => void;
  pendingSaves: number;
  lastSavedAt: number | null;
  beginSave: () => void;
  endSave: () => void;
  focusedNodeId: string | null;
  setFocusedNode: (id: string | null) => void;
  canUndo: boolean;
  canRedo: boolean;
  pushHistory: (entry: HistoryEntry) => void;
  undo: () => Promise<void>;
  redo: () => Promise<void>;
  setNodePosition: (id: string, pos: { x: number; y: number }) => Promise<void>;
  setAnchor: (id: string | null) => Promise<void>;
  restoreEdge: (edge: Edge) => Promise<void>;
  linkNodes: (sourceId: string, targetId: string) => Promise<void>;
  updateEdgeLabel: (edgeId: string, label: string) => Promise<void>;
  updateEdgeType: (edgeId: string, edgeType: string) => Promise<void>;
  previewMarkdown: string | null;
  setPreviewMarkdown: (md: string | null) => void;
  onNodesChange: OnNodesChange<AppNode>;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
  onReconnect: (oldEdge: Edge, newConnection: Connection) => void;
  loadInitialData: () => Promise<void>;
  setActiveProject: (id: string) => Promise<void>;
  createProject: (title: string) => Promise<void>;
  renameProject: (id: string, title: string) => Promise<void>;
  addNode: (node: AppNode) => Promise<void>;
  updateNodeData: (id: string, data: Partial<AppNode['data']>) => Promise<void>;
  linkExistingMentionsOf: (targetId: string) => Promise<void>;
  updateNodeType: (id: string, type: string) => Promise<void>;
  updateNodeParent: (id: string, parentId: string | null) => Promise<void>;
  deleteNode: (id: string) => Promise<void>;
  restoreNode: (id: string) => Promise<void>;
  duplicateNode: (id: string) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  restoreProject: (id: string) => Promise<void>;
  createSnapshot: () => Promise<void>;
  exportProjectJSON: () => Promise<string>;
  importProjectJSON: (jsonString: string) => Promise<void>;
  applyLayout: (layoutedNodes: AppNode[]) => Promise<void>;
};

// Position saves and content saves get separate timer namespaces -- sharing one
// map keyed by node id meant a drag could cancel a pending content save.
const updateTimeouts: Record<string, ReturnType<typeof setTimeout>> = {};
const contentTimeouts: Record<string, ReturnType<typeof setTimeout>> = {};
// Renaming a node / editing its aliases triggers a debounced re-scan of
// OTHER nodes' text for the new names (the forward spiderweb only fires when
// the mentioning document itself is edited).
const reverseScanTimeouts: Record<string, ReturnType<typeof setTimeout>> = {};

const undoStack: HistoryEntry[] = [];
const redoStack: HistoryEntry[] = [];
const HISTORY_LIMIT = 100;
// Suppresses pushHistory while an undo/redo is re-running store actions,
// otherwise every undo would push itself back onto the stack.
let isTimeTraveling = false;

// Node titles are used to build auto-link regexes; escape them so titles
// containing regex metacharacters (e.g. "Dr. Who (Clone)") don't throw.
const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const useStore = create<AppState>((set, get) => ({
  projects: [],
  activeProjectId: null,
  mode: 'universal',
  nodes: [],
  edges: [],
  trashedNodes: [],
  isLoading: true,
  error: null,
  saveError: null,
  clearSaveError: () => set({ saveError: null }),
  reportSaveError: (action: string, e: unknown) => {
    console.error(`Failed to ${action}:`, e);
    const msg = e instanceof Error ? e.message : String(e);
    set({ saveError: `Failed to ${action}: ${msg}` });
  },
  pendingSaves: 0,
  lastSavedAt: null,
  beginSave: () => set(s => ({ pendingSaves: s.pendingSaves + 1 })),
  endSave: () => set(s => ({ pendingSaves: Math.max(0, s.pendingSaves - 1), lastSavedAt: Date.now() })),
  focusedNodeId: null,
  setFocusedNode: (id: string | null) => set({ focusedNodeId: id }),
  canUndo: false,
  canRedo: false,

  pushHistory: (entry: HistoryEntry) => {
    if (isTimeTraveling) return;
    undoStack.push(entry);
    if (undoStack.length > HISTORY_LIMIT) undoStack.shift();
    redoStack.length = 0;
    set({ canUndo: true, canRedo: false });
  },

  undo: async () => {
    const entry = undoStack.pop();
    if (!entry) return;
    isTimeTraveling = true;
    try {
      await entry.undo();
      redoStack.push(entry);
    } catch (e) {
      get().reportSaveError('undo', e);
    } finally {
      isTimeTraveling = false;
      set({ canUndo: undoStack.length > 0, canRedo: redoStack.length > 0 });
    }
  },

  redo: async () => {
    const entry = redoStack.pop();
    if (!entry) return;
    isTimeTraveling = true;
    try {
      await entry.redo();
      undoStack.push(entry);
    } catch (e) {
      get().reportSaveError('redo', e);
    } finally {
      isTimeTraveling = false;
      set({ canUndo: undoStack.length > 0, canRedo: redoStack.length > 0 });
    }
  },

  previewMarkdown: null,
  setPreviewMarkdown: (md: string | null) => set({ previewMarkdown: md }),

  onNodesChange: (changes: NodeChange<AppNode>[]) => {
    const prevNodes = get().nodes;
    // Capture removed nodes before applying changes so they land in the trash,
    // whether removal came from our UI or React Flow's keyboard delete.
    const removedNodes = changes
      .filter(c => c.type === 'remove')
      .map(c => prevNodes.find(n => n.id === (c as { id: string }).id))
      .filter((n): n is AppNode => !!n);

    set({
      nodes: applyNodeChanges(changes, prevNodes),
      ...(removedNodes.length > 0
        ? { trashedNodes: [...get().trashedNodes, ...removedNodes] }
        : {}),
    });

    if (removedNodes.length > 0) {
      get().pushHistory({
        undo: async () => {
          for (const n of removedNodes) await get().restoreNode(n.id);
        },
        redo: () => get().onNodesChange(removedNodes.map(n => ({ type: 'remove' as const, id: n.id }))),
      });
      // Surface every trashing as a toast with a Restore button -- deletes
      // (including deck absorption and the Delete key) must never be silent.
      // Suppressed during undo/redo replays: the user asked for those.
      if (!isTimeTraveling) {
        for (const n of removedNodes) {
          window.dispatchEvent(new CustomEvent('node-trashed', {
            detail: { id: n.id, label: n.data?.label || 'Untitled', type: n.type },
          }));
        }
      }
    }

    changes.forEach(async (change) => {
      if (change.type === 'position' && change.position) {
        // Debounce position writes to avoid IPC flooding while dragging
        if (updateTimeouts[change.id]) clearTimeout(updateTimeouts[change.id]);
        else get().beginSave();
        updateTimeouts[change.id] = setTimeout(async () => {
          delete updateTimeouts[change.id];
          try {
            const { db } = await initDb();
            // Read the CURRENT position at flush time, not the drag payload:
            // dropping into/out of a group during the debounce window
            // rewrites position to parent-relative coords, and saving the
            // stale absolute payload would clobber that in the DB.
            const current = get().nodes.find(n => n.id === change.id);
            const pos = current?.position ?? change.position!;
            await db.update(nodesTable)
              .set({ x_position: pos.x, y_position: pos.y })
              .where(eq(nodesTable.id, change.id));
          } catch (e) {
            get().reportSaveError('save node position', e);
          } finally {
            get().endSave();
          }
        }, 500);
      } else if (change.type === 'dimensions' && change.dimensions) {
        // Persist resizes (debounced like positions -- the resizer emits a
        // stream of dimension changes while dragging)
        const key = `size:${change.id}`;
        const dims = change.dimensions;
        if (updateTimeouts[key]) clearTimeout(updateTimeouts[key]);
        else get().beginSave();
        updateTimeouts[key] = setTimeout(async () => {
          delete updateTimeouts[key];
          try {
            const { db } = await initDb();
            await db.update(nodesTable)
              .set({ width: dims.width, height: dims.height })
              .where(eq(nodesTable.id, change.id));
          } catch (e) {
            get().reportSaveError('save node size', e);
          } finally {
            get().endSave();
          }
        }, 500);
      } else if (change.type === 'remove') {
        get().beginSave();
        try {
          const { db } = await initDb();
          await db.update(nodesTable).set({ deleted_at: Date.now() }).where(eq(nodesTable.id, change.id));
        } catch (e) {
          get().reportSaveError('move node to trash', e);
        } finally {
          get().endSave();
        }
      }
    });
  },

  onEdgesChange: (changes: EdgeChange[]) => {
    const prevEdges = get().edges;
    const removedEdges = changes
      .filter(c => c.type === 'remove')
      .map(c => prevEdges.find(e => e.id === (c as { id: string }).id))
      .filter((e): e is Edge => !!e);

    set({
      edges: applyEdgeChanges(changes, prevEdges),
    });

    if (removedEdges.length > 0) {
      get().pushHistory({
        undo: async () => {
          for (const e of removedEdges) await get().restoreEdge(e);
        },
        redo: () => get().onEdgesChange(removedEdges.map(e => ({ type: 'remove' as const, id: e.id }))),
      });
    }

    // Handle edge removals
    changes.forEach(async (change) => {
      if (change.type === 'remove') {
        get().beginSave();
        try {
          const { db } = await initDb();
          await db.delete(edgesTable).where(eq(edgesTable.id, change.id));
        } catch (e) {
          get().reportSaveError('delete connection', e);
        } finally {
          get().endSave();
        }
      }
    });
  },

  onConnect: async (connection: Connection) => {
    // Self-loops break the elastic edge geometry (zero-length vector), and
    // duplicate connections would just stack invisibly.
    if (connection.source === connection.target) return;
    // Handles are part of identity: beat-1 -> hero and beat-2 -> hero are
    // DIFFERENT connections (sequence beats and compile slots share a node id)
    const alreadyConnected = get().edges.some(
      e => e.source === connection.source && e.target === connection.target &&
        (e.sourceHandle ?? null) === (connection.sourceHandle ?? null) &&
        (e.targetHandle ?? null) === (connection.targetHandle ?? null)
    );
    if (alreadyConnected) return;

    const edge = { ...connection, id: crypto.randomUUID(), data: { strength: 1, isNew: true } };
    set({
      edges: addEdge(edge as any, get().edges),
    });

    get().pushHistory({
      undo: () => get().onEdgesChange([{ type: 'remove', id: edge.id }]),
      redo: () => get().restoreEdge(edge as any),
    });

    get().beginSave();
    try {
      const { db } = await initDb();
      await db.insert(edgesTable).values({
        id: edge.id,
        project_id: get().activeProjectId,
        source_id: connection.source,
        target_id: connection.target,
        // Without the handles, compile-slot and sequence-beat wiring
        // reattached to default anchors on every restart
        source_handle: connection.sourceHandle || null,
        target_handle: connection.targetHandle || null,
        label: ''
      });
    } catch (e) {
      get().reportSaveError('save connection', e);
    } finally {
      get().endSave();
    }
  },

  onReconnect: async (oldEdge: Edge, newConnection: Connection) => {
    set({
      edges: reconnectEdge(oldEdge, newConnection, get().edges),
    });

    // reconnectEdge keeps the edge's id in memory, so update the same DB row
    // instead of delete+insert (which left the two ids out of sync).
    get().beginSave();
    try {
      const { db } = await initDb();
      await db.update(edgesTable)
        .set({
          source_id: newConnection.source,
          target_id: newConnection.target,
          source_handle: newConnection.sourceHandle || null,
          target_handle: newConnection.targetHandle || null,
        })
        .where(eq(edgesTable.id, oldEdge.id));
    } catch (e) {
      get().reportSaveError('save reconnected edge', e);
    } finally {
      get().endSave();
    }
  },

  setNodePosition: async (id: string, pos: { x: number; y: number }) => {
    set({ nodes: get().nodes.map(n => n.id === id ? { ...n, position: { ...pos } } : n) });
    get().beginSave();
    try {
      const { db } = await initDb();
      await db.update(nodesTable)
        .set({ x_position: pos.x, y_position: pos.y })
        .where(eq(nodesTable.id, id));
    } catch (e) {
      get().reportSaveError('save node position', e);
    } finally {
      get().endSave();
    }
  },

  // ANCHOR / BIG IDEA: exactly one node per project can be the anchor -- the
  // governing idea everything should trace back to. Pass null to clear.
  setAnchor: async (id: string | null) => {
    const prevAnchor = get().nodes.find(n => (n.data as any).metadata?.isAnchor);
    if (prevAnchor?.id === id) id = null; // toggling the current anchor clears it

    set({
      nodes: get().nodes.map(n => {
        const isAnchor = n.id === id;
        const wasAnchor = !!(n.data as any).metadata?.isAnchor;
        if (isAnchor === wasAnchor) return n;
        return { ...n, data: { ...n.data, metadata: { ...(n.data.metadata || {}), isAnchor } } };
      })
    });

    get().beginSave();
    try {
      const { db } = await initDb();
      const changed = [prevAnchor?.id, id].filter((x): x is string => !!x);
      for (const nid of changed) {
        const node = get().nodes.find(n => n.id === nid);
        if (node) {
          await db.update(nodesTable)
            .set({ metadata: node.data.metadata || null })
            .where(eq(nodesTable.id, nid));
        }
      }
    } catch (e) {
      get().reportSaveError('save anchor', e);
    } finally {
      get().endSave();
    }
  },

  // Re-insert an edge that exists as a full object (undo of a deletion, or a
  // programmatic link). Idempotent: skips if already present.
  restoreEdge: async (edge: Edge) => {
    if (get().edges.some(e => e.id === edge.id)) return;
    set({ edges: [...get().edges, edge] });
    get().beginSave();
    try {
      const { db } = await initDb();
      await db.insert(edgesTable).values({
        id: edge.id,
        project_id: get().activeProjectId,
        source_id: edge.source,
        target_id: edge.target,
        source_handle: edge.sourceHandle || null,
        target_handle: edge.targetHandle || null,
        label: (edge.label as string) || '',
        strength: (edge.data as any)?.strength || 1,
        edge_type: (edge.data as any)?.edgeType || DEFAULT_EDGE_TYPE,
      }).onConflictDoNothing();
    } catch (e) {
      get().reportSaveError('restore connection', e);
    } finally {
      get().endSave();
    }
  },

  // Create a link between two nodes (used by @-mentions in the editor).
  linkNodes: async (sourceId: string, targetId: string) => {
    if (sourceId === targetId) return;
    if (get().edges.some(e => e.source === sourceId && e.target === targetId)) return;
    const edge = {
      id: crypto.randomUUID(),
      source: sourceId,
      target: targetId,
      sourceHandle: 'bottom',
      targetHandle: 'top',
      type: 'elastic',
      animated: true,
      data: { strength: 1 },
      style: { stroke: '#fbbf24', strokeWidth: 2 },
    } as unknown as Edge;
    await get().restoreEdge(edge);
    get().pushHistory({
      undo: () => get().onEdgesChange([{ type: 'remove', id: edge.id }]),
      redo: () => get().restoreEdge(edge),
    });
  },

  updateEdgeLabel: async (edgeId: string, label: string) => {
    const existing = get().edges.find(e => e.id === edgeId);
    if (!existing) return;
    const oldLabel = (existing.label as string) || '';
    if (oldLabel === label) return;

    set({ edges: get().edges.map(e => e.id === edgeId ? { ...e, label: label || undefined } : e) });
    get().pushHistory({
      undo: () => get().updateEdgeLabel(edgeId, oldLabel),
      redo: () => get().updateEdgeLabel(edgeId, label),
    });

    get().beginSave();
    try {
      const { db } = await initDb();
      await db.update(edgesTable).set({ label }).where(eq(edgesTable.id, edgeId));
    } catch (e) {
      get().reportSaveError('save connection name', e);
    } finally {
      get().endSave();
    }
  },

  updateEdgeType: async (edgeId: string, edgeType: string) => {
    if (!EDGE_TYPES[edgeType]) return;
    const existing = get().edges.find(e => e.id === edgeId);
    if (!existing) return;
    const oldType = (existing.data as any)?.edgeType || DEFAULT_EDGE_TYPE;
    if (oldType === edgeType) return;

    set({
      edges: get().edges.map(e =>
        e.id === edgeId ? { ...e, data: { ...e.data, edgeType } } : e
      )
    });
    get().pushHistory({
      undo: () => get().updateEdgeType(edgeId, oldType),
      redo: () => get().updateEdgeType(edgeId, edgeType),
    });

    get().beginSave();
    try {
      const { db } = await initDb();
      await db.update(edgesTable).set({ edge_type: edgeType }).where(eq(edgesTable.id, edgeId));
    } catch (e) {
      get().reportSaveError('save connection type', e);
    } finally {
      get().endSave();
    }
  },

  addNode: async (node: AppNode) => {
    // Stamp registry spawn dimensions as FIXED width/height on every creation
    // path. min-sizes are not enough: BaseNode's h-full can't resolve against
    // a wrapper that only has min-height, so the card collapses to content
    // height while the resizer frame stays at full size.
    const spawn = nodeSpawnConfig(node.type || 'default');
    const style: any = { ...(node.style as any) };
    if (style.width == null && spawn.width != null) style.width = spawn.width;
    if (style.height == null && spawn.height != null) style.height = spawn.height;
    if (style.zIndex == null) style.zIndex = spawn.zIndex;
    node = { ...node, style };
    set({ nodes: [...get().nodes, node] });
    get().pushHistory({
      undo: () => get().deleteNode(node.id),
      redo: () => get().restoreNode(node.id),
    });
    get().beginSave();
    try {
      const { db } = await initDb();
      await db.insert(nodesTable).values({
        id: node.id,
        project_id: get().activeProjectId,
        parent_id: node.parentId || null,
        title: node.data.label,
        content: node.data.content || '',
        manuscript: node.data.manuscript || '',
        notes: node.data.notes || '',
        updated_at: Date.now(),
        x_position: node.position.x,
        y_position: node.position.y,
        width: (node.style as any)?.width ?? null,
        height: (node.style as any)?.height ?? null,
        node_type: node.type || 'default'
      });
    } catch (e) {
      get().reportSaveError('save new node', e);
    } finally {
      get().endSave();
    }
  },

  updateNodeData: async (id: string, data: Partial<AppNode['data']>) => {
    const prevNode = get().nodes.find(n => n.id === id);

    // 1. Update the local state for the node
    set({
      nodes: get().nodes.map(n => n.id === id ? { ...n, data: { ...n.data, ...data, updated_at: Date.now() } } : n)
    });

    // Renamed, or aliases changed? Re-scan existing text elsewhere for the
    // new names, so "add the alias later" still forms the web.
    const labelChanged = data.label !== undefined && data.label !== prevNode?.data.label;
    const aliasesChanged = data.metadata !== undefined &&
      String(data.metadata?.aliases ?? '') !== String(prevNode?.data.metadata?.aliases ?? '');
    if (labelChanged || aliasesChanged) {
      if (reverseScanTimeouts[id]) clearTimeout(reverseScanTimeouts[id]);
      reverseScanTimeouts[id] = setTimeout(() => {
        delete reverseScanTimeouts[id];
        get().linkExistingMentionsOf(id);
      }, 700);
    }

    // 2. SPIDERWEB AUTO-LINKING: Check if they typed another node's name.
    // Mention count doubles as link strength: the more a title appears in this
    // node's text, the thicker/brighter the edge renders.
    const newText = (data.content || data.manuscript || '').toLowerCase();
    if (newText.length > 5) {
      const allNodes = get().nodes;
      const currentEdges = get().edges;
      const newEdgesToCreate: any[] = [];
      const strengthUpdates: { id: string; strength: number }[] = [];
      // Strip HTML tags for a clean regex search
      const plainText = newText.replace(/<[^>]+>/g, '');

      allNodes.forEach(otherNode => {
        if (otherNode.id === id) return;
        // Alias pins mirror their target's title; linking to them would
        // duplicate the real connection
        if (otherNode.type === 'alias') return;
        const otherTitle = otherNode.data.label?.toLowerCase().trim();
        if (otherTitle && otherTitle.length > 2) { // Only auto-link words longer than 2 chars
          // Knowledge cards can declare aliases ("The Iron King, Aldric") --
          // the spiderweb matches those alternate names too
          const aliasNames = String((otherNode.data as any).metadata?.aliases || '')
            .split(',')
            .map(s => s.trim().toLowerCase())
            .filter(s => s.length > 2);
          const names = [otherTitle, ...aliasNames];
          let occurrences = 0;
          for (const name of names) {
            const regex = new RegExp(`\\b${escapeRegExp(name)}\\b`, 'gi');
            occurrences += (plainText.match(regex) || []).length;
          }
          if (occurrences > 0) {
            // Found a match! Check if an edge already exists in EITHER
            // direction -- a manual character->document edge must be
            // strengthened, not shadowed by a duplicate reverse edge.
            const existing = currentEdges.find(e =>
              (e.source === id && e.target === otherNode.id) ||
              (e.source === otherNode.id && e.target === id));
            if (!existing) {
              const newEdge = {
                id: crypto.randomUUID(),
                source: id,
                target: otherNode.id,
                sourceHandle: 'bottom',
                targetHandle: 'top',
                type: 'elastic',
                animated: true,
                data: { strength: occurrences },
                style: { stroke: '#fbbf24', strokeWidth: 2 }
              };
              newEdgesToCreate.push(newEdge);
            } else {
              const currentStrength = (existing.data as any)?.strength || 1;
              if (currentStrength !== occurrences) {
                strengthUpdates.push({ id: existing.id, strength: occurrences });
              }
            }
          }
        }
      });

      if (newEdgesToCreate.length > 0) {
        set({ edges: [...get().edges, ...newEdgesToCreate] });
        // Save new edges to DB asynchronously
        initDb().then(async ({ db }) => {
          for (const edge of newEdgesToCreate) {
            try {
              await db.insert(edgesTable).values({
                id: edge.id,
                project_id: get().activeProjectId,
                source_id: edge.source,
                target_id: edge.target,
                source_handle: edge.sourceHandle || null,
                target_handle: edge.targetHandle || null,
                strength: edge.data.strength,
                edge_type: edge.data.edgeType || DEFAULT_EDGE_TYPE
              });
            } catch (e) {
              get().reportSaveError('save auto-link', e);
            }
          }
        });
      }

      // Strength changes only fire when the count actually moved, so writing
      // immediately doesn't flood the DB during normal typing.
      if (strengthUpdates.length > 0) {
        set({
          edges: get().edges.map(e => {
            const u = strengthUpdates.find(s => s.id === e.id);
            return u ? { ...e, data: { ...e.data, strength: u.strength } } : e;
          })
        });
        initDb().then(async ({ db }) => {
          for (const u of strengthUpdates) {
            try {
              await db.update(edgesTable).set({ strength: u.strength }).where(eq(edgesTable.id, u.id));
            } catch (e) {
              get().reportSaveError('save link strength', e);
            }
          }
        });
      }
    }

    // Debounce DB write to prevent IPC flooding on fast typing
    if (contentTimeouts[id]) clearTimeout(contentTimeouts[id]);
    else get().beginSave();

    contentTimeouts[id] = setTimeout(async () => {
      delete contentTimeouts[id];
      try {
        const latestNode = get().nodes.find(n => n.id === id);
        if (latestNode) {
          const { db } = await initDb();
          await db.update(nodesTable).set({
            title: latestNode.data.label,
            content: latestNode.data.content || '',
            manuscript: latestNode.data.manuscript || '',
            notes: latestNode.data.notes || '',
            metadata: latestNode.data.metadata || null,
            updated_at: latestNode.data.updated_at || Date.now()
          }).where(eq(nodesTable.id, id));
        }
      } catch (e) {
        get().reportSaveError('save node content', e);
      } finally {
        get().endSave();
      }
    }, 500);
  },

  // REVERSE SPIDERWEB: scan every other node's existing text for THIS node's
  // title/aliases and create (or strengthen) doc->node links. The forward
  // spiderweb in updateNodeData only fires when the mentioning document is
  // edited, so without this, adding an alias AFTER the document was written
  // never forms the link.
  linkExistingMentionsOf: async (targetId: string) => {
    const target = get().nodes.find(n => n.id === targetId);
    if (!target || target.type === 'alias') return;

    const names = [
      String(target.data.label || ''),
      ...String((target.data as any).metadata?.aliases || '').split(','),
    ]
      .map(s => s.trim().toLowerCase())
      .filter(s => s.length > 2);
    if (names.length === 0) return;

    const currentEdges = get().edges;
    const newEdgesToCreate: any[] = [];
    const strengthUpdates: { id: string; strength: number }[] = [];

    for (const other of get().nodes) {
      if (other.id === targetId || other.type === 'alias') continue;
      // Same text source as the forward scan (content OR manuscript, never
      // both) so the two scans always agree on the mention count.
      const raw = String(other.data.content || other.data.manuscript || '');
      if (raw.length <= 5) continue;
      const plainText = raw.toLowerCase().replace(/<[^>]+>/g, '');

      let occurrences = 0;
      for (const name of names) {
        const regex = new RegExp(`\\b${escapeRegExp(name)}\\b`, 'gi');
        occurrences += (plainText.match(regex) || []).length;
      }
      if (occurrences === 0) continue;

      const existing = currentEdges.find(e =>
        (e.source === other.id && e.target === targetId) ||
        (e.source === targetId && e.target === other.id));
      if (!existing) {
        newEdgesToCreate.push({
          id: crypto.randomUUID(),
          source: other.id,
          target: targetId,
          sourceHandle: 'bottom',
          targetHandle: 'top',
          type: 'elastic',
          animated: true,
          data: { strength: occurrences },
          style: { stroke: '#fbbf24', strokeWidth: 2 }
        });
      } else if (((existing.data as any)?.strength || 1) !== occurrences) {
        strengthUpdates.push({ id: existing.id, strength: occurrences });
      }
    }

    if (newEdgesToCreate.length > 0) {
      set({ edges: [...get().edges, ...newEdgesToCreate] });
      try {
        const { db } = await initDb();
        for (const edge of newEdgesToCreate) {
          await db.insert(edgesTable).values({
            id: edge.id,
            project_id: get().activeProjectId,
            source_id: edge.source,
            target_id: edge.target,
            source_handle: edge.sourceHandle || null,
            target_handle: edge.targetHandle || null,
            strength: edge.data.strength,
            edge_type: DEFAULT_EDGE_TYPE
          });
        }
      } catch (e) {
        get().reportSaveError('save auto-link', e);
      }
    }

    if (strengthUpdates.length > 0) {
      set({
        edges: get().edges.map(e => {
          const u = strengthUpdates.find(s => s.id === e.id);
          return u ? { ...e, data: { ...e.data, strength: u.strength } } : e;
        })
      });
      try {
        const { db } = await initDb();
        for (const u of strengthUpdates) {
          await db.update(edgesTable).set({ strength: u.strength }).where(eq(edgesTable.id, u.id));
        }
      } catch (e) {
        get().reportSaveError('save link strength', e);
      }
    }
  },

  updateNodeType: async (id: string, type: string) => {
    set({
      nodes: get().nodes.map(n => n.id === id ? { ...n, type } : n)
    });
    get().beginSave();
    try {
      const { db } = await initDb();
      await db.update(nodesTable).set({ node_type: type }).where(eq(nodesTable.id, id));
    } catch (e) {
      get().reportSaveError('save node type', e);
    } finally {
      get().endSave();
    }
  },

  updateNodeParent: async (id: string, parentId: string | null) => {
    get().beginSave();
    try {
      const { db } = await initDb();
      const node = get().nodes.find(n => n.id === id);
      if (node) {
        // Persist parent AND the (parent-relative) position together. A
        // previous version used reversed column names here, which Drizzle
        // silently dropped -- the DB kept the old ABSOLUTE coords, reload
        // treated them as RELATIVE to the group, and nodes teleported.
        await db.update(nodesTable).set({
          parent_id: parentId,
          x_position: node.position.x,
          y_position: node.position.y
        }).where(eq(nodesTable.id, id));
      } else {
        await db.update(nodesTable).set({ parent_id: parentId }).where(eq(nodesTable.id, id));
      }
    } catch (e) {
      get().reportSaveError('save node grouping', e);
    } finally {
      get().endSave();
    }
  },

  deleteNode: async (id: string) => {
    // onNodesChange handles the in-memory removal (into trashedNodes), the
    // soft delete in the DB, and the undo history entry.
    get().onNodesChange([{ type: 'remove', id }]);
  },

  restoreNode: async (id: string) => {
    get().beginSave();
    try {
      const { db } = await initDb();
      await db.update(nodesTable).set({ deleted_at: null }).where(eq(nodesTable.id, id));
      // Reload active project to fetch the restored node
      await get().setActiveProject(get().activeProjectId!);
    } catch (e) {
      get().reportSaveError('restore node', e);
    } finally {
      get().endSave();
    }
  },

  deleteProject: async (id: string) => {
    set({ projects: get().projects.map(p => p.id === id ? { ...p, deleted_at: Date.now() } : p) });
    get().beginSave();
    try {
      const { db } = await initDb();
      await db.update(projectsTable).set({ deleted_at: Date.now() }).where(eq(projectsTable.id, id));
    } catch (e) {
      get().reportSaveError('move project to trash', e);
    } finally {
      get().endSave();
    }

    // Never leave the user staring at a trashed workspace: hop to another
    // living project, or start a fresh one if none remain.
    if (get().activeProjectId === id) {
      const nextProject = get().projects.find(p => p.id !== id && !p.deleted_at);
      if (nextProject) {
        await get().setActiveProject(nextProject.id);
      } else {
        await get().createProject('Main Workspace');
      }
    }
  },

  restoreProject: async (id: string) => {
    set({ projects: get().projects.map(p => p.id === id ? { ...p, deleted_at: undefined } : p) });
    get().beginSave();
    try {
      const { db } = await initDb();
      await db.update(projectsTable).set({ deleted_at: null }).where(eq(projectsTable.id, id));
    } catch (e) {
      get().reportSaveError('restore project', e);
    } finally {
      get().endSave();
    }
  },

  createSnapshot: async () => {
    const currentId = get().activeProjectId;
    if (!currentId) return;

    const newId = crypto.randomUUID();
    const currentProject = get().projects.find(p => p.id === currentId);
    const title = currentProject ? `${currentProject.title} - Snapshot` : 'Snapshot';

    try {
    const { db } = await initDb();

    // Insert new project
    await db.insert(projectsTable).values({
      id: newId,
      title,
      updated_at: Date.now(),
      snapshot_of: currentId
    });

    // Copy all nodes
    const allNodes = await db.select().from(nodesTable).where(eq(nodesTable.project_id, currentId));
    // Since IDs must be unique across the DB (or at least we want them to be), we need to map old node IDs to new ones
    const idMap = new Map<string, string>();
    for (const node of allNodes) {
      idMap.set(node.id, crypto.randomUUID());
    }

    for (const node of allNodes) {
      await db.insert(nodesTable).values({
        ...node,
        id: idMap.get(node.id)!,
        project_id: newId,
        parent_id: node.parent_id ? idMap.get(node.parent_id) : null,
      });
    }

    // Copy all edges
    const allEdges = await db.select().from(edgesTable).where(eq(edgesTable.project_id, currentId));
    for (const edge of allEdges) {
      if (idMap.has(edge.source_id) && idMap.has(edge.target_id)) {
        await db.insert(edgesTable).values({
          ...edge,
          id: crypto.randomUUID(),
          project_id: newId,
          source_id: idMap.get(edge.source_id)!,
          target_id: idMap.get(edge.target_id)!,
        });
      }
    }

    // STAY on the live workspace. Switching onto the snapshot here meant the
    // user kept writing into the frozen copy without realizing it -- the
    // snapshot is the backup, not the new working canvas.
    set({ projects: [...get().projects, { id: newId, title, updated_at: Date.now(), snapshot_of: currentId }] });
    } catch (e) {
      get().reportSaveError('create snapshot', e);
    }
  },

  duplicateNode: async (id: string) => {
    const nodeToCopy = get().nodes.find(n => n.id === id);
    if (!nodeToCopy) return;

    // Build a clean copy -- spreading the live node would drag along
    // React Flow runtime state (selected, dragging, measured)
    const newNode: AppNode = {
      id: crypto.randomUUID(),
      type: nodeToCopy.type,
      position: { x: nodeToCopy.position.x + 50, y: nodeToCopy.position.y + 50 },
      parentId: nodeToCopy.parentId,
      style: { ...(nodeToCopy.style as any) },
      data: { ...nodeToCopy.data, label: `${nodeToCopy.data.label} (Copy)` }
    };
    await get().addNode(newNode);
  },

  loadInitialData: async () => {
    try {
      const { db } = await initDb();

      const dbProjects = await db.select().from(projectsTable);

      // Never auto-select a trashed project
      const livingProjects = dbProjects.filter((p: any) => !p.deleted_at);

      let initialProjectId = localStorage.getItem('activeProjectId');
      if (livingProjects.length === 0) {
        // Create Default Project
        initialProjectId = crypto.randomUUID();
        await db.insert(projectsTable).values({
          id: initialProjectId,
          title: 'Main Workspace',
          updated_at: Date.now()
        });
        dbProjects.push({ id: initialProjectId, title: 'Main Workspace', updated_at: Date.now() });
        localStorage.setItem('activeProjectId', initialProjectId);
      } else if (!initialProjectId || !livingProjects.find((p: any) => p.id === initialProjectId)) {
        initialProjectId = livingProjects[0].id;
        localStorage.setItem('activeProjectId', initialProjectId as string);
      }

      set({ projects: dbProjects, activeProjectId: initialProjectId });

      if (!initialProjectId) return;

      // Only load non-deleted nodes for active project
      const dbNodes = await db.select().from(nodesTable).where(eq(nodesTable.project_id, initialProjectId));
      const activeNodes = resolveDanglingParents(dbNodes, dbNodes.filter((n: any) => !n.deleted_at));
      const trashedDbNodes = dbNodes.filter((n: any) => n.deleted_at);
      const dbEdges = await db.select().from(edgesTable).where(eq(edgesTable.project_id, initialProjectId));

      set({
        trashedNodes: trashedDbNodes.map((n: any) => ({
          id: n.id,
          type: n.node_type,
          position: { x: n.x_position, y: n.y_position },
          parentId: n.parent_id || undefined,
          extent: undefined, // match live nesting: children are not clamped into the group
        style: loadedNodeStyle(n),
          data: { label: n.title, content: n.content, manuscript: n.manuscript || '', notes: n.notes || '', metadata: n.metadata, updated_at: n.updated_at || Date.now() },
        })),
        nodes: sortParentsFirst(activeNodes.map((n: any) => ({
          id: n.id,
          type: n.node_type,
          position: { x: n.x_position, y: n.y_position },
          parentId: n.parent_id || undefined,
          extent: undefined, // match live nesting: children are not clamped into the group
        style: loadedNodeStyle(n),
          data: {
            label: n.title,
            content: n.content,
            manuscript: n.manuscript || '',
            notes: n.notes || '',
            metadata: n.metadata,
            updated_at: n.updated_at || Date.now()
          },
        }))),
        edges: dbEdges.map((e: any) => ({
          id: e.id,
          source: e.source_id,
          target: e.target_id,
          sourceHandle: e.source_handle || undefined,
          targetHandle: e.target_handle || undefined,
          label: e.label || undefined,
          data: { strength: e.strength || 1, edgeType: e.edge_type || DEFAULT_EDGE_TYPE },
        })),
        isLoading: false,
      });
    } catch (e: any) {
      console.error("Failed to load initial data:", e);
      set({ error: String(e), isLoading: false });
    }
  },

  setActiveProject: async (id: string) => {
    localStorage.setItem('activeProjectId', id);
    set({ isLoading: true, nodes: [], edges: [], activeProjectId: id });
    const { db } = await initDb();
    const dbNodes = await db.select().from(nodesTable).where(eq(nodesTable.project_id, id));
    const activeNodes = resolveDanglingParents(dbNodes, dbNodes.filter((n: any) => !n.deleted_at));
    const trashedDbNodes = dbNodes.filter((n: any) => n.deleted_at);
    const dbEdges = await db.select().from(edgesTable).where(eq(edgesTable.project_id, id));

    set({
      trashedNodes: trashedDbNodes.map((n: any) => ({
        id: n.id,
        type: n.node_type,
        position: { x: n.x_position, y: n.y_position },
        parentId: n.parent_id || undefined,
        extent: undefined, // match live nesting: children are not clamped into the group
        style: loadedNodeStyle(n),
        data: { label: n.title, content: n.content, manuscript: n.manuscript || '', notes: n.notes || '', metadata: n.metadata, updated_at: n.updated_at || Date.now() },
      })),
      nodes: sortParentsFirst(activeNodes.map((n: any) => ({
        id: n.id,
        type: n.node_type,
        position: { x: n.x_position, y: n.y_position },
        parentId: n.parent_id || undefined,
        extent: undefined, // match live nesting: children are not clamped into the group
        style: loadedNodeStyle(n),
        data: { label: n.title, content: n.content, manuscript: n.manuscript || '', notes: n.notes || '', metadata: n.metadata, updated_at: n.updated_at || Date.now() },
      }))),
      edges: dbEdges.map((e: any) => ({
        id: e.id,
        source: e.source_id,
        target: e.target_id,
        sourceHandle: e.source_handle || undefined,
        targetHandle: e.target_handle || undefined,
        label: e.label || undefined,
        data: { strength: e.strength || 1, edgeType: e.edge_type || DEFAULT_EDGE_TYPE },
      })),
      isLoading: false,
    });
  },

  createProject: async (title: string) => {
    const newId = crypto.randomUUID();
    const { db } = await initDb();
    await db.insert(projectsTable).values({
      id: newId,
      title,
      updated_at: Date.now()
    });
    set({ projects: [...get().projects, { id: newId, title, updated_at: Date.now() }] });
    await get().setActiveProject(newId);
  },

  renameProject: async (id: string, title: string) => {
    const trimmed = title.trim();
    if (!trimmed) return;
    set({ projects: get().projects.map(p => p.id === id ? { ...p, title: trimmed } : p) });
    get().beginSave();
    try {
      const { db } = await initDb();
      await db.update(projectsTable).set({ title: trimmed, updated_at: Date.now() }).where(eq(projectsTable.id, id));
    } catch (e) {
      get().reportSaveError('rename workspace', e);
    } finally {
      get().endSave();
    }
  },

  exportProjectJSON: async () => {
    const { activeProjectId, projects, nodes, edges } = get();
    if (!activeProjectId) throw new Error('No active project to export');
    const project = projects.find(p => p.id === activeProjectId);
    const data = { project, nodes, edges };
    return JSON.stringify(data, null, 2);
  },

  importProjectJSON: async (jsonString: string) => {
    try {
      const data = JSON.parse(jsonString);
      if (!data.project || !data.nodes || !data.edges) throw new Error('Invalid JSON structure');

      const { db } = await initDb();
      const newProjectId = crypto.randomUUID();

      // Insert new project
      await db.insert(projectsTable).values({
        id: newProjectId,
        title: `${data.project.title} (Imported)`,
        updated_at: Date.now()
      });

      const idMap = new Map<string, string>();

      // Insert all nodes with new IDs
      for (const node of data.nodes) {
        const newId = crypto.randomUUID();
        idMap.set(node.id, newId);
      }

      for (const node of data.nodes) {
        const mappedParentId = node.parentId ? idMap.get(node.parentId) : null;
        await db.insert(nodesTable).values({
          id: idMap.get(node.id)!,
          project_id: newProjectId,
          node_type: node.type,
          title: node.data.label || '',
          content: node.data.content || '',
          manuscript: node.data.manuscript || '',
          notes: node.data.notes || '',
          metadata: node.data.metadata || null,
          x_position: Math.round(node.position.x),
          y_position: Math.round(node.position.y),
          width: node.style?.width ?? null,
          height: node.style?.height ?? null,
          parent_id: mappedParentId,
          updated_at: Date.now()
        });
      }

      // Insert edges mapped
      for (const edge of data.edges) {
        const mappedSource = idMap.get(edge.source);
        const mappedTarget = idMap.get(edge.target);
        if (mappedSource && mappedTarget) {
          await db.insert(edgesTable).values({
            id: crypto.randomUUID(),
            project_id: newProjectId,
            source_id: mappedSource,
            target_id: mappedTarget,
            source_handle: edge.sourceHandle || null,
            target_handle: edge.targetHandle || null,
            label: edge.label || null,
            strength: edge.data?.strength || 1,
            edge_type: edge.data?.edgeType || DEFAULT_EDGE_TYPE,
          });
        }
      }

      // Load the imported project
      set({ projects: [...get().projects, { id: newProjectId, title: `${data.project.title} (Imported)`, updated_at: Date.now() }] });
      await get().setActiveProject(newProjectId);
    } catch (e) {
      console.error("Failed to import JSON:", e);
      alert("Failed to import JSON file. It might be corrupted.");
    }
  },


  applyLayout: async (layoutedNodes: AppNode[]) => {
    set({ nodes: layoutedNodes });
    get().beginSave();
    try {
      const { db } = await initDb();
      // Batch update all node positions
      for (const node of layoutedNodes) {
        await db.update(nodesTable)
          .set({ x_position: node.position.x, y_position: node.position.y })
          .where(eq(nodesTable.id, node.id));
      }
    } catch (e) {
      get().reportSaveError('apply layout', e);
    } finally {
      get().endSave();
    }
  },
}));

// DEV-ONLY: expose the store for browser-based verification and stress
// seeding (dead code in production builds).
if (import.meta.env.DEV) {
  (window as any).__store = useStore;
}
