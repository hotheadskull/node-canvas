import { expect, test } from '@playwright/test';

// Chunk 4 end-to-end: star ports on rails, live wires, tentative wires with
// the waiting badge, and the commit -> dissolve -> undo lifecycle.

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('nodecanvas.v2.menuView', 'all'); });
  await page.reload();
});

async function addNode(page: import('@playwright/test').Page, type: string) {
  await page.getByRole('button', { name: /add node/i }).click();
  await page.locator(`[data-node-type="${type}"]`).click();
}

/**
 * Locate nodes by their kind tag EXACTLY -- hasText is case-insensitive and
 * matches subtree text, so e.g. a document whose intake list says "Section 1"
 * would also match hasText 'SECTION'.
 */
function nodeOfKind(page: import('@playwright/test').Page, kind: string) {
  return page
    .locator('.react-flow__node')
    .filter({ has: page.locator('.canvas-node-kind', { hasText: new RegExp(`^${kind}$`) }) });
}

async function dragBetween(
  page: import('@playwright/test').Page,
  from: { x: number; y: number },
  to: { x: number; y: number },
) {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps: 12 });
  await page.mouse.up();
}

function center(box: { x: number; y: number; width: number; height: number }) {
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

/** Bring every node into view before dragging (the camera follows spawns). */
async function fitAll(page: import('@playwright/test').Page) {
  await page.getByRole('button', { name: 'Fit' }).click();
  await page.waitForTimeout(450);
}

test('give star to take star creates a live wire, colored by kind', async ({ page }) => {
  await addNode(page, 'note');
  await addNode(page, 'document');
  await fitAll(page);
  const note = nodeOfKind(page, 'Note').first();
  const doc = nodeOfKind(page, 'Document').first();

  const giveStar = note.locator('[data-handleid="text-out"]');
  const takeStar = doc.locator('[data-handleid="sections-in"]');
  await expect(giveStar).toBeVisible();
  await expect(takeStar).toBeVisible();

  await dragBetween(page, center((await giveStar.boundingBox())!), center((await takeStar.boundingBox())!));

  const wirePath = page.locator('.wire-edge.is-live');
  await expect(wirePath).toHaveCount(1);
  await page.waitForFunction(() => {
    const raw = localStorage.getItem('nodecanvas.v2.document');
    return raw !== null && JSON.parse(raw).wires.length === 1;
  });
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('nodecanvas.v2.document')!));
  expect(saved.wires[0].status).toBe('live');
  expect(saved.wires[0].sourcePort).toBe('text-out');
  expect(saved.wires[0].targetPort).toBe('sections-in');
});

test('tentative lifecycle: loose drops, waiting badges, commit dissolves siblings, undo restores', async ({
  page,
}) => {
  await addNode(page, 'note');
  await addNode(page, 'document');
  await addNode(page, 'document');
  await fitAll(page);
  const note = nodeOfKind(page, 'Note').first();
  const docs = nodeOfKind(page, 'Document');

  // drop the note's give star onto each document's plain top dot -> tentative
  for (const index of [0, 1]) {
    const giveStar = note.locator('[data-handleid="text-out"]');
    const topDot = docs.nth(index).locator('[data-handleid="top"]');
    await dragBetween(page, center((await giveStar.boundingBox())!), center((await topDot.boundingBox())!));
  }

  await expect(page.locator('.wire-edge.is-tentative')).toHaveCount(2);
  await expect(page.locator('.waiting-badge')).toHaveCount(2);
  await expect(page.locator('.waiting-badge').first()).toHaveText('1 waiting');

  // commit the first candidate from its chip
  await page.locator('.wire-chip-commit').first().click();
  await expect(page.locator('.wire-edge.is-live')).toHaveCount(1);
  await expect(page.locator('.wire-edge.is-tentative')).toHaveCount(0);
  await expect(page.locator('.waiting-badge')).toHaveCount(0);

  // the undo toast restores both candidates
  const toast = page.locator('.toast');
  await expect(toast).toContainText('1 other candidate dissolved');
  await toast.getByRole('button', { name: 'Undo' }).click();
  await expect(page.locator('.wire-edge.is-tentative')).toHaveCount(2);
  await expect(page.locator('.wire-edge.is-live')).toHaveCount(0);
});

test('port labels follow the canvas setting', async ({ page }) => {
  await addNode(page, 'section');
  const section = page.locator('.react-flow__node').first();
  const label = section.locator('.port-label', { hasText: 'People' });

  // default: ALWAYS visible (user, 2026-08-10 -- show the possibilities)
  await page.mouse.move(10, 10);
  await expect(label).toHaveCSS('opacity', '1');

  // switch to hover mode: hidden until the node is hovered
  await page.getByRole('button', { name: 'Canvas settings' }).click();
  await page.getByRole('button', { name: 'Hover', exact: true }).click();
  await page.mouse.move(10, 10);
  await expect(label).toHaveCSS('opacity', '0');
  await section.hover();
  await expect(label).toHaveCSS('opacity', '1');
});
