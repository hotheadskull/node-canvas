import { expect, test } from '@playwright/test';

// Chunk 17 Tab Card anatomy: the regression suite for the user-reported
// node bugs (docs/design/node-anatomy.md, "Bugs this spec retires").
// 1. The card GROWS as you type (V1 rule: auto height is the resting state).
// 2. Body text never sits under port stars/labels (no rails; labels float
//    outside the card).
// 3. Manual resize takes ownership; Fit hands it back; growth resumes.

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

async function addNode(page: import('@playwright/test').Page, type: string) {
  await page.getByRole('button', { name: /add node/i }).click();
  await page.locator(`[data-node-type="${type}"]`).click();
}

function nodeOfKind(page: import('@playwright/test').Page, kind: string) {
  return page
    .locator('.react-flow__node')
    .filter({ has: page.locator('.canvas-node-kind', { hasText: new RegExp(`^${kind}$`) }) });
}

async function fitAll(page: import('@playwright/test').Page) {
  await page.getByRole('button', { name: 'Fit' }).click();
  await page.waitForTimeout(450);
}

const LONG_TEXT =
  'She notices the letter before he does. The handwriting is her mother’s, ' +
  'which is impossible, because her mother has been gone for eleven years. ' +
  'The coffee goes cold between them while neither says what both are thinking. ' +
  'Outside, the first snow of the year starts to fall on a city that does not care.';

test('the user bug: a note grows downward as you type (no lag, no manual resize)', async ({
  page,
}) => {
  await addNode(page, 'note');
  await fitAll(page);
  const note = nodeOfKind(page, 'Note').first();
  const before = (await note.boundingBox())!;

  await note.locator('.richtext-content').click();
  await page.keyboard.type(LONG_TEXT.slice(0, 160), { delay: 1 });
  await page.keyboard.type(LONG_TEXT.slice(160), { delay: 1 });

  await expect
    .poll(async () => (await note.boundingBox())!.height, { timeout: 4000 })
    .toBeGreaterThan(before.height + 40);

  // the card grew DOWN from a fixed top edge -- nothing moved (I5)
  const after = (await note.boundingBox())!;
  expect(Math.abs(after.y - before.y)).toBeLessThan(2);

  // survives reload byte-for-byte: same content, same auto height
  await page.reload();
  await fitAll(page);
  const reloaded = (await nodeOfKind(page, 'Note').first().boundingBox())!;
  expect(Math.abs(reloaded.height - after.height)).toBeLessThan(8);
});

test('the user bug: body text owns the full card width -- no rails over text', async ({
  page,
}) => {
  await addNode(page, 'document');
  await fitAll(page);
  const doc = nodeOfKind(page, 'Document').first();
  const card = (await doc.locator('.canvas-node').boundingBox())!;
  const body = (await doc.locator('.canvas-node-main').boundingBox())!;

  // the content column spans the card (only the border is outside it)
  expect(body.width).toBeGreaterThan(card.width - 6);

  // port labels render OUTSIDE the card, never over the body
  await doc.hover();
  const label = doc.locator('.port-label', { hasText: 'Sections' });
  await expect(label).toBeVisible();
  const labelBox = (await label.boundingBox())!;
  expect(labelBox.x + labelBox.width).toBeLessThanOrEqual(card.x + 1);
});

test('manual resize takes ownership; Fit hands the height back to the text', async ({
  page,
}) => {
  await addNode(page, 'note');
  await fitAll(page);
  const note = nodeOfKind(page, 'Note').first();
  // select via the tab (clicking the body focuses the editor instead)
  await note.locator('.canvas-node-tab').click();

  // drag the bottom-right resizer corner down to own the height
  const box = (await note.boundingBox())!;
  const corner = note.locator('.react-flow__resize-control.handle.bottom.right');
  await expect(corner).toBeVisible();
  const cornerBox = (await corner.boundingBox())!;
  await page.mouse.move(cornerBox.x + cornerBox.width / 2, cornerBox.y + cornerBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    cornerBox.x + cornerBox.width / 2,
    cornerBox.y + cornerBox.height / 2 + 120,
    { steps: 8 },
  );
  await page.mouse.up();

  await expect
    .poll(async () => (await note.boundingBox())!.height)
    .toBeGreaterThan(box.height + 90);

  // ownership recorded -> the Fit control appears on the tab while selected
  const fit = note.locator('.canvas-node-fit');
  await expect(fit).toBeVisible();
  await fit.click();

  // height returns to content-driven (much shorter than the owned 120+ extra)
  await expect
    .poll(async () => (await note.boundingBox())!.height)
    .toBeLessThan(box.height + 60);
});
