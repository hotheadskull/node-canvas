import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

const useStorePath = path.resolve('src/store/useStore.ts');
const appTsxPath = path.resolve('src/App.tsx');

// Tier 4: Real-world application scenarios
test('Scenario-1: Dragging nodes updates position in Zustand store and db with debounced timeout', () => {
  const useStore = fs.readFileSync(useStorePath, 'utf8');
  
  // Checks that updateTimeouts debouncing exists
  assert.ok(
    /updateTimeouts\[change\.id\]\s*=\s*setTimeout/.test(useStore),
    'Expected dragging position change to use debounced timeout'
  );
  
  // Checks that x_position and y_position updates are written to DB
  assert.ok(
    /x_position:\s*change\.position!\.x/.test(useStore) && /y_position:\s*change\.position!\.y/.test(useStore),
    'Expected x_position and y_position to be saved to DB'
  );
});

test('Scenario-2: Typing matching node title triggers spiderweb auto-linking database insert', () => {
  const useStore = fs.readFileSync(useStorePath, 'utf8');
  
  // Check for auto-linking edge insertion
  assert.ok(
    /await\s+db\.insert\(edgesTable\)\.values\({\s*id:\s*edge\.id/.test(useStore),
    'Expected auto-linking to insert edges into database'
  );
});

test('Scenario-3: Deck absorption only fires on actual deck targets and soft-deletes the original', () => {
  const appTsx = fs.readFileSync(appTsxPath, 'utf8');

  // REGRESSION GUARD: absorbing on ANY intersection (without the deck type
  // check) ate group zones and sequence nodes on overlap-drop
  assert.ok(
    /intersections\.find\(n\s*=>\s*n\.type\s*===\s*['"]deck['"]\)/.test(appTsx),
    'Expected deck absorption to check the target is a deck'
  );

  // Check for cards copying (persisted inside metadata so it survives restarts)
  assert.ok(
    /metadata:\s*\{\s*\.\.\.meta,\s*cards:\s*\[\.\.\.deckCards,\s*cardData\]/.test(appTsx),
    'Expected deck node metadata to be updated with card data'
  );

  // Check that the original node is soft-deleted (goes to trash + DB)
  assert.ok(
    /deleteNode\(node\.id\)/.test(appTsx),
    'Expected original node to be soft-deleted after dropping into deck'
  );
});

test('Scenario-4: Dropping a node onto a GroupNode nests it and dragging out un-nests it', () => {
  const appTsx = fs.readFileSync(appTsxPath, 'utf8');

  // Group targets are found by type, never by "first intersection"
  assert.ok(
    /intersections\.find\(n\s*=>\s*n\.type\s*===\s*['"]group['"]\)/.test(appTsx),
    'Expected intersection lookup specifically for group type'
  );

  // Nesting sets parentId to the group and persists it
  assert.ok(
    /parentId:\s*targetGroup\.id/.test(appTsx) && /updateNodeParent\(node\.id,\s*targetGroup\.id\)/.test(appTsx),
    'Expected node parentId set to the group and persisted'
  );

  // Dragging out clears the parent and persists that too
  assert.ok(
    /updateNodeParent\(node\.id,\s*null\)/.test(appTsx),
    'Expected dragging out of a group to clear the parent'
  );
});

test('Scenario-5: Reconnecting an edge updates the same edge row in the database', () => {
  const useStore = fs.readFileSync(useStorePath, 'utf8');

  // Check that onReconnect is defined
  assert.ok(
    /onReconnect:\s*async\s*\(oldEdge:\s*Edge,\s*newConnection:\s*Connection\)/.test(useStore),
    'Expected onReconnect function signature'
  );

  // reconnectEdge keeps the edge id in memory, so the DB row must be updated
  // in place (delete+insert with a new id desynced memory and DB ids)
  assert.ok(
    /db\.update\(edgesTable\)[\s\S]*?source_id:\s*newConnection\.source[\s\S]*?\.where\(eq\(edgesTable\.id,\s*oldEdge\.id\)\)/.test(useStore),
    'Expected reconnect to update the existing edge row by its original id'
  );
});
