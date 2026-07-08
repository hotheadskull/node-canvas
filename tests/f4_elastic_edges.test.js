import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

const appTsxPath = path.resolve('src/App.tsx');
const elasticEdgePath = path.resolve('src/components/ElasticEdge.tsx');
const appCssPath = path.resolve('src/App.css');

// Tier 1: Feature Coverage (F4)
test('F4-1: ElasticEdge is registered under edgeTypes in App.tsx', () => {
  const content = fs.readFileSync(appTsxPath, 'utf8');
  assert.ok(
    /default:\s*ElasticEdge/.test(content),
    'Expected ElasticEdge to be registered as default in edgeTypes map'
  );
});

test('F4-2: ElasticEdge implements Euclidean distance formula', () => {
  const content = fs.readFileSync(elasticEdgePath, 'utf8');
  assert.ok(
    /Math\.hypot\(tx\s*-\s*sx,\s*ty\s*-\s*sy\)/.test(content),
    'Expected Euclidean distance to be calculated with Math.hypot'
  );
});

test('F4-3: ElasticEdge defines MAX_STRETCH distance limit', () => {
  const content = fs.readFileSync(elasticEdgePath, 'utf8');
  assert.ok(
    /MAX_STRETCH\s*=\s*800/.test(content),
    'Expected MAX_STRETCH constant to equal 800px'
  );
});

test('F4-4: ElasticEdge decreases strokeWidth as tension increases', () => {
  const content = fs.readFileSync(elasticEdgePath, 'utf8');
  assert.ok(
    /strokeWidth\s*=\s*Math\.max\(0\.5,\s*2\s*-\s*\(tension\s*\*\s*1\.5\)\)/.test(content),
    'Expected strokeWidth to decrease dynamically from 2 to 0.5 based on tension'
  );
});

test('F4-5: ElasticEdge triggers removal event when distance exceeds MAX_STRETCH', () => {
  const content = fs.readFileSync(elasticEdgePath, 'utf8');
  assert.ok(
    /onEdgesChange\(\[\{\s*type:\s*['"]remove['"],\s*id\s*\}\]\)/.test(content),
    'Expected onEdgesChange remove action to snap the edge'
  );
});

// Tier 2: Boundary & Corner Cases (F4)
test('F4-Boundary-1: ElasticEdge returns null when source or target nodes are missing', () => {
  const content = fs.readFileSync(elasticEdgePath, 'utf8');
  assert.ok(
    /if\s*\(!sourceNode\s*\|\|\s*!targetNode\)\s*\{\s*return\s+null;?\s*\}/.test(content),
    'Expected component safety check returning null'
  );
});

test('F4-Boundary-2: Tension interpolation keeps the value bounded between 0 and 1', () => {
  const content = fs.readFileSync(elasticEdgePath, 'utf8');
  assert.ok(
    /Math\.max\(0,\s*Math\.min\(1,\s*\(distance\s*-\s*TENSION_START\)\s*\/\s*\(MAX_STRETCH\s*-\s*TENSION_START\)\)\)/.test(content),
    'Expected tension calculation to be clamped between 0 and 1 using Math.max/min'
  );
});

test('F4-Boundary-3: Tension calculation interpolates to strained red RGB values', () => {
  const content = fs.readFileSync(elasticEdgePath, 'utf8');
  assert.ok(
    /const\s+r\s*=\s*Math\.round\(140\s*\+\s*tension\s*\*\s*\(239\s*-\s*140\)\)/.test(content) &&
    /const\s+g\s*=\s*Math\.round\(115\s*\+\s*tension\s*\*\s*\(68\s*-\s*115\)\)/.test(content) &&
    /const\s+b\s*=\s*Math\.round\(75\s*\+\s*tension\s*\*\s*\(68\s*-\s*75\)\)/.test(content),
    'Expected dynamic RGB interpolation from gold to strained red'
  );
});

test('F4-Boundary-4: Edge thins down to a minimum of 0.5px and no thinner', () => {
  const content = fs.readFileSync(elasticEdgePath, 'utf8');
  assert.ok(
    /Math\.max\(0\.5,/.test(content),
    'Expected strokeWidth lower limit to be 0.5px'
  );
});

test('F4-Boundary-5: Highly tense edges render a glowing blur under-layer', () => {
  const content = fs.readFileSync(elasticEdgePath, 'utf8');
  assert.ok(
    /tension\s*>\s*0\.5/.test(content) && /filter:\s*['"]blur\(4px\)['"]/.test(content),
    'Expected extra blur under-layer for tension > 0.5'
  );
});
