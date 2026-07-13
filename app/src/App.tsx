import { createId } from '@node-canvas/core';

// Placeholder shell. The canvas baseline lands in Chunk 2, ported from
// /legacy for look and feel (invariant I6).
export default function App() {
  return (
    <main data-testid="app-shell" data-boot-id={createId('boot')}>
      <h1>Node Canvas V2</h1>
      <p>Workspace scaffold. Canvas arrives in Chunk 2.</p>
    </main>
  );
}
