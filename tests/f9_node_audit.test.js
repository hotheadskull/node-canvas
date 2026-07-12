import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

const read = (p) => fs.readFileSync(path.resolve(p), 'utf8');

// F9-1: EVERY node with dynamically-created handles must re-register them
// with React Flow, or connections to new handles silently fail. Crucible
// was missed when compile/sequence were fixed.
test('F9-1: all dynamic-handle nodes call updateNodeInternals', () => {
  for (const file of [
    'src/components/CompileNode.tsx',
    'src/components/SequenceNode.tsx',
    'src/components/CrucibleNode.tsx',
  ]) {
    const src = read(file);
    assert.ok(
      /useUpdateNodeInternals/.test(src) && /updateNodeInternals\(id\)/.test(src),
      `${file} must call updateNodeInternals when its handle set changes`
    );
  }
});

// F9-2: Crucible's "Push Text to Scene" must write the field Scene nodes
// actually display (manuscript), not the orphaned content field.
test('F9-2: crucible pushes conflict text into the scene manuscript', () => {
  const src = read('src/components/CrucibleNode.tsx');
  assert.ok(
    /manuscript: existingText \+ textToInsert/.test(src),
    'pushToScene must append to manuscript (scenes display manuscript || content)'
  );
  assert.ok(
    /targetNode\.data\.manuscript \|\| targetNode\.data\.content/.test(src),
    'pushToScene must start from whichever field currently holds the scene text'
  );
});

// F9-3: sequence beats must never be unreachable -- the strip scrolls
// (wheel scrolls beats, not the canvas zoom) and the node is resizable.
test('F9-3: sequence beats overflow into a scrollable strip', () => {
  const src = read('src/components/SequenceNode.tsx');
  assert.ok(
    /nowheel/.test(src) && /overflow-x-auto/.test(src),
    'Beat strip must be a nowheel horizontal scroller, not overflow-hidden'
  );
  assert.ok(
    !/resizable={false}/.test(src),
    'Sequence must be resizable so users can widen it instead of scrolling'
  );
  assert.ok(
    /onScroll=/.test(src) && /updateNodeInternals\(id\)/.test(src),
    'Scrolling the strip must re-measure handles or pinned beat edges go stale'
  );
});

// F9-4: hub corner handles are PERCENTAGE positioned so they track the
// octagon at any size (hardcoded px only fit the 120px spawn).
test('F9-4: hub corner handles scale with the octagon', () => {
  const src = read('src/components/HubNode.tsx');
  assert.ok(
    !/left: '18px'/.test(src) && !/left: '102px'/.test(src),
    'Hub corner handles must not use spawn-size px offsets'
  );
  assert.ok(
    (src.match(/left: '(?:15|85)%'/g) || []).length === 4,
    'All four corner handles must sit at 15%/85% of the octagon'
  );
  assert.ok(
    src.includes('minWidth={100} minHeight={100} keepAspectRatio'),
    'Hub resizer must not exceed the spawn size and must keep the octagon square'
  );
});

// F9-5: group zone card minimums must match its resizer minimums, or the
// resize frame detaches from the card (the old spawn-size glitch class).
test('F9-5: group zone card min matches its resizer min', () => {
  const src = read('src/components/GroupNode.tsx');
  const resizerMin = src.match(/minWidth={(\d+)}/)?.[1];
  const cardMin = src.match(/minWidth: '(\d+)px'/)?.[1];
  assert.strictEqual(resizerMin, cardMin, `Resizer min (${resizerMin}) and card min (${cardMin}) must agree`);
});

// F9-6: writing-surface type picker lives in the icon with mode-aware
// labels -- no raw type strings, no header dropdown chrome.
test('F9-6: ThemeNode type picker is icon-based with proper labels', () => {
  const src = read('src/components/ThemeNode.tsx');
  assert.ok(!/headerRight=/.test(src), 'ThemeNode must not stack a headerRight dropdown');
  assert.ok(
    /renderIcon=/.test(src) && /nodeLabel\(t, mode\)/.test(src),
    'ThemeNode options must show registry labels, not raw type strings'
  );
});

// F9-8: nodes auto-grow with content. Height ownership belongs to the
// content until the USER resizes; only user resizes persist; Fit hands
// ownership back.
test('F9-8: auto-grow sizing model stays intact', () => {
  const store = read('src/store/useStore.ts');
  // Only user-driven dimension changes may hit the DB -- persisting React
  // Flow's measure events would freeze auto heights forever.
  assert.ok(
    /change\.type === 'dimensions' && change\.dimensions &&\s*\n?\s*\(\(change as any\)\.resizing \|\| \(change as any\)\.setAttributes\)/.test(store),
    'Dimension persistence must be gated on resizing/setAttributes'
  );
  assert.ok(
    /resetNodeSize/.test(store) && /set\(\{ height: null \}\)/.test(store),
    'resetNodeSize must clear the persisted height'
  );
  // A bare click on a resize edge emits a zero-delta resize -- it must not
  // convert an auto-growing card to manual sizing.
  assert.ok(
    /Math\.abs\(cur\.width - c\.dimensions\.width\) < 1/.test(store),
    'Zero-delta resize events must be filtered before they take ownership'
  );
  // Load fallback: fixed types get registry heights, everything else auto
  assert.ok(
    /spawn\.sizing === 'fixed' \? spawn\.height : undefined/.test(store),
    'Loads must not re-stamp heights onto auto-sizing nodes'
  );
  const baseNode = read('src/components/BaseNode.tsx');
  assert.ok(
    /hasManualHeight/.test(baseNode) && /resetNodeSize\(id\)/.test(baseNode),
    'BaseNode must offer the Fit button once a manual resize took ownership'
  );
  const css = read('src/App.css');
  assert.ok(
    /field-sizing: content/.test(css),
    'Textareas must grow with content so auto-height cards grow too'
  );
  const registry = read('src/nodes/registry.ts');
  assert.ok(
    /sizing: 'fixed'/.test(registry) && /sizing: 'auto'/.test(registry),
    'Registry must mark group/hub fixed and sequence auto'
  );
});

// F9-9: the resizer is part of the card, not a frame around it -- no
// visible outline, corner dots wear the node accent, edges light up flush
// with the card border on hover.
test('F9-9: resize affordance is integrated, not a floating frame', () => {
  const css = read('src/App.css');
  assert.ok(
    /\.react-flow__resize-control\.line \{ border: none !important; \}/.test(css),
    'Resize lines must draw no frame'
  );
  assert.ok(
    /\.react-flow__resize-control\.line:hover::after \{ opacity: 1; \}/.test(css),
    'Hovering an edge must light the flush border line'
  );
  const baseNode = read('src/components/BaseNode.tsx');
  assert.ok(
    /backgroundColor: accentColor/.test(baseNode) && /borderRadius: '50%'/.test(baseNode),
    'Corner handles must be accent-colored dots'
  );
});

// F9-7: below 50% zoom the app grows connection handles to a usable size.
test('F9-7: zoomed-out canvases get bigger handle targets', () => {
  const app = read('src/App.tsx');
  assert.ok(
    /viewport\.zoom < 0\.5/.test(app) && /zoomed-out/.test(app),
    'App must flag the canvas with .zoomed-out below 50% zoom'
  );
  const css = read('src/App.css');
  assert.ok(
    /\.zoomed-out \.react-flow__handle/.test(css),
    'App.css must grow handles when zoomed out'
  );
  assert.ok(
    /:not\(\[data-handleid\^="slot-"\]\)/.test(css),
    'In-row slot handles must be excluded from the size boost'
  );
});
