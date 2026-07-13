import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  createEmptyDocument,
  DocumentValidationError,
  parseDocument,
  serializeDocument,
} from './schema';

const goldenPath = new URL('./roundtrip.golden.json', import.meta.url);
const golden = readFileSync(goldenPath, 'utf8');

/** Normalize line endings only -- content stays byte-significant. */
const normalize = (text: string) => `${text.replace(/\r\n/g, '\n').trimEnd()}\n`;

describe('document load/save round-trip (golden)', () => {
  it('load -> save reproduces the golden file exactly', () => {
    const parsed = parseDocument(golden);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(normalize(serializeDocument(parsed.document))).toBe(normalize(golden));
  });

  it('serialization is deterministic (save -> load -> save is stable)', () => {
    const parsed = parseDocument(golden);
    if (!parsed.ok) throw new Error(parsed.error);
    const once = serializeDocument(parsed.document);
    const reparsed = parseDocument(once);
    if (!reparsed.ok) throw new Error(reparsed.error);
    expect(serializeDocument(reparsed.document)).toBe(once);
  });

  it('preserves pack payload keys it does not know about (I8)', () => {
    const parsed = parseDocument(golden);
    if (!parsed.ok) throw new Error(parsed.error);
    const doc = structuredClone(parsed.document);
    doc.nodes[0]!.data['packField'] = { custom: true };
    const saved = serializeDocument(doc);
    const reloaded = parseDocument(saved);
    if (!reloaded.ok) throw new Error(reloaded.error);
    expect(reloaded.document.nodes[0]!.data['packField']).toEqual({ custom: true });
  });
});

describe('validation surfaces errors, never swallows them (I9)', () => {
  it('rejects invalid JSON with a readable error', () => {
    const result = parseDocument('{not json');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain('not valid JSON');
  });

  it('rejects an unknown schema version', () => {
    const doc = JSON.parse(golden);
    doc.schemaVersion = 999;
    const result = parseDocument(JSON.stringify(doc));
    expect(result.ok).toBe(false);
  });

  it('rejects an edge pointing at a missing node', () => {
    const doc = JSON.parse(golden);
    doc.edges.push({ id: 'edge_bad', source: 'node_title-1', target: 'node_ghost' });
    const result = parseDocument(JSON.stringify(doc));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain('node_ghost');
  });

  it('rejects duplicate node ids', () => {
    const doc = JSON.parse(golden);
    doc.nodes.push(structuredClone(doc.nodes[0]));
    const result = parseDocument(JSON.stringify(doc));
    expect(result.ok).toBe(false);
  });

  it('refuses to serialize an invalid document', () => {
    const parsed = parseDocument(golden);
    if (!parsed.ok) throw new Error(parsed.error);
    const doc = structuredClone(parsed.document);
    doc.edges.push({ id: 'edge_bad', source: 'node_ghost', target: 'node_title-1' });
    expect(() => serializeDocument(doc)).toThrow(DocumentValidationError);
  });
});

describe('createEmptyDocument', () => {
  it('creates a valid, serializable document', () => {
    const doc = createEmptyDocument('My project');
    const saved = serializeDocument(doc);
    const reloaded = parseDocument(saved);
    expect(reloaded.ok).toBe(true);
    if (!reloaded.ok) return;
    expect(reloaded.document.name).toBe('My project');
    expect(reloaded.document.canvasMode).toBe('universal');
  });
});
