import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

const appTsxPath = path.resolve('src/App.tsx');
const baseNodePath = path.resolve('src/components/BaseNode.tsx');
const themeNodePath = path.resolve('src/components/ThemeNode.tsx');
const knowledgeCardPath = path.resolve('src/components/KnowledgeCard.tsx');
const logicNodePath = path.resolve('src/components/LogicNode.tsx');

// Handles are centralized in BaseNode -- every card-style node composes it.

// Tier 1: Feature Coverage (F3)
test('F3-1: Handle component is imported from @xyflow/react in BaseNode', () => {
  const content = fs.readFileSync(baseNodePath, 'utf8');
  assert.ok(
    /import\s+{[^}]*Handle[^}]*}\s+from\s+['"]@xyflow\/react['"]/.test(content),
    'Expected Handle to be imported from @xyflow/react in BaseNode'
  );
});

test('F3-2: BaseNode renders handles for top, bottom, left, and right positions', () => {
  const content = fs.readFileSync(baseNodePath, 'utf8');
  assert.ok(
    /position=\{Position\.Top\}/.test(content) &&
    /position=\{Position\.Bottom\}/.test(content) &&
    /position=\{Position\.Left\}/.test(content) &&
    /position=\{Position\.Right\}/.test(content),
    'Expected BaseNode to render top, bottom, left, and right handles'
  );
});

test('F3-3: BaseNode handles support hover scale interaction', () => {
  const content = fs.readFileSync(baseNodePath, 'utf8');
  assert.ok(
    /hover:scale-125/.test(content),
    'Expected handles in BaseNode to scale up on hover (hover:scale-125)'
  );
});

test('F3-4: BaseNode handles use the accent color passed by each node type', () => {
  const content = fs.readFileSync(baseNodePath, 'utf8');
  assert.ok(
    /style=\{\{\s*backgroundColor:\s*accentColor\s*\}\}/.test(content),
    'Expected handles to dynamically set background color to accentColor'
  );
});

test('F3-5: KnowledgeCard and ThemeNode pass their kind/type color as the accent', () => {
  const knowledgeCard = fs.readFileSync(knowledgeCardPath, 'utf8');
  const themeNode = fs.readFileSync(themeNodePath, 'utf8');
  assert.ok(
    /accentColor=\{kind\.color\}/.test(knowledgeCard),
    'Expected KnowledgeCard to pass kind.color as accentColor'
  );
  assert.ok(
    /accentColor=\{accentColor\}/.test(themeNode) || /accentColor=\{COLORS/.test(themeNode),
    'Expected ThemeNode to pass its per-type color as accentColor'
  );
});

// Tier 2: Boundary & Corner Cases (F3)
test('F3-Boundary-1: BaseNode supports per-side handle toggles', () => {
  const content = fs.readFileSync(baseNodePath, 'utf8');
  assert.ok(
    /hasTopHandle/.test(content) && /hasBottomHandle/.test(content) &&
    /hasLeftHandle/.test(content) && /hasRightHandle/.test(content),
    'Expected BaseNode to allow hiding individual handles'
  );
});

test('F3-Boundary-2: BaseNode handles define z-index values to remain clickable on top of content', () => {
  const content = fs.readFileSync(baseNodePath, 'utf8');
  assert.ok(
    /z-50/.test(content),
    'Expected BaseNode handles to have z-50 class'
  );
});

test('F3-Boundary-3: ReactFlow is set to loose connection mode', () => {
  const content = fs.readFileSync(appTsxPath, 'utf8');
  assert.ok(
    /connectionMode=\{ConnectionMode\.Loose\}/.test(content),
    'Expected ConnectionMode.Loose to allow connection between any handles'
  );
});

test('F3-Boundary-4: LogicNode uses the blue accent through BaseNode', () => {
  const content = fs.readFileSync(logicNodePath, 'utf8');
  assert.ok(
    /accentColor="#3b82f6"/.test(content),
    'Expected LogicNode to pass blue #3b82f6 as its accent color'
  );
});

test('F3-Boundary-5: ReactFlow connectionRadius is configured to a high value for snap target assistance', () => {
  const content = fs.readFileSync(appTsxPath, 'utf8');
  assert.ok(
    /connectionRadius=\{100\}/.test(content),
    'Expected connectionRadius to be 100 in App.tsx'
  );
});
