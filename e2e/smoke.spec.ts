import { expect, test } from '@playwright/test';

test('app shell boots', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('app-shell')).toBeVisible();
});
