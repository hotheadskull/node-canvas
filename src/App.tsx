import React, { useState, useCallback, useEffect, useMemo } from 'react';
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
import { ThemeNode } from './components/ThemeNode';
import { ElasticEdge } from './components/ElasticEdge';
import { CreateNodeMenu } from './components/CreateNodeMenu';
import { CanvasSearch } from './components/CanvasSearch';
import { ProjectManager } from './components/ProjectManager';
import './App.css';
import { Trash2 } from 'lucide-react';

import { QuoteNode } from './components/QuoteNode';
import { StatNode } from './components/StatNode';
import { TaskNode } from './components/TaskNode';
import { SequenceNode } from './components/SequenceNode';
import { HubNode } from './components/HubNode';
import { GroupNode } from './components/GroupNode';
import { LoreNode } from './components/LoreNode';
import { SnippetNode } from './components/SnippetNode';
import { MasterNode } from './components/MasterNode';
import { LogicNode } from './components/LogicNode';
import { ItemNode } from './components/ItemNode';
import { DeckNode } from './components/DeckNode';
import { PrintNode } from './components/PrintNode';

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

const nodeTypes = {
  document: ThemeNode,
  reference: SnippetNode,
  quote: QuoteNode,
  stat: StatNode,
  task: TaskNode,
  sequence: SequenceNode,
  hub: HubNode,
  group: GroupNode,
  lore: LoreNode,
  snippet: SnippetNode,
  master: MasterNode,
  logic: LogicNode,
  item: ItemNode,
  deck: DeckNode,
  print: PrintNode,
  
  // Backwards compatibility for existing nodes
  book: ThemeNode,
  chapter: ThemeNode,
  scene: ThemeNode,
  character: ThemeNode,
  location: ThemeNode,
  faction: ThemeNode,
  event: ThemeNode,
  idea: ThemeNode,
  story: ThemeNode,
  directory: ThemeNode,
  
  default: ThemeNode,
};

const edgeTypes = {
  default: ElasticEdge,
};

function FlowCanvas() {
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, onReconnect } = useStore();
  const addNode = useStore(state => state.addNode);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const { screenToFlowPosition, getIntersectingNodes } = useReactFlow();
  
  const previewMarkdown = useStore(state => state.previewMarkdown);
  const setPreviewMarkdown = useStore(state => state.setPreviewMarkdown);

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
      if (node.type === 'hub') return node;
      
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
      
      return {
        ...node,
        position: targetPosition,
        className: isHidden 
          ? 'opacity-0 pointer-events-none'
          : 'opacity-100',
        style: {
          ...node.style,
          '--node-transition': isHidden 
            ? 'transform 0.8s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.6s ease' // Faster pull-in
            : 'transform 3.5s cubic-bezier(0.05, 0.9, 0.1, 1.0), opacity 3.0s ease' // Extremely gentle float out
        } as any
      };
    });
  }, [nodes, edges]);

  const processedEdges = useMemo(() => {
    const collapsedHubIds = new Set(
      nodes.filter(n => n.type === 'hub' && (n.data as any)?.metadata?.isCollapsed).map(n => n.id)
    );
    return edges.map(edge => {
      const isHidden = collapsedHubIds.has(edge.source) || collapsedHubIds.has(edge.target);
      return {
        ...edge,
        hidden: isHidden
      };
    });
  }, [nodes, edges]);

  const onNodeDragStop = useCallback((_: any, draggedNode: any) => {
    const node = draggedNode as AppNode;
    const intersections = getIntersectingNodes(node);
    if (intersections.length > 0) {
      const targetNode = intersections[0] as AppNode;
      
      // NESTING INTO INFO BOX
      if (targetNode.type === 'group' && node.parentId !== targetNode.id) {
        useStore.setState((state) => ({
          nodes: state.nodes.map(n => 
            n.id === node.id 
              ? { 
                  ...n, 
                  parentId: targetNode.id, 
                  extent: 'parent',
                  position: { x: node.position.x - targetNode.position.x, y: node.position.y - targetNode.position.y }
                } 
              : n
          )
        }));
        useStore.getState().updateNodeParent(node.id, targetNode.id);
        return;
      }

      // DROPPING INTO DECK
      if (targetNode.type === 'deck') {
        const cardData = { label: node.data.label, content: node.data.content };
        
        const deckCards: any[] = Array.isArray(targetNode.data.cards) ? targetNode.data.cards : [];
        useStore.getState().updateNodeData(targetNode.id, { 
          cards: [...deckCards, cardData],
          activeIndex: deckCards.length
        });

        // Delete the original node
        useStore.setState(state => ({
          nodes: state.nodes.filter(n => n.id !== node.id),
          edges: state.edges.filter(e => e.source !== node.id && e.target !== node.id)
        }));
        return;
      }
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
          nodes={processedNodes}
          edges={processedEdges}
          onNodesChange={onNodesChange}
          onNodeDragStop={onNodeDragStop}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
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
              let width: number | undefined = 400; // Default (e.g. document/chapter)
              let height: number | undefined = 300;
              let zIndex = 1;
              
              if (type === 'hub') {
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
                style: { width, height, zIndex }
              });
            }} />
            {/* Removed the old compile button here since we now use the Master Print Node */}
          </Panel>
          <div className="search-wrapper">
            <CanvasSearch />
          </div>
          <ProjectManager />
        </ReactFlow>

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

  if (isLoading) {
    return <div className="h-screen w-screen flex items-center justify-center bg-[#0a0a0c] text-[#fbbf24]">Loading Engine...</div>;
  }

  return (
    <ReactFlowProvider>
      <FlowCanvas />
    </ReactFlowProvider>
  );
}
