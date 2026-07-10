import ELK from 'elkjs/lib/elk.bundled.js';
import { Edge, Node } from '@xyflow/react';

const elk = new ELK();

const DEFAULT_WIDTH = 300;
const DEFAULT_HEIGHT = 150;

export const getLayoutedElements = async (nodes: Node[], edges: Edge[]) => {
  // Map React Flow nodes/edges to ELK's hierarchical format
  
  // Find roots (nodes without a parentId)
  const roots = nodes.filter(n => !n.parentId);
  
  const buildElkNode = (n: Node): any => {
    // Find children
    const children = nodes.filter(child => child.parentId === n.id);
    const hasChildren = children.length > 0;
    
    // For groups, we might want different layout settings
    const layoutOptions: any = {
      'elk.padding': '[top=60,left=20,bottom=20,right=20]',
      'elk.direction': 'RIGHT',
    };
    
    const elkNode: any = {
      id: n.id,
      // If it has a specific width/height, use it, else default
      width: n.style?.width ? (typeof n.style.width === 'number' ? n.style.width : parseInt(n.style.width as string)) : DEFAULT_WIDTH,
      height: n.style?.height ? (typeof n.style.height === 'number' ? n.style.height : parseInt(n.style.height as string)) : DEFAULT_HEIGHT,
      layoutOptions,
    };

    if (hasChildren) {
      elkNode.children = children.map(buildElkNode);
    }
    
    return elkNode;
  };

  const graph = {
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': 'RIGHT',
      'elk.spacing.nodeNode': '80',
      'elk.layered.spacing.nodeNodeBetweenLayers': '120',
      'elk.edgeRouting': 'ORTHOGONAL',
      'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX'
    },
    children: roots.map(buildElkNode),
    edges: edges.map(e => ({
      id: e.id,
      sources: [e.source],
      targets: [e.target]
    }))
  };

  try {
    const layoutedGraph = await elk.layout(graph);
    
    // Flatten the layouted graph back to a nodes list for React Flow
    const layoutedNodes: Node[] = [];
    
    const flattenNodes = (elkNodes: any[]) => {
      for (const en of elkNodes) {
        const rfNode = nodes.find(n => n.id === en.id);
        if (rfNode) {
          layoutedNodes.push({
            ...rfNode,
            position: { x: en.x || 0, y: en.y || 0 },
            style: { ...rfNode.style, width: en.width, height: en.height }
          });
        }
        if (en.children) {
          flattenNodes(en.children);
        }
      }
    };
    
    flattenNodes(layoutedGraph.children || []);
    
    return { nodes: layoutedNodes, edges };
  } catch (error) {
    console.error('ELK Layout Error', error);
    return { nodes, edges }; // Return original on failure
  }
};
