import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';

// Chunk 18: the FULL persistence loop in one journey -- build, save a
// .nodecanvas file, wipe, reopen the file, and export the work. Every hop a
// real user makes between sessions, exercised end to end in the browser
// world (the Tauri dialogs replace the download/picker seams on desktop).

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem('nodecanvas.v2.menuView', 'all');
    localStorage.setItem('nodecanvas.v2.tutorialDone', '1');
  });
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

async function fitAll(page: import('@playwright/test').Page) {
  await page.getByRole('button', { name: 'Fit' }).click();
  await page.waitForTimeout(450);
}

async function openProjectMenu(page: import('@playwright/test').Page) {
  await page.getByRole('button', { name: 'Project', exact: true }).click();
}

test('full loop: build, save .nodecanvas, wipe, reopen the file, export markdown', async ({
  page,
}) => {
  test.setTimeout(120_000); // one long journey, many real interactions
  // build: a note wired into a document
  await addNode(page, 'note');
  await addNode(page, 'document');
  await fitAll(page);
  const note = nodeOfKind(page, 'Note').first();
  const doc = nodeOfKind(page, 'Document').first();
  await note.locator('.richtext-content').click();
  await page.keyboard.type('The letter arrives at dawn.', { delay: 1 });
  await page.locator('.nodecanvas-flow').click({ position: { x: 10, y: 400 } });
  const giveStar = note.locator('[data-handleid="text-out"]');
  const takeStar = doc.locator('[data-handleid="sections-in"]');
  await dragBetween(
    page,
    center((await giveStar.boundingBox())!),
    center((await takeStar.boundingBox())!),
  );
  await expect(doc.locator('.doc-block.is-embed')).toContainText('The letter arrives at dawn.');

  // save a copy -- the browser world's Save As is a download
  await openProjectMenu(page);
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: /download a copy/i }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.nodecanvas$/);
  const savedPath = await download.path();

  // wipe: New canvas replaces everything (with an Undo we don't take)
  await openProjectMenu(page);
  await page.getByRole('button', { name: 'New canvas' }).click();
  await expect(page.locator('.react-flow__node')).toHaveCount(0);

  // reopen the saved file through the real picker
  await openProjectMenu(page);
  const chooserPromise = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Open project…' }).click();
  const chooser = await chooserPromise;
  await chooser.setFiles(savedPath!);
  await expect(page.locator('.react-flow__node')).toHaveCount(2);
  await fitAll(page);
  await expect(nodeOfKind(page, 'Document').first().locator('.doc-block.is-embed')).toContainText(
    'The letter arrives at dawn.',
  );

  // the reopened canvas survives a reload (working copy auto-saved)
  await page.reload();
  await expect(page.locator('.react-flow__node')).toHaveCount(2);

  // export the document's compiled work as Markdown from the palette
  await page.keyboard.press('Control+k');
  await page.getByPlaceholder(/jump to anything/i).fill('export markdown');
  const mdDownloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: /as Markdown/ }).first().click();
  const mdDownload = await mdDownloadPromise;
  expect(mdDownload.suggestedFilename()).toMatch(/\.md$/);
  const markdown = readFileSync((await mdDownload.path())!, 'utf8');
  expect(markdown).toContain('The letter arrives at dawn.');
  expect(markdown.startsWith('# ')).toBe(true);
});

test('canvas exports as a PNG image', async ({ page }) => {
  await addNode(page, 'note');
  await addNode(page, 'person');
  await fitAll(page);
  await openProjectMenu(page);
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export canvas as PNG' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.png$/);
  // a real image came out, not an empty shell
  const bytes = readFileSync((await download.path())!);
  expect(bytes.length).toBeGreaterThan(1000);
  expect(bytes.subarray(1, 4).toString()).toBe('PNG');
});

test('undo brings the previous canvas back after New', async ({ page }) => {
  await addNode(page, 'note');
  await expect(page.locator('.react-flow__node')).toHaveCount(1);
  await openProjectMenu(page);
  await page.getByRole('button', { name: 'New canvas' }).click();
  await expect(page.locator('.react-flow__node')).toHaveCount(0);
  await page.getByRole('button', { name: /undo/i }).click();
  await expect(page.locator('.react-flow__node')).toHaveCount(1);
});
