import { expect, test } from '@playwright/test';

// Observatory §2: three collapse states. Sticky (persisted per node),
// ⌥click toggles, ⌥⇧A sweeps, collapsing never drops a wire (ports merge),
// and zoom below 45% borrows collapsed rendering WITHOUT writing it back.

async function boot(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem('nodecanvas.v2.menuView', 'all');
    localStorage.setItem('nodecanvas.v2.tutorialDone', 'done');
  });
  await page.reload();
}

test('⌥click collapses to title+subtitle, persists through reload, ⌥click expands', async ({
  page,
}) => {
  await boot(page);
  await page.getByRole('button', { name: /add node/i }).click();
  await page.locator('[data-node-type="note"]').click();
  await page.getByRole('button', { name: 'Fit' }).click();
  await page.waitForTimeout(400);

  const note = page.locator('.react-flow__node.react-flow__node-canvas').first();
  await note.locator('.richtext-content').click();
  await page.keyboard.type('The letter arrives at dawn and nobody wants to open it.', { delay: 1 });

  // collapse via ⌥click on the header rail
  await note.locator('.plate-header').click({ modifiers: ['Alt'] });
  await expect(note.locator('[data-collapsed-body]')).toBeVisible();
  await expect(note.locator('.plate-subtitle')).toContainText('letter arrives at dawn');
  await expect(note.locator('.richtext-content')).toHaveCount(0);
  await expect(note.locator('.plate-meta')).toHaveCount(0);

  // sticky: the stored value survives a reload
  await page.reload();
  await page.getByRole('button', { name: 'Fit' }).click();
  await page.waitForTimeout(400);
  const reloaded = page.locator('.react-flow__node.react-flow__node-canvas').first();
  await expect(reloaded.locator('[data-collapsed-body]')).toBeVisible();

  // ⌥click expands again
  await reloaded.locator('.plate-header').click({ modifiers: ['Alt'] });
  await expect(reloaded.locator('[data-collapsed-body]')).toHaveCount(0);
  await expect(reloaded.locator('.richtext-content')).toBeVisible();
});

test('collapsing never drops a wire: ports merge, the edge survives', async ({ page }) => {
  await boot(page);
  // a document with one wired section (the spine pattern)
  await page.getByRole('button', { name: /add node/i }).click();
  await page.locator('[data-node-type="document"]').click();
  await page.locator('[data-add-section]').click();
  await page.waitForTimeout(300);
  await page.getByRole('button', { name: 'Fit' }).click();
  await page.waitForTimeout(400);
  await expect(page.locator('.wire-edge.is-live')).toHaveCount(1);

  // collapse the SECTION (the wire's source)
  const section = page
    .locator('.react-flow__node')
    .filter({ has: page.locator('.canvas-node-kind', { hasText: /^Section$/ }) });
  await section.locator('.plate-header').click({ modifiers: ['Alt'] });
  await expect(section.locator('[data-collapsed-body]')).toBeVisible();

  // the wire is still there, re-anchored to the merged dot
  await expect(page.locator('.wire-edge.is-live')).toHaveCount(1);
  await expect(section.locator('.port-star.is-merged').first()).toBeAttached();

  // and the model kept every wire
  const wireCount = await page.evaluate(
    () => JSON.parse(localStorage.getItem('nodecanvas.v2.document')!).wires.length,
  );
  expect(wireCount).toBe(1);
});

test('zoom below 45% borrows collapsed rendering and never writes it back', async ({ page }) => {
  await boot(page);
  for (const type of ['note', 'person']) {
    await page.getByRole('button', { name: /add node/i }).click();
    await page.locator(`[data-node-type="${type}"]`).click();
  }
  await page.getByRole('button', { name: 'Fit' }).click();
  await page.waitForTimeout(400);
  await expect(page.locator('[data-collapsed-body]')).toHaveCount(0);

  // wheel out well past the 45% threshold
  const pane = page.locator('.react-flow__pane');
  const box = (await pane.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  for (let i = 0; i < 10; i++) await page.mouse.wheel(0, 400);
  await page.waitForTimeout(300);
  await expect(page.locator('[data-collapsed-body]')).toHaveCount(2);

  // the STORED document was never touched
  const stored = await page.evaluate(
    () => localStorage.getItem('nodecanvas.v2.document') ?? '',
  );
  expect(stored).not.toContain('"collapsed"');

  // zoom back in: full plates return
  for (let i = 0; i < 10; i++) await page.mouse.wheel(0, -400);
  await page.waitForTimeout(300);
  await expect(page.locator('[data-collapsed-body]')).toHaveCount(0);
});

test('⌥⇧A sweeps: collapse all, then expand all', async ({ page }) => {
  await boot(page);
  for (const type of ['note', 'person', 'place']) {
    await page.getByRole('button', { name: /add node/i }).click();
    await page.locator(`[data-node-type="${type}"]`).click();
  }
  await page.getByRole('button', { name: 'Fit' }).click();
  await page.waitForTimeout(400);

  await page.locator('.react-flow__pane').click({ position: { x: 700, y: 80 } });
  await page.keyboard.press('Alt+Shift+KeyA');
  await expect(page.locator('[data-collapsed-body]')).toHaveCount(3);

  await page.keyboard.press('Alt+Shift+KeyA');
  await expect(page.locator('[data-collapsed-body]')).toHaveCount(0);
});
