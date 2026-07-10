import { Edge } from '@xyflow/react';
import { edgeTypeOf } from './edgeTypes';
import { AppNode } from '../store/useStore';

export const compileManuscript = (
  printNodeId: string,
  nodes: AppNode[],
  edges: Edge[]
): string => {
  let manuscriptText = '';

  // 1. Find the Print Node
  const printNode = nodes.find(n => n.id === printNodeId);
  if (!printNode) return '# Compilation Error: Print node not found.';

  // 2. Find nodes feeding into the Print Node
  const incomingEdges = edges.filter(e => e.target === printNodeId);
  if (incomingEdges.length === 0) return 'No content connected to Compile node. Connect scenes or chapters to compile them.';

  // 3. Recursive function to crawl nodes and gather text
  const compileNode = (nodeId: string, depth: number) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;

    // Append title/content based on type
    const indent = '#'.repeat(Math.min(depth + 1, 6));
    
    if (node.type === 'master') {
      manuscriptText += `${indent} ${node.data.label}\n\n`;
      if (node.data.content) manuscriptText += `*${node.data.content}*\n\n`;
    } else if (node.type === 'chapter' || node.type === 'group') {
      manuscriptText += `\n${indent} ${node.data.label}\n\n`;
    } else if (node.type === 'scene' || node.type === 'document') {
      manuscriptText += `\n${indent} ${node.data.label}\n\n`;
      if (node.data.manuscript) {
        manuscriptText += `${node.data.manuscript}\n\n`;
      }
    }

    // Two ways a node flows into another:
    // A. Children (nodes that have this node as parentId)
    // B. Explicit 'causes' or 'references' edges going OUT from this node
    
    // First, compile children (sorted by Y position to read top-to-bottom)
    const children = nodes
      .filter(n => n.parentId === node.id)
      .sort((a, b) => (a.position.y || 0) - (b.position.y || 0));
      
    for (const child of children) {
      compileNode(child.id, depth + 1);
    }

    // Second, compile connected nodes (if this isn't just a container)
    // To prevent infinite loops, we'd need a visited set if graphs can cycle,
    // but in story flow it's usually a DAG. We'll add a simple visited check.
    const outgoingEdges = edges
      .filter(e => e.source === node.id && edgeTypeOf(e.data) !== 'contradicts')
      // Sort edges by source Y position if multiple come from same node? Or just follow naturally.
      .sort((a, b) => {
        const targetA = nodes.find(n => n.id === a.target);
        const targetB = nodes.find(n => n.id === b.target);
        return ((targetA?.position?.y || 0) - (targetB?.position?.y || 0));
      });
      
    for (const edge of outgoingEdges) {
      if (!visited.has(edge.target) && nodes.find(n => n.id === edge.target)?.parentId !== node.id) {
        visited.add(edge.target);
        compileNode(edge.target, depth);
      }
    }
  };

  const visited = new Set<string>();

  // Start compilation for all roots connected to Print node
  // Sort them by Y position to compile top-to-bottom
  const roots = incomingEdges
    .map(e => nodes.find(n => n.id === e.source))
    .filter((n): n is AppNode => !!n)
    .sort((a, b) => (a.position.y || 0) - (b.position.y || 0));

  for (const root of roots) {
    if (!visited.has(root.id)) {
      visited.add(root.id);
      compileNode(root.id, 1);
    }
  }

  return manuscriptText.trim();
};
