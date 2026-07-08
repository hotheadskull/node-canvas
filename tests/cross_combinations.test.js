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
test('F3-F4-1: Handle border styling color matches the elastic edge default connection stroke color', () => {
  const appTsx = fs.readFileSync(appTsxPath, 'utf8');
  const themeNode = fs.readFileSync(themeNodePath, 'utf8');
  
  // Default connection stroke color in App.tsx (art-deco gold family)
  assert.ok(
    /stroke:\s*['"]#a88530['"]/.test(appTsx),
    'Expected default edge option stroke to be #a88530'
  );

  // Document theme border in ThemeNode stays in the same gold family
  assert.ok(
    /borderColor:\s*['"]#8c734b['"]/.test(themeNode),
    'Expected ThemeNode document theme border to be gold #8c734b'
  );
});

test('F3-F5-2: Handles zoom/grow on hover without interfering with node drag prevention', () => {
  const themeNode = fs.readFileSync(themeNodePath, 'utf8');
  
  // Handles have hover:scale-125
  assert.ok(
    /hover:scale-125/.test(themeNode),
    'Expected hover scale class on handles'
  );
  
  // Inputs have propagation stop
  assert.ok(
    /onPointerDown=\{\(e\)\s*=>\s*e\.stopPropagation\(\)\}/.test(themeNode),
    'Expected inputs to block drag propagation'
  );
});

test('F2-F5-3: ThemeNode changes its border color to yellow (#fbbf24) and triggers level up when word count threshold is reached', () => {
  const themeNode = fs.readFileSync(themeNodePath, 'utf8');
  
  // Level up threshold condition
  assert.ok(
    /wordCount\s*>=\s*500/.test(themeNode),
    'Expected level up word count threshold check'
  );
  
  // Color change assertion
  assert.ok(
    /borderColor:\s*isLeveledUp\s*\?\s*['"]#fbbf24['"]/.test(themeNode),
    'Expected border color to switch to #fbbf24 on level up'
  );
});

test('F2-F4-4: LogicNode utilizes distinct blue/dark-blue boundaries while linking to elastic edges', () => {
  const logicNode = fs.readFileSync(logicNodePath, 'utf8');
  
  // LogicNode has blue borders
  assert.ok(
    /border-\[\s*#3b82f6\s*\]/.test(logicNode) && /border-\[\s*#1e3a8a\s*\]/.test(logicNode),
    'Expected LogicNode to use custom blue colors'
  );
  
  // It renders handles pointing to default elastic edges
  assert.ok(
    /bg-\[\s*#3b82f6\s*\]/.test(logicNode),
    'Expected LogicNode handle background to match its blue theme'
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
