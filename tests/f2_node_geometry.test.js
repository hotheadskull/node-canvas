import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

const appTsxPath = path.resolve('src/App.tsx');
const themeNodePath = path.resolve('src/components/ThemeNode.tsx');
const knowledgeCardPath = path.resolve('src/components/KnowledgeCard.tsx');
const logicNodePath = path.resolve('src/components/LogicNode.tsx');

// Tier 1: Feature Coverage (F2)
test('F2-1: ThemeNode is registered under nodeTypes in App.tsx', () => {
  const content = fs.readFileSync(appTsxPath, 'utf8');
  assert.ok(
    /document:\s*ThemeNode/.test(content) && /default:\s*ThemeNode/.test(content),
    'Expected ThemeNode to be registered as the document and default node type'
  );
});

test('F2-2: KnowledgeCard covers the consolidated knowledge types in App.tsx', () => {
  const content = fs.readFileSync(appTsxPath, 'utf8');
  assert.ok(
    /item:\s*KnowledgeCard/.test(content) &&
    /character:\s*KnowledgeCard/.test(content) &&
    /lore:\s*KnowledgeCard/.test(content) &&
    /alias:\s*AliasNode/.test(content),
    'Expected knowledge types to map to KnowledgeCard and alias to AliasNode'
  );
});

test('F2-3: LogicNode is registered under nodeTypes in App.tsx', () => {
  const content = fs.readFileSync(appTsxPath, 'utf8');
  assert.ok(
    /logic:\s*LogicNode/.test(content),
    'Expected LogicNode to be registered in nodeTypes map'
  );
});

test('F2-4: ThemeNode uses polygon clipPath for book and chapter badges', () => {
  const content = fs.readFileSync(themeNodePath, 'utf8');
  assert.ok(
    /clipPath:\s*['"]polygon\(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%\)['"]/.test(content),
    'Expected hexagon clipPath for book badge'
  );
});

test('F2-5: KnowledgeCard defines distinct kind colors including emerald location', () => {
  const content = fs.readFileSync(knowledgeCardPath, 'utf8');
  assert.ok(
    /#10b981/.test(content) && /KINDS/.test(content) && /aliases/.test(content),
    'Expected KnowledgeCard KINDS palette (emerald location) and alias support'
  );
});

// Tier 2: Boundary & Corner Cases (F2)
test('F2-Boundary-1: NodeResizers define explicit minWidth and minHeight constraints', () => {
  const themeNode = fs.readFileSync(themeNodePath, 'utf8');
  const knowledgeCard = fs.readFileSync(knowledgeCardPath, 'utf8');
  const logicNode = fs.readFileSync(logicNodePath, 'utf8');

  assert.ok(
    /minWidth=\{220\}/.test(themeNode) && /minHeight=\{120\}/.test(themeNode),
    'ThemeNode resizer must have minWidth 220, minHeight 120'
  );
  assert.ok(
    /minWidth=\{200\}/.test(knowledgeCard) && /minHeight=\{150\}/.test(knowledgeCard),
    'KnowledgeCard resizer must have minWidth 200, minHeight 150'
  );
  assert.ok(
    /minWidth=\{250\}/.test(logicNode) && /minHeight=\{200\}/.test(logicNode),
    'LogicNode resizer must have minWidth 250, minHeight 200'
  );
});

test('F2-Boundary-2: LogicNode manages an array of premises correctly', () => {
  const content = fs.readFileSync(logicNodePath, 'utf8');
  assert.ok(
    /const\s+premises\s*=\s*data\.premises\s*\|\|\s*\[['"]{2}\]/.test(content),
    'Expected LogicNode premises list to fall back to an empty string array'
  );
});

test('F2-Boundary-3: ThemeNode theme lookup falls back to default if nodeType is unrecognized', () => {
  const content = fs.readFileSync(themeNodePath, 'utf8');
  assert.ok(
    /THEMES\[nodeType\]\s*\|\|\s*THEMES\[['"]idea['"]\]/.test(content),
    'Expected ThemeNode to fall back to idea theme'
  );
});

test('F2-Boundary-4: ThemeNode uses distinct background textures based on node type', () => {
  const content = fs.readFileSync(themeNodePath, 'utf8');
  assert.ok(
    /\['book',\s*'chapter',\s*'scene'\].includes\(nodeType\)\s*\?\s*['"]texture-leather['"]/.test(content) ||
    /bgClass\s*=\s*['"]texture-leather['"]/.test(content),
    'Expected ThemeNode to support leather and stone textures'
  );
});

test('F2-Boundary-5: LogicNode conclusion textarea has styled rows structure', () => {
  const content = fs.readFileSync(logicNodePath, 'utf8');
  assert.ok(
    /rows=\{2\}/.test(content) && /placeholder=["']Therefore\.\.\.["']/.test(content),
    'Expected LogicNode premise rows={2} and conclusion placeholder'
  );
});
