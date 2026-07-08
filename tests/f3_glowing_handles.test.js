import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

const appTsxPath = path.resolve('src/App.tsx');
const themeNodePath = path.resolve('src/components/ThemeNode.tsx');
const itemNodePath = path.resolve('src/components/ItemNode.tsx');
const logicNodePath = path.resolve('src/components/LogicNode.tsx');

// Tier 1: Feature Coverage (F3)
test('F3-1: Handle component is imported from @xyflow/react in nodes', () => {
  const content = fs.readFileSync(themeNodePath, 'utf8');
  assert.ok(
    /import\s+{[^}]*Handle[^}]*}\s+from\s+['"]@xyflow\/react['"]/.test(content),
    'Expected Handle to be imported from @xyflow/react in ThemeNode'
  );
});

test('F3-2: ThemeNode renders handles for top, bottom, left, and right positions', () => {
  const content = fs.readFileSync(themeNodePath, 'utf8');
  assert.ok(
    /position=\{Position\.Top\}/.test(content) &&
    /position=\{Position\.Bottom\}/.test(content) &&
    /position=\{Position\.Left\}/.test(content) &&
    /position=\{Position\.Right\}/.test(content),
    'Expected ThemeNode to render top, bottom, left, and right handles'
  );
});

test('F3-3: Handles in ThemeNode support hover scale interaction', () => {
  const content = fs.readFileSync(themeNodePath, 'utf8');
  assert.ok(
    /hover:scale-125/.test(content),
    'Expected handles in ThemeNode to scale up on hover (hover:scale-125)'
  );
});

test('F3-4: ThemeNode handles use dynamic colors matching node theme progressColor', () => {
  const content = fs.readFileSync(themeNodePath, 'utf8');
  assert.ok(
    /style=\{\{\s*backgroundColor:\s*theme\.progressColor\s*\}\}/.test(content),
    'Expected handles to dynamically set background color to progressColor'
  );
});

test('F3-5: ItemNode handles are styled with emerald background color', () => {
  const content = fs.readFileSync(itemNodePath, 'utf8');
  assert.ok(
    /bg-\[\s*#10b981\s*\]/.test(content),
    'Expected ItemNode handles to have bg-[#10b981]'
  );
});

// Tier 2: Boundary & Corner Cases (F3)
test('F3-Boundary-1: ThemeNode hides handles when the node type is region', () => {
  const content = fs.readFileSync(themeNodePath, 'utf8');
  assert.ok(
    /nodeType\s*===\s*['"]region['"]\s*\?\s*['"]opacity-0 pointer-events-none['"]\s*:\s*['"]opacity-100['"]/.test(content),
    'Expected handles to be hidden for region node type'
  );
});

test('F3-Boundary-2: Node handles define z-index values to remain clickable on top of content', () => {
  const content = fs.readFileSync(themeNodePath, 'utf8');
  assert.ok(
    /z-10/.test(content),
    'Expected ThemeNode handles to have z-10 class'
  );
  
  const logicContent = fs.readFileSync(logicNodePath, 'utf8');
  assert.ok(
    /z-50/.test(logicContent),
    'Expected LogicNode handles to have z-50 class'
  );
});

test('F3-Boundary-3: ReactFlow is set to loose connection mode', () => {
  const content = fs.readFileSync(appTsxPath, 'utf8');
  assert.ok(
    /connectionMode=\{ConnectionMode\.Loose\}/.test(content),
    'Expected ConnectionMode.Loose to allow connection between any handles'
  );
});

test('F3-Boundary-4: LogicNode handles are styled with blue background color', () => {
  const content = fs.readFileSync(logicNodePath, 'utf8');
  assert.ok(
    /bg-\[\s*#3b82f6\s*\]/.test(content),
    'Expected LogicNode handles to have bg-[#3b82f6]'
  );
});

test('F3-Boundary-5: ReactFlow connectionRadius is configured to a high value for snap target assistance', () => {
  const content = fs.readFileSync(appTsxPath, 'utf8');
  assert.ok(
    /connectionRadius=\{100\}/.test(content),
    'Expected connectionRadius to be 100 in App.tsx'
  );
});
