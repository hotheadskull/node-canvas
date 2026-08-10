import { expect, test } from '@playwright/test';

// Phase G (split panel), Phase H (filter bar + earned resolution +
// minimap), and merge (Phase I item, user-approved 2026-08-10).

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

test('the split panel: stepper to 4, split, four wired children appear', async ({ page }) => {
  await boot(page);
  // documents dropped their Split button in the polish round (Split reads
  // as the fork there) -- the panel lives on manuscript/claim/passage
  await addNode(page, 'manuscript');
  await page.getByRole('button', { name: 'Fit' }).click();
  await page.waitForTimeout(400);

  await page.getByRole('button', { name: /split/i }).click();
  const panel = page.locator('[data-split-panel]');
  await expect(panel).toBeVisible();
  await panel.locator('.split-type-picker').selectOption('section');
  // count starts at 3; one more makes 4, and the preview numbers them
  await panel.locator('[aria-label="More"]').click();
  await expect(panel.locator('[data-split-preview] .split-preview-stub')).toHaveCount(4);
  await panel.getByRole('button', { name: /^Split$/ }).click();

  await page.waitForFunction(() => {
    const raw = localStorage.getItem('nodecanvas.v2.document');
    if (raw === null) return false;
    const parsed = JSON.parse(raw);
    return parsed.nodes.length === 5 && parsed.wires.length === 4;
  });
  await page.getByRole('button', { name: 'Fit' }).click();
  await page.waitForTimeout(400);
  await expect(
    page.locator('.canvas-node-title[value="Section 01"]'),
  ).toHaveCount(1);
});

test('merge folds two notes into the first; the second vanishes', async ({ page }) => {
  await boot(page);
  await addNode(page, 'note');
  await addNode(page, 'note');
  await page.getByRole('button', { name: 'Fit' }).click();
  await page.waitForTimeout(400);

  const nodes = page.locator('.react-flow__node.react-flow__node-canvas');
  await nodes.nth(0).locator('.plate-header').click();
  await nodes.nth(1).locator('.plate-header').click({ modifiers: ['Control'] });
  await page.getByRole('button', { name: 'Merge 2' }).click();
  await page.waitForFunction(() => {
    const raw = localStorage.getItem('nodecanvas.v2.document');
    return raw !== null && JSON.parse(raw).nodes.length === 1;
  });
  await expect(page.locator('.react-flow__node.react-flow__node-canvas')).toHaveCount(1);
});

test('filter bar: chips resolve their kind, the rest whisper; minimap lives', async ({
  page,
}) => {
  await boot(page);
  await addNode(page, 'manuscript');
  await page.getByRole('button', { name: 'Fit' }).click();
  await page.waitForTimeout(300);
  await page.getByRole('button', { name: /split/i }).click();
  const panel = page.locator('[data-split-panel]');
  await panel.locator('.split-type-picker').selectOption('section');
  await panel.locator('[aria-label="More"]').click();
  await panel.getByRole('button', { name: /^Split$/ }).click();
  await page.waitForTimeout(400);
  await addNode(page, 'person');
  await page.getByRole('button', { name: 'Fit' }).click();
  await page.waitForTimeout(400);

  // wire the person into a section: 4 text wires + 1 person wire
  const person = page.locator('.react-flow__node').filter({
    has: page.locator('.canvas-node-kind', { hasText: /^Person$/ }),
  });
  const section = page.locator('.react-flow__node').filter({
    has: page.locator('.canvas-node-kind', { hasText: /^Section$/ }),
  });
  await person.locator('.port-star[data-port-direction="give"]').first().click({ force: true });
  await section
    .first()
    .locator('.port-star[data-port-direction="take"]')
    .first()
    .click({ force: true });
  await expect(page.locator('.wire-edge.is-live')).toHaveCount(5);

  const bar = page.locator('[data-filter-bar]');
  await expect(bar).toBeVisible();
  await expect(bar.locator('[data-filter-readout]')).toHaveText('5 of 5 shown');

  // resolve ONLY text: the person wire drops to a whisper
  await bar.locator('.filter-chip', { hasText: /^text/ }).click();
  await expect(bar.locator('[data-filter-readout]')).toHaveText('4 of 5 shown');
  await expect(page.locator('.wire-edge.is-muted')).toHaveCount(1);
  await bar.getByRole('button', { name: 'clear' }).click();
  await expect(page.locator('.wire-edge.is-muted')).toHaveCount(0);

  await expect(page.locator('.react-flow__minimap')).toBeVisible();
});
