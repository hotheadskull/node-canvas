import { expect, test } from '@playwright/test';

// Observatory §4: the wire harness. Settled wires are orthogonal with 45°
// chamfers (never bezier curves); one give feeding two takes splits at a
// junction dot; dragging ghosts to a straight line and settles on release.

async function boot(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem('nodecanvas.v2.menuView', 'all');
    localStorage.setItem('nodecanvas.v2.tutorialDone', 'done');
  });
  await page.reload();
}

test('settled wires are orthogonal chamfered runs, never curves', async ({ page }) => {
  await boot(page);
  await page.getByRole('button', { name: /add node/i }).click();
  await page.locator('[data-node-type="document"]').click();
  await page.locator('[data-add-section]').click();
  await page.locator('[data-add-section]').click();
  await page.waitForTimeout(400);
  await page.getByRole('button', { name: 'Fit' }).click();
  await page.waitForTimeout(500);

  const wires = page.locator('.wire-edge.is-live');
  await expect(wires).toHaveCount(2);
  for (const d of await wires.evaluateAll((paths) =>
    paths.map((path) => path.getAttribute('d') ?? ''),
  )) {
    expect(d.startsWith('M')).toBe(true);
    expect(d).not.toMatch(/[CQ]/); // no curves in the harness
    expect(d).toContain('L'); // real line runs
  }
});

test('one give feeding two takes earns exactly one junction dot', async ({ page }) => {
  await boot(page);
  // a note whose Text give feeds TWO documents' spine intakes
  for (const type of ['note', 'document', 'document']) {
    await page.getByRole('button', { name: /add node/i }).click();
    await page.locator(`[data-node-type="${type}"]`).click();
    await page.waitForTimeout(120);
  }
  await page.getByRole('button', { name: 'Fit' }).click();
  await page.waitForTimeout(400);

  const note = page.locator('.react-flow__node').filter({
    has: page.locator('.canvas-node-kind', { hasText: /^Note$/ }),
  });
  const docs = page.locator('.react-flow__node').filter({
    has: page.locator('.canvas-node-kind', { hasText: /^Document$/ }),
  });
  const give = note.locator('.port-star[data-port-direction="give"]').first();
  for (const index of [0, 1]) {
    await give.click({ force: true });
    await docs
      .nth(index)
      .locator('.port-star[data-port-direction="take"]')
      .first()
      .click({ force: true });
    await page.waitForTimeout(250);
  }
  await expect(page.locator('.wire-edge.is-live')).toHaveCount(2);
  await expect(page.locator('[data-junction]')).toHaveCount(1);
});

test('dragging ghosts the wire and it settles orthogonal on release', async ({ page }) => {
  await boot(page);
  await page.getByRole('button', { name: /add node/i }).click();
  await page.locator('[data-node-type="document"]').click();
  await page.locator('[data-add-section]').click();
  await page.waitForTimeout(400);
  await page.getByRole('button', { name: 'Fit' }).click();
  await page.waitForTimeout(500);

  const section = page.locator('.react-flow__node').filter({
    has: page.locator('.canvas-node-kind', { hasText: /^Section$/ }),
  });
  const header = section.locator('.plate-header');
  const box = (await header.boundingBox())!;

  // drag 140px down; sample mid-drag: the wire must be a plain 2-point line
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2 + 90, { steps: 6 });
  const midDragD = await page
    .locator('.wire-edge.is-live')
    .first()
    .evaluate((path) => path.getAttribute('d') ?? '');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2 + 140, { steps: 4 });
  await page.mouse.up();
  await page.waitForTimeout(500);

  // ghost: exactly one M and one L, nothing else
  expect(midDragD).toMatch(/^M[-\d.]+,[-\d.]+ L[-\d.]+,[-\d.]+$/);

  // settled: orthogonal again with multiple runs
  const settledD = await page
    .locator('.wire-edge.is-live')
    .first()
    .evaluate((path) => path.getAttribute('d') ?? '');
  expect(settledD).not.toMatch(/[CQ]/);
  expect((settledD.match(/L/g) ?? []).length).toBeGreaterThan(2);
});

test('the signal budget animates at most 8 wires', async ({ page }) => {
  await boot(page);
  await page.getByRole('button', { name: /add node/i }).click();
  await page.locator('[data-node-type="document"]').click();
  for (let index = 0; index < 3; index++) {
    await page.locator('[data-add-section]').click();
  }
  await page.waitForTimeout(400);
  await page.getByRole('button', { name: 'Fit' }).click();
  await page.waitForTimeout(500);
  const signalCount = await page.locator('.wire-signal').count();
  expect(signalCount).toBeGreaterThan(0);
  expect(signalCount).toBeLessThanOrEqual(8);
});
