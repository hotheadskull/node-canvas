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
