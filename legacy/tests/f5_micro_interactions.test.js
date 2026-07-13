import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

const themeNodePath = path.resolve('src/components/ThemeNode.tsx');
const useStorePath = path.resolve('src/store/useStore.ts');
const appTsxPath = path.resolve('src/App.tsx');

// Tier 1: Feature Coverage (F5)
test('F5-1: ThemeNode has no 3D flip (removed: broke pointer hit-testing)', () => {
  const content = fs.readFileSync(themeNodePath, 'utf8');
  assert.ok(
    !/isFlipped/.test(content) && !/preserve-3d/.test(content),
    'Expected ThemeNode to have no flip state or preserve-3d transforms'
  );
});

test('F5-2: ThemeNode inputs stop pointer propagation to allow editing without node drag', () => {
  const content = fs.readFileSync(themeNodePath, 'utf8');
  assert.ok(
    /onPointerDown=\{\(e\)\s*=>\s*e\.stopPropagation\(\)\}/.test(content),
    'Expected text areas and inputs to call e.stopPropagation() on pointer down'
  );
});

test('F5-3: useStore spiderweb auto-linking automatically creates connections', () => {
  const content = fs.readFileSync(useStorePath, 'utf8');
  assert.ok(
    /allNodes\.forEach\(otherNode\s*=>/.test(content) &&
    /newEdgesToCreate\.push\(newEdge\)/.test(content),
    'Expected useStore to define automatic edge connection logic in updateNodeData'
  );
});

test('F5-4: useStore strip HTML tags when evaluating auto-linking matches', () => {
  const content = fs.readFileSync(useStorePath, 'utf8');
  assert.ok(
    /const\s+plainText\s*=\s*newText\.replace\(\/<\[\^>\]\+>\/g,\s*['"]{2}\)/.test(content),
    'Expected HTML tags to be stripped for clean plain text matching'
  );
});

test('F5-5: Node transition CSS variable is dynamically defined based on hidden status', () => {
  const content = fs.readFileSync(appTsxPath, 'utf8');
  assert.ok(
    /--node-transition/.test(content),
    'Expected App.tsx to define --node-transition styles'
  );
});

// Tier 2: Boundary & Corner Cases (F5)
test('F5-Boundary-1: ThemeNode writing nodes render connected cast chips', () => {
  const content = fs.readFileSync(themeNodePath, 'utf8');
  assert.ok(
    /CAST_TYPES/.test(content) && /castChips/.test(content),
    'Expected ThemeNode to compute cast chips from connected knowledge nodes'
  );
});

test('F5-Boundary-2: Spiderweb auto-linking does not connect a node to itself', () => {
  const content = fs.readFileSync(useStorePath, 'utf8');
  assert.ok(
    /if\s*\(otherNode\.id\s*===\s*id\)\s*return;?/.test(content),
    'Expected auto-linking loop to skip self'
  );
});

test('F5-Boundary-3: Spiderweb auto-linking checks for existing edges to avoid duplicates', () => {
  const content = fs.readFileSync(useStorePath, 'utf8');
  // The dedupe must look in BOTH directions -- a manual character->document
  // edge counts as existing when the auto-linker wants document->character.
  assert.ok(
    /currentEdges\.find\(e\s*=>\s*\(e\.source === id && e\.target === otherNode\.id\)\s*\|\|\s*\(e\.source === otherNode\.id && e\.target === id\)\)/.test(content),
    'Expected a bidirectional check for existing edges before auto-creating'
  );
});

test('F5-Boundary-4: Word count level-up threshold drives the gold fill state', () => {
  const content = fs.readFileSync(themeNodePath, 'utf8');
  assert.ok(
    /wordCount\s*>=\s*500/.test(content) && /isLeveledUp/.test(content),
    'Expected level-up state to trigger at >= 500 words'
  );
});

test('F5-Boundary-5: BaseNode function tags carry the fixed color palette', () => {
  const content = fs.readFileSync(path.resolve('src/components/BaseNode.tsx'), 'utf8');
  assert.ok(
    /FUNC_COLORS/.test(content) && /scripture/.test(content) && /illustration/.test(content),
    'Expected BaseNode function-tag palette (scripture/illustration/...)'
  );
});
