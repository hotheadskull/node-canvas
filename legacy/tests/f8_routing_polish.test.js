import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

const read = (p) => fs.readFileSync(path.resolve(p), 'utf8');

// F8-1: the gentle hub collapse/expand float is a CSS transition on the node
// transform. It must only be armed on nodes actively animating a toggle --
// left on permanently, children of a dragged group (which never get React
// Flow's .dragging exemption) visibly lag behind the group.
test('F8-1: node transform transition is scoped to collapse animations', () => {
  const app = read('src/App.tsx');
  assert.ok(
    /isHidden \|\| animUntil\.has\(node\.id\)/.test(app),
    'App.tsx must gate --node-transition behind isHidden/animUntil, never apply it unconditionally'
  );
  assert.ok(
    /animUntilRef/.test(app) && /prevHiddenRef/.test(app),
    'App.tsx must track which nodes recently toggled hidden state'
  );
  const css = read('src/index.css');
  assert.ok(
    /\.react-flow__node:not\(\.dragging\)/.test(css) && /--node-transition, transform 0s/.test(css),
    'index.css must default the node transition to 0s when no animation is armed'
  );
});

// F8-2: edges must route AROUND intervening nodes, not under them -- with a
// bezier fallback and a scale guard so huge canvases stay cheap.
test('F8-2: ElasticEdge uses obstacle-avoiding routing with bezier fallback', () => {
  const edge = read('src/components/ElasticEdge.tsx');
  assert.ok(
    /getAvoidingPath/.test(edge) && /absoluteNodeRects/.test(edge),
    'ElasticEdge must call the smart-path utilities'
  );
  assert.ok(
    /smart\?\.path \?\? bezierPath/.test(edge),
    'ElasticEdge must fall back to the plain bezier when nothing blocks the line'
  );
  assert.ok(
    /SMART_ROUTE_NODE_LIMIT/.test(edge),
    'Smart routing must be capped by a node-count guard for large canvases'
  );
  assert.ok(
    /r\.type !== 'group'/.test(edge),
    'Group zones must not be treated as obstacles'
  );
});

// F8-2b: the geometry itself must guard the degenerate cases that would
// produce NaN paths or dodge phantom obstacles.
test('F8-2b: smartPath guards endpoints, children coords, and merges stacks', () => {
  const sp = read('src/utils/smartPath.ts');
  assert.ok(
    /rectContains\(r, sx, sy\) \|\| rectContains\(r, tx, ty\)/.test(sp),
    'Obstacles overlapping an edge endpoint must be skipped'
  );
  assert.ok(
    /while \(pid && guard\+\+ < 20\)/.test(sp),
    'absoluteNodeRects must walk parent chains (group children store RELATIVE coords) with a cycle guard'
  );
  assert.ok(
    /MERGE_DIST/.test(sp),
    'Nearby same-side detours must merge into one arc, not a per-node wobble'
  );
});

// F8-2c: beat/slot edges pin INSIDE their host node, so they must stack
// above the cards -- under default stacking the final segment hides behind
// the node body and the connection looks like it stops at the border.
test('F8-2c: anchored edges render above nodes', () => {
  const app = read('src/App.tsx');
  assert.ok(
    /zIndex: hasAnchoredHandle\(edge\) \? 1001 : edge\.zIndex/.test(app),
    'processedEdges must elevate beat/slot edges above the node layer'
  );
  const eu = read('src/utils/edgeUtils.ts');
  assert.ok(
    /export function hasAnchoredHandle/.test(eu) && /export const GENERIC_HANDLES/.test(eu),
    'edgeUtils must own the single definition of generic vs anchored handles'
  );
});

// F8-3: the Person/Entity card header must stay lean -- the type picker
// lives in the icon, and the sermon Function dropdown is gone.
test('F8-3: KnowledgeCard header has no dropdown chrome', () => {
  const kc = read('src/components/KnowledgeCard.tsx');
  assert.ok(
    !/showFunction={true}/.test(kc),
    'KnowledgeCard must not render the sermon Function dropdown'
  );
  assert.ok(
    !/headerRight=/.test(kc),
    'KnowledgeCard must not stack a headerRight dropdown next to the title input'
  );
  assert.ok(
    /renderIcon=/.test(kc) && /updateNodeType\(id, e\.target\.value\)/.test(kc),
    'The card type picker must live in the header icon'
  );
});

// F8-4: adding an alias (or renaming) AFTER documents were written must
// still form the spiderweb -- via a reverse scan of existing text.
test('F8-4: alias/title changes retro-link existing documents', () => {
  const store = read('src/store/useStore.ts');
  assert.ok(
    /linkExistingMentionsOf/.test(store) && /reverseScanTimeouts/.test(store),
    'useStore must debounce a reverse spiderweb scan when names change'
  );
  assert.ok(
    /labelChanged \|\| aliasesChanged/.test(store),
    'The reverse scan must trigger on BOTH renames and alias edits'
  );
  // Both scans must dedupe in either direction, or a manual char->doc edge
  // gets shadowed by an auto doc->char duplicate.
  const dualChecks = (store.match(/\(e\.source === (?:id|other\.id|targetId) && e\.target === [^)]+\) \|\|/g) || []).length;
  assert.ok(
    dualChecks >= 2,
    `Both spiderweb scans must check for existing edges in either direction (found ${dualChecks})`
  );
});
