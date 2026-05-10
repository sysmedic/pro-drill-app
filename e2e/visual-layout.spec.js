import { expect, test } from '@playwright/test';

const openCleanApp = async (page) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.getByRole('heading', { name: /고객 관리/ })).toBeVisible();
};

const createCustomerAndOpenChart = async (page, customerName) => {
  await page.getByRole('button', { name: /신규/ }).click();
  await page.getByPlaceholder('고객 이름').fill(customerName);
  await page.getByRole('button', { name: /고객 등록 완료/ }).click();

  await page.getByText(customerName, { exact: true }).click();
  await expect(page.getByText(/핸드 컨디션/)).toBeVisible();
};

const expectHorizontallyAligned = async (first, second, tolerance = 2) => {
  const firstBox = await first.boundingBox();
  const secondBox = await second.boundingBox();

  expect(firstBox).not.toBeNull();
  expect(secondBox).not.toBeNull();
  expect(Math.abs(firstBox.x - secondBox.x)).toBeLessThanOrEqual(tolerance);
  expect(Math.abs(firstBox.width - secondBox.width)).toBeLessThanOrEqual(tolerance);
};

test.beforeEach(async ({ page }) => {
  await openCleanApp(page);
});

test('chart fixed surfaces stay aligned across supported viewports', async ({ page }, testInfo) => {
  await createCustomerAndOpenChart(page, `시각 QA ${testInfo.project.name}`);

  const toolbar = page.getByTestId('toolbar-fixed-topbar');
  const editSurface = page.getByTestId('chart-edit-surface');
  await expect(toolbar).toBeVisible();
  await expect(editSurface).toBeVisible();
  await expectHorizontallyAligned(toolbar, editSurface);

  await testInfo.attach(`chart-edit-${testInfo.project.name}`, {
    body: await page.screenshot({ fullPage: true }),
    contentType: 'image/png',
  });

  await page.getByRole('button', { name: '차트' }).click();
  const chartSurface = page.getByTestId('chart-blueprint-surface');
  await expect(chartSurface).toBeVisible();
  await expectHorizontallyAligned(toolbar, chartSurface);

  await page.getByRole('button', { name: '유틸', exact: true }).click();
  const utilitySheet = page.getByTestId('utility-sheet-surface');
  await expect(utilitySheet).toBeVisible();
  await expectHorizontallyAligned(toolbar, utilitySheet);

  await testInfo.attach(`chart-view-${testInfo.project.name}`, {
    body: await page.screenshot({ fullPage: true }),
    contentType: 'image/png',
  });
});
