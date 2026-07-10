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

test('F2-4: ThemeNode composes BaseNode with per-type icons and colors', () => {
  const content = fs.readFileSync(themeNodePath, 'utf8');
  assert.ok(
    /from ['"]\.\/BaseNode['"]/.test(content) && /ICONS/.test(content) && /COLORS/.test(content),
    'Expected ThemeNode to build on BaseNode with ICONS/COLORS maps per writing type'
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
test('F2-Boundary-1: BaseNode owns the resizer; nodes pass explicit min constraints', () => {
  const baseNode = fs.readFileSync(path.resolve('src/components/BaseNode.tsx'), 'utf8');
  const themeNode = fs.readFileSync(themeNodePath, 'utf8');
  const knowledgeCard = fs.readFileSync(knowledgeCardPath, 'utf8');
  const logicNode = fs.readFileSync(logicNodePath, 'utf8');

  assert.ok(
    /NodeResizer/.test(baseNode) && /minWidth=\{minWidth\}/.test(baseNode) && /isVisible=\{selected\}/.test(baseNode),
    'BaseNode must render the NodeResizer, visible when selected'
  );
  assert.ok(
    /minWidth=\{\d+\}/.test(themeNode) && /minHeight=\{\d+\}/.test(themeNode),
    'ThemeNode must pass explicit min constraints to BaseNode'
  );
  assert.ok(
    /minWidth=\{\d+\}/.test(knowledgeCard) && /minHeight=\{\d+\}/.test(knowledgeCard),
    'KnowledgeCard must pass explicit min constraints to BaseNode'
  );
  assert.ok(
    /minWidth=\{\d+\}/.test(logicNode) && /minHeight=\{\d+\}/.test(logicNode),
    'LogicNode must pass explicit min constraints to BaseNode'
  );
});

test('F2-Boundary-2: LogicNode manages an array of premises correctly', () => {
  const content = fs.readFileSync(logicNodePath, 'utf8');
  assert.ok(
    /Array\.isArray\(data\.premises\)\s*\?\s*data\.premises\s*:\s*\[['"]{2}\]/.test(content),
    'Expected LogicNode premises list to fall back to an empty string array'
  );
});

test('F2-Boundary-3: ThemeNode icon/color lookups fall back to defaults for unrecognized types', () => {
  const content = fs.readFileSync(themeNodePath, 'utf8');
  assert.ok(
    /ICONS\[nodeType\]\s*\|\|/.test(content) && /COLORS\[nodeType\]\s*\|\|/.test(content),
    'Expected ThemeNode to fall back to default icon and color'
  );
});

test('F2-Boundary-4: ThemeNode renders the liquid word-count fill', () => {
  const content = fs.readFileSync(themeNodePath, 'utf8');
  assert.ok(
    /fillPercentage/.test(content) && /Math\.min\(100,/.test(content),
    'Expected ThemeNode liquid fill driven by word count, capped at 100%'
  );
});

test('F2-Boundary-5: LogicNode conclusion textarea has styled rows structure', () => {
  const content = fs.readFileSync(logicNodePath, 'utf8');
  assert.ok(
    /rows=\{2\}/.test(content) && /placeholder=["']Therefore\.\.\.["']/.test(content),
    'Expected LogicNode premise rows={2} and conclusion placeholder'
  );
});
