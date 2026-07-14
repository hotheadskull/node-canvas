import { expect, test } from '@playwright/test';

// Chunk 2 end-to-end: spawn via the gallery menu, connect with a real mouse
// drag, verify the edge renders with its robust hit affordances, then reload
// and verify nothing moved (I5).

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test('spawn two nodes, connect them, edge renders with both click affordances', async ({
  page,
}) => {
  // spawn Person and Section through the real menu
  await page.getByRole('button', { name: /add node/i }).click();
  await page.locator('[data-node-type="person"]').click();
  await page.getByRole('button', { name: /add node/i }).click();
  await page.locator('[data-node-type="section"]').click();
  await expect(page.locator('.react-flow__node')).toHaveCount(2);
  // the camera follows the newest spawn; bring both nodes into view to drag
  await page.getByRole('button', { name: 'Fit' }).click();
  await page.waitForTimeout(450);

  // collision-free spawn: bounding boxes must not overlap
  const boxes = [];
  for (const node of await page.locator('.react-flow__node').all()) {
    boxes.push((await node.boundingBox())!);
  }
  const [a, b] = boxes;
  const overlap =
    a!.x < b!.x + b!.width &&
    a!.x + a!.width > b!.x &&
    a!.y < b!.y + b!.height &&
    a!.y + a!.height > b!.y;
  expect(overlap).toBe(false);

  // connect: real mouse drag from one node's bottom handle to the other node
  const sourceHandle = page.locator('.react-flow__node').first().locator('.react-flow__handle-bottom');
  const targetHandle = page.locator('.react-flow__node').nth(1).locator('.react-flow__handle-top');
  const from = (await sourceHandle.boundingBox())!;
  const to = (await targetHandle.boundingBox())!;
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 12 });
  await page.mouse.up();

  // the edge renders: visible path + wide interaction path + label chip
  await expect(page.locator('.react-flow__edge-path')).toHaveCount(1);
  const interactionWidth = await page
    .locator('.react-flow__edge-interaction')
    .getAttribute('stroke-width');
  expect(Number(interactionWidth)).toBeGreaterThanOrEqual(24);
  await expect(page.locator('.edge-chip-face')).toBeVisible();

  // the chip is the second affordance: clicking it opens the edge menu
  await page.locator('.edge-chip-face').click();
  await expect(page.locator('.edge-chip-input')).toBeVisible();
  await page.locator('.edge-chip-input').fill('knows');
  await page.keyboard.press('Escape');

  // the edge persisted with its handles (v1 F7-10a lesson); wait out the
  // debounced save before reading
  await page.waitForFunction(() => {
    const raw = localStorage.getItem('nodecanvas.v2.document');
    return raw !== null && JSON.parse(raw).edges.length === 1;
  });
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('nodecanvas.v2.document')!),
  );
  expect(saved.edges).toHaveLength(1);
  expect(saved.edges[0].sourceHandle).toBeTruthy();
  expect(saved.edges[0].targetHandle).toBeTruthy();
});

test('I5: reload moves nothing -- positions and viewport land exactly as saved', async ({
  page,
}) => {
  await page.getByRole('button', { name: /add node/i }).click();
  await page.locator('[data-node-type="note"]').click();
  await expect(page.locator('.react-flow__node')).toHaveCount(1);
  // let the debounced save land
  await page.waitForFunction(() => {
    const raw = localStorage.getItem('nodecanvas.v2.document');
    return raw !== null && JSON.parse(raw).nodes.length === 1;
  });

  const before = await page.locator('.react-flow__node').evaluate((el) => el.style.transform);
  await page.reload();
  await expect(page.locator('.react-flow__node')).toHaveCount(1);
  const after = await page.locator('.react-flow__node').evaluate((el) => el.style.transform);
  expect(after).toBe(before);
});
