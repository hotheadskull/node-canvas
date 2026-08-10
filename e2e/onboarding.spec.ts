import { expect, test } from '@playwright/test';

// Chunk 16 end-to-end: the invite offers the tour once; each step advances
// when the user actually performs its action; the ? panel holds the
// reference and replays the tour.

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('nodecanvas.v2.menuView', 'all'); });
  await page.reload();
  await expect(page.getByRole('button', { name: /add node/i })).toBeVisible();
});

test('the tour: invite -> perform every step -> finish -> no more invite', async ({ page }) => {
  const counter = page.locator('[data-tutorial-counter]');

  // fresh canvas: the invite offers itself; starting opens step 1
  await expect(page.locator('[data-tutorial-invite]')).toBeVisible();
  await page.getByRole('button', { name: 'Start tour' }).click();
  await expect(counter).toHaveText('1 / 8');
  await page.getByRole('button', { name: 'Next' }).click();
  await expect(counter).toHaveText('2 / 8');

  // step 2: add a node -> auto-advances
  await page.getByRole('button', { name: /add node/i }).click();
  await page.locator('[data-node-type="note"]').click();
  await expect(counter).toHaveText('3 / 8');

  // step 3: write something
  await page.locator('.react-flow__node-canvas .richtext-content').first().click();
  await page.keyboard.type('my first thought');
  await expect(counter).toHaveText('4 / 8');

  // step 4: second node
  await page.getByRole('button', { name: /add node/i }).click();
  await page.locator('[data-node-type="person"]').click();
  await expect(counter).toHaveText('5 / 8');

  // step 5: connect with a plain edge (bottom dot -> other node)
  await page.getByRole('button', { name: 'Fit' }).click();
  await page.waitForTimeout(450);
  const nodes = page.locator('.react-flow__node-canvas');
  const fromDot = nodes.nth(0).locator('[data-handleid="bottom"]');
  const toDot = nodes.nth(1).locator('[data-handleid="top"]');
  const from = (await fromDot.boundingBox())!;
  const to = (await toDot.boundingBox())!;
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 12 });
  await page.mouse.up();
  await expect(counter).toHaveText('6 / 8');

  // step 6: group them
  await nodes.nth(0).click();
  await nodes.nth(1).click({ modifiers: ['Control'] });
  await page.getByRole('button', { name: 'Group 2' }).click();
  await expect(counter).toHaveText('7 / 8');

  // step 7: the palette latch
  await page.keyboard.press('Control+k');
  await expect(counter).toHaveText('8 / 8');
  await page.keyboard.press('Escape');

  // finish persists; reloading never re-invites
  await page.getByRole('button', { name: 'Finish' }).click();
  await expect(page.locator('[data-tutorial-step]')).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('button', { name: /add node/i })).toBeVisible();
  await expect(page.locator('[data-tutorial-invite]')).toHaveCount(0);
});

test('Back sticks on a completed step; leaving early is remembered', async ({ page }) => {
  await page.getByRole('button', { name: 'Start tour' }).click();
  const counter = page.locator('[data-tutorial-counter]');
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('button', { name: /add node/i }).click();
  await page.locator('[data-node-type="note"]').click();
  await expect(counter).toHaveText('3 / 8');

  // back to the completed add-node step: it does NOT snap forward
  await page.getByRole('button', { name: 'Back' }).click();
  await expect(counter).toHaveText('2 / 8');
  await page.waitForTimeout(400);
  await expect(counter).toHaveText('2 / 8');

  await page.getByRole('button', { name: 'Leave the tour' }).click();
  await expect(page.locator('[data-tutorial-step]')).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('button', { name: /add node/i })).toBeVisible();
  await expect(page.locator('[data-tutorial-invite]')).toHaveCount(0);
});

test('the ? panel: reference content, Esc closes, Replay restarts the tour', async ({ page }) => {
  await page.getByRole('button', { name: 'Not now' }).click();
  await page.getByRole('button', { name: 'Help' }).click();
  const panel = page.locator('[data-tips-panel]');
  await expect(panel).toBeVisible();
  await expect(panel).toContainText('Three kinds of connection');
  await expect(panel).toContainText('Ctrl+K');
  await page.keyboard.press('Escape');
  await expect(panel).toHaveCount(0);

  await page.getByRole('button', { name: 'Help' }).click();
  await page.getByRole('button', { name: 'Replay the tour' }).click();
  await expect(page.locator('[data-tutorial-counter]')).toHaveText('1 / 8');
});
