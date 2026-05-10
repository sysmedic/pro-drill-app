import { expect, test } from '@playwright/test';

const CUSTOMERS_KEY = 'bowling_customers';
const CHART_HISTORY_PREFIX = 'chart_history_v8_';

const openCleanApp = async (page) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.getByRole('heading', { name: /고객 관리/ })).toBeVisible();
};

const patchStorageFailure = async (page, keyPredicateSource) => {
  await page.evaluate((predicateSource) => {
    const predicate = new Function('key', `return (${predicateSource})(key);`);
    const originalSetItem = Storage.prototype.setItem;

    Storage.prototype.setItem = function patchedSetItem(key, value) {
      if (predicate(key)) {
        throw new Error('quota exceeded');
      }
      return originalSetItem.call(this, key, value);
    };
  }, keyPredicateSource);
};

test('customer save failure keeps the modal open and avoids false success', async ({ page }) => {
  await openCleanApp(page);
  await patchStorageFailure(page, `(key) => key === '${CUSTOMERS_KEY}'`);

  await page.getByRole('button', { name: /신규/ }).click();
  await page.getByPlaceholder('고객 이름').fill('저장 실패 고객');
  await page.getByRole('button', { name: /고객 등록 완료/ }).click();

  await expect(page.getByRole('alert')).toContainText('저장 실패');
  await expect(page.getByRole('dialog', { name: /신규 고객 등록/ })).toBeVisible();
  await expect(page.getByText('저장 실패 고객', { exact: true })).toHaveCount(0);
});

test('chart save failure preserves dirty state and does not write history', async ({ page }) => {
  const customerName = '차트 저장 실패 고객';

  await openCleanApp(page);
  await page.getByRole('button', { name: /신규/ }).click();
  await page.getByPlaceholder('고객 이름').fill(customerName);
  await page.getByRole('button', { name: /고객 등록 완료/ }).click();
  await page.getByText(customerName, { exact: true }).click();
  await expect(page.getByText(/핸드 컨디션/)).toBeVisible();

  await patchStorageFailure(page, `(key) => key.startsWith('${CHART_HISTORY_PREFIX}')`);
  await page.getByRole('button', { name: '차트' }).click();
  await page.getByRole('button', { name: /작업내용/ }).click();
  await page.getByLabel(/레이아웃/).fill('40 x 5 x 35');
  await page.getByRole('button', { name: '저장', exact: true }).click();

  await expect(page.getByRole('alert')).toContainText('저장 실패');

  const historyKeys = await page.evaluate((historyPrefix) => (
    Object.keys(localStorage).filter((key) => key.startsWith(historyPrefix))
  ), CHART_HISTORY_PREFIX);
  expect(historyKeys).toHaveLength(0);

  await page.getByRole('button', { name: /뒤로/ }).click();
  await expect(page.getByRole('dialog', { name: /주의/ })).toBeVisible();
});
