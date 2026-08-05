// Chunk 18: file-per-project persistence. The browser world is testable in
// jsdom (Tauri paths are exercised by hand + e2e); what these pin down is
// the CONTRACT: adopt stashes the outgoing canvas with a working Undo,
// opening validates before adopting, migration keeps the original bytes,
// and every failure is surfaced (I9), never swallowed.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { addNode, createEmptyDocument, serializeDocument, spawnNode } from '@node-canvas/core';
import { projectIO } from '../persistence/projectFile';
import {
  PREVIOUS_DOCUMENT_KEY,
  STORAGE_KEY,
  useCanvasStore,
} from './canvasStore';

// The store reaches file IO through the projectIO seam (module-level vi.mock
// can't intercept it -- test-setup imports the store before mocks register).
const realIO = { ...projectIO };
const mocks = {
  pickProjectFile: vi.fn(),
  downloadFile: vi.fn(),
};

afterEach(() => {
  Object.assign(projectIO, realIO);
});

function seededDocument() {
  let doc = createEmptyDocument('Seeded project');
  doc = addNode(doc, spawnNode('note', { x: 10, y: 20 }));
  return doc;
}

beforeEach(() => {
  localStorage.clear();
  mocks.pickProjectFile.mockReset();
  mocks.downloadFile.mockReset();
  Object.assign(projectIO, {
    isTauri: () => false,
    pickProjectFile: mocks.pickProjectFile,
    downloadFile: mocks.downloadFile,
  });
  useCanvasStore.setState({
    document: createEmptyDocument('reset'),
    persistenceError: null,
    toast: null,
    projectPath: null,
    projectFileName: null,
  });
});

describe('newProject', () => {
  it('stashes the outgoing canvas and Undo brings it back', () => {
    const before = seededDocument();
    useCanvasStore.setState({ document: before });
    useCanvasStore.getState().newProject();

    const state = useCanvasStore.getState();
    expect(state.document.nodes).toHaveLength(0);
    // the stash holds the exact outgoing canvas
    expect(localStorage.getItem(PREVIOUS_DOCUMENT_KEY)).toBe(serializeDocument(before));
    // and the fresh canvas was written through immediately (no debounce gap)
    expect(localStorage.getItem(STORAGE_KEY)).toBe(serializeDocument(state.document));

    expect(state.toast?.undo).toBeDefined();
    state.toast?.undo?.();
    expect(useCanvasStore.getState().document.id).toBe(before.id);
    expect(localStorage.getItem(STORAGE_KEY)).toBe(serializeDocument(before));
  });
});

describe('openProject', () => {
  it('adopts a valid picked file and binds its name', async () => {
    const picked = seededDocument();
    mocks.pickProjectFile.mockResolvedValue({
      raw: serializeDocument(picked),
      path: null,
      fileName: 'seeded.nodecanvas',
    });
    await useCanvasStore.getState().openProject();
    const state = useCanvasStore.getState();
    expect(state.document.id).toBe(picked.id);
    expect(state.projectFileName).toBe('seeded.nodecanvas');
    expect(state.persistenceError).toBeNull();
  });

  it('a cancelled dialog changes nothing', async () => {
    const current = useCanvasStore.getState().document;
    mocks.pickProjectFile.mockResolvedValue(null);
    await useCanvasStore.getState().openProject();
    expect(useCanvasStore.getState().document).toBe(current);
  });

  it('an invalid file surfaces a banner and does NOT replace the canvas (I9)', async () => {
    const current = useCanvasStore.getState().document;
    mocks.pickProjectFile.mockResolvedValue({
      raw: '{"schemaVersion": 1, "broken": true}',
      path: null,
      fileName: 'broken.nodecanvas',
    });
    await useCanvasStore.getState().openProject();
    const state = useCanvasStore.getState();
    expect(state.document).toBe(current);
    expect(state.persistenceError).toContain('broken.nodecanvas');
  });

  it('a file from a NEWER schema is refused with the update message', async () => {
    const doc = seededDocument();
    const raw = serializeDocument(doc).replace('"schemaVersion": 1', '"schemaVersion": 99');
    mocks.pickProjectFile.mockResolvedValue({ raw, path: null, fileName: 'future.nodecanvas' });
    await useCanvasStore.getState().openProject();
    expect(useCanvasStore.getState().persistenceError).toContain('newer Node Canvas');
  });
});

describe('saveProjectAs (browser world)', () => {
  it('downloads the serialized document under the project name', async () => {
    const doc = seededDocument();
    useCanvasStore.setState({ document: doc });
    await useCanvasStore.getState().saveProjectAs();
    expect(mocks.downloadFile).toHaveBeenCalledTimes(1);
    const [fileName, contents] = mocks.downloadFile.mock.calls[0]!;
    expect(fileName).toBe('Seeded project.nodecanvas');
    expect(contents).toBe(serializeDocument(doc));
  });
});

describe('exportNode (browser world)', () => {
  it('downloads Markdown named after the node title', async () => {
    let doc = createEmptyDocument('Export me');
    const node = spawnNode('document', { x: 0, y: 0 });
    node.data.title = 'Chapter: One';
    node.data.content = '<p>Hello <strong>world</strong></p>';
    doc = addNode(doc, node);
    useCanvasStore.setState({ document: doc });
    await useCanvasStore.getState().exportNode(node.id, 'markdown');
    const [fileName, contents] = mocks.downloadFile.mock.calls[0]!;
    expect(fileName).toBe('Chapter - One.md');
    expect(contents).toContain('# Chapter: One');
    expect(contents).toContain('Hello **world**');
  });
});
