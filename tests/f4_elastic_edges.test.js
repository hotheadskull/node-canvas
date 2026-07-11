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

test('F4-2: ElasticEdge pins slot/beat edges to their exact handle', () => {
  const content = fs.readFileSync(elasticEdgePath, 'utf8');
  // Compile slots and sequence beats are SPECIFIC handles: the edge must
  // attach to the dot itself, never float to the host node's boundary
  // (floating made beat connections look attached to the sequence node).
  assert.ok(
    /getHandleAnchor\(sourceNode, 'source', sourceHandleId\)/.test(content) &&
    /getHandleAnchor\(targetNode, 'target', targetHandleId\)/.test(content),
    'Expected anchored endpoints for non-generic handles'
  );
  assert.ok(
    /GENERIC_HANDLES/.test(content),
    'Expected the four generic BaseNode handles to keep floating behavior'
  );
});

test('F4-3: edge color never changes with distance', () => {
  const content = fs.readFileSync(elasticEdgePath, 'utf8');
  // The old gold-to-red "tension" shift overrode the user's chosen
  // connection color on long lines. Color comes ONLY from the edge type.
  assert.ok(
    /const stroke = typeDef\.color/.test(content),
    'Expected stroke to come straight from the edge type definition'
  );
  assert.ok(
    !/MAX_STRETCH|TENSION_START|tension/.test(content),
    'Expected all distance-tension physics to be gone from ElasticEdge'
  );
});

test('F4-4: strokeWidth comes from link strength only', () => {
  const content = fs.readFileSync(elasticEdgePath, 'utf8');
  assert.ok(
    /strokeWidth = Math\.min\(2 \+ \(strength - 1\) \* 0\.6, 4\.5\)/.test(content),
    'Expected width to scale with link strength, capped at 4.5px, independent of distance'
  );
});

test('F4-5: ElasticEdge never auto-deletes on stretch (manual delete button is fine)', () => {
  const content = fs.readFileSync(elasticEdgePath, 'utf8');
  // No distance-triggered snap deletion -- removal must only happen from an
  // explicit user action (the edge's delete button)
  assert.ok(
    !/isBroken/.test(content) && !/distance\s*>\s*MAX_STRETCH\s*&&/.test(content),
    'Expected no auto-removal of edges at distance; tension visuals only'
  );
  assert.ok(
    /EDGE_TYPES/.test(content) && /strokeDasharray/.test(content),
    'Expected typed edges with per-type dash styling'
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

test('F4-Boundary-2: detoured routes re-aim their floating endpoints', () => {
  const content = fs.readFileSync(elasticEdgePath, 'utf8');
  // Endpoints are chosen before the detour exists; without re-aiming at the
  // first/last waypoint the line wraps an obstacle and doubles back to the
  // far side of the card instead of entering on the near side.
  assert.ok(
    /intersectToward\(sourceNode, first\[0\], first\[1\]\)/.test(content) &&
    /intersectToward\(targetNode, last\[0\], last\[1\]\)/.test(content),
    'Expected floating endpoints to re-aim at the detour approach direction'
  );
  assert.ok(
    /if \(moved\) smart = getAvoidingPath\(sx, sy, tx, ty, obstacles\)/.test(content),
    'Expected a second routing pass after endpoints move'
  );
});

test('F4-Boundary-3: an anchored end aims its floating partner at the pin', () => {
  const content = fs.readFileSync(elasticEdgePath, 'utf8');
  assert.ok(
    /if \(srcAnchor && !tgtAnchor\)/.test(content) && /else if \(tgtAnchor && !srcAnchor\)/.test(content),
    'Expected the floating end of a slot/beat edge to aim at the pinned handle, not the node center'
  );
});

test('F4-Boundary-4: strong links still glow gold', () => {
  const content = fs.readFileSync(elasticEdgePath, 'utf8');
  assert.ok(
    /strength >= 3/.test(content) && /rgba\(240, 192, 80/.test(content),
    'Expected the strength aura layer to survive the tension-system removal'
  );
});
