import { expect, test } from '@playwright/test';

// Chunks 7+8 end-to-end: gather -> face with derived counts -> external edge
// to the face -> expand/collapse lossless -> drill-in with breadcrumbs ->
// unpack keeps everything (I3/I4 exercised through the real UI).

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

async function addNode(page: import('@playwright/test').Page, type: string) {
  await page.getByRole('button', { name: /add node/i }).click();
  await page.locator(`[data-node-type="${type}"]`).click();
}

async function fitAll(page: import('@playwright/test').Page) {
  await page.getByRole('button', { name: 'Fit' }).click();
  await page.waitForTimeout(450);
}

test('gather -> face counts -> collapse/expand -> drill -> unpack', async ({ page }) => {
  await addNode(page, 'person');
  await addNode(page, 'person');
  await addNode(page, 'place');
  await fitAll(page);

  // select all three with a selection drag is finicky; use ctrl-click (RF multi-select key on Windows)
  const nodes = page.locator('.react-flow__node.react-flow__node-canvas');
  await nodes.nth(0).click();
  await nodes.nth(1).click({ modifiers: ['Control'] });
  await nodes.nth(2).click({ modifiers: ['Control'] });

  await page.getByRole('button', { name: 'Group 3' }).click();

  // members hidden, face shows derived counts
  await expect(page.locator('.react-flow__node-canvas')).toHaveCount(0);
  const face = page.locator('.assembly-face.is-collapsed');
  await expect(face).toHaveCount(1);
  await expect(face.locator('.assembly-face-counts')).toHaveText('Person: 2 · Place: 1');

  // expand in place: members return, face becomes a pill
  await face.locator('[aria-label="Expand group"]').click();
  await expect(page.locator('.react-flow__node-canvas')).toHaveCount(3);
  await expect(page.locator('.assembly-face.is-pill')).toHaveCount(1);

  // collapse again (lossless: same three members come back later)
  await page.locator('[aria-label="Collapse group"]').click();
  await expect(page.locator('.react-flow__node-canvas')).toHaveCount(0);

  // drill in: scoped canvas + breadcrumbs
  await page.locator('[aria-label="Open group"]').click();
  await expect(page.locator('.react-flow__node-canvas')).toHaveCount(3);
  await expect(page.locator('.breadcrumbs')).toContainText('New group');
  await page.locator('.breadcrumbs').getByRole('button', { name: 'Canvas', exact: true }).click();
  await expect(page.locator('.react-flow__node-canvas')).toHaveCount(0); // still collapsed outside

  // unpack from the face: group dissolves, all three nodes intact
  await page.locator('.assembly-face .assembly-face-unpack').click();
  await expect(page.locator('.assembly-face')).toHaveCount(0);
  await expect(page.locator('.react-flow__node-canvas')).toHaveCount(3);
});

test('external edge attaches to the face and survives inner deletion', async ({ page }) => {
  await addNode(page, 'person');
  await addNode(page, 'person');
  await fitAll(page);

  const nodes = page.locator('.react-flow__node.react-flow__node-canvas');
  await nodes.nth(0).click();
  await nodes.nth(1).click({ modifiers: ['Control'] });
  await page.getByRole('button', { name: 'Group 2' }).click();
  await expect(page.locator('.assembly-face.is-collapsed')).toHaveCount(1);

  // add an outside note and connect it to the FACE with a plain-dot drag
  await addNode(page, 'note');
  await fitAll(page);
  const note = page.locator('.react-flow__node-canvas').first();
  const noteDot = note.locator('.react-flow__handle-bottom');
  const face = page.locator('.assembly-face');
  const faceDot = face.locator('.react-flow__handle-bottom');
  const from = (await noteDot.boundingBox())!;
  const to = (await faceDot.boundingBox())!;
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 12 });
  await page.mouse.up();

  await expect(page.locator('.react-flow__edge')).toHaveCount(1);
  await page.waitForFunction(() => {
    const raw = localStorage.getItem('nodecanvas.v2.document');
    return raw !== null && JSON.parse(raw).edges.length === 1;
  });
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('nodecanvas.v2.document')!),
  );
  expect(saved.edges[0].target.startsWith('asm_') || saved.edges[0].source.startsWith('asm_')).toBe(
    true,
  );

  // delete a member INSIDE the group (drill in, delete) -- the face edge survives
  await page.locator('[aria-label="Open group"]').click();
  await page.locator('.react-flow__node-canvas').first().click();
  await page.keyboard.press('Delete');
  await page.locator('.breadcrumbs').getByRole('button', { name: 'Canvas', exact: true }).click();
  await expect(page.locator('.assembly-face')).toHaveCount(1);
  await expect(page.locator('.react-flow__edge')).toHaveCount(1);
});
