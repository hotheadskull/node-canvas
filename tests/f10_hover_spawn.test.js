import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

const read = (p) => fs.readFileSync(path.resolve(p), 'utf8');

// F10-1: the constellation hover must not survive leaving the app. Alt-Tab
// delivers no mouseleave, so without these guards the hovered node stays
// "highlighted like it was clicked" and every unrelated edge is faded to
// near-invisible (which reads as "I can't click my connection lines").
test('F10-1: constellation hover clears when the window loses focus', () => {
  const app = read('src/App.tsx');
  assert.ok(
    /document\.hasFocus\(\)/.test(app),
    'The 3s hover timer must not light the constellation while unfocused'
  );
  assert.ok(
    /window\.addEventListener\('blur', clearHover\)/.test(app) &&
    /document\.addEventListener\('visibilitychange', clearHover\)/.test(app),
    'Window blur / tab hide must clear the hover state'
  );
  assert.ok(
    /window\.removeEventListener\('blur', clearHover\)/.test(app),
    'The blur listener must be cleaned up on unmount'
  );
});

// F10-2: clicking empty canvas is the universal "make it stop" gesture --
// it must dismiss the constellation too, not just node selection.
test('F10-2: pane click dismisses the constellation', () => {
  const app = read('src/App.tsx');
  const paneClick = app.match(/const onPaneClick = useCallback\(\(\) => \{[\s\S]*?\}, \[\]\);/)?.[0];
  assert.ok(paneClick, 'onPaneClick must exist');
  assert.ok(
    /setHoveredNodeId\(null\)/.test(paneClick),
    'onPaneClick must clear hoveredNodeId'
  );
});

// F10-3: menu spawns take the NEAREST free cell around the screen center
// (same row first, then below/above) -- never an unconditional walk to the
// right that marches each new node further off-screen.
test('F10-3: spawn placement searches rings around center, not rightward only', () => {
  const app = read('src/App.tsx');
  assert.ok(
    /const overlaps = \(px: number, py: number\)/.test(app),
    'Spawn placement must use an overlap predicate over all node rects'
  );
  assert.ok(
    /for \(let dx = -4; dx <= 4; dx\+\+\)/.test(app) &&
    /for \(let dy = -4; dy <= 4; dy\+\+\)/.test(app),
    'Candidate cells must cover both directions on both axes'
  );
  assert.ok(
    /cands\.sort\(\(a, b\) => a\.key - b\.key\)/.test(app),
    'Nearest free candidate must win'
  );
  assert.ok(
    !/x = hit\.rect\.x \+ hit\.rect\.w \+ GAP/.test(app),
    'The old rightward-only walk must be gone'
  );
});
