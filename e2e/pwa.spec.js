import { expect, test } from '@playwright/test';

test('pwa manifest is served with standalone metadata and local icons', async ({ page, request }) => {
  await page.goto('/');

  const manifestHref = await page.locator('link[rel="manifest"]').getAttribute('href');
  expect(manifestHref).toBeTruthy();

  const response = await request.get(new URL(manifestHref, page.url()).toString());
  expect(response.ok()).toBeTruthy();

  const manifest = await response.json();
  const iconSources = manifest.icons.map((icon) => icon.src);

  expect(manifest.display).toBe('standalone');
  expect(manifest.lang).toBe('ko');
  expect(iconSources).toEqual(expect.arrayContaining([
    '/icon-192-v2.png',
    '/icon-512-v2.png',
    '/maskable-icon-512-v2.png',
  ]));
});
