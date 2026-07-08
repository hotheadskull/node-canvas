import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

const themeNodePath = path.resolve('src/components/ThemeNode.tsx');
const useStorePath = path.resolve('src/store/useStore.ts');
const appTsxPath = path.resolve('src/App.tsx');

// Tier 1: Feature Coverage (F5)
test('F5-1: ThemeNode supports 3D flip using isFlipped local state', () => {
  const content = fs.readFileSync(themeNodePath, 'utf8');
  assert.ok(
    /const\s*\[isFlipped,\s*setIsFlipped\]\s*=\s*useState\(false\)/.test(content),
    'Expected ThemeNode to have isFlipped state initialized to false'
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
    /const\s+plainText\s*=\s*newText\.replace\(\/\\<\[\^\\>\]\+\\>\/g,\s*['"]{2}\)/.test(content),
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
test('F5-Boundary-1: ThemeNode containers use backface-hidden class for 3D flip correctness', () => {
  const content = fs.readFileSync(themeNodePath, 'utf8');
  assert.ok(
    /backface-hidden/.test(content),
    'Expected backface-hidden styling class on front and back sides'
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
  assert.ok(
    /currentEdges\.some\(e\s*=>\s*e\.source\s*===\s*id\s*&&\s*e\.target\s*===\s*otherNode\.id\)/.test(content),
    'Expected check for existing edges before auto-creating'
  );
});

test('F5-Boundary-4: Word count level-up indicator renders above a threshold of 500 words', () => {
  const content = fs.readFileSync(themeNodePath, 'utf8');
  assert.ok(
    /wordCount\s*>=\s*500/.test(content) && /LEVEL UP!/.test(content),
    'Expected Level Up indicator to show up at >= 500 words'
  );
});

test('F5-Boundary-5: Alchemy fusion animation triggers animate-alchemy class', () => {
  const content = fs.readFileSync(themeNodePath, 'utf8');
  assert.ok(
    /data\.isFusing\s*\?\s*['"]animate-alchemy['"]/.test(content),
    'Expected alchemy animation class under isFusing conditions'
  );
});
