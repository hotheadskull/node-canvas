import { expect, test } from '@playwright/test';

// Chunk 15 end-to-end: an orphan Plant flags itself until its Payoff wire
// lands; the Event face carries story time and role-labeled Involves wires.

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('nodecanvas.v2.menuView', 'all'); });
  await page.reload();
  await expect(page.getByRole('button', { name: /add node/i })).toBeVisible();
});

async function addNodeFromAll(page: import('@playwright/test').Page, type: string) {
  await page.getByRole('button', { name: /add node/i }).click();
  await page.getByRole('tab', { name: 'All' }).click();
  await page.locator(`[data-node-type="${type}"]`).click();
}

async function fitAll(page: import('@playwright/test').Page) {
  await page.getByRole('button', { name: 'Fit' }).click();
  await page.waitForTimeout(450);
}

async function dragStarToStar(
  page: import('@playwright/test').Page,
  from: import('@playwright/test').Locator,
  to: import('@playwright/test').Locator,
) {
  const a = (await from.boundingBox())!;
  const b = (await to.boundingBox())!;
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await page.mouse.down();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 12 });
  await page.mouse.up();
}

test('plant flags itself until the payoff wire lands', async ({ page }) => {
  await addNodeFromAll(page, 'plant');
  await fitAll(page);

  const plant = page.locator('.react-flow__node-canvas:has([data-face="plant"])');
  // orphan: amber flag + the none-yet line
  await expect(plant.locator('[data-hygiene-flag]')).toHaveCount(1);
  await expect(plant.locator('.pair-none')).toHaveText('Payoffs — none yet');

  await addNodeFromAll(page, 'payoff');
  await fitAll(page);
  const payoff = page.locator('.react-flow__node-canvas:has([data-face="payoff"])');
  await payoff.locator('input.canvas-node-title').fill('The shot in act three');

  await dragStarToStar(
    page,
    plant.locator('.port-star[data-port-label="Plant"]'),
    payoff.locator('.port-star[data-port-label="Resolves"]'),
  );

  // flag clears on both ends; both faces list the pairing
  await expect(plant.locator('[data-hygiene-flag]')).toHaveCount(0);
  await expect(plant.locator('[data-pair-list]')).toContainText('The shot in act three');
  await expect(payoff.locator('[data-pair-list]')).toContainText('Resolves');
});

test('event: story time persists; involves wire carries the role', async ({ page }) => {
  await addNodeFromAll(page, 'event');
  await fitAll(page);
  const event = page.locator('.react-flow__node-canvas:has([data-face="event"])');
  await event.locator('.event-time-input').fill('14.2');
  await page.waitForFunction(() => {
    const raw = localStorage.getItem('nodecanvas.v2.document');
    if (!raw) return false;
    const doc = JSON.parse(raw);
    return doc.nodes.some(
      (node: { type: string; data: { storyTime?: number } }) =>
        node.type === 'event' && node.data.storyTime === 14.2,
    );
  });

  await page.getByRole('button', { name: /add node/i }).click();
  await page.locator('[data-node-type="person"]').click();
  await fitAll(page);
  const person = page.locator('.react-flow__node-canvas:has(.port-star[data-port-label="Identity"])');
  await person.locator('input.canvas-node-title').fill('Anna');

  await dragStarToStar(
    page,
    person.locator('.port-star[data-port-label="Identity"]'),
    event.locator('.port-star[data-port-label="Involves"]'),
  );

  // label the wire with the role from its chip
  await page.locator('.edge-chip-face.wire-face').click();
  await page.locator('.wire-label-input').fill('bride');
  await expect(event.locator('[data-event-involves]')).toContainText('Anna · bride');

  // reload: story time and role survive (I9)
  await page.reload();
  await fitAll(page);
  await expect(
    page.locator('.react-flow__node-canvas:has([data-face="event"]) .event-time-input'),
  ).toHaveValue('14.2');
  await expect(page.locator('[data-event-involves]')).toContainText('Anna · bride');
});
