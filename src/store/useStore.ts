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
  addNode: (node: AppNode) => Promise<void>;
  updateNodeData: (id: string, data: Partial<AppNode['data']>) => Promise<void>;
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
  generateDemoProject: () => Promise<void>;
};

// Position saves and content saves get separate timer namespaces -- sharing one
// map keyed by node id meant a drag could cancel a pending content save.
const updateTimeouts: Record<string, ReturnType<typeof setTimeout>> = {};
const contentTimeouts: Record<string, ReturnType<typeof setTimeout>> = {};

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
            await db.update(nodesTable)
              .set({ x_position: change.position!.x, y_position: change.position!.y })
              .where(eq(nodesTable.id, change.id));
          } catch (e) {
            get().reportSaveError('save node position', e);
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
    const alreadyConnected = get().edges.some(
      e => e.source === connection.source && e.target === connection.target
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
        .set({ source_id: newConnection.source, target_id: newConnection.target })
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
        node_type: node.type || 'default'
      });
    } catch (e) {
      get().reportSaveError('save new node', e);
    } finally {
      get().endSave();
    }
  },

  updateNodeData: async (id: string, data: Partial<AppNode['data']>) => {
    // 1. Update the local state for the node
    set({
      nodes: get().nodes.map(n => n.id === id ? { ...n, data: { ...n.data, ...data, updated_at: Date.now() } } : n)
    });

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
            // Found a match! Check if edge already exists
            const exists = currentEdges.some(e => e.source === id && e.target === otherNode.id);
            if (!exists) {
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
              const existing = currentEdges.find(e => e.source === id && e.target === otherNode.id)!;
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
                strength: edge.data.strength,
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
      await db.update(nodesTable).set({ parent_id: parentId }).where(eq(nodesTable.id, id));
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

    set({ projects: [...get().projects, { id: newId, title, updated_at: Date.now(), snapshot_of: currentId }] });
    await get().setActiveProject(newId);
    } catch (e) {
      get().reportSaveError('create snapshot', e);
    }
  },

  duplicateNode: async (id: string) => {
    const nodeToCopy = get().nodes.find(n => n.id === id);
    if (!nodeToCopy) return;

    const newId = crypto.randomUUID();
    const newNode = {
      ...nodeToCopy,
      id: newId,
      position: { x: nodeToCopy.position.x + 50, y: nodeToCopy.position.y + 50 },
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
      const activeNodes = dbNodes.filter((n: any) => !n.deleted_at);
      const trashedDbNodes = dbNodes.filter((n: any) => n.deleted_at);
      const dbEdges = await db.select().from(edgesTable).where(eq(edgesTable.project_id, initialProjectId));

      set({
        trashedNodes: trashedDbNodes.map((n: any) => ({
          id: n.id,
          type: n.node_type,
          position: { x: n.x_position, y: n.y_position },
          parentId: n.parent_id || undefined,
          extent: n.parent_id ? 'parent' : undefined,
          data: { label: n.title, content: n.content, manuscript: n.manuscript || '', notes: n.notes || '', metadata: n.metadata, updated_at: n.updated_at || Date.now() },
        })),
        nodes: activeNodes.map((n: any) => ({
          id: n.id,
          type: n.node_type,
          position: { x: n.x_position, y: n.y_position },
          parentId: n.parent_id || undefined,
          extent: n.parent_id ? 'parent' : undefined,
          data: {
            label: n.title,
            content: n.content,
            manuscript: n.manuscript || '',
            notes: n.notes || '',
            metadata: n.metadata,
            updated_at: n.updated_at || Date.now()
          },
        })),
        edges: dbEdges.map((e: any) => ({
          id: e.id,
          source: e.source_id,
          target: e.target_id,
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
    const activeNodes = dbNodes.filter((n: any) => !n.deleted_at);
    const trashedDbNodes = dbNodes.filter((n: any) => n.deleted_at);
    const dbEdges = await db.select().from(edgesTable).where(eq(edgesTable.project_id, id));

    set({
      trashedNodes: trashedDbNodes.map((n: any) => ({
        id: n.id,
        type: n.node_type,
        position: { x: n.x_position, y: n.y_position },
        parentId: n.parent_id || undefined,
        extent: n.parent_id ? 'parent' : undefined,
        data: { label: n.title, content: n.content, manuscript: n.manuscript || '', notes: n.notes || '', metadata: n.metadata, updated_at: n.updated_at || Date.now() },
      })),
      nodes: activeNodes.map((n: any) => ({
        id: n.id,
        type: n.node_type,
        position: { x: n.x_position, y: n.y_position },
        parentId: n.parent_id || undefined,
        extent: n.parent_id ? 'parent' : undefined,
        data: { label: n.title, content: n.content, manuscript: n.manuscript || '', notes: n.notes || '', metadata: n.metadata, updated_at: n.updated_at || Date.now() },
      })),
      edges: dbEdges.map((e: any) => ({
        id: e.id,
        source: e.source_id,
        target: e.target_id,
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
            label: edge.label || null,
            strength: edge.data?.strength || 1,
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

  generateDemoProject: async () => {
    get().beginSave();
    try {
      const { db } = await initDb();
      const pId = crypto.randomUUID();
      await db.insert(projectsTable).values({ id: pId, title: 'Demo: The Iron Saga', updated_at: Date.now() });

      const n = Array.from({ length: 25 }).map(() => crypto.randomUUID());

      const nodes = [
        { id: n[0], type: 'master', label: 'The Iron Saga', x: 0, y: -800, logline: 'A kingdom falls to a usurper, and the heir must gather ancient relics to reclaim the throne.', theme: 'Betrayal', audience: 'Fantasy', content: 'Core concept mapping.' },
        
        { id: n[1], type: 'document', label: 'Book 1: The Fall', x: -400, y: -400, func: 'none', content: '<p>The kingdom fractures.</p>', tags: '#epic' },
        { id: n[2], type: 'document', label: 'Chapter 1: Ash', x: -600, y: 0, func: 'action', content: '<p>The night the keep fell.</p>', tags: '#action' },
        { id: n[3], type: 'scene', label: 'Scene: The King dies', x: -800, y: 400, func: 'climax', content: '<p>Aldric is betrayed by Kaelen.</p>', tags: '#climax' },
        
        { id: n[4], type: 'character', label: 'Aldric', aliases: 'Iron King', x: 400, y: -400, func: 'royal', content: '<p>The stern ruler.</p>', tags: '#royal', stats: [{key: 'Age', value: '45'}, {key: 'Weapon', value: 'Broadsword'}] },
        { id: n[5], type: 'character', label: 'Kaelen', aliases: 'The Usurper', x: 800, y: -400, func: 'villain', content: '<p>Ambitious and ruthless.</p>', tags: '#villain', stats: [{key: 'Age', value: '38'}, {key: 'Motive', value: 'Jealousy'}] },
        
        { id: n[6], type: 'location', label: 'The Iron Keep', aliases: '', x: 600, y: -100, func: 'setting', content: '<p>Black stone fortress.</p>', tags: '#setting', stats: [{key: 'Region', value: 'The North'}, {key: 'Defense', value: 'High'}] },
        
        { id: n[7], type: 'lore', label: 'The Blood Oath', aliases: '', x: 1200, y: 0, func: 'magic', content: '<p>A magical contract.</p>', tags: '#magic' },
        { id: n[8], type: 'item', label: 'The Ashen Crown', aliases: '', x: 1000, y: -200, func: 'artifact', content: '<p>The symbol of rule.</p>', tags: '#artifact', stats: [{key: 'Material', value: 'Meteoric Iron'}] },
        
        { id: n[9], type: 'quote', label: 'To hold power is to hold fire.', aliases: '', x: -800, y: 800, func: 'quote', content: '<p>To hold power is to hold fire. It warms the house, but if left unchecked, it burns it down.</p>', tags: '#theme', author: 'The First King', sourceUrl: 'Chronicles, p.14' },
        
        { id: n[10], type: 'task', label: 'Worldbuilding Tasks', aliases: '', x: -1200, y: -600, func: 'none', content: '', tags: '#todo', tasks: [{label: 'Map the Northern Reaches', completed: true}, {label: 'Detail the magic system', completed: false}] },
        
        { id: n[11], type: 'sequence', label: 'The Usurpers Path', aliases: '', x: 1400, y: 400, func: 'none', content: '', tags: '', beats: [{id: 'b1', title: 'The Betrayal', subtitle: 'At the feast'}, {id: 'b2', title: 'The Escape', subtitle: 'Through the crypts'}] },
        
        { id: n[12], type: 'hub', label: 'Character Connections', aliases: '', x: 600, y: -700, func: 'none', content: '', tags: '' },
        
        { id: n[13], type: 'logic', label: 'If Aldric dies -> Rebellion', aliases: '', x: 1200, y: 800, func: 'none', content: '', tags: '', premises: ['Aldric is loved by the peasants', 'Kaelen has no royal blood'], conclusion: 'The Northern Lords will immediately rebel against Kaelen' },
        
        { id: n[14], type: 'deck', label: 'Key Artifacts', aliases: '', x: 1400, y: -400, func: 'none', content: '', tags: '', cards: [{label: 'The Crown', content: 'Forged from stars'}, {label: 'The Blade', content: 'Lost in the sea'}] },
        
        { id: n[15], type: 'alias', label: 'Aldric', aliases: '', x: -1100, y: 400, func: 'none', content: '', tags: '', targetId: n[4] },
        { id: n[16], type: 'print', label: 'Export Draft', aliases: '', x: -900, y: -800, func: 'none', content: '', tags: '', slotCount: 3 }
      ];

      for (const node of nodes as any[]) {
        await db.insert(nodesTable).values({
          id: node.id,
          project_id: pId,
          title: node.label,
          node_type: node.type,
          x_position: node.x,
          y_position: node.y,
          content: node.content,
          metadata: { 
            function: node.func, 
            tags: node.tags, 
            aliases: node.aliases || '', 
            targetId: node.targetId || '',
            stats: node.stats,
            author: node.author,
            sourceUrl: node.sourceUrl,
            tasks: node.tasks,
            beats: node.beats,
            cards: node.cards,
            premises: node.premises,
            conclusion: node.conclusion,
            logline: node.logline,
            theme: node.theme,
            audience: node.audience
          },
          updated_at: Date.now()
        });
      }

      const edges = [
        { source: n[0], target: n[1], type: 'references', strength: 2 },
        { source: n[1], target: n[2], type: 'references', strength: 2 },
        { source: n[2], target: n[3], type: 'references', strength: 2 },
        { source: n[12], target: n[4], type: 'references', strength: 1 },
        { source: n[12], target: n[5], type: 'references', strength: 1 },
        { source: n[4], target: n[6], type: 'references', strength: 2 },
        { source: n[5], target: n[4], type: 'contradicts', strength: 3 },
        { source: n[5], target: n[8], type: 'causes', strength: 2 },
        { source: n[8], target: n[7], type: 'foreshadows', strength: 2 },
        { source: n[3], target: n[15], type: 'references', strength: 1 },
        { source: n[3], target: n[9], type: 'supports', strength: 1 },
        { source: n[1], target: n[16], type: 'references', strength: 1, targetHandle: 'slot-1' },
        { source: n[2], target: n[16], type: 'references', strength: 1, targetHandle: 'slot-2' },
      ];

      for (const e of edges) {
        await db.insert(edgesTable).values({
          id: crypto.randomUUID(),
          project_id: pId,
          source_id: e.source,
          target_id: e.target,
          edge_type: e.type,
          strength: e.strength
        });
      }

      set({ projects: [...get().projects, { id: pId, title: 'Demo: The Iron Saga', updated_at: Date.now() }] });
      await get().setActiveProject(pId);
    } catch (e) {
      console.error('generate demo failed', e);
    } finally {
      get().endSave();
    }
  },
}));
