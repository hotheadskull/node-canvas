import { expect, test } from '@playwright/test';

// Observatory §10: double-click grows a plate IN PLACE to 736px. Session
// only: the stored document never changes (I5 -- opening is not a write),
// Esc returns to the map, and the footer's Focus button is the step into
// the full writing room.

async function boot(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem('nodecanvas.v2.menuView', 'all');
    localStorage.setItem('nodecanvas.v2.tutorialDone', 'done');
  });
  await page.reload();
}

async function addNode(page: import('@playwright/test').Page, type: string) {
  await page.getByRole('button', { name: /add node/i }).click();
  await page.locator(`[data-node-type="${type}"]`).click();
  await page.waitForTimeout(200);
}

test('double-click grows the plate in place; Esc returns; the document never changes', async ({
  page,
}) => {
  await boot(page);
  await addNode(page, 'note');
  await page.getByRole('button', { name: 'Fit' }).click();
  await page.waitForTimeout(450);

  await page.waitForFunction(() => localStorage.getItem('nodecanvas.v2.document') !== null);
  const before = await page.evaluate(() => localStorage.getItem('nodecanvas.v2.document'));

  await page.locator('.canvas-node .plate-header').dblclick();
  const open = page.locator('.canvas-node.is-open');
  await expect(open).toHaveCount(1);
  // the rendered width borrows exactly 736 unscaled pixels
  expect(await open.evaluate((element) => (element as HTMLElement).offsetWidth)).toBe(736);
  // the linked rail lists the plate's ports as chips
  await expect(open.locator('[data-open-rail] .open-chip')).not.toHaveCount(0);

  await page.keyboard.press('Escape');
  await expect(page.locator('.canvas-node.is-open')).toHaveCount(0);
  expect(
    await page
      .locator('.canvas-node')
      .first()
      .evaluate((element) => (element as HTMLElement).offsetWidth),
  ).toBeLessThan(736);

  // opening was NOT a write: the stored document is byte-identical
  await page.waitForTimeout(700); // let any (wrongly) debounced save flush
  const after = await page.evaluate(() => localStorage.getItem('nodecanvas.v2.document'));
  expect(after).toBe(before);
});

test('the Focus button steps from the open plate into the writing room', async ({ page }) => {
  await boot(page);
  await addNode(page, 'note');
  await page.getByRole('button', { name: 'Fit' }).click();
  await page.waitForTimeout(450);

  await page.locator('.canvas-node .plate-header').dblclick();
  await expect(page.locator('.canvas-node.is-open')).toHaveCount(1);
  await page.locator('.open-focus').click();
  await expect(page.locator('[data-focus-editor]')).toBeVisible();

  // Esc closes the room first, then the open plate -- two distinct steps
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-focus-editor]')).toHaveCount(0);
  await expect(page.locator('.canvas-node.is-open')).toHaveCount(1);
  await page.keyboard.press('Escape');
  await expect(page.locator('.canvas-node.is-open')).toHaveCount(0);
});

test('a wire stays settled on the grown plate (no permanent ghost)', async ({ page }) => {
  await boot(page);
  await addNode(page, 'note');
  await addNode(page, 'document');
  await page.getByRole('button', { name: 'Fit' }).click();
  await page.waitForTimeout(400);

  const note = page.locator('.react-flow__node').filter({
    has: page.locator('.canvas-node-kind', { hasText: /^Note$/ }),
  });
  const doc = page.locator('.react-flow__node').filter({
    has: page.locator('.canvas-node-kind', { hasText: /^Document$/ }),
  });
  await note.locator('.port-star[data-port-direction="give"]').first().click({ force: true });
  await doc.locator('.port-star[data-port-direction="take"]').first().click({ force: true });
  await expect(page.locator('.wire-edge.is-live')).toHaveCount(1);

  await note.locator('.plate-header').dblclick();
  await expect(page.locator('.canvas-node.is-open')).toHaveCount(1);
  await page.waitForTimeout(600);

  // settled = orthogonal harness path (multiple runs), not the 2-point ghost
  const d = await page
    .locator('.wire-edge.is-live')
    .first()
    .evaluate((path) => path.getAttribute('d') ?? '');
  expect((d.match(/L/g) ?? []).length).toBeGreaterThan(1);
  expect(d).not.toMatch(/^M[-\d.]+,[-\d.]+ L[-\d.]+,[-\d.]+$/);
});
