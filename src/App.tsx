import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  BackgroundVariant,
  Panel,
  ReactFlowProvider,
  useReactFlow,
  useViewport,
  ConnectionMode,
  ControlButton
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useStore, AppNode } from './store/useStore';
import { getLayoutedElements } from './utils/layout';
import { ThemeNode } from './components/ThemeNode';
import { ElasticEdge } from './components/ElasticEdge';
import { CreateNodeMenu } from './components/CreateNodeMenu';
import { CanvasSearch } from './components/CanvasSearch';
import { ProjectManager } from './components/ProjectManager';
import { ReferencePanel } from './components/ReferencePanel';
import { TutorialOverlay } from './components/TutorialOverlay';
import './App.css';
import { Trash2, Undo2, Redo2, Anchor, Crosshair, CircleDashed, Wand } from 'lucide-react';
import { RichTextEditor } from './components/RichTextEditor';
import { CommandPalette } from './components/CommandPalette';
import { EDGE_TYPES, edgeTypeOf } from './utils/edgeTypes';

import { QuoteNode } from './components/QuoteNode';
import { StatNode } from './components/StatNode';
import { TaskNode } from './components/TaskNode';
import { SequenceNode } from './components/SequenceNode';
import { HubNode } from './components/HubNode';
import { GroupNode } from './components/GroupNode';
import { KnowledgeCard } from './components/KnowledgeCard';
import { AliasNode } from './components/AliasNode';
import { MasterNode } from './components/MasterNode';
import { LogicNode } from './components/LogicNode';
import { DeckNode } from './components/DeckNode';
import { CompileNode } from './components/CompileNode';
import { CrucibleNode } from './components/CrucibleNode';
import { LiveConnectionLine } from './components/LiveConnectionLine';

// Generate a random starfield SVG as a data URI for seamless background tiling
const generateStarSVG = (density: number, maxSize: number, color: string) => {
  let circles = '';
  const size = 2048; // Increased tile size to 2048 to prevent visible repetition

  const addCircle = (cx: number, cy: number, r: number, opacity: string) => {
    circles += `<circle cx="${cx}" cy="${cy}" r="${r * 2.5}" fill="${color}" opacity="${(parseFloat(opacity) * 0.3).toFixed(2)}" />`;
    circles += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${color}" opacity="${opacity}" />`;
  };

  for (let i = 0; i < density; i++) {
    const cx = Math.random() * size;
    const cy = Math.random() * size;
    const r = Math.random() * maxSize + 0.8; // Minimum radius 0.8 so they don't vanish
    const opacity = (Math.random() * 0.4 + 0.6).toFixed(2); // Brighter baseline opacity (0.6 - 1.0)

    // Draw the main star
    addCircle(cx, cy, r, opacity);

    // Seamless Edge Wrapping!
    // If a star touches an edge, perfectly clone it on the opposite side.
    if (cx - r < 0) addCircle(cx + size, cy, r, opacity);
    if (cx + r > size) addCircle(cx - size, cy, r, opacity);
    if (cy - r < 0) addCircle(cx, cy + size, r, opacity);
    if (cy + r > size) addCircle(cx, cy - size, r, opacity);
    
    // Corner wrapping
    if (cx - r < 0 && cy - r < 0) addCircle(cx + size, cy + size, r, opacity);
    if (cx + r > size && cy - r < 0) addCircle(cx - size, cy + size, r, opacity);
    if (cx - r < 0 && cy + r > size) addCircle(cx + size, cy - size, r, opacity);
    if (cx + r > size && cy + r > size) addCircle(cx - size, cy - size, r, opacity);
  }
  
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">${circles}</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

interface ShootingStarsProps {
  x: number;
  y: number;
  zoom: number;
}

const ShootingStars = ({ x, y, zoom }: ShootingStarsProps) => {
  return (
    // Transform container to world space!
    <div 
      className="absolute inset-0 overflow-visible pointer-events-none z-[-1]"
      style={{
        transform: `translate(${x}px, ${y}px) scale(${zoom})`,
        transformOrigin: '0 0',
      }}
    >
      {/* 
        Container covers a massive area so shooting stars can be spawned far out 
        and fly through the visible canvas.
      */}
      <div className="absolute inset-[-4000px]">
        <div className="shooting-star star-1"></div>
        <div className="shooting-star star-2"></div>
        <div className="shooting-star star-3"></div>
        <div className="shooting-star star-4"></div>
        <div className="shooting-star star-5"></div>
        <div className="shooting-star star-6"></div>
        <div className="shooting-star star-7"></div>
        <div className="shooting-star star-8"></div>
        <div className="shooting-star star-9"></div>
        <div className="shooting-star star-10"></div>
        <div className="shooting-star star-11"></div>
        <div className="shooting-star star-12"></div>
        <div className="shooting-star-rare star-13"></div>
        <div className="shooting-star-rare star-14"></div>
        <div className="shooting-star-rare star-15"></div>
      </div>
    </div>
  );
};

const DynamicCanvasBackground = () => {
  const { x, y, zoom } = useViewport();
  
  // Generate our layers only once
  const farStars = useMemo(() => generateStarSVG(400, 1.0, '#ffffff'), []);
  const midStars = useMemo(() => generateStarSVG(200, 1.5, '#ffd999'), []); // Brighter gold
  const nearStars = useMemo(() => generateStarSVG(75, 2.0, '#b8d4ff'), []); // Brighter cyan

  return (
    <>
      {/* Base Dark Void */}
      <div className="absolute inset-0 z-[-4] bg-[#08080a] pointer-events-none" />
      
      {/* Far Layer - Moves slowly */}
      <div 
        style={{
          position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: -3,
          backgroundImage: `url('${farStars}')`,
          backgroundRepeat: 'repeat',
          backgroundPosition: `${x * 0.2}px ${y * 0.2}px`,
          backgroundSize: `${2048 * zoom}px ${2048 * zoom}px`,
        }}
      />

      {/* Mid Layer - Moves at medium speed */}
      <div 
        style={{
          position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: -2,
          backgroundImage: `url('${midStars}')`,
          backgroundRepeat: 'repeat',
          backgroundPosition: `${x * 0.5}px ${y * 0.5}px`,
          backgroundSize: `${2048 * zoom}px ${2048 * zoom}px`,
          filter: 'drop-shadow(0 0 3px rgba(255, 217, 153, 0.6))'
        }}
      />

      {/* Near Layer - Moves 1:1 with the canvas */}
      <div 
        style={{
          position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: -1,
          backgroundImage: `url('${nearStars}')`,
          backgroundRepeat: 'repeat',
          backgroundPosition: `${x * 1.0}px ${y * 1.0}px`,
          backgroundSize: `${2048 * zoom}px ${2048 * zoom}px`,
          filter: 'drop-shadow(0 0 4px rgba(184, 212, 255, 0.8))'
        }}
      />

      <ShootingStars x={x} y={y} zoom={zoom} />

      {/* Fade out the grid smoothly as the user zooms out */}
      <Background 
        color={`rgba(240, 192, 80, ${Math.max(0, Math.min(0.2, (zoom - 0.15) * 0.25)).toFixed(2)})`} 
        variant={BackgroundVariant.Cross} 
        gap={24} 
        size={6} 
      />
    </>
  );
};

// Three tiers: writing surfaces (ThemeNode), knowledge cards (KnowledgeCard),
// and structure tools. Legacy type names stay registered so old canvases load.
const nodeTypes = {
  // Tier 1: writing surfaces
  document: ThemeNode,
  book: ThemeNode,
  chapter: ThemeNode,
  scene: ThemeNode,
  story: ThemeNode,
  directory: ThemeNode,
  master: MasterNode,

  // Tier 2: knowledge cards (one component, kind = node type)
  character: KnowledgeCard,
  location: KnowledgeCard,
  faction: KnowledgeCard,
  event: KnowledgeCard,
  lore: KnowledgeCard,
  item: KnowledgeCard,
  reference: KnowledgeCard,
  snippet: KnowledgeCard,
  idea: KnowledgeCard,
  citation: KnowledgeCard,
  quote: QuoteNode,

  // Tier 3: structure & flow
  stat: StatNode,
  task: TaskNode,
  sequence: SequenceNode,
  hub: HubNode,
  group: GroupNode,
  logic: LogicNode,
  deck: DeckNode,
  print: CompileNode,
  crucible: CrucibleNode,
  alias: AliasNode,

  default: ThemeNode,
};

const edgeTypes = {
  default: ElasticEdge,
  elastic: ElasticEdge, // auto-link edges are created with type 'elastic'
};

function FlowCanvas() {
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, onReconnect } = useStore();
  const addNode = useStore(state => state.addNode);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  // Legend toggles: relationship types can be hidden to declutter the canvas
  const [hiddenEdgeTypes, setHiddenEdgeTypes] = useState<Set<string>>(new Set());
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [orphansOpen, setOrphansOpen] = useState(false);
  // Anchor-check mode: dim everything that doesn't trace back to the anchor
  const [anchorCheck, setAnchorCheck] = useState(false);
  const { screenToFlowPosition, getIntersectingNodes, setCenter } = useReactFlow();
  const dragStartPos = useRef<Record<string, { x: number; y: number }>>({});

  const previewMarkdown = useStore(state => state.previewMarkdown);
  const setPreviewMarkdown = useStore(state => state.setPreviewMarkdown);
  const canUndo = useStore(state => state.canUndo);
  const canRedo = useStore(state => state.canRedo);

  // Canvas-level undo/redo (Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y) and the Ctrl+K
  // command palette. Text fields and TipTap editors keep their own native
  // undo, so those shortcuts skip when one is focused; Ctrl+K works anywhere.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen(o => !o);
        return;
      }
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      if (e.key === 'Escape') {
        useStore.getState().setFocusedNode(null);
        setPaletteOpen(false);
        return;
      }
      if (!(e.ctrlKey || e.metaKey)) return;
      if (e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) useStore.getState().redo();
        else useStore.getState().undo();
      } else if (e.key.toLowerCase() === 'y') {
        e.preventDefault();
        useStore.getState().redo();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // The project's anchor (Big Idea) node, if one is pinned
  const anchorId = useMemo(
    () => nodes.find(n => (n.data as any).metadata?.isAnchor)?.id ?? null,
    [nodes]
  );

  // Nodes with no connections at all -- Luhmann's rule: an unlinked note is
  // a forgotten note. Surfaced in a quiet widget so they get linked or culled.
  const orphanNodes = useMemo(() => {
    const connected = new Set<string>();
    edges.forEach(e => { connected.add(e.source); connected.add(e.target); });
    nodes.forEach(n => {
      const targetId = (n.data as any).metadata?.targetId;
      if (n.type === 'alias' && targetId) { connected.add(n.id); connected.add(targetId); }
      if (n.parentId) { connected.add(n.id); connected.add(n.parentId); }
    });
    return nodes.filter(n => !connected.has(n.id));
  }, [nodes, edges]);

  // CONSTELLATION: while hovering a node (or in anchor-check mode, from the
  // anchor), the connected web stays lit and everything else fades back into
  // the starfield. Alias pins act as bridges: the pin and its real target
  // count as connected, so a web wired through a pin lights up the target's
  // web too.
  const focusRootId = anchorCheck && anchorId ? anchorId : hoveredNodeId;
  const constellation = useMemo(() => {
    if (!focusRootId) return null;
    const aliasLinks = nodes
      .filter(n => n.type === 'alias' && (n.data as any)?.metadata?.targetId)
      .map(n => ({ a: n.id, b: (n.data as any).metadata.targetId as string }));
    const member = new Set<string>([focusRootId]);
    const queue = [focusRootId];
    while (queue.length > 0) {
      const current = queue.pop()!;
      edges.forEach(e => {
        if (e.source === current && !member.has(e.target)) { member.add(e.target); queue.push(e.target); }
        if (e.target === current && !member.has(e.source)) { member.add(e.source); queue.push(e.source); }
      });
      aliasLinks.forEach(l => {
        if (l.a === current && !member.has(l.b)) { member.add(l.b); queue.push(l.b); }
        if (l.b === current && !member.has(l.a)) { member.add(l.a); queue.push(l.a); }
      });
    }
    return member;
  }, [focusRootId, edges, nodes]);

  // ORBITS: satellites (group children and nodes tethered to a hub) drift
  // gently around their anchor so clusters feel alive. Purely cosmetic --
  // real positions never change.
  const orbitingIds = useMemo(() => {
    const hubIds = new Set(nodes.filter(n => n.type === 'hub').map(n => n.id));
    const satellites = new Set<string>();
    nodes.forEach(n => { if (n.parentId) satellites.add(n.id); });
    edges.forEach(e => {
      if (hubIds.has(e.source) && !hubIds.has(e.target)) satellites.add(e.target);
      if (hubIds.has(e.target) && !hubIds.has(e.source)) satellites.add(e.source);
    });
    return satellites;
  }, [nodes, edges]);

  const processedNodes = useMemo(() => {
    const collapsedHubIds = new Set(
      nodes.filter(n => n.type === 'hub' && (n.data as any)?.metadata?.isCollapsed).map(n => n.id)
    );

    const hiddenNodeIds = new Set();
    edges.forEach(edge => {
      if (collapsedHubIds.has(edge.source)) hiddenNodeIds.add(edge.target);
      if (collapsedHubIds.has(edge.target)) hiddenNodeIds.add(edge.source);
    });

    return nodes.map(node => {
      const constellationClass = constellation
        ? (constellation.has(node.id) ? ' constellation-lit' : ' constellation-dim')
        : '';
      const anchorClass = (node.data as any).metadata?.isAnchor ? ' anchor-node' : '';

      if (node.type === 'hub') {
        const extra = constellationClass + anchorClass;
        return extra ? { ...node, className: extra } : node;
      }

      const isHidden = hiddenNodeIds.has(node.id);
      let targetPosition = node.position;

      if (isHidden) {
        // Find the hub it's connected to
        const connectedEdge = edges.find(e =>
          (e.source === node.id || e.target === node.id) &&
          (collapsedHubIds.has(e.source) || collapsedHubIds.has(e.target))
        );
        if (connectedEdge) {
          const hubId = connectedEdge.source === node.id ? connectedEdge.target : connectedEdge.source;
          const hubNode = nodes.find(n => n.id === hubId);
          if (hubNode) {
            targetPosition = { x: hubNode.position.x + 60, y: hubNode.position.y + 60 };
          }
        }
      }

      // Stagger orbit timing per node so satellites don't drift in lockstep
      const idHash = node.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
      const orbits = !isHidden && orbitingIds.has(node.id);

      return {
        ...node,
        position: targetPosition,
        className: (isHidden
          ? 'opacity-0 pointer-events-none'
          : 'opacity-100') + (orbits ? ' orbit-float' : '') + constellationClass + anchorClass,
        style: {
          ...node.style,
          ...(orbits ? {
            '--orbit-dur': `${14 + (idHash % 9)}s`,
            animationDelay: `-${idHash % 14}s`,
          } : {}),
          '--node-transition': isHidden
            ? 'transform 0.8s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.6s ease, filter 0.3s ease' // Faster pull-in
            : 'transform 3.5s cubic-bezier(0.05, 0.9, 0.1, 1.0), opacity 3.0s ease, filter 0.3s ease' // Extremely gentle float out
        } as any
      };
    });
  }, [nodes, edges, constellation, orbitingIds]);

  const processedEdges = useMemo(() => {
    const collapsedHubIds = new Set(
      nodes.filter(n => n.type === 'hub' && (n.data as any)?.metadata?.isCollapsed).map(n => n.id)
    );

    const hiddenNodeIds = new Set();
    edges.forEach(edge => {
      if (collapsedHubIds.has(edge.source)) hiddenNodeIds.add(edge.target);
      if (collapsedHubIds.has(edge.target)) hiddenNodeIds.add(edge.source);
    });

    // Edges whose endpoint is trashed stay in the store (so restoring the node
    // brings its connections back) but must not be handed to React Flow.
    const nodeIds = new Set(nodes.map(n => n.id));
    return edges.map(edge => {
      const isHidden =
        collapsedHubIds.has(edge.source) ||
        collapsedHubIds.has(edge.target) ||
        hiddenNodeIds.has(edge.source) ||
        hiddenNodeIds.has(edge.target) ||
        !nodeIds.has(edge.source) ||
        !nodeIds.has(edge.target) ||
        hiddenEdgeTypes.has(edgeTypeOf(edge.data));
      const constellationMode = constellation
        ? (constellation.has(edge.source) && constellation.has(edge.target) ? 'lit' : 'dim')
        : undefined;
      return {
        ...edge,
        hidden: isHidden,
        data: { ...edge.data, constellation: constellationMode },
      };
    });
  }, [nodes, edges, constellation, hiddenEdgeTypes]);

  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const onNodeMouseEnter = useCallback((_: React.MouseEvent, node: any) => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = setTimeout(() => {
      setHoveredNodeId(node.id);
    }, 3000);
  }, []);

  const onNodeMouseLeave = useCallback(() => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    setHoveredNodeId(null);
  }, []);

  const onNodeDragStart = useCallback((_: any, node: any) => {
    dragStartPos.current[node.id] = { ...node.position };
  }, []);

  // Double-clicking an alias pin warps the camera to its real node
  const onNodeDoubleClick = useCallback((_: React.MouseEvent, node: any) => {
    if (node.type !== 'alias') return;
    const targetId = node.data?.metadata?.targetId;
    if (!targetId) return;
    const target = useStore.getState().nodes.find(n => n.id === targetId);
    if (!target) return;
    const w = (target.measured?.width ?? (target.style as any)?.width ?? 300) as number;
    const h = (target.measured?.height ?? (target.style as any)?.height ?? 200) as number;
    setCenter(target.position.x + w / 2, target.position.y + h / 2, { zoom: 1, duration: 800 });
  }, [setCenter]);

  const toggleEdgeType = useCallback((key: string) => {
    setHiddenEdgeTypes(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const onNodeDragStop = useCallback((_: any, draggedNode: any) => {
    const node = draggedNode as AppNode;

    // Record the move in undo history (positions persist via onNodesChange)
    const start = dragStartPos.current[node.id];
    delete dragStartPos.current[node.id];
    if (start && (start.x !== node.position.x || start.y !== node.position.y)) {
      const end = { ...node.position };
      useStore.getState().pushHistory({
        undo: () => useStore.getState().setNodePosition(node.id, start),
        redo: () => useStore.getState().setNodePosition(node.id, end),
      });
    }

    const intersections = getIntersectingNodes(node);
      const targetGroup = intersections.find(n => n.type === 'group') as AppNode | undefined;

      if (targetGroup) {
        // NESTING INTO A GROUP
        if (node.parentId !== targetGroup.id) {
          useStore.setState((state) => {
            let absX = 0; let absY = 0;
            let current: AppNode | undefined = node;
            while (current) {
              absX += current.position.x; absY += current.position.y;
              current = state.nodes.find(n => n.id === current?.parentId);
            }
            let targetAbsX = 0; let targetAbsY = 0;
            let targetCurrent: AppNode | undefined = targetGroup;
            while (targetCurrent) {
              targetAbsX += targetCurrent.position.x; targetAbsY += targetCurrent.position.y;
              targetCurrent = state.nodes.find(n => n.id === targetCurrent?.parentId);
            }
            
            const otherNodes = state.nodes.filter(n => n.id !== node.id);
            const draggedNode = state.nodes.find(n => n.id === node.id);
            if (!draggedNode) return state;

            const updatedNode = {
              ...draggedNode,
              parentId: targetGroup.id,
              extent: undefined, // Remove extent so it doesn't trap or bug out
              position: { x: absX - targetAbsX, y: absY - targetAbsY }
            };

            return { nodes: [...otherNodes, updatedNode] };
          });
          useStore.getState().updateNodeParent(node.id, targetGroup.id);
          return;
        }
      } else if (node.parentId) {
        // DRAGGING OUT OF A GROUP
        // Check if the old parent was a group
        const oldParent = useStore.getState().nodes.find(n => n.id === node.parentId);
        if (oldParent && oldParent.type === 'group') {
          useStore.setState((state) => {
            let absX = 0; let absY = 0;
            let current: AppNode | undefined = node;
            while (current) {
              absX += current.position.x; absY += current.position.y;
              current = state.nodes.find(n => n.id === current?.parentId);
            }

            const otherNodes = state.nodes.filter(n => n.id !== node.id);
            const draggedNode = state.nodes.find(n => n.id === node.id);
            if (!draggedNode) return state;

            const updatedNode = {
              ...draggedNode,
              parentId: undefined,
              extent: undefined,
              position: { x: absX, y: absY }
            };

            return { nodes: [...otherNodes, updatedNode] };
          });
          useStore.getState().updateNodeParent(node.id, null);
          return;
        }
      }

      // If we dropped onto a DECK
      if (intersections.length > 0) {
        const targetNode = intersections[0] as AppNode;
        const cardData = { label: node.data.label, content: node.data.content };

        // Cards live in metadata so they survive restarts -- metadata is the
        // only free-form field updateNodeData persists to the DB.
        const meta = (targetNode.data.metadata as any) || {};
        const deckCards: any[] = Array.isArray(meta.cards) ? meta.cards : [];
        useStore.getState().updateNodeData(targetNode.id, {
          metadata: { ...meta, cards: [...deckCards, cardData], activeIndex: deckCards.length }
        });

        // Soft-delete the absorbed node so it lands in the trash instead of
        // silently reappearing on next launch.
        useStore.getState().deleteNode(node.id);
        return;
      }
  }, [getIntersectingNodes]);

  // Phase 4: Gamified "Tech Tree" Progression
  useEffect(() => {
    // Arbitrary auto-unlocks are disabled in favor of Spiderweb linking
  }, [nodes, edges, selectedNodeId, addNode, onConnect]);

  const onNodeClick = useCallback((_: React.MouseEvent, node: any) => {
    setSelectedNodeId(node.id);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null);
  }, []);

  const onConnectEnd = useCallback((event: any, connectionState: any) => {
    if (!connectionState.isValid) {
      const id = crypto.randomUUID();
      const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
      
      addNode({
        id,
        type: 'idea',
        position,
        data: { label: 'New Idea', content: '', manuscript: '' }
      }).then(() => {
        // We know the source of the edge drag, but not always if it was dragged from target
        // If they dragged from a source handle, connectionState.fromNodeId is set
        if (connectionState.fromNodeId) {
          onConnect({
            source: connectionState.fromNodeId,
            target: id,
            sourceHandle: connectionState.fromHandleId,
            targetHandle: 'top' // default connecting to top of new node
          } as any);
        }
      });
    }
  }, [screenToFlowPosition, addNode, onConnect]);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const files = Array.from(event.dataTransfer.files);
      if (files.length > 0) {
        for (const file of files) {
          if (file.name.endsWith('.md') || file.type === 'text/markdown' || file.name.endsWith('.txt')) {
            const reader = new FileReader();
            reader.onload = (e) => {
              const text = e.target?.result as string;
              const position = screenToFlowPosition({
                x: event.clientX,
                y: event.clientY,
              });
              
              // Spawn a theme node (Rich text editor) for imported documents
              addNode({
                id: crypto.randomUUID(),
                type: 'theme',
                position,
                data: {
                  label: file.name.replace(/\.(md|txt)$/i, ''),
                  content: text,
                  manuscript: text
                }
              });
            };
            reader.readAsText(file);
          }
        }
      }
    },
    [screenToFlowPosition, addNode]
  );

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex' }}>
      
      {/* Visual Node Environment */}
      <div 
        style={{ flex: 1, position: 'relative' }}
        onDragOver={onDragOver}
        onDrop={onDrop}
      >
        <ReactFlow
          id="canvas-area"
          nodes={processedNodes}
          edges={processedEdges}
          onNodesChange={onNodesChange}
          onNodeDragStart={onNodeDragStart}
          onNodeDragStop={onNodeDragStop}
          onNodeMouseEnter={onNodeMouseEnter}
          onNodeMouseLeave={onNodeMouseLeave}
          onNodeDoubleClick={onNodeDoubleClick}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          connectionLineComponent={LiveConnectionLine}
          connectionMode={ConnectionMode.Loose}
          connectionRadius={100}
          onConnectEnd={onConnectEnd}
          onReconnect={onReconnect}
          edgesReconnectable={true}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          panOnScroll={false}
          zoomOnScroll={true}
          zoomOnPinch={true}
          zoomOnDoubleClick={false}
          minZoom={0.1}
          maxZoom={4}
          panOnDrag={true}
          selectionOnDrag={false}
          fitView
          className="cosmic-canvas"
          defaultEdgeOptions={{ 
            style: { stroke: '#a88530', strokeWidth: 2 } 
          }}
        >
          <DynamicCanvasBackground />
          <Controls>
            <ControlButton
              onClick={async () => {
                const { nodes: layoutedNodes } = await getLayoutedElements(useStore.getState().nodes, useStore.getState().edges);
                await useStore.getState().applyLayout(layoutedNodes as AppNode[]);
                setCenter(0, 0, { zoom: 0.6, duration: 800 });
              }}
              title="Clean Up Board (Auto-Layout)"
            >
              <Wand size={14} className="text-[#f0c050]" />
            </ControlButton>
            <ControlButton
              onClick={() => { if (selectedNodeId) useStore.getState().setAnchor(selectedNodeId); }}
              title="Pin selected node as the Anchor (Big Idea)"
              disabled={!selectedNodeId}
            >
              <Anchor size={14} className={selectedNodeId ? 'text-[#f0c050]' : 'text-gray-600'} />
            </ControlButton>
            <ControlButton
              onClick={() => setAnchorCheck(c => !c)}
              title={anchorCheck ? 'Exit anchor check' : 'Anchor check: dim everything that doesn\'t trace back to the Big Idea'}
              disabled={!anchorId}
            >
              <Crosshair size={14} className={anchorCheck ? 'text-[#f0c050]' : (anchorId ? 'text-white' : 'text-gray-600')} />
            </ControlButton>
            <ControlButton
              onClick={() => useStore.getState().undo()}
              title="Undo (Ctrl+Z)"
              disabled={!canUndo}
            >
              <Undo2 size={14} className={canUndo ? 'text-white' : 'text-gray-600'} />
            </ControlButton>
            <ControlButton
              onClick={() => useStore.getState().redo()}
              title="Redo (Ctrl+Shift+Z)"
              disabled={!canRedo}
            >
              <Redo2 size={14} className={canRedo ? 'text-white' : 'text-gray-600'} />
            </ControlButton>
            <ControlButton
              onClick={() => {
                if (selectedNodeId) {
                  useStore.getState().deleteNode(selectedNodeId);
                  setSelectedNodeId(null);
                }
              }} 
              title="Delete Selected Node"
              disabled={!selectedNodeId}
            >
              <Trash2 size={14} className={selectedNodeId ? "text-red-500" : "text-gray-500"} />
            </ControlButton>
            <ControlButton 
              onClick={() => {
                if (selectedNodeId) {
                  useStore.getState().duplicateNode(selectedNodeId);
                }
              }} 
              title="Duplicate Selected Node"
              disabled={!selectedNodeId}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={selectedNodeId ? "text-white" : "text-gray-500"}><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
            </ControlButton>
          </Controls>
          <Panel position="top-left" className="m-4 flex gap-2">
            <CreateNodeMenu onCreate={(type, label) => {
              const newNodeId = crypto.randomUUID();
              // Spawn in the center of the screen, with a slight random offset
              const centerPos = screenToFlowPosition({ 
                x: window.innerWidth / 2 + (Math.random() * 50 - 25), 
                y: window.innerHeight / 2 + (Math.random() * 50 - 25) 
              });
              let width: number | undefined = 400;
              let height: number | undefined = 300;
              let zIndex = 1;

              if (['document', 'book', 'chapter', 'scene'].includes(type)) {
                // Tier 1: main writing surfaces get the most room
                width = 480;
                height = 380;
              } else if (['character', 'location', 'faction', 'event'].includes(type)) {
                // Tier 2: knowledge cards sit between writing surfaces and sparks
                width = 320;
                height = 260;
              } else if (type === 'quote') {
                width = 320;
                height = 220;
              } else if (type === 'alias') {
                width = undefined; // pill sizes itself
                height = undefined;
                zIndex = 2;
              } else if (type === 'hub') {
                width = 120;
                height = 120;
              } else if (type === 'sequence') {
                width = 500;
                height = 200;
              } else if (type === 'group') {
                width = 400;
                height = 400;
                zIndex = -1;
              } else if (type === 'lore') {
                width = 300;
                height = 200;
              } else if (type === 'snippet' || type === 'reference') { // Idea node
                width = 300;
                height = 150;
              } else if (type === 'master') {
                width = 400;
                height = 300;
              } else if (type === 'logic') {
                width = 300;
                height = 200;
              } else if (type === 'item') {
                width = 300;
                height = 250;
              } else if (type === 'deck') {
                width = 250;
                height = 300;
              } else if (type === 'print') {
                width = 300;
                height = 250;
              }

              addNode({
                id: newNodeId,
                type,
                position: centerPos,
                data: { label, content: '', manuscript: '' },
                style: { minWidth: width, minHeight: height, zIndex }
              });
            }} />
            {/* Removed the old compile button here since we now use the Master Print Node */}
          </Panel>
          <div className="search-wrapper">
            <CanvasSearch />
          </div>
          <ProjectManager />
          <Panel position="bottom-right" className="m-4 flex flex-col items-end gap-1 select-none">
            {orphanNodes.length > 0 && (
              <div className="relative pointer-events-auto">
                {orphansOpen && (
                  <div className="orphan-list">
                    {orphanNodes.slice(0, 10).map(n => (
                      <button
                        key={n.id}
                        className="orphan-item"
                        onClick={() => {
                          const w = ((n.measured as any)?.width ?? (n.style as any)?.width ?? 300) as number;
                          const h = ((n.measured as any)?.height ?? (n.style as any)?.height ?? 200) as number;
                          setCenter(n.position.x + w / 2, n.position.y + h / 2, { zoom: 1, duration: 700 });
                          setOrphansOpen(false);
                        }}
                      >
                        <span className="palette-type">{n.type || 'node'}</span>
                        <span className="truncate">{n.data.label || 'Untitled'}</span>
                      </button>
                    ))}
                    {orphanNodes.length > 10 && (
                      <div className="px-3 py-1 text-[9px] text-gray-600">+{orphanNodes.length - 10} more</div>
                    )}
                  </div>
                )}
                <button
                  className="orphan-widget"
                  onClick={() => setOrphansOpen(o => !o)}
                  title="Nodes with no connections — link them into the web or let them go"
                >
                  <CircleDashed size={11} />
                  {orphanNodes.length} unlinked
                </button>
              </div>
            )}
            <div className="edge-legend pointer-events-auto">
              {Object.entries(EDGE_TYPES).map(([key, def]) => (
                <button
                  key={key}
                  className={`edge-legend-item ${hiddenEdgeTypes.has(key) ? 'is-hidden' : ''}`}
                  onClick={() => toggleEdgeType(key)}
                  title={hiddenEdgeTypes.has(key) ? `Show "${def.label}" connections` : `Hide "${def.label}" connections`}
                >
                  <svg width="18" height="6">
                    <line x1="0" y1="3" x2="18" y2="3" stroke={def.color} strokeWidth="2" strokeDasharray={def.dash} />
                  </svg>
                  {def.label}
                </button>
              ))}
            </div>
            <SaveIndicator />
            <div className="canvas-hint">@ links nodes · click a line to type it · Ctrl+K jumps anywhere</div>
          </Panel>
        </ReactFlow>

        <WarpFocusOverlay />
        <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />

        {previewMarkdown !== null && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-12">
            <div className="bg-[#111114] border border-[#3730a3] w-full max-w-4xl h-full rounded-xl shadow-2xl flex flex-col overflow-hidden">
              <div className="flex justify-between items-center p-6 border-b border-[#3730a3] bg-[#312e81]/30">
                <h2 className="text-xl font-serif text-white">Compiled Manuscript Preview</h2>
                <div className="flex gap-4">
                  <button 
                    onClick={() => {
                      setTimeout(() => window.print(), 100);
                    }}
                    className="px-4 py-2 bg-[#d4b98c] hover:bg-[#fbbf24] text-black rounded font-bold text-sm tracking-widest uppercase transition-colors mr-2"
                  >
                    Download PDF
                  </button>
                  <button 
                    onClick={() => {
                      const blob = new Blob([previewMarkdown], { type: 'text/markdown' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `Manuscript.md`;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      URL.revokeObjectURL(url);
                      setPreviewMarkdown(null);
                    }}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded font-bold text-sm tracking-widest uppercase transition-colors"
                  >
                    Download .md
                  </button>
                  <button onClick={() => setPreviewMarkdown(null)} className="text-gray-500 hover:text-white px-4 py-2 uppercase tracking-widest text-sm">✕ Close</button>
                </div>
              </div>
              <div className="p-12 overflow-y-auto flex-1 font-serif text-lg text-gray-200 leading-loose prose prose-invert max-w-none whitespace-pre-wrap">
                {previewMarkdown}
              </div>
            </div>
          </div>
        )}

        {/* Old Compile Mode UI has been replaced by the Master Print Node */}
      </div>

      <SaveErrorBanner />
    </div>
  );
}

// Live save status so there's never any doubt whether work is persisted.
function SaveIndicator() {
  const pendingSaves = useStore(state => state.pendingSaves);
  const lastSavedAt = useStore(state => state.lastSavedAt);
  const saving = pendingSaves > 0;
  return (
    <div
      className={`save-indicator ${saving ? 'is-saving' : ''}`}
      title={lastSavedAt ? `Last saved ${new Date(lastSavedAt).toLocaleTimeString()}` : 'No changes yet this session'}
    >
      {saving ? '● Saving…' : '✓ All changes saved'}
    </div>
  );
}

// WARP FOCUS: fullscreen distraction-free writing mode for a single node,
// opened via the ⤢ button on writing nodes. Esc or ✕ returns to the canvas.
function WarpFocusOverlay() {
  const focusedNodeId = useStore(state => state.focusedNodeId);
  const setFocusedNode = useStore(state => state.setFocusedNode);
  const updateNodeData = useStore(state => state.updateNodeData);
  const node = useStore(state => state.nodes.find(n => n.id === state.focusedNodeId));

  if (!focusedNodeId || !node) return null;

  const nodeType = node.type || 'idea';
  const usesManuscript = ['document', 'book', 'chapter', 'scene'].includes(nodeType);
  const text = usesManuscript ? (node.data.manuscript || '') : (node.data.content || '');
  const wordCount = text.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(w => w.length > 0).length;

  return (
    <div className="absolute inset-0 bg-black/85 backdrop-blur-md z-[100] flex items-center justify-center p-8">
      <div className="warp-overlay-content bg-[#111114] border border-[#8c734b] w-full max-w-4xl h-full rounded-xl shadow-2xl flex flex-col overflow-hidden">
        <div className="flex justify-between items-center gap-4 p-5 border-b border-[#8c734b]/40 bg-[#1a1a1f]">
          <input
            className="flex-1 min-w-0 bg-transparent outline-none text-xl font-serif text-[#d4b98c] border-b border-transparent focus:border-[#8c734b] uppercase tracking-wider"
            value={node.data.label}
            onChange={(e) => updateNodeData(node.id, { label: e.target.value })}
            placeholder="Node Title"
          />
          <span className="text-xs text-gray-500 shrink-0">{wordCount} words</span>
          <button
            onClick={() => setFocusedNode(null)}
            className="text-gray-500 hover:text-white px-3 py-1 uppercase tracking-widest text-sm shrink-0"
            title="Return to canvas (Esc)"
          >
            ✕ Close
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-10 font-serif text-lg leading-loose">
          <RichTextEditor
            content={text}
            onChange={(html) => {
              if (usesManuscript) updateNodeData(node.id, { manuscript: html });
              else updateNodeData(node.id, { content: html });
            }}
            textColor="#e5e7eb"
            nodeId={node.id}
          />
        </div>
      </div>
    </div>
  );
}

// Non-fatal banner for failed DB writes: the canvas keeps working, but the
// user needs to know their last change may not have been saved.
function SaveErrorBanner() {
  const saveError = useStore(state => state.saveError);
  const clearSaveError = useStore(state => state.clearSaveError);
  if (!saveError) return null;
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[200] flex items-center gap-3 bg-[#3f1119] border border-red-700 text-red-200 text-sm rounded-lg px-4 py-2 shadow-2xl max-w-xl">
      <span className="whitespace-pre-wrap">⚠ {saveError}</span>
      <button
        onClick={clearSaveError}
        className="text-red-400 hover:text-white shrink-0 font-bold"
        title="Dismiss"
      >
        ✕
      </button>
    </div>
  );
}

export default function App() {
  const loadInitialData = useStore(state => state.loadInitialData);
  useEffect(() => { loadInitialData(); }, [loadInitialData]);

  const { error, isLoading } = useStore();

  if (error) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#0a0a0c] text-red-500 p-8">
        <h1 className="text-2xl font-bold mb-4">Database Engine Error</h1>
        <pre className="bg-[#1a1a1f] p-4 rounded text-sm whitespace-pre-wrap">{error}</pre>
        <button onClick={() => window.location.reload()} className="mt-4 px-4 py-2 bg-red-800 text-white rounded">Retry</button>
      </div>
    );
  }

  return (
    <>
      {isLoading && (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-[#0a0a0c]/80 backdrop-blur-sm text-[#fbbf24]">
          Loading Engine...
        </div>
      )}
      <ReactFlowProvider>
        <TutorialOverlay />
        <ReferencePanel />
        <FlowCanvas />
      </ReactFlowProvider>
    </>
  );
}
