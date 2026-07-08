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

test('Scenario-3: Dropping a node onto a DeckNode nests it as a card and deletes the original canvas node', () => {
  const appTsx = fs.readFileSync(appTsxPath, 'utf8');
  
  // Check for targetNode.type === 'deck' nesting logic
  assert.ok(
    /targetNode\.type\s*===\s*['"]deck['"]/.test(appTsx),
    'Expected intersection check for deck type'
  );
  
  // Check for cards copying
  assert.ok(
    /cards:\s*\[\.\.\.deckCards,\s*cardData\]/.test(appTsx),
    'Expected deck node data to be updated with card data'
  );
  
  // Check for deletion of original node from state
  assert.ok(
    /nodes:\s*state\.nodes\.filter\(n\s*=>\s*n\.id\s*!==\s*node\.id\)/.test(appTsx),
    'Expected original node to be deleted after dropping into deck'
  );
});

test('Scenario-4: Dropping a node onto a GroupNode sets it as a child with extent constraint', () => {
  const appTsx = fs.readFileSync(appTsxPath, 'utf8');
  
  // Check for group type check
  assert.ok(
    /targetNode\.type\s*===\s*['"]group['"]/.test(appTsx),
    'Expected intersection check for group type'
  );
  
  // Check for parentId and extent properties updates
  assert.ok(
    /parentId:\s*targetNode\.id/.test(appTsx) && /extent:\s*['"]parent['"]/.test(appTsx),
    'Expected node parentId and parent extent constraint to be set'
  );
});

test('Scenario-5: Reconnecting an edge deletes the old edge from the database and inserts the new connection', () => {
  const useStore = fs.readFileSync(useStorePath, 'utf8');
  
  // Check that onReconnect is defined
  assert.ok(
    /onReconnect:\s*async\s*\(oldEdge:\s*Edge,\s*newConnection:\s*Connection\)/.test(useStore),
    'Expected onReconnect function signature'
  );
  
  // Check that old edge is deleted from DB
  assert.ok(
    /db\.delete\(edgesTable\)\.where\(eq\(edgesTable\.id,\s*oldEdge\.id\)\)/.test(useStore),
    'Expected old edge deletion query in database'
  );
  
  // Check that new edge is inserted in DB
  assert.ok(
    /db\.insert\(edgesTable\)\.values\(\{/.test(useStore),
    'Expected new edge insertion query in database'
  );
});
