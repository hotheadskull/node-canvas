import { expect, test } from '@playwright/test';

// The Document node pass (docs/design/node-passes/document.md): wired
// content lands INLINE as a live embed; editing it inside the document
// FORKS (source untouched); apply-to-source is the only write-back.

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('nodecanvas.v2.menuView', 'all'); });
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

test('wire a note into a document: live embed inline, fork on edit, deliberate write-back', async ({
  page,
}) => {
  await addNode(page, 'note');
  await addNode(page, 'document');
  await fitAll(page);
  const note = nodeOfKind(page, 'Note').first();
  const doc = nodeOfKind(page, 'Document').first();

  // give the note some words
  await note.locator('.richtext-content').click();
  await page.keyboard.type('The letter arrives at dawn.', { delay: 1 });
  await page.locator('.nodecanvas-flow').click({ position: { x: 10, y: 400 } });

  // wire note -> document spine
  const giveStar = note.locator('[data-handleid="text-out"]');
  const takeStar = doc.locator('[data-handleid="sections-in"]');
  await dragBetween(page, center((await giveStar.boundingBox())!), center((await takeStar.boundingBox())!));

  // the note's text appears INSIDE the document as a LIVE embed
  const embed = doc.locator('.doc-block.is-embed');
  await expect(embed).toHaveClass(/is-live/);
  await expect(embed).toContainText('The letter arrives at dawn.');

  // edit the embed inside the document -> it FORKS (amber), source untouched
  await embed.locator('.richtext-content').click();
  await page.keyboard.press('End');
  await page.keyboard.type(' He burns it.', { delay: 1 });
  await expect(embed).toHaveClass(/is-forked/);
  await expect(note.locator('.richtext-content')).toContainText('The letter arrives at dawn.');
  await expect(note.locator('.richtext-content')).not.toContainText('He burns it');

  // the source wears the quiet "edited in" notice
  await expect(note.locator('[data-fork-notice]')).toBeVisible();

  // hover actions: apply to source = the only write-back. Deselect first --
  // a selected node's resizer lines intercept clicks near the card edges.
  await page.locator('.nodecanvas-flow').click({ position: { x: 10, y: 500 } });
  await embed.hover();
  await embed.locator('button', { hasText: 'apply to source' }).click();
  await expect(embed).toHaveClass(/is-live/);
  await expect(note.locator('.richtext-content')).toContainText('He burns it.');
  await expect(note.locator('[data-fork-notice]')).toHaveCount(0);

  // survives reload (blocks persist; still one document, one live embed)
  await page.reload();
  await fitAll(page);
  const docAfter = nodeOfKind(page, 'Document').first();
  await expect(docAfter.locator('.doc-block.is-embed.is-live')).toContainText('He burns it.');
});

test('revert discards the document version; the fullscreen room edits the same blocks', async ({
  page,
}) => {
  await addNode(page, 'note');
  await addNode(page, 'document');
  await fitAll(page);
  const note = nodeOfKind(page, 'Note').first();
  const doc = nodeOfKind(page, 'Document').first();

  await note.locator('.richtext-content').click();
  await page.keyboard.type('Original words.', { delay: 1 });
  await page.locator('.nodecanvas-flow').click({ position: { x: 10, y: 400 } });

  const giveStar = note.locator('[data-handleid="text-out"]');
  const takeStar = doc.locator('[data-handleid="sections-in"]');
  await dragBetween(page, center((await giveStar.boundingBox())!), center((await takeStar.boundingBox())!));

  const embed = doc.locator('.doc-block.is-embed');
  await embed.locator('.richtext-content').click();
  await page.keyboard.press('End');
  await page.keyboard.type(' Gone too far.', { delay: 1 });
  await expect(embed).toHaveClass(/is-forked/);

  // the user's escape hatch: revert to source (deselect first: a selected
  // node's resizer lines intercept clicks near the card edges)
  await page.locator('.nodecanvas-flow').click({ position: { x: 10, y: 500 } });
  await embed.hover();
  await embed.locator('button', { hasText: 'revert' }).click();
  await expect(embed).toHaveClass(/is-live/);
  await expect(embed).toContainText('Original words.');
  await expect(embed).not.toContainText('Gone too far');

  // the earned fullscreen: Expand opens the room on the SAME blocks
  await doc.locator('button', { hasText: 'Expand' }).click();
  const room = page.locator('[data-doc-room]');
  await expect(room).toBeVisible();
  await expect(room.locator('.doc-block.is-embed')).toContainText('Original words.');
  await page.keyboard.press('Escape');
  await expect(room).toHaveCount(0);
});

test('arrow keys walk the caret across blocks like one continuous text', async ({ page }) => {
  await addNode(page, 'document');
  await fitAll(page);
  const doc = nodeOfKind(page, 'Document').first();

  // write in the first (only) text block
  await doc.locator('.richtext-content').first().click();
  await page.keyboard.type('Alpha', { delay: 1 });

  // insert a second paragraph block after it and write there
  await doc.locator('.doc-insert').last().click();
  await doc.locator('.richtext-content').last().click();
  await page.keyboard.type('Beta', { delay: 1 });

  // walk LEFT through "Beta" -- the fifth press crosses the block boundary
  // into the end of "Alpha" (user bug: arrows used to stop at the edge)
  for (let index = 0; index < 5; index += 1) await page.keyboard.press('ArrowLeft');
  await page.keyboard.type('!', { delay: 1 });

  // one step RIGHT crosses back to the start of the second block
  await page.keyboard.press('ArrowRight');
  await page.keyboard.type('X', { delay: 1 });

  await page.waitForFunction(() => {
    const raw = localStorage.getItem('nodecanvas.v2.document');
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    const docNode = parsed.nodes.find((node: { type: string }) => node.type === 'document');
    const texts = (docNode?.data?.blocks ?? [])
      .filter((block: { kind: string }) => block.kind === 'text')
      .map((block: { content?: string }) => block.content ?? '');
    return (
      texts.some((text: string) => text.includes('Alpha!')) &&
      texts.some((text: string) => text.includes('XBeta'))
    );
  });
});

test('highlight-split: the selection moves OUT into a new node with a lineage edge', async ({
  page,
}) => {
  await addNode(page, 'document');
  await fitAll(page);
  const doc = nodeOfKind(page, 'Document').first();

  await doc.locator('.richtext-content').first().click();
  await page.keyboard.type('The pistol on the mantel must fire.', { delay: 1 });
  await page.keyboard.press('Control+a');

  // the ✂ Split control appears in the toolbar only while text is selected
  const splitButton = doc.locator('.richtext-split-btn');
  await expect(splitButton).toBeVisible();
  await splitButton.click();
  await doc.locator('.richtext-split-picker button', { hasText: 'Note' }).click();

  // model: the note holds the text, the document gave it up, and a plain
  // "split" edge remembers the lineage
  await page.waitForFunction(() => {
    const raw = localStorage.getItem('nodecanvas.v2.document');
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    const note = parsed.nodes.find((node: { type: string }) => node.type === 'note');
    const docNode = parsed.nodes.find((node: { type: string }) => node.type === 'document');
    const blocks: { content?: string }[] = docNode?.data?.blocks ?? [];
    return (
      note !== undefined &&
      String(note.data.content).includes('pistol') &&
      blocks.every((block) => !String(block.content ?? '').includes('pistol')) &&
      parsed.edges.some((edge: { label?: string }) => edge.label === 'split')
    );
  });

  await fitAll(page);
  await expect(nodeOfKind(page, 'Note').first()).toContainText(
    'The pistol on the mantel must fire.',
  );
});
