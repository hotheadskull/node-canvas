import { expect, test } from '@playwright/test';

// The expanded plate is RETIRED (user, 2026-08-12: "i dont want an expanded
// node state ... if someone needs a bigger node then they better drag it to
// make it bigger"). A node has ONE size, changed only by the user dragging
// it; double-click steps into the full editor room instead of growing the
// card in place. These pin that rule so the grown plate cannot creep back.

async function boot(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem('nodecanvas.v2.tutorialDone', 'done');
  });
  await page.reload();
}

async function addNode(page: import('@playwright/test').Page, type: string) {
  await page.getByRole('button', { name: /add node/i }).click();
  await page.locator(`[data-node-type="${type}"]`).click();
  await page.waitForTimeout(200);
}

test('double-click opens the editor room; the card never grows in place', async ({ page }) => {
  await boot(page);
  await addNode(page, 'note');
  await page.getByRole('button', { name: 'Fit' }).click();
  await page.waitForTimeout(400);

  const card = page.locator('.canvas-node').first();
  const before = await card.evaluate((element) => (element as HTMLElement).offsetWidth);

  await card.locator('.plate-header').dblclick();
  await page.waitForTimeout(400);

  // the editor room opened...
  await expect(page.locator('.focus-editor, [data-focus-editor]')).toHaveCount(1);
  // ...and no plate anywhere grew to the retired 736px open width
  await expect(page.locator('.canvas-node.is-open')).toHaveCount(0);

  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);
  const after = await card.evaluate((element) => (element as HTMLElement).offsetWidth);
  expect(after).toBe(before);
});

test('the size a node keeps is the size the user dragged it to', async ({ page }) => {
  await boot(page);
  await addNode(page, 'note');
  await page.getByRole('button', { name: 'Fit' }).click();
  await page.waitForTimeout(400);

  const card = page.locator('.canvas-node').first();
  await card.click();
  await page.waitForTimeout(200);
  const before = await card.evaluate((element) => (element as HTMLElement).offsetWidth);

  // drag the resizer's right edge outward
  const handle = page.locator('.react-flow__resize-control.right').first();
  const box = await handle.boundingBox();
  if (box) {
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 120, box.y + box.height / 2, { steps: 10 });
    await page.mouse.up();
    await page.waitForTimeout(400);
    const after = await card.evaluate((element) => (element as HTMLElement).offsetWidth);
    expect(after).toBeGreaterThan(before);

    // and it PERSISTS -- the drag is a real document write
    const stored = await page.evaluate(
      () => JSON.parse(localStorage.getItem('nodecanvas.v2.document')!).nodes[0]?.size?.width ?? 0,
    );
    expect(stored).toBeGreaterThan(before);
  }
});
