import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

const appTsxPath = path.resolve('src/App.tsx');
const themeNodePath = path.resolve('src/components/ThemeNode.tsx');
const logicNodePath = path.resolve('src/components/LogicNode.tsx');
const elasticEdgePath = path.resolve('src/components/ElasticEdge.tsx');
const appCssPath = path.resolve('src/App.css');

// Tier 3: Cross-feature combinations
test('F3-F4-1: BaseNode handle borders share the dark frame color used across edges', () => {
  const appTsx = fs.readFileSync(appTsxPath, 'utf8');
  const baseNode = fs.readFileSync(path.resolve('src/components/BaseNode.tsx'), 'utf8');

  // Default connection stroke color in App.tsx (art-deco gold family)
  assert.ok(
    /stroke:\s*['"]#a88530['"]/.test(appTsx),
    'Expected default edge option stroke to be #a88530'
  );

  // Handles keep the dark ring so they read against any accent color
  assert.ok(
    /border-\[#151518\]/.test(baseNode),
    'Expected BaseNode handles to keep the dark #151518 ring'
  );
});

test('F3-F5-2: Handles zoom/grow on hover without interfering with node drag prevention', () => {
  const baseNode = fs.readFileSync(path.resolve('src/components/BaseNode.tsx'), 'utf8');

  // Handles have hover:scale-125
  assert.ok(
    /hover:scale-125/.test(baseNode),
    'Expected hover scale class on handles'
  );

  // BaseNode's own inputs stop pointer propagation so click-to-edit works
  // instead of starting a node drag
  assert.ok(
    /onPointerDown=\{\(e\)\s*=>\s*e\.stopPropagation\(\)\}/.test(baseNode),
    'Expected BaseNode inputs to block drag propagation'
  );
});

test('F2-F5-3: ThemeNode switches to the gold gradient and levels up at the word threshold', () => {
  const themeNode = fs.readFileSync(themeNodePath, 'utf8');

  // Level up threshold condition
  assert.ok(
    /wordCount\s*>=\s*500/.test(themeNode),
    'Expected level up word count threshold check'
  );

  // Gold gradient on level up
  assert.ok(
    /isLeveledUp\s*\?\s*['"]linear-gradient\(to top, #fbbf24/.test(themeNode),
    'Expected the fill to switch to the gold gradient on level up'
  );
});

test('F2-F4-4: LogicNode keeps its blue identity through the BaseNode accent', () => {
  const logicNode = fs.readFileSync(logicNodePath, 'utf8');

  // LogicNode passes blue as its accent; BaseNode derives borders and
  // handles from it
  assert.ok(
    /accentColor="#3b82f6"/.test(logicNode),
    'Expected LogicNode to pass blue #3b82f6 as its BaseNode accent'
  );
});

test('F1-F4-5: ElasticEdge tension-based red color maintains visibility against the deep space dark background', () => {
  const appCss = fs.readFileSync(appCssPath, 'utf8');
  const elasticEdge = fs.readFileSync(elasticEdgePath, 'utf8');
  
  // Background is #0a0a0c
  assert.ok(
    /--background:\s*#0a0a0c/.test(appCss),
    'Expected background to be deep-space #0a0a0c'
  );
  
  // Tension red RGB values are calculated
  assert.ok(
    /239/.test(elasticEdge) && /68/.test(elasticEdge),
    'Expected tension color calculation to output bright red values (e.g. rgb(239, 68, 68)) for readability on dark background'
  );
});
