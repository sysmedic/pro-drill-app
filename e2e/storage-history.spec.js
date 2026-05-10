import { expect, test } from '@playwright/test';

const CUSTOMERS_KEY = 'bowling_customers';
const CHART_HISTORY_PREFIX = 'chart_history_v8_';

const openCleanApp = async (page) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.getByRole('heading', { name: /고객 관리/ })).toBeVisible();
};

const createCustomerAndOpenChart = async (page, customerName) => {
  await page.getByRole('button', { name: /신규/ }).click();
  await page.getByPlaceholder('고객 이름').fill(customerName);
  await page.getByRole('textbox', { name: '연락처', exact: true }).fill('01022223333');
  await page.getByRole('button', { name: /고객 등록 완료/ }).click();

  const customerEntry = page.getByText(customerName, { exact: true });
  await expect(customerEntry).toBeVisible();
  await customerEntry.click();
  await expect(page.getByText(/핸드 컨디션/)).toBeVisible();
};

const switchToChartView = async (page) => {
  const chartButton = page.getByRole('button', { name: /차트/ });
  if (await chartButton.isVisible()) await chartButton.click();
  await expect(page.getByText('작업내용')).toBeVisible();
};

const openTaskDetails = async (page) => {
  await page.getByRole('button', { name: /작업내용/ }).click();
  await expect(page.getByLabel(/볼링공 모델명/)).toBeVisible();
};

const saveChart = async (page) => {
  let saveMessage = '';
  page.once('dialog', async (dialog) => {
    saveMessage = dialog.message();
    await dialog.accept();
  });

  await page.getByRole('button', { name: /^Save$/ }).click();
  expect(saveMessage).toContain('안전하게 저장');
};

test.beforeEach(async ({ page }) => {
  await openCleanApp(page);
});

test('saved chart creates the expected localStorage history key and reloads through history', async ({ page }) => {
  const customerName = 'E2E 저장 고객';
  const ballName = 'E2E 퍼플볼';

  await createCustomerAndOpenChart(page, customerName);
  await switchToChartView(page);
  await openTaskDetails(page);
  await page.getByLabel(/볼링공 모델명/).fill(ballName);
  await page.getByLabel(/레이아웃/).fill('50 x 4 x 30');
  await saveChart(page);

  const storageState = await page.evaluate(({ customersKey, historyPrefix, name }) => {
    const customers = JSON.parse(localStorage.getItem(customersKey) || '[]');
    const customer = customers.find((entry) => entry.name === name);
    const historyKey = customer?.id ? `${historyPrefix}${customer.id}` : null;
    const history = historyKey ? JSON.parse(localStorage.getItem(historyKey) || '[]') : [];

    return {
      customerId: customer?.id || null,
      history,
      historyKey,
    };
  }, { customersKey: CUSTOMERS_KEY, historyPrefix: CHART_HISTORY_PREFIX, name: customerName });

  expect(storageState.customerId).toMatch(/^cus_/);
  expect(storageState.historyKey).toBe(`${CHART_HISTORY_PREFIX}${storageState.customerId}`);
  expect(storageState.history).toHaveLength(1);
  expect(storageState.history[0].name).toBe(ballName);
  expect(storageState.history[0].data.ballName).toBe(ballName);

  await page.getByRole('button', { name: /Back/ }).click();
  await expect(page.getByRole('heading', { name: /고객 관리/ })).toBeVisible();

  await page.getByText(customerName, { exact: true }).click();
  await expect(page.getByRole('button', { name: /수정/ })).toBeVisible();
  await openTaskDetails(page);
  await expect(page.getByLabel(/볼링공 모델명/)).toHaveValue(ballName);

  await page.getByRole('button', { name: '유틸', exact: true }).click();
  await page.getByRole('button', { name: /저장기록/ }).click();

  const historyDialog = page.getByRole('dialog', { name: /저장 기록/ });
  await expect(historyDialog).toBeVisible();
  let confirmMessage = '';
  page.once('dialog', async (dialog) => {
    confirmMessage = dialog.message();
    await dialog.accept();
  });

  await historyDialog.getByText(ballName, { exact: true }).click();
  expect(confirmMessage).toContain('기록을 불러오시겠습니까');
  await expect(historyDialog).toBeHidden();
  await expect(page.getByLabel(/볼링공 모델명/)).toHaveValue(ballName);
});

test('unsaved chart edits show an exit confirmation before leaving', async ({ page }) => {
  await createCustomerAndOpenChart(page, 'E2E 미저장 고객');
  await switchToChartView(page);
  await openTaskDetails(page);
  await page.getByLabel(/레이아웃/).fill('40 x 5 x 35');

  await page.getByRole('button', { name: /Back/ }).click();
  const exitDialog = page.getByRole('dialog', { name: /주의/ });
  await expect(exitDialog).toBeVisible();
  await expect(exitDialog).toContainText(/저장되지 않은 변경 사항/);

  await exitDialog.getByRole('button', { name: /취소/ }).click();
  await expect(exitDialog).toBeHidden();
  await expect(page.getByText('작업내용')).toBeVisible();

  await page.getByRole('button', { name: /Back/ }).click();
  const reopenedExitDialog = page.getByRole('dialog', { name: /주의/ });
  await reopenedExitDialog.getByRole('button', { name: /저장하지 않고 나가기/ }).click();
  await expect(page.getByRole('heading', { name: /고객 관리/ })).toBeVisible();
});
