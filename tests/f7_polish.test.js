import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

const read = (p) => fs.readFileSync(path.resolve(p), 'utf8');

// F7-1: compile order must come from the print node's SLOTS, not canvas
// position -- the slots are the user's explicit manuscript order.
test('F7-1: compiler orders roots by slot number', () => {
  const compiler = read('src/utils/compiler.ts');
  assert.ok(
    /slot-\(?\\d\+?\)?/.test(compiler) || /slotOf/.test(compiler),
    'compiler.ts must parse slot order from targetHandle'
  );
  assert.ok(
    /slotOf\(a\) - slotOf\(b\)/.test(compiler),
    'Roots must sort by slot number first, Y position only as fallback'
  );
});

// F7-2: manuscripts are stored as TipTap HTML -- text exports must convert,
// never dump raw tags into the .md/.txt file.
test('F7-2: markdown export strips TipTap HTML', () => {
  const compiler = read('src/utils/compiler.ts');
  assert.ok(
    /htmlToPlainMarkdown/.test(compiler),
    'compiler.ts must convert manuscript HTML for text output'
  );
});

// F7-3: deleting a node must never be silent -- the store announces every
// trashing and the toast offers one-click restore.
test('F7-3: node deletions fire a restorable toast', () => {
  const store = read('src/store/useStore.ts');
  const toast = read('src/components/TrashToast.tsx');
  const app = read('src/App.tsx');
  assert.ok(
    /node-trashed/.test(store),
    "useStore must dispatch 'node-trashed' when nodes are removed"
  );
  assert.ok(
    /node-trashed/.test(toast) && /restoreNode/.test(toast),
    'TrashToast must listen for trashings and offer restore'
  );
  assert.ok(/<TrashToast\s*\/>/.test(app), 'TrashToast must be mounted in App');
});

// F7-4: edge type keys are stored in user DBs -- labels/colors may change,
// keys may not.
test('F7-4: edge type keys stay stable', () => {
  const edgeTypes = read('src/utils/edgeTypes.ts');
  for (const key of ['references', 'causes', 'supports', 'contradicts', 'requires',
    'foreshadows', 'inspires', 'transitions', 'parallels', 'resolves']) {
    assert.ok(
      new RegExp(`^\\s*${key}:`, 'm').test(edgeTypes),
      `Edge type key '${key}' must remain in EDGE_TYPES`
    );
  }
});

// F7-5: every edge type must be visually distinct: no two types may share
// the same color, and dashed/animated variety must survive redesigns.
test('F7-5: edge type colors are unique', () => {
  const edgeTypes = read('src/utils/edgeTypes.ts');
  const colors = [...edgeTypes.matchAll(/color:\s*'(#[0-9a-fA-F]{6})'/g)].map(m => m[1].toLowerCase());
  assert.ok(colors.length >= 10, `Expected 10 edge colors, found ${colors.length}`);
  assert.strictEqual(new Set(colors).size, colors.length, 'Every edge type needs its own color');
});

// F7-7: nodes with DYNAMIC handles (compile slots, sequence beats) must call
// useUpdateNodeInternals when the handle set changes -- without it React Flow
// never registers the handles and connections to them silently fail.
test('F7-7: dynamic-handle nodes re-register with React Flow', () => {
  for (const file of ['src/components/CompileNode.tsx', 'src/components/SequenceNode.tsx']) {
    const src = read(file);
    assert.ok(
      /useUpdateNodeInternals/.test(src) && /updateNodeInternals\(id\)/.test(src),
      `${file} must call updateNodeInternals when its handles change`
    );
  }
});

// F7-8: hiding edge types must never be silent or sticky-by-accident --
// a visible restore banner exists, and drawing an edge of a hidden type
// unhides that type immediately.
test('F7-8: hidden edge types are loud and self-healing', () => {
  const app = read('src/App.tsx');
  assert.ok(
    /edge-legend-restore/.test(app) && /hiddenEdgeTypes\.size > 0/.test(app),
    'App must show a restore banner when any edge type is hidden'
  );
  assert.ok(
    /edges\.length > prevEdgeCountRef\.current/.test(app),
    'Drawing a new edge must unhide its type (never born invisible)'
  );
});

// F7-9: group-nesting persistence -- the teleporting-nodes bug had three
// heads and every one must stay dead:
//   a) updateNodeParent must write the REAL columns (x_position, not the
//      phantom position_x Drizzle silently dropped)
//   b) the debounced position save must read the CURRENT store position at
//      flush time, not the stale drag payload
//   c) loaded nodes must be sorted parents-before-children or React Flow
//      breaks nesting on reload
test('F7-9: group nesting survives save and reload', () => {
  const store = read('src/store/useStore.ts');
  assert.ok(
    !/position_x|position_y/.test(store),
    'useStore must never reference position_x/position_y (schema columns are x_position/y_position)'
  );
  assert.ok(
    /x_position: node\.position\.x/.test(store),
    'updateNodeParent must persist the parent-relative position with the parent'
  );
  assert.ok(
    /const current = get\(\)\.nodes\.find\(n => n\.id === change\.id\)/.test(store),
    'Debounced position flush must read the current position, not the drag payload'
  );
  assert.ok(
    /sortParentsFirst/.test(store) &&
    (store.match(/sortParentsFirst\(activeNodes\.map/g) || []).length >= 2,
    'Both load paths must sort parents before children'
  );
});

// F7-6: the backup safety net must stay wired end to end.
test('F7-6: backup commands exist in Rust and are surfaced in the UI', () => {
  const rust = read('src-tauri/src/lib.rs');
  const pm = read('src/components/ProjectManager.tsx');
  assert.ok(
    /fn list_backups/.test(rust) && /fn open_backup_folder/.test(rust),
    'lib.rs must define list_backups and open_backup_folder'
  );
  assert.ok(
    /list_backups/.test(rust.match(/generate_handler!\[[^\]]*\]/s)?.[0] || ''),
    'Backup commands must be registered in the invoke handler'
  );
  assert.ok(
    /list_backups/.test(pm) && /open_backup_folder/.test(pm),
    'ProjectManager must surface backup info and the folder button'
  );
});
