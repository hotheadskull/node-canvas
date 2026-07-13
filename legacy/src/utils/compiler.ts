import { Edge } from '@xyflow/react';
import { edgeTypeOf } from './edgeTypes';
import { AppNode } from '../store/useStore';

// The compile pipeline: walk the graph into structured blocks, then render
// those blocks as Markdown, plain text, or HTML (print/PDF and Word exports
// share the HTML renderer). One walk, many output formats.
export type CompileBlock =
  | { kind: 'heading'; level: number; text: string }
  | { kind: 'epigraph'; text: string }
  | { kind: 'content'; html: string }
  | { kind: 'beats'; items: { title: string; subtitle: string }[] };

const WRITING_TYPES = ['document', 'book', 'chapter', 'scene', 'story'];

// TipTap stores manuscripts as HTML. Convert to readable Markdown-ish text
// for the MD/TXT exports; the HTML renderers embed the original markup.
export const htmlToPlainMarkdown = (html: string): string => {
  if (!html) return '';
  let text = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>\s*<p[^>]*>/gi, '\n\n')
    .replace(/<\/(h[1-6]|li|blockquote|div)>/gi, '\n')
    .replace(/<h1[^>]*>/gi, '# ')
    .replace(/<h2[^>]*>/gi, '## ')
    .replace(/<h3[^>]*>/gi, '### ')
    .replace(/<li[^>]*>/gi, '- ')
    .replace(/<blockquote[^>]*>/gi, '> ')
    .replace(/<(strong|b)[^>]*>(.*?)<\/(strong|b)>/gi, '**$2**')
    .replace(/<(em|i)[^>]*>(.*?)<\/(em|i)>/gi, '*$2*')
    .replace(/<[^>]+>/g, '');
  text = text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'");
  return text.replace(/\n{3,}/g, '\n\n').trim();
};

export const compileBlocks = (
  printNodeId: string,
  nodes: AppNode[],
  edges: Edge[]
): CompileBlock[] => {
  const blocks: CompileBlock[] = [];

  const printNode = nodes.find(n => n.id === printNodeId);
  if (!printNode) return blocks;

  const incomingEdges = edges.filter(e => e.target === printNodeId);
  if (incomingEdges.length === 0) return blocks;

  const visited = new Set<string>();

  const compileNode = (nodeId: string, depth: number) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;

    const level = Math.min(depth, 6);
    const label = node.data.label || 'Untitled';
    const meta = (node.data as any).metadata || {};

    if (node.type === 'master') {
      blocks.push({ kind: 'heading', level, text: label });
      const core = node.data.content || meta.coreIdea || '';
      if (core) blocks.push({ kind: 'epigraph', text: htmlToPlainMarkdown(core) });
    } else if (WRITING_TYPES.includes(node.type || '')) {
      blocks.push({ kind: 'heading', level, text: label });
      const body = node.data.manuscript || node.data.content || '';
      if (body) blocks.push({ kind: 'content', html: body });
    } else if (node.type === 'group' || node.type === 'directory') {
      blocks.push({ kind: 'heading', level, text: label });
    } else if (node.type === 'sequence') {
      blocks.push({ kind: 'heading', level, text: label });
      const beats: { title: string; subtitle: string }[] = meta.beats || [];
      if (beats.length > 0) {
        blocks.push({
          kind: 'beats',
          items: beats.map(b => ({ title: b.title || 'Untitled beat', subtitle: b.subtitle || '' })),
        });
      }
    } else if (node.type === 'quote') {
      const quoteText = htmlToPlainMarkdown(node.data.content || '');
      if (quoteText) blocks.push({ kind: 'epigraph', text: quoteText });
    }
    // Knowledge cards and other structure nodes contribute no text, but the
    // walk still flows THROUGH them so chains like scene -> character -> scene
    // don't dead-end.

    // Children first (nested inside groups), top-to-bottom
    const children = nodes
      .filter(n => n.parentId === node.id)
      .sort((a, b) => (a.position.y || 0) - (b.position.y || 0));
    for (const child of children) {
      if (!visited.has(child.id)) {
        visited.add(child.id);
        compileNode(child.id, depth + 1);
      }
    }

    // Then follow outgoing story-flow edges, top-to-bottom by target
    const outgoingEdges = edges
      .filter(e => e.source === node.id && e.target !== printNodeId && edgeTypeOf(e.data) !== 'contradicts')
      .sort((a, b) => {
        const targetA = nodes.find(n => n.id === a.target);
        const targetB = nodes.find(n => n.id === b.target);
        return (targetA?.position?.y || 0) - (targetB?.position?.y || 0);
      });
    for (const edge of outgoingEdges) {
      if (!visited.has(edge.target)) {
        visited.add(edge.target);
        compileNode(edge.target, depth);
      }
    }
  };

  // Slot order IS the manuscript order: slot 1 compiles first. Edges without
  // a slot handle fall back to canvas Y order after the slotted ones.
  const slotOf = (e: Edge) => {
    const m = /^slot-(\d+)$/.exec(e.targetHandle || '');
    return m ? parseInt(m[1], 10) : Number.MAX_SAFE_INTEGER;
  };
  const orderedRoots = [...incomingEdges]
    .sort((a, b) => {
      const slotDiff = slotOf(a) - slotOf(b);
      if (slotDiff !== 0) return slotDiff;
      const nodeA = nodes.find(n => n.id === a.source);
      const nodeB = nodes.find(n => n.id === b.source);
      return (nodeA?.position?.y || 0) - (nodeB?.position?.y || 0);
    })
    .map(e => nodes.find(n => n.id === e.source))
    .filter((n): n is AppNode => !!n);

  for (const root of orderedRoots) {
    if (!visited.has(root.id)) {
      visited.add(root.id);
      compileNode(root.id, 1);
    }
  }

  return blocks;
};

export const blocksToMarkdown = (blocks: CompileBlock[]): string => {
  let out = '';
  for (const b of blocks) {
    if (b.kind === 'heading') out += `${'#'.repeat(b.level)} ${b.text}\n\n`;
    else if (b.kind === 'epigraph') out += `*${b.text}*\n\n`;
    else if (b.kind === 'content') out += `${htmlToPlainMarkdown(b.html)}\n\n`;
    else if (b.kind === 'beats') {
      out += b.items
        .map((it, i) => `${i + 1}. **${it.title}**${it.subtitle ? ` — ${it.subtitle}` : ''}`)
        .join('\n') + '\n\n';
    }
  }
  return out.trim();
};

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Shared by the print-to-PDF window and the Word (.doc) export.
export const blocksToHtml = (blocks: CompileBlock[]): string => {
  let out = '';
  for (const b of blocks) {
    if (b.kind === 'heading') {
      const tag = `h${Math.min(b.level, 6)}`;
      out += `<${tag}>${escapeHtml(b.text)}</${tag}>\n`;
    } else if (b.kind === 'epigraph') {
      out += `<blockquote><em>${escapeHtml(b.text)}</em></blockquote>\n`;
    } else if (b.kind === 'content') {
      out += `<div class="manuscript-block">${b.html}</div>\n`;
    } else if (b.kind === 'beats') {
      out += '<ol>' + b.items
        .map(it => `<li><strong>${escapeHtml(it.title)}</strong>${it.subtitle ? ` — ${escapeHtml(it.subtitle)}` : ''}</li>`)
        .join('') + '</ol>\n';
    }
  }
  return out;
};

// Back-compatible entry point: Markdown string, or a friendly hint when
// nothing is wired up yet.
export const compileManuscript = (
  printNodeId: string,
  nodes: AppNode[],
  edges: Edge[]
): string => {
  const printNode = nodes.find(n => n.id === printNodeId);
  if (!printNode) return '# Compilation Error: Print node not found.';
  const incoming = edges.filter(e => e.target === printNodeId);
  if (incoming.length === 0) return 'No content connected to Compile node. Connect scenes or chapters to compile them.';
  return blocksToMarkdown(compileBlocks(printNodeId, nodes, edges));
};
