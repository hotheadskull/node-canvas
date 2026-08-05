import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { DocumentSchema, type CanvasDocument } from './schema';
import { htmlToMarkdown, exportMarkdown, exportPlainText, exportFileStem } from './export';

const golden = JSON.parse(readFileSync(new URL('./export.golden.json', import.meta.url), 'utf8'));
const fixture: CanvasDocument = DocumentSchema.parse(golden.fixture);

describe('exportMarkdown (golden: compiled spine -> Markdown document)', () => {
  it('renders the wired chapter exactly', () => {
    const result = exportMarkdown(fixture, 'node_chapter');
    expect(result.title).toBe('Chapter One');
    expect(result.markdown).toBe(golden.markdown);
  });

  it('an empty node still exports a valid document with its title', () => {
    const result = exportMarkdown(fixture, 'node_scene-b');
    expect(result.markdown.startsWith('# The shore\n')).toBe(true);
  });

  it('unknown node exports as Untitled instead of throwing', () => {
    expect(exportMarkdown(fixture, 'node_missing').markdown).toBe('# Untitled\n');
  });
});

describe('exportPlainText', () => {
  it('strips every tag and keeps all the words', () => {
    const text = exportPlainText(fixture, 'node_chapter');
    // No markup survives -- but decoded user prose (like "<nothing>") does.
    for (const tag of ['<p>', '<h2>', '<ul>', '<li>', '<blockquote>', '<strong>']) {
      expect(text).not.toContain(tag);
    }
    for (const words of ['The Storm', 'all at once', 'hold fast & wait', 'lantern', 'pier drowned']) {
      expect(text).toContain(words);
    }
  });
});

describe('htmlToMarkdown', () => {
  it('covers the StarterKit vocabulary', () => {
    expect(htmlToMarkdown('<h1>Title</h1><p>Body</p>')).toBe('# Title\n\nBody');
    expect(htmlToMarkdown('<p><s>gone</s> and <code>kept*raw</code></p>')).toBe(
      '~~gone~~ and `kept*raw`',
    );
    expect(htmlToMarkdown('<ol start="3"><li>third</li><li>fourth</li></ol>')).toBe(
      '3. third\n4. fourth',
    );
    expect(htmlToMarkdown('<pre><code>const a = 1;\nconst b = 2;</code></pre>')).toBe(
      '```\nconst a = 1;\nconst b = 2;\n```',
    );
    expect(htmlToMarkdown('<p><a href="https://x.test">link</a></p>')).toBe(
      '[link](https://x.test)',
    );
  });

  it('nests lists with indentation', () => {
    expect(htmlToMarkdown('<ul><li>outer<ul><li>inner</li></ul></li></ul>')).toBe(
      '- outer\n  - inner',
    );
  });

  it('escapes characters Markdown would misread', () => {
    expect(htmlToMarkdown('<p>2 * 3 = 6 and snake_case</p>')).toBe(
      '2 \\* 3 = 6 and snake\\_case',
    );
    expect(htmlToMarkdown('<p># not a heading</p>')).toBe('\\# not a heading');
  });

  it('never loses words to malformed HTML', () => {
    expect(htmlToMarkdown('<p>open <strong>bold never closes</p>')).toContain(
      'bold never closes',
    );
    expect(htmlToMarkdown('plain text, no tags at all')).toBe('plain text, no tags at all');
  });
});

describe('exportFileStem', () => {
  it('replaces illegal filename characters and keeps words readable', () => {
    expect(exportFileStem('My Novel: Draft 2')).toBe('My Novel - Draft 2');
    expect(exportFileStem('a/b\\c?d')).not.toMatch(/[/\\?]/);
  });

  it('falls back to Untitled', () => {
    expect(exportFileStem('   ')).toBe('Untitled');
    expect(exportFileStem('???')).toBe('Untitled');
  });
});
