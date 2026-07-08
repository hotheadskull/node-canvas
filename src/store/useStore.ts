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
};

const updateTimeouts: Record<string, ReturnType<typeof setTimeout>> = {};

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

    changes.forEach(async (change) => {
      if (change.type === 'position' && change.position) {
        // Debounce position writes to avoid IPC flooding while dragging
        if (updateTimeouts[change.id]) clearTimeout(updateTimeouts[change.id]);
        updateTimeouts[change.id] = setTimeout(async () => {
          try {
            const { db } = await initDb();
            await db.update(nodesTable)
              .set({ x_position: change.position!.x, y_position: change.position!.y })
              .where(eq(nodesTable.id, change.id));
          } catch (e) {
            get().reportSaveError('save node position', e);
          }
        }, 500);
      } else if (change.type === 'remove') {
        try {
          const { db } = await initDb();
          await db.update(nodesTable).set({ deleted_at: Date.now() }).where(eq(nodesTable.id, change.id));
        } catch (e) {
          get().reportSaveError('move node to trash', e);
        }
      }
    });
  },

  onEdgesChange: (changes: EdgeChange[]) => {
    set({
      edges: applyEdgeChanges(changes, get().edges),
    });

    // Handle edge removals
    changes.forEach(async (change) => {
      if (change.type === 'remove') {
        try {
          const { db } = await initDb();
          await db.delete(edgesTable).where(eq(edgesTable.id, change.id));
        } catch (e) {
          get().reportSaveError('delete connection', e);
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

    const edge = { ...connection, id: crypto.randomUUID() };
    set({
      edges: addEdge(edge as any, get().edges),
    });

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
    }
  },

  onReconnect: async (oldEdge: Edge, newConnection: Connection) => {
    set({
      edges: reconnectEdge(oldEdge, newConnection, get().edges),
    });

    // reconnectEdge keeps the edge's id in memory, so update the same DB row
    // instead of delete+insert (which left the two ids out of sync).
    try {
      const { db } = await initDb();
      await db.update(edgesTable)
        .set({ source_id: newConnection.source, target_id: newConnection.target })
        .where(eq(edgesTable.id, oldEdge.id));
    } catch (e) {
      get().reportSaveError('save reconnected edge', e);
    }
  },

  addNode: async (node: AppNode) => {
    set({ nodes: [...get().nodes, node] });
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
    }
  },

  updateNodeData: async (id: string, data: Partial<AppNode['data']>) => {
    // 1. Update the local state for the node
    set({
      nodes: get().nodes.map(n => n.id === id ? { ...n, data: { ...n.data, ...data, updated_at: Date.now() } } : n)
    });

    // 2. SPIDERWEB AUTO-LINKING: Check if they typed another node's name
    const newText = (data.content || data.manuscript || '').toLowerCase();
    if (newText.length > 5) {
      const allNodes = get().nodes;
      const currentEdges = get().edges;
      const newEdgesToCreate: any[] = [];
      
      allNodes.forEach(otherNode => {
        if (otherNode.id === id) return;
        const otherTitle = otherNode.data.label?.toLowerCase().trim();
        if (otherTitle && otherTitle.length > 2) { // Only auto-link words longer than 2 chars
          // Strip HTML tags for a clean regex search
          const plainText = newText.replace(/<[^>]+>/g, '');
          const regex = new RegExp(`\\b${escapeRegExp(otherTitle)}\\b`, 'i');
          if (regex.test(plainText)) {
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
                style: { stroke: '#fbbf24', strokeWidth: 2 }
              };
              newEdgesToCreate.push(newEdge);
            }
          }
        }
      });

      if (newEdgesToCreate.length > 0) {
        set({ edges: [...currentEdges, ...newEdgesToCreate] });
        // Save new edges to DB asynchronously
        initDb().then(async ({ db }) => {
          for (const edge of newEdgesToCreate) {
            try {
              await db.insert(edgesTable).values({
                id: edge.id,
                project_id: get().activeProjectId,
                source_id: edge.source,
                target_id: edge.target,
              });
            } catch (e) {
              get().reportSaveError('save auto-link', e);
            }
          }
        });
      }
    }
    
    // Debounce DB write to prevent IPC flooding on fast typing
    if (updateTimeouts[id]) clearTimeout(updateTimeouts[id]);
    
    updateTimeouts[id] = setTimeout(async () => {
      const latestNode = get().nodes.find(n => n.id === id);
      if (!latestNode) return;

      try {
        const { db } = await initDb();
        await db.update(nodesTable).set({
          title: latestNode.data.label,
          content: latestNode.data.content || '',
          manuscript: latestNode.data.manuscript || '',
          notes: latestNode.data.notes || '',
          metadata: latestNode.data.metadata || null,
          updated_at: latestNode.data.updated_at || Date.now()
        }).where(eq(nodesTable.id, id));
      } catch (e) {
        get().reportSaveError('save node content', e);
      }
    }, 500);
  },

  updateNodeType: async (id: string, type: string) => {
    set({
      nodes: get().nodes.map(n => n.id === id ? { ...n, type } : n)
    });
    try {
      const { db } = await initDb();
      await db.update(nodesTable).set({ node_type: type }).where(eq(nodesTable.id, id));
    } catch (e) {
      get().reportSaveError('save node type', e);
    }
  },

  updateNodeParent: async (id: string, parentId: string | null) => {
    try {
      const { db } = await initDb();
      await db.update(nodesTable).set({ parent_id: parentId }).where(eq(nodesTable.id, id));
    } catch (e) {
      get().reportSaveError('save node grouping', e);
    }
  },

  deleteNode: async (id: string) => {
    // onNodesChange handles both the in-memory removal (into trashedNodes)
    // and the soft delete in the DB.
    get().onNodesChange([{ type: 'remove', id }]);
  },

  restoreNode: async (id: string) => {
    try {
      const { db } = await initDb();
      await db.update(nodesTable).set({ deleted_at: null }).where(eq(nodesTable.id, id));
      // Reload active project to fetch the restored node
      await get().setActiveProject(get().activeProjectId!);
    } catch (e) {
      get().reportSaveError('restore node', e);
    }
  },

  deleteProject: async (id: string) => {
    set({ projects: get().projects.map(p => p.id === id ? { ...p, deleted_at: Date.now() } : p) });
    try {
      const { db } = await initDb();
      await db.update(projectsTable).set({ deleted_at: Date.now() }).where(eq(projectsTable.id, id));
    } catch (e) {
      get().reportSaveError('move project to trash', e);
    }
  },

  restoreProject: async (id: string) => {
    set({ projects: get().projects.map(p => p.id === id ? { ...p, deleted_at: undefined } : p) });
    try {
      const { db } = await initDb();
      await db.update(projectsTable).set({ deleted_at: null }).where(eq(projectsTable.id, id));
    } catch (e) {
      get().reportSaveError('restore project', e);
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
      
      // Ensure migrations have run before loading data
      // For this session, we assume runMigrations() was called in main.ts, but let's run it just in case
      // Wait, let's just do standard queries.
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
        data: { label: n.title, content: n.content, manuscript: n.manuscript || '', notes: n.notes || '', updated_at: n.updated_at || Date.now() },
      })),
      nodes: activeNodes.map((n: any) => ({
        id: n.id,
        type: n.node_type,
        position: { x: n.x_position, y: n.y_position },
        parentId: n.parent_id || undefined,
        extent: n.parent_id ? 'parent' : undefined,
        data: { label: n.title, content: n.content, manuscript: n.manuscript || '', notes: n.notes || '', updated_at: n.updated_at || Date.now() },
      })),
      edges: dbEdges.map((e: any) => ({
        id: e.id,
        source: e.source_id,
        target: e.target_id,
        label: e.label || undefined,
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
            label: edge.label || null
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
}));
