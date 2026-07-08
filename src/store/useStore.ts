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
  edges: Edge[];
  isLoading: boolean;
  error: string | null;
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
};

const updateTimeouts: Record<string, ReturnType<typeof setTimeout>> = {};

export const useStore = create<AppState>((set, get) => ({
  projects: [],
  activeProjectId: null,
  nodes: [],
  edges: [],
  isLoading: true,
  error: null,
  previewMarkdown: null,
  setPreviewMarkdown: (md: string | null) => set({ previewMarkdown: md }),
  
  onNodesChange: (changes: NodeChange<AppNode>[]) => {
    set({
      nodes: applyNodeChanges(changes, get().nodes),
    });
    
    // In a production app, we would debounce this async sync to SQLite
    // For now, if a node's position changes (dragged), we update DB
    changes.forEach(async (change) => {
      if (change.type === 'position' && change.position) {
        if (updateTimeouts[change.id]) clearTimeout(updateTimeouts[change.id]);
        updateTimeouts[change.id] = setTimeout(async () => {
          const { db } = await initDb();
          await db.update(nodesTable)
            .set({ x_position: change.position!.x, y_position: change.position!.y })
            .where(eq(nodesTable.id, change.id));
        }, 500);
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
        const { db } = await initDb();
        await db.delete(edgesTable).where(eq(edgesTable.id, change.id));
      }
    });
  },
  
  onConnect: async (connection: Connection) => {
    const edge = { ...connection, id: `${connection.source}-${connection.target}` };
    set({
      edges: addEdge(edge as any, get().edges),
    });
    
    const { db } = await initDb();
    await db.insert(edgesTable).values({
      id: edge.id,
      project_id: get().activeProjectId,
      source_id: connection.source,
      target_id: connection.target,
      label: ''
    });
  },

  onReconnect: async (oldEdge: Edge, newConnection: Connection) => {
    set({
      edges: reconnectEdge(oldEdge, newConnection, get().edges),
    });
    
    // In a real app we'd update DB, but for now we just delete the old and insert new
    const { db } = await initDb();
    await db.delete(edgesTable).where(eq(edgesTable.id, oldEdge.id));
    const newId = `${newConnection.source}-${newConnection.target}`;
    await db.insert(edgesTable).values({
      id: newId,
      project_id: get().activeProjectId,
      source_id: newConnection.source,
      target_id: newConnection.target,
      label: ''
    });
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
      console.error("DB Error in addNode:", e);
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
          const regex = new RegExp(`\\b${otherTitle}\\b`, 'i');
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
                updated_at: Date.now()
              });
            } catch(e) {}
          }
        });
      }
    }
    
    // Debounce DB write to prevent IPC flooding on fast typing
    if (updateTimeouts[id]) clearTimeout(updateTimeouts[id]);
    
    updateTimeouts[id] = setTimeout(async () => {
      const latestNode = get().nodes.find(n => n.id === id);
      if (!latestNode) return;
      
      const { db } = await initDb();
      await db.update(nodesTable).set({
        title: latestNode.data.label,
        content: latestNode.data.content || '',
        manuscript: latestNode.data.manuscript || '',
        notes: latestNode.data.notes || '',
        metadata: latestNode.data.metadata || null,
        updated_at: latestNode.data.updated_at || Date.now()
      }).where(eq(nodesTable.id, id));
    }, 500);
  },

  updateNodeType: async (id: string, type: string) => {
    set({
      nodes: get().nodes.map(n => n.id === id ? { ...n, type } : n)
    });
    const { db } = await initDb();
    await db.update(nodesTable).set({ node_type: type }).where(eq(nodesTable.id, id));
  },

  updateNodeParent: async (id: string, parentId: string | null) => {
    const { db } = await initDb();
    await db.update(nodesTable).set({ parent_id: parentId }).where(eq(nodesTable.id, id));
  },

  deleteNode: async (id: string) => {
    get().onNodesChange([{ type: 'remove', id }]);
    const { db } = await initDb();
    await db.update(nodesTable).set({ deleted_at: Date.now() }).where(eq(nodesTable.id, id));
  },

  restoreNode: async (id: string) => {
    const { db } = await initDb();
    await db.update(nodesTable).set({ deleted_at: null }).where(eq(nodesTable.id, id));
    // Reload active project to fetch the restored node
    await get().setActiveProject(get().activeProjectId!);
  },

  deleteProject: async (id: string) => {
    set({ projects: get().projects.map(p => p.id === id ? { ...p, deleted_at: Date.now() } : p) });
    const { db } = await initDb();
    await db.update(projectsTable).set({ deleted_at: Date.now() }).where(eq(projectsTable.id, id));
  },

  restoreProject: async (id: string) => {
    set({ projects: get().projects.map(p => p.id === id ? { ...p, deleted_at: undefined } : p) });
    const { db } = await initDb();
    await db.update(projectsTable).set({ deleted_at: null }).where(eq(projectsTable.id, id));
  },

  createSnapshot: async () => {
    const currentId = get().activeProjectId;
    if (!currentId) return;
    
    const newId = crypto.randomUUID();
    const currentProject = get().projects.find(p => p.id === currentId);
    const title = currentProject ? `${currentProject.title} - Snapshot` : 'Snapshot';
    
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
      
      let initialProjectId = localStorage.getItem('activeProjectId');
      if (dbProjects.length === 0) {
        // Create Default Project
        initialProjectId = crypto.randomUUID();
        await db.insert(projectsTable).values({
          id: initialProjectId,
          title: 'Main Workspace',
          updated_at: Date.now()
        });
        dbProjects.push({ id: initialProjectId, title: 'Main Workspace', updated_at: Date.now() });
        localStorage.setItem('activeProjectId', initialProjectId);
      } else if (!initialProjectId || !dbProjects.find((p: any) => p.id === initialProjectId)) {
        initialProjectId = dbProjects[0].id;
        localStorage.setItem('activeProjectId', initialProjectId as string);
      }

      set({ projects: dbProjects, activeProjectId: initialProjectId });

      if (!initialProjectId) return;

      // Only load non-deleted nodes for active project
      const dbNodes = await db.select().from(nodesTable).where(eq(nodesTable.project_id, initialProjectId));
      const activeNodes = dbNodes.filter((n: any) => !n.deleted_at);
      const dbEdges = await db.select().from(edgesTable).where(eq(edgesTable.project_id, initialProjectId));

      set({
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
    const dbEdges = await db.select().from(edgesTable).where(eq(edgesTable.project_id, id));
    
    set({
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
}));
