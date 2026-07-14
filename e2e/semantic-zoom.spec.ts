import { expect, test } from '@playwright/test';

// Chunk 10: past the zoom-out threshold, collapsed assemblies render as
// glowing stars; double-clicking a star dives back toward it.

test('collapsed groups become stars when zoomed far out', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  // build a collapsed group
  for (const type of ['person', 'place']) {
    await page.getByRole('button', { name: /add node/i }).click();
    await page.locator(`[data-node-type="${type}"]`).click();
  }
  await page.getByRole('button', { name: 'Fit' }).click();
  await page.waitForTimeout(450);
  const nodes = page.locator('.react-flow__node.react-flow__node-canvas');
  await nodes.nth(0).click();
  await nodes.nth(1).click({ modifiers: ['Control'] });
  await page.getByRole('button', { name: 'Group 2' }).click();
  await expect(page.locator('.assembly-face.is-collapsed')).toHaveCount(1);

  // zoom far out with the wheel
  const canvas = page.locator('.react-flow__pane');
  const box = (await canvas.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  for (let i = 0; i < 14; i++) {
    await page.mouse.wheel(0, 400);
  }
  await expect(page.locator('.canvas-root')).toHaveClass(/zoom-far/);
  await expect(page.locator('.assembly-star')).toBeVisible();

  // double-click the star: the camera dives back in and the card returns
  await page.locator('.assembly-face').dblclick();
  await page.waitForTimeout(600);
  await expect(page.locator('.canvas-root')).not.toHaveClass(/zoom-far/);
  await expect(page.locator('.assembly-star')).toBeHidden();
  await expect(page.locator('.assembly-face-counts')).toBeVisible();
});
