// ============================================================================
// EXPORT -- compiled work leaving the canvas as portable text.
//
// The editors store TipTap StarterKit HTML in node content. Export renders
// that HTML to Markdown (headings, emphasis, lists, quotes, code, rules,
// links) or plain text. Deliberately NO citation formatting (decision log:
// export markdown, let word processors typeset).
//
// The converter is a tiny hand-rolled HTML reader because core/ is pure TS
// (I7): no DOM, no DOMParser, no dependencies. It only needs to be as good
// as the vocabulary StarterKit can produce.
// ============================================================================

import type { CanvasDocument } from './schema';
import { compileBlocks } from './blocks';
import { stripHtml } from './derive';

type HtmlNode = { tag: string; attrs: Record<string, string>; children: Child[] };
type Child = HtmlNode | string;

const VOID_TAGS = new Set(['br', 'hr', 'img', 'input', 'meta', 'link']);

function decodeEntities(text: string): string {
  return text
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

function parseAttrs(tagText: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const attrPattern = /([a-zA-Z-]+)\s*=\s*"([^"]*)"/g;
  let match: RegExpExecArray | null;
  while ((match = attrPattern.exec(tagText)) !== null) {
    const [, name, value] = match;
    if (name !== undefined && value !== undefined) {
      attrs[name.toLowerCase()] = decodeEntities(value);
    }
  }
  return attrs;
}

/** Parse an HTML fragment into a tree. Unknown/mismatched tags degrade to
 * their text content rather than throwing -- exports must never lose words. */
export function parseHtml(html: string): Child[] {
  const root: HtmlNode = { tag: '#root', attrs: {}, children: [] };
  const stack: HtmlNode[] = [root];
  const tokens = html.match(/<!--[\s\S]*?-->|<\/?[a-zA-Z][^>]*>|[^<]+/g) ?? [];
  for (const token of tokens) {
    if (token.startsWith('<!--')) continue;
    if (token.startsWith('</')) {
      const tag = token.slice(2).replace(/[\s>/]+.*$/s, '').toLowerCase();
      for (let index = stack.length - 1; index > 0; index--) {
        if (stack[index]?.tag === tag) {
          stack.length = index;
          break;
        }
      }
      continue;
    }
    const top = stack[stack.length - 1] ?? root;
    if (token.startsWith('<')) {
      const tag = token.slice(1).replace(/[\s>/]+.*$/s, '').toLowerCase();
      const node: HtmlNode = { tag, attrs: parseAttrs(token), children: [] };
      top.children.push(node);
      const selfClosing = VOID_TAGS.has(tag) || /\/>$/.test(token);
      if (!selfClosing) stack.push(node);
      continue;
    }
    const text = decodeEntities(token);
    if (text !== '') top.children.push(text);
  }
  return root.children;
}

/** Escape characters Markdown would otherwise interpret, without wrecking
 * prose: emphasis markers anywhere; structural markers only at line start. */
function escapeText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/([*_`])/g, '\\$1')
    .replace(/^(\s*)([#>+-])/gm, '$1\\$2')
    .replace(/^(\s*)(\d+)\.(\s)/gm, '$1$2\\.$3');
}

function renderInline(children: Child[]): string {
  let out = '';
  for (const child of children) {
    if (typeof child === 'string') {
      out += escapeText(child);
      continue;
    }
    const inner = () => renderInline(child.children);
    switch (child.tag) {
      case 'strong':
      case 'b':
        out += `**${inner()}**`;
        break;
      case 'em':
      case 'i':
        out += `*${inner()}*`;
        break;
      case 's':
      case 'del':
      case 'strike':
        out += `~~${inner()}~~`;
        break;
      case 'code':
        out += `\`${renderPlain(child.children)}\``;
        break;
      case 'a': {
        const href = child.attrs.href;
        out += href ? `[${inner()}](${href})` : inner();
        break;
      }
      case 'br':
        out += '\n';
        break;
      default:
        // u, span, mark, unknown tags: transparent -- keep the words
        out += inner();
    }
  }
  return out;
}

function renderPlain(children: Child[]): string {
  let out = '';
  for (const child of children) {
    out += typeof child === 'string' ? child : renderPlain(child.children);
  }
  return out;
}

function prefixLines(text: string, prefix: string): string {
  return text
    .split('\n')
    .map((line) => (line === '' ? prefix.trimEnd() : prefix + line))
    .join('\n');
}

function renderBlocks(children: Child[]): string[] {
  const blocks: string[] = [];
  for (const child of children) {
    if (typeof child === 'string') {
      const text = escapeText(child).trim();
      if (text !== '') blocks.push(text);
      continue;
    }
    const headingMatch = /^h([1-6])$/.exec(child.tag);
    if (headingMatch) {
      blocks.push(`${'#'.repeat(Number(headingMatch[1]))} ${renderInline(child.children).trim()}`);
      continue;
    }
    switch (child.tag) {
      case 'p': {
        const text = renderInline(child.children).trim();
        if (text !== '') blocks.push(text);
        break;
      }
      case 'ul':
      case 'ol': {
        // Rendered flat; a parent <li> supplies the continuation indent, so
        // nesting depth emerges from the recursion instead of being counted.
        const items: string[] = [];
        let ordinal = Number(child.attrs.start ?? '1');
        for (const item of child.children) {
          if (typeof item === 'string' || item.tag !== 'li') continue;
          const marker = child.tag === 'ol' ? `${ordinal++}. ` : '- ';
          const flat = renderBlocks(item.children).join('\n').split('\n');
          const rendered = flat
            .map((line, index) => (index === 0 ? marker + line : '  ' + line))
            .join('\n');
          items.push(rendered);
        }
        if (items.length > 0) blocks.push(items.join('\n'));
        break;
      }
      case 'blockquote': {
        const inner = renderBlocks(child.children).join('\n\n');
        if (inner !== '') blocks.push(prefixLines(inner, '> '));
        break;
      }
      case 'pre': {
        const code = renderPlain(child.children).replace(/\n$/, '');
        blocks.push('```\n' + code + '\n```');
        break;
      }
      case 'hr':
        blocks.push('---');
        break;
      default: {
        // div and friends: recurse transparently; bare inline elements at
        // block level (TipTap never emits these, but pasted HTML might)
        // render as a paragraph.
        if (child.children.some((inner) => typeof inner !== 'string' && isBlockTag(inner.tag))) {
          blocks.push(...renderBlocks(child.children));
        } else {
          const text = renderInline([child]).trim();
          if (text !== '') blocks.push(text);
        }
      }
    }
  }
  return blocks;
}

function isBlockTag(tag: string): boolean {
  return /^(p|h[1-6]|ul|ol|li|blockquote|pre|hr|div)$/.test(tag);
}

/** Convert a TipTap HTML fragment to Markdown. */
export function htmlToMarkdown(html: string): string {
  return renderBlocks(parseHtml(html)).join('\n\n');
}

/**
 * Compiled text is HTML fragments joined by blank lines (compile /
 * compileBlocks contract). Convert each fragment so a stray unclosed tag in
 * one source can never swallow the rest of the manuscript.
 */
function compiledHtmlToMarkdown(compiledHtml: string): string {
  return compiledHtml
    .split('\n\n')
    .map((fragment) => htmlToMarkdown(fragment))
    .filter((fragment) => fragment !== '')
    .join('\n\n');
}

export type MarkdownExport = { markdown: string; title: string };

/**
 * Export a compile-face node (document/manuscript/claim/passage) as a
 * Markdown document: the node's title as H1, then its compiled work.
 */
export function exportMarkdown(document: CanvasDocument, nodeId: string): MarkdownExport {
  const node = document.nodes.find((candidate) => candidate.id === nodeId);
  const title = (node?.data.title ?? '').trim() || 'Untitled';
  const compiled = compileBlocks(document, nodeId);
  const body = compiledHtmlToMarkdown(compiled.text);
  const markdown = body === '' ? `# ${title}\n` : `# ${title}\n\n${body}\n`;
  return { markdown, title };
}

/** Export the same compilation as plain text (no markup at all). */
export function exportPlainText(document: CanvasDocument, nodeId: string): string {
  const compiled = compileBlocks(document, nodeId);
  return stripHtml(compiled.text).trim() + '\n';
}

/** A filesystem-safe filename stem for an export ("My Novel: Draft 2" ->
 * "My Novel - Draft 2"). Extension is the caller's business. */
export function exportFileStem(title: string): string {
  const cleaned = title
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-')
    .replace(/\s+/g, ' ')
    .replace(/(?: ?- ?)+/g, ' - ')
    .trim()
    .replace(/^[.\s-]+|[.\s-]+$/g, '');
  return cleaned === '' ? 'Untitled' : cleaned;
}
