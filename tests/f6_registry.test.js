import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

const registryPath = path.resolve('src/nodes/registry.ts');
const appTsxPath = path.resolve('src/App.tsx');
const demoDataPath = path.resolve('src/store/demoData.ts');
const baseNodePath = path.resolve('src/components/BaseNode.tsx');
const menuPath = path.resolve('src/components/CreateNodeMenu.tsx');

const registry = fs.readFileSync(registryPath, 'utf8');
const appTsx = fs.readFileSync(appTsxPath, 'utf8');

// Types declared in the registry
const registryTypes = [...registry.matchAll(/^\s*type:\s*'([a-z]+)'/gm)].map(m => m[1]);

// F6-1: TUTORIAL PROTECTION -- every node type the demo/tutorial project uses
// must stay registered in both the registry and App's nodeTypes map. If this
// fails, the tutorial will render broken fallback nodes.
test('F6-1: every node type used by the demo/tutorial stays registered', () => {
  const demo = fs.readFileSync(demoDataPath, 'utf8');
  const demoTypes = [...new Set([...demo.matchAll(/type:\s*'([a-z]+)'/g)].map(m => m[1]))]
    // smoothstep is an edge type, not a node type
    .filter(t => t !== 'smoothstep');

  for (const t of demoTypes) {
    assert.ok(
      registryTypes.includes(t),
      `Demo uses node type '${t}' but it is missing from src/nodes/registry.ts`
    );
    assert.ok(
      new RegExp(`^\\s*${t}:\\s*[A-Z]`, 'm').test(appTsx),
      `Demo uses node type '${t}' but it is not mapped in App.tsx nodeTypes`
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
