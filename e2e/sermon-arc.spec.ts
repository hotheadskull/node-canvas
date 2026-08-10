import { expect, test } from '@playwright/test';

// Chunk 14 end-to-end: Passage → Propositions split, gather into an Arc
// group, work the relationships in the Arc room, read the derived outline on
// the face, see the relation code ride the wire chip, and drill in for the
// phrasing-strip view. Plus the Big Idea derivation on a Title node.

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

test('passage splits into propositions; Arc room derives the outline', async ({ page }) => {
  await addNodeFromAll(page, 'passage');
  await fitAll(page);

  // Passage carries the compile face -> Split -> Passage → Propositions
  await page.getByRole('button', { name: /Split/ }).click();
  await page.getByRole('menuitem', { name: /Propositions/ }).click();
  await page.waitForFunction(() => {
    const raw = localStorage.getItem('nodecanvas.v2.document');
    if (!raw) return false;
    const doc = JSON.parse(raw);
    return doc.nodes.length === 4 && doc.wires.length === 3;
  });
  await fitAll(page);

  // gather the three propositions into a group
  const props = page.locator('.react-flow__node-canvas:has([data-face="proposition"])');
  await expect(props).toHaveCount(3);
  await props.nth(0).click();
  await props.nth(1).click({ modifiers: ['Control'] });
  await props.nth(2).click({ modifiers: ['Control'] });
  await page.getByRole('button', { name: 'Group 3' }).click();
  const face = page.locator('.assembly-face.is-collapsed');
  await expect(face).toHaveCount(1);

  // the face knows it's an Arc group: outline (3 main points, 0 arcs) + button
  await expect(face.locator('[data-arc-outline]')).toContainText('3 main points · 0 arcs');
  await face.locator('[aria-label="Open Arc room"]').click();
  await expect(page.locator('[data-arc-room]')).toBeVisible();
  const rows = page.locator('[data-arc-row]');
  await expect(rows).toHaveCount(3);

  // subordinate row 2 under row 1 as Ground
  const ids: string[] = await page.evaluate(() =>
    [...document.querySelectorAll('[data-arc-row]')].map(
      (row) => row.getAttribute('data-arc-row')!,
    ),
  );
  await rows.nth(1).locator('select').first().selectOption(ids[0]!);
  await rows.nth(1).locator('select').nth(1).selectOption('ground');
  await page.waitForFunction(() => {
    const raw = localStorage.getItem('nodecanvas.v2.document');
    if (!raw) return false;
    const doc = JSON.parse(raw);
    return doc.wires.some(
      (wire: { targetPort: string; relation?: string }) =>
        wire.targetPort === 'arc-in' && wire.relation === 'ground',
    );
  });
  // the bracket carries the code in Arc view
  await expect(page.locator('.arc-room-brackets')).toContainText('G');

  // Phrasing view indents the subordinated proposition
  await page.getByRole('tab', { name: 'Phrasing' }).click();
  await expect(rows.nth(1)).toHaveCSS('padding-left', '32px');
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-arc-room]')).toHaveCount(0);

  // face outline updated: one arc, two main points now
  await expect(face.locator('[data-arc-outline]')).toContainText('2 main points · 1 arc');

  // expand: the relation code rides the wire chip on the canvas
  await face.locator('[aria-label="Expand group"]').click();
  await fitAll(page);
  await expect(page.locator('[data-arc-code]').first()).toHaveText('G');

  // drill in: propositions render as phrasing strips (display-only; stored
  // positions in the document are untouched)
  const before = await page.evaluate(
    () => JSON.parse(localStorage.getItem('nodecanvas.v2.document')!).nodes,
  );
  await page.locator('[aria-label="Collapse group"]').click();
  await page.locator('[aria-label="Open group"]').click();
  await expect(page.locator('.phrasing-node')).toHaveCount(3);
  const after = await page.evaluate(
    () => JSON.parse(localStorage.getItem('nodecanvas.v2.document')!).nodes,
  );
  expect(after).toEqual(before);
});

test('Big Idea: wiring a note into the Title derives the statement', async ({ page }) => {
  await page.getByRole('button', { name: /add node/i }).click();
  await page.locator('[data-node-type="title"]').click();
  await page.getByRole('button', { name: /add node/i }).click();
  await page.locator('[data-node-type="note"]').click();
  await fitAll(page);

  // write the subject into the note
  const note = page.locator('.react-flow__node-canvas:not(:has([data-face="title"]))');
  await note.locator('.richtext-content').click();
  await page.keyboard.type('true worship');

  // pull the Title away so the upcoming wire chip lands over empty canvas
  const title = page.locator('.react-flow__node-canvas:has([data-face="title"])');
  const header = (await title.locator('.canvas-node-header').boundingBox())!;
  await page.mouse.move(header.x + header.width / 2, header.y + header.height / 2);
  await page.mouse.down();
  await page.mouse.move(header.x + header.width / 2 + 380, header.y + 260, { steps: 12 });
  await page.mouse.up();

  // drag the note's Text give star onto the Title's plain top dot -> a
  // TENTATIVE wire lands in the first compatible intake (Subject), commit it
  const giveStar = note.locator('.port-star[data-port-direction="give"]');
  const titleDot = title.locator('[data-handleid="top"]');
  const from = (await giveStar.boundingBox())!;
  const to = (await titleDot.boundingBox())!;
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 12 });
  await page.mouse.up();
  await page.locator('.wire-chip-commit').click();

  // the Title face derives the Big Idea line live from the wired note
  await expect(title.locator('[data-big-idea]')).toContainText('true worship');
});
