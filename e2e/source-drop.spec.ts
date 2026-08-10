import { expect, test } from '@playwright/test';

// §10 gesture: drop a file on the canvas -> a Source node at the cursor,
// the file riding along as a data URL that SURVIVES RELOAD (I9: it lives
// in the validated document, not in a blob URL that dies with the tab).

test('dropping a file mints a Source at the cursor; the file survives reload', async ({
  page,
}) => {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem('nodecanvas.v2.tutorialDone', 'done');
  });
  await page.reload();
  await expect(page.getByRole('button', { name: /add node/i })).toBeVisible();

  await page.evaluate(() => {
    const dt = new DataTransfer();
    dt.items.add(new File(['the tide turned at dawn'], 'field-notes.txt', { type: 'text/plain' }));
    const target = document.querySelector('.canvas-root')!;
    target.dispatchEvent(
      new DragEvent('drop', { dataTransfer: dt, bubbles: true, clientX: 700, clientY: 400 }),
    );
  });

  await page.waitForFunction(() => {
    const raw = localStorage.getItem('nodecanvas.v2.document');
    if (raw === null) return false;
    const doc = JSON.parse(raw);
    return doc.nodes.some(
      (node: { type: string; data: Record<string, unknown> }) =>
        node.type === 'source' &&
        node.data.title === 'field-notes.txt' &&
        typeof node.data.sourceUrl === 'string' &&
        (node.data.sourceUrl as string).startsWith('data:text/plain'),
    );
  });

  // reload: the Source still knows its file (data URL, not a dead blob)
  await page.reload();
  await page.getByRole('button', { name: 'Fit' }).click();
  await page.waitForTimeout(400);
  const source = page.locator('.react-flow__node').filter({
    has: page.locator('.canvas-node-kind', { hasText: /^Source$/ }),
  });
  await expect(source).toHaveCount(1);
  await expect(source.locator('.source-fallback a')).toHaveText('Open file');
});
