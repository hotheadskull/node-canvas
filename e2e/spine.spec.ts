import { expect, test } from '@playwright/test';

// End-to-end: "+ Section" creates wired stubs one by one; writing into
// stubs compiles in wire order; reordering reorders the compiled work.

async function addThreeSections(page: import('@playwright/test').Page) {
  const addSection = page.locator('[data-add-section]');
  await addSection.click();
  await addSection.click();
  await addSection.click();
}

test('add sections -> write -> compile -> reorder, all through the real UI', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('nodecanvas.v2.menuView', 'all'); });
  await page.reload();

  // spawn a document and grow 3 wired sections off its footer button
  await page.getByRole('button', { name: /add node/i }).click();
  await page.locator('[data-node-type="document"]').click();
  await addThreeSections(page);

  // assert the MODEL first (onlyRenderVisibleElements keeps off-screen nodes
  // out of the DOM), then Fit and assert the rendering
  await page.waitForFunction(() => {
    const raw = localStorage.getItem('nodecanvas.v2.document');
    return raw !== null && JSON.parse(raw).nodes.length === 4;
  });
  await page.waitForTimeout(200);
  await page.getByRole('button', { name: 'Fit' }).click();
  await page.waitForTimeout(450);
  await expect(page.locator('.react-flow__node')).toHaveCount(4);
  await expect(page.locator('.wire-edge.is-live')).toHaveCount(3);

  // the document renders three LIVE embed blocks (the sections, inline)
  const doc = page
    .locator('.react-flow__node')
    .filter({ has: page.locator('.canvas-node-kind', { hasText: /^Document$/ }) });
  await expect(doc.locator('.doc-block.is-embed.is-live')).toHaveCount(3);

  // write into the first two sections (kind-tag filter: hasText would also
  // match the document, whose embeds mirror "First words.")
  const sections = page
    .locator('.react-flow__node')
    .filter({ has: page.locator('.canvas-node-kind', { hasText: /^Section$/ }) });
  await sections.nth(0).locator('.richtext-content').click();
  await page.keyboard.type('First words.');
  await sections.nth(1).locator('.richtext-content').click();
  await page.keyboard.type('Second words.');
  await page.locator('.nodecanvas-flow').click({ position: { x: 10, y: 500 } });

  // the embeds mirror the sections LIVE, in wire order
  await expect(doc.locator('[data-doc-blocks]')).toContainText('First words.');
  await expect(doc.locator('[data-doc-blocks]')).toContainText('Second words.');

  // reorder: drag the second embed's grip above the first (the "slider").
  // dnd-kit needs a real pointer drag past its 6px activation distance.
  const secondEmbed = doc.locator('.doc-block.is-embed', { hasText: 'Second words.' });
  await secondEmbed.hover();
  const grip = secondEmbed.locator('.doc-block-grip');
  const firstEmbed = doc.locator('.doc-block.is-embed', { hasText: 'First words.' });
  const gripBox = (await grip.boundingBox())!;
  const targetBox = (await firstEmbed.boundingBox())!;
  await page.mouse.move(gripBox.x + gripBox.width / 2, gripBox.y + gripBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(targetBox.x + 40, targetBox.y + 4, { steps: 14 });
  await page.waitForTimeout(120);
  await page.mouse.up();

  // block order IS compile order: the model's wires flipped with the blocks
  await page.waitForFunction(() => {
    const raw = localStorage.getItem('nodecanvas.v2.document');
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    const texts = parsed.wires.map(
      (wire: { source: string }) =>
        parsed.nodes.find((node: { id: string }) => node.id === wire.source)?.data?.content ?? '',
    );
    return texts.length === 3 && texts[0].includes('Second words.');
  });

  // word count reflects the compiled text
  await expect(page.locator('.document-stat')).toHaveText(/4/);

  // everything survives a reload exactly (I5 + persistence). The restored
  // viewport may cull off-screen nodes, so Fit before counting the DOM.
  await page.reload();
  await page.waitForFunction(() => {
    const raw = localStorage.getItem('nodecanvas.v2.document');
    return raw !== null && JSON.parse(raw).nodes.length === 4;
  });
  await page.getByRole('button', { name: 'Fit' }).click();
  await page.waitForTimeout(450);
  await expect(page.locator('.react-flow__node')).toHaveCount(4);
  const docAfter = page
    .locator('.react-flow__node')
    .filter({ has: page.locator('.canvas-node-kind', { hasText: /^Document$/ }) });
  await expect(docAfter.locator('[data-doc-blocks]')).toContainText('Second words.');
});

test('cast derives through the spine and renames propagate live', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('nodecanvas.v2.menuView', 'all'); });
  await page.reload();

  await page.getByRole('button', { name: /add node/i }).click();
  await page.locator('[data-node-type="document"]').click();
  await addThreeSections(page);
  await page.getByRole('button', { name: /add node/i }).click();
  await page.locator('[data-node-type="person"]').click();
  await page.getByRole('button', { name: 'Fit' }).click();
  await page.waitForTimeout(450);

  // name the person and wire their identity into Section 1's People intake
  const person = page
    .locator('.react-flow__node')
    .filter({ has: page.locator('.canvas-node-kind', { hasText: /^Person$/ }) });
  await person.locator('input.canvas-node-title').fill('Bob');
  const give = person.locator('[data-handleid="identity-out"]');
  const section = page
    .locator('.react-flow__node')
    .filter({ has: page.locator('.canvas-node-kind', { hasText: /^Section$/ }) })
    .first();
  const take = section.locator('[data-handleid="people-in"]');
  const from = (await give.boundingBox())!;
  const to = (await take.boundingBox())!;
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 12 });
  await page.mouse.up();

  await expect(page.locator('.document-cast')).toHaveText('Cast: Bob');

  // rename -> the chapter's cast updates without touching anything else
  await person.locator('input.canvas-node-title').fill('Robert');
  await expect(page.locator('.document-cast')).toHaveText('Cast: Robert');
});

test('focus editor: double-click to write, walk the spine, Esc back (design B)', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('nodecanvas.v2.menuView', 'all'); });
  await page.reload();

  await page.getByRole('button', { name: /add node/i }).click();
  await page.locator('[data-node-type="document"]').click();
  await addThreeSections(page);
  await page.getByRole('button', { name: 'Fit' }).click();
  await page.waitForTimeout(450);

  // double-click Section 1 -> focus room opens
  const section = page
    .locator('.react-flow__node')
    .filter({ has: page.locator('.canvas-node-kind', { hasText: /^Section$/ }) })
    .first();
  await section.dblclick();
  const room = page.locator('[data-focus-editor]');
  await expect(room).toBeVisible();
  await expect(room.locator('.focus-title')).toHaveValue('Section 1');

  // write rich text
  await room.locator('.richtext-focus').click();
  await page.keyboard.type('The storm broke at midnight.');
  await expect(room.locator('.focus-meta')).toHaveText('5 words');

  // walk the spine forward
  await room.getByRole('button', { name: /next/i }).click();
  await expect(room.locator('.focus-title')).toHaveValue('Section 2');

  // Esc returns to the canvas; the document's live embed mirrors the words
  await page.keyboard.press('Escape');
  await expect(room).toHaveCount(0);
  const doc = page
    .locator('.react-flow__node')
    .filter({ has: page.locator('.canvas-node-kind', { hasText: /^Document$/ }) });
  await expect(doc.locator('[data-doc-blocks]')).toContainText(
    'The storm broke at midnight.',
  );
});
