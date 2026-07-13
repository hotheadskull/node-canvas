import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

const registryPath = path.resolve('src/nodes/registry.ts');
const appTsxPath = path.resolve('src/App.tsx');
const tutorialPath = path.resolve('src/components/TutorialOverlay.tsx');
const baseNodePath = path.resolve('src/components/BaseNode.tsx');
const menuPath = path.resolve('src/components/CreateNodeMenu.tsx');

const registry = fs.readFileSync(registryPath, 'utf8');
const appTsx = fs.readFileSync(appTsxPath, 'utf8');

// Types declared in the registry
const registryTypes = [...registry.matchAll(/^\s*type:\s*'([a-z]+)'/gm)].map(m => m[1]);

// F6-1: TUTORIAL PROTECTION -- the driver.js tutorial guides users to click
// specific menu labels and anchors to specific element ids. If any of these
// drift, the tutorial strands the user mid-step.
test('F6-1: tutorial labels, sections, and anchor ids stay in sync', () => {
  const tutorial = fs.readFileSync(tutorialPath, 'utf8');
  const menu = fs.readFileSync(menuPath, 'utf8');

  // Labels the tutorial tells users to click must exist in the registry
  // (universal mode is the tutorial's default)
  assert.ok(
    /universal:\s*'Main Concept'/.test(registry),
    "Tutorial step 4 says to click 'Main Concept' -- registry universal master label must match"
  );
  assert.ok(
    /universal:\s*'Person \/ Entity'/.test(registry),
    "Tutorial step 13 says to click 'Person / Entity' -- registry universal character label must match"
  );

  // Menu section names the tutorial references must exist in TIER_TITLES
  for (const section of [...tutorial.matchAll(/under '([^']+)'/g)].map(m => m[1])) {
    assert.ok(
      registry.includes(`'${section}'`),
      `Tutorial references menu section '${section}' which is not a TIER_TITLES value`
    );
  }

  // Element ids the tutorial highlights must exist somewhere in the app
  const srcAll = [appTsx, menu,
    fs.readFileSync(path.resolve('src/components/CanvasSearch.tsx'), 'utf8'),
    fs.readFileSync(path.resolve('src/components/ProjectManager.tsx'), 'utf8'),
    fs.readFileSync(path.resolve('src/App.css'), 'utf8'),
  ].join('\n');
  const anchorIds = [...tutorial.matchAll(/element:\s*'#([a-z-]+)'/g)].map(m => m[1]);
  for (const anchor of anchorIds) {
    assert.ok(
      srcAll.includes(`id="${anchor}"`) || srcAll.includes(`id='${anchor}'`),
      `Tutorial anchors to #${anchor} but no element defines that id`
    );
  }

  // Every menu-visible registry type must be mapped in App's nodeTypes
  for (const t of registryTypes) {
    assert.ok(
      new RegExp(`^\\s*${t}:\\s*[A-Z]`, 'm').test(appTsx),
      `Registry type '${t}' is not mapped in App.tsx nodeTypes`
    );
  }
});

// F6-2: every registry type has all three mode labels and descriptions
test('F6-2: registry entries define novel, sermon, and universal labels', () => {
  const novelLabels = [...registry.matchAll(/novel:\s*'[^']+'/g)].length;
  const sermonLabels = [...registry.matchAll(/sermon:\s*'[^']+'/g)].length;
  const universalLabels = [...registry.matchAll(/universal:\s*'[^']+'/g)].length;
  // labels + descriptions => at least two entries per mode per type
  assert.ok(
    novelLabels >= registryTypes.length * 2 &&
    sermonLabels >= registryTypes.length * 2 &&
    universalLabels >= registryTypes.length * 2,
    'Every registry entry needs labels AND descriptions for all three modes'
  );
});

// F6-3: the create menu is registry-driven, not hand-maintained
test('F6-3: CreateNodeMenu renders from the registry', () => {
  const menu = fs.readFileSync(menuPath, 'utf8');
  assert.ok(
    /menuNodesForTier/.test(menu) && /nodes\/registry/.test(menu),
    'Expected CreateNodeMenu to render from src/nodes/registry.ts'
  );
  assert.ok(
    /'universal'/.test(menu) || /universal/.test(menu),
    'Expected the universal mode toggle'
  );
});

// F6-4: spawn sizes come from the registry
test('F6-4: node spawn sizes come from nodeSpawnConfig', () => {
  assert.ok(
    /nodeSpawnConfig\(type\)/.test(appTsx),
    'Expected App.tsx to size new nodes via the registry'
  );
});

// F6-5: BaseNode header layout regression guard -- a w-full first child
// pushed the right-side controls outside the node where they were clipped
test('F6-5: BaseNode header uses flex-1 min-w-0, never w-full', () => {
  const baseNode = fs.readFileSync(baseNodePath, 'utf8');
  assert.ok(
    !/flex items-center gap-2 w-full/.test(baseNode),
    'BaseNode header title group must not be w-full (clips headerRight controls)'
  );
  assert.ok(
    /flex-1 min-w-0/.test(baseNode),
    'BaseNode header title group must be flex-1 min-w-0'
  );
});

// F6-6: BaseNode inputs must stop pointer propagation or clicking a field
// drags the node instead of focusing the input
test('F6-6: BaseNode inputs stop pointer propagation', () => {
  const baseNode = fs.readFileSync(baseNodePath, 'utf8');
  const stops = [...baseNode.matchAll(/onPointerDown=\{\(e\)\s*=>\s*e\.stopPropagation\(\)\}/g)].length;
  assert.ok(
    stops >= 3,
    `Expected title, function, and tags controls to stop propagation (found ${stops})`
  );
});

// F6-7: sizing policy guard. Nodes AUTO-GROW with content: width is stamped
// fixed (prose wraps), height stays auto unless the type is 'fixed' (groups,
// hubs) or the user resizes. The v1.0.9 trap (min sizes on the WRAPPER, so
// BaseNode h-full collapsed while the resizer stayed big) must never return:
// min sizes live on the card via BaseNode props, never on wrapper style.
test('F6-7: spawn sizing follows the registry policy', () => {
  const store = fs.readFileSync(path.resolve('src/store/useStore.ts'), 'utf8');
  assert.ok(
    !/style:\s*\{\s*minWidth/.test(appTsx),
    'App.tsx must not spawn nodes with minWidth/minHeight style'
  );
  assert.ok(
    /nodeSpawnConfig\(node\.type/.test(store) &&
    /spawn\.sizing !== 'auto' && style\.width == null/.test(store) &&
    /spawn\.sizing === 'fixed' && style\.height == null/.test(store),
    'addNode must stamp width for wrapping, height only for fixed types'
  );
  assert.ok(
    !/style\.minHeight = spawn/.test(store),
    'Never put min sizes on the React Flow wrapper (v1.0.9 collapse trap)'
  );
});
