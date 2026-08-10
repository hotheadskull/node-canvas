import { expect, test } from '@playwright/test';

// User decisions 2026-08-10: the connection grammar stays fixed (takes one
// side, gives the other) but (1) a per-node swap flips the gutters so a
// plate can face its partners, and (2) starting a wire drag BROADCASTS
// every legal landing -- compatible ports light up in their kind color,
// the rest step back.

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

test('dragging from a give lights every compatible take and dims the rest', async ({ page }) => {
  await boot(page);
  for (const type of ['note', 'document', 'person']) await addNode(page, type);
  await page.getByRole('button', { name: 'Fit' }).click();
  await page.waitForTimeout(450);

  const note = page.locator('.react-flow__node').filter({
    has: page.locator('.canvas-node-kind', { hasText: /^Note$/ }),
  });
  const doc = page.locator('.react-flow__node').filter({
    has: page.locator('.canvas-node-kind', { hasText: /^Document$/ }),
  });
  const give = note.locator('.port-star[data-port-direction="give"]').first();
  const giveBox = (await give.boundingBox())!;

  // start a real drag and hold it mid-air
  await page.mouse.move(giveBox.x + giveBox.width / 2, giveBox.y + giveBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(giveBox.x + 120, giveBox.y + 80, { steps: 5 });

  // the document's text intake is a lit candidate, with its label forced on
  await expect(doc.locator('.port-star.is-candidate')).not.toHaveCount(0);
  await expect(doc.locator('.port-label.is-candidate').first()).toBeVisible();
  // somewhere on the canvas, incompatible ports stepped back
  await expect(page.locator('.port-star.is-bystander')).not.toHaveCount(0);

  // release in empty space: the broadcast clears completely
  await page.mouse.up();
  await expect(page.locator('.port-star.is-candidate')).toHaveCount(0);
  await expect(page.locator('.port-star.is-bystander')).toHaveCount(0);
});

test('the swap button flips a plate: intake right, output left, wires intact', async ({
  page,
}) => {
  await boot(page);
  await addNode(page, 'note');
  await addNode(page, 'document');
  await page.getByRole('button', { name: 'Fit' }).click();
  await page.waitForTimeout(450);

  const note = page.locator('.react-flow__node').filter({
    has: page.locator('.canvas-node-kind', { hasText: /^Note$/ }),
  });
  const doc = page.locator('.react-flow__node').filter({
    has: page.locator('.canvas-node-kind', { hasText: /^Document$/ }),
  });
  await note.locator('.port-star[data-port-direction="give"]').first().click({ force: true });
  await doc.locator('.port-star[data-port-direction="take"]').first().click({ force: true });
  await expect(page.locator('.wire-edge.is-live')).toHaveCount(1);

  // before the flip: the note's give sits in its RIGHT half
  const giveOf = async () => {
    const nodeBox = (await note.boundingBox())!;
    const box = (await note
      .locator('.port-star[data-port-direction="give"]')
      .first()
      .boundingBox())!;
    return box.x + box.width / 2 - (nodeBox.x + nodeBox.width / 2);
  };
  expect(await giveOf()).toBeGreaterThan(0);

  await note.locator('.plate-header').click();
  await note.locator('[aria-label="Swap connection sides"]').click();
  await page.waitForTimeout(500);

  // after: the give lives in the LEFT gutter; the wire survived and settled
  expect(await giveOf()).toBeLessThan(0);
  await expect(page.locator('.wire-edge.is-live')).toHaveCount(1);
  const d = await page
    .locator('.wire-edge.is-live')
    .first()
    .evaluate((path) => path.getAttribute('d') ?? '');
  expect((d.match(/L/g) ?? []).length).toBeGreaterThan(1);

  // the flip persists: stored on the node, survives a reload
  await page.waitForFunction(() => {
    const raw = localStorage.getItem('nodecanvas.v2.document');
    return (
      raw !== null &&
      JSON.parse(raw).nodes.some((node: { data: Record<string, unknown> }) => node.data.flipped === true)
    );
  });
  await page.reload();
  await page.getByRole('button', { name: 'Fit' }).click();
  await page.waitForTimeout(450);
  expect(await giveOf()).toBeLessThan(0);
});
