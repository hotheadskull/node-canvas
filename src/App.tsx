import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  BackgroundVariant,
  Panel,
  ReactFlowProvider,
  useReactFlow,
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

import { InfoBoxNode } from './components/InfoBoxNode';

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

const nodeTypes = {
  document: ThemeNode, // Main text box
  reference: ThemeNode, // Small connectable node
  info_box: InfoBoxNode,
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

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex' }}>
      
      {/* Visual Node Environment */}
      <div style={{ flex: 1, position: 'relative' }}>
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
          className="bg-[#0a0a0c]"
          defaultEdgeOptions={{ 
            style: { stroke: '#4c1d95', strokeWidth: 2 } 
          }}
        >
          <Background color="#2a2a35" variant={BackgroundVariant.Dots} gap={24} size={2} />
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
              let width: number | undefined = 250;
              let height: number | undefined = 150;
              let zIndex = 1;
              
              if (type === 'hub') {
                width = 120;
                height = 120;
              } else if (type === 'sequence') {
                width = 600;
                height = 200;
              } else if (type === 'group') {
                width = 400;
                height = 400;
                zIndex = -1;
              } else if (type === 'lore') {
                width = 320;
                height = 200;
              } else if (type === 'snippet') {
                width = 200;
                height = 100;
              } else if (type === 'master') {
                width = 500;
                height = 350;
              } else if (type === 'logic') {
                width = 320;
                height = 200;
              } else if (type === 'item') {
                width = 320;
                height = 300;
              } else if (type === 'deck') {
                width = 288;
                height = 200;
              } else if (type === 'print') {
                width = 200;
                height = 500;
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
          <CanvasSearch />
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
