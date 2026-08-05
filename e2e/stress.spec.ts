import { expect, test } from '@playwright/test';

// Chunk 18 perf pass: 500 nodes / 800 edges (the long-standing stress
// target). Budgets are deliberately generous -- this guards against
// pathological regressions (seconds-long hangs), not micro-perf.

function buildStressDocument() {
  const COLS = 25;
  const nodes = Array.from({ length: 500 }, (_, index) => ({
    id: `node_stress-${index}`,
    type: index % 7 === 0 ? 'person' : 'note',
    position: { x: (index % COLS) * 360, y: Math.floor(index / COLS) * 280 },
    // real documents always carry recorded sizes; without one the culling
    // pass sees a zero-size rect that intersects nothing and renders nothing
    size: { width: 320, height: 200 },
    data: { title: `Stress ${index}`, content: `<p>Body of node ${index}</p>` },
  }));
  const edges = [] as { id: string; source: string; target: string }[];
  for (let index = 0; index < 499; index++) {
    edges.push({
      id: `edge_chain-${index}`,
      source: `node_stress-${index}`,
      target: `node_stress-${index + 1}`,
    });
  }
  for (let index = 0; index < 301; index++) {
    const from = (index * 13) % 500;
    const to = (index * 89 + 250) % 500;
    if (from === to) continue;
    edges.push({
      id: `edge_cross-${index}`,
      source: `node_stress-${from}`,
      target: `node_stress-${to}`,
    });
  }
  return {
    schemaVersion: 1,
    id: 'doc_stress',
    name: 'Stress test',
    canvasMode: 'universal',
    createdAt: '2026-08-05T12:00:00.000Z',
    nodes,
    edges,
    wires: [],
    assemblies: [],
  };
}

test('500 nodes / 800 edges: boots, culls, and stays interactive', async ({ page }) => {
  test.setTimeout(90_000);
  // Seed BEFORE the app ever boots: seeding after a goto loses the document
  // to the flush-on-beforeunload save (the empty in-memory canvas overwrites
  // localStorage during the reload).
  const doc = buildStressDocument();
  await page.addInitScript((serialized) => {
    if (localStorage.getItem('nodecanvas.v2.document') !== serialized) {
      localStorage.clear();
      localStorage.setItem('nodecanvas.v2.menuView', 'all');
      localStorage.setItem('nodecanvas.v2.tutorialDone', '1');
      localStorage.setItem('nodecanvas.v2.document', serialized);
    }
  }, JSON.stringify(doc, null, 2));

  const bootStart = Date.now();
  await page.goto('/');
  await expect(page.getByTestId('app-shell')).toBeVisible();
  await expect(page.locator('.react-flow__node').first()).toBeVisible({ timeout: 15_000 });
  const bootMs = Date.now() - bootStart;
  expect(bootMs).toBeLessThan(15_000);

  // Visibility culling is the load-bearing perf lever: at 100% zoom over a
  // 9000x5600 canvas the DOM must hold a small fraction of the 500 nodes.
  const rendered = await page.locator('.react-flow__node').count();
  expect(rendered).toBeGreaterThan(0);
  expect(rendered).toBeLessThan(150);

  // Panning must not hang: five viewport drags complete inside a budget.
  const panStart = Date.now();
  for (let index = 0; index < 5; index++) {
    await page.mouse.move(640, 400);
    await page.mouse.down();
    await page.mouse.move(240, 250, { steps: 5 });
    await page.mouse.up();
  }
  expect(Date.now() - panStart).toBeLessThan(8_000);

  // Editing still lands: spawn a node and type into it.
  const spawnStart = Date.now();
  await page.getByRole('button', { name: /add node/i }).click();
  await page.locator('[data-node-type="note"]').click();
  await expect(page.locator('.react-flow__node').locator('.richtext-content').first())
    .toBeVisible({ timeout: 5_000 });
  expect(Date.now() - spawnStart).toBeLessThan(5_000);
});
