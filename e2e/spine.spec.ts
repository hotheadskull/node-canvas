import { expect, test } from '@playwright/test';

// Chunks 5+6 end-to-end: Split creates wired stubs; writing into stubs
// compiles in wire order; reordering the intake reorders the compiled work.

test('split -> write -> compile -> reorder, all through the real UI', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  // spawn a document and split it into 3 sections
  await page.getByRole('button', { name: /add node/i }).click();
  await page.locator('[data-node-type="document"]').click();
  await page.getByRole('button', { name: /Split/ }).click();
  await page.getByRole('menuitem', { name: /3 blank sections/ }).click();

  await expect(page.locator('.react-flow__node')).toHaveCount(4);
  await expect(page.locator('.wire-edge.is-live')).toHaveCount(3);
  await page.getByRole('button', { name: 'Fit' }).click();
  await page.waitForTimeout(450);

  // the intake list shows the three stubs in order
  const rows = page.locator('.document-intake-list li .intake-row-title');
  await expect(rows).toHaveText(['Section 1', 'Section 2', 'Section 3']);

  // write into the first two sections (kind-tag filter: hasText would also
  // match the document whose intake list contains "Section 1")
  const sections = page
    .locator('.react-flow__node')
    .filter({ has: page.locator('.canvas-node-kind', { hasText: /^Section$/ }) });
  await sections.nth(0).locator('textarea.canvas-node-content').fill('First words.');
  await sections.nth(1).locator('textarea.canvas-node-content').fill('Second words.');

  // compiled preview follows wire order
  await page.getByRole('button', { name: 'Preview' }).click();
  await expect(page.locator('[data-compiled-preview]')).toHaveText(
    'First words.\n\nSecond words.',
  );

  // reorder: move Section 2 up -> compiled text flips
  await page.getByRole('button', { name: 'Move Section 2 up' }).click();
  await expect(page.locator('[data-compiled-preview]')).toHaveText(
    'Second words.\n\nFirst words.',
  );
  await expect(rows).toHaveText(['Section 2', 'Section 1', 'Section 3']);

  // word count reflects the compiled text
  await expect(page.locator('.document-stat')).toHaveText(/4/);

  // everything survives a reload exactly (I5 + persistence)
  await page.reload();
  await expect(page.locator('.react-flow__node')).toHaveCount(4);
  await expect(page.locator('.document-intake-list li .intake-row-title')).toHaveText([
    'Section 2',
    'Section 1',
    'Section 3',
  ]);
});

test('cast derives through the spine and renames propagate live', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  await page.getByRole('button', { name: /add node/i }).click();
  await page.locator('[data-node-type="document"]').click();
  await page.getByRole('button', { name: /Split/ }).click();
  await page.getByRole('menuitem', { name: /3 blank sections/ }).click();
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
