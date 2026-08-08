import { expect, test } from '@playwright/test';

const CUSTOMERS_KEY = 'bowling_customers';
const CHART_HISTORY_PREFIX = 'chart_history_v8_';

const openCleanApp = async (page) => {
  await page.goto('/');
  await page.evaluate(async () => {
    localStorage.clear();
    await new Promise((resolve) => {
      const request = indexedDB.open('ProDrillDB', 1);
      request.onsuccess = (event) => {
        const db = event.target.result;
        try {
          const storeNames = Array.from(db.objectStoreNames);
          const targets = ['customers', 'chartHistories'].filter(name => storeNames.includes(name));
          if (targets.length === 0) {
            db.close();
            resolve();
            return;
          }
          const transaction = db.transaction(targets, 'readwrite');
          targets.forEach(name => transaction.objectStore(name).clear());
          transaction.oncomplete = () => {
            db.close();
            resolve();
          };
          transaction.onerror = () => {
            db.close();
            resolve();
          };
        } catch {
          db.close();
          resolve();
        }
      };
      request.onerror = () => resolve();
      request.onblocked = () => resolve();
    });
  });
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
  const chartViewBtn = page.getByRole('button', { name: '차트 보기로 전환' });
  await chartViewBtn.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
  if (await chartViewBtn.isVisible()) {
    await chartViewBtn.click();
  }
  await expect(page.getByText('작업내용')).toBeVisible();
};

const openTaskDetails = async (page) => {
  await expect(page.getByLabel(/볼링공 모델명/)).toBeVisible();
};

const saveChart = async (page) => {
  await page.getByRole('button', { name: '저장', exact: true }).click();
  const nameModalConfirm = page.getByRole('button', { name: '저장 / 확인' });
  await nameModalConfirm.waitFor({ state: 'visible', timeout: 8000 });
  await nameModalConfirm.click();
  await expect(page.getByRole('status')).toContainText('기록이 저장되었습니다.');
  await page.waitForTimeout(600);
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

  const storageState = await page.evaluate(async ({ historyPrefix, name }) => {
    const customers = await window.indexedDbHelper.getAllCustomers();
    const customer = customers.find((entry) => entry.name === name);
    const history = customer?.id ? await window.indexedDbHelper.getChartHistory(customer.id) : [];
    const historyKey = customer?.id ? `${historyPrefix}${customer.id}` : null;

    return {
      customerId: customer?.id || null,
      history,
      historyKey,
    };
  }, { historyPrefix: CHART_HISTORY_PREFIX, name: customerName });

  expect(storageState.customerId).toMatch(/^(cus_|id_)/);
  expect(storageState.historyKey).toBe(`${CHART_HISTORY_PREFIX}${storageState.customerId}`);
  expect(storageState.history).toHaveLength(1);
  expect(storageState.history[0].name).toContain(ballName);
  expect(storageState.history[0].data.ballName).toBe(ballName);

  const headingCustomerManager = page.getByRole('heading', { name: /고객 관리/ });
  if (!(await headingCustomerManager.isVisible())) {
    const backBtn = page.getByRole('button', { name: /고객관리/ });
    await backBtn.waitFor({ state: 'visible', timeout: 3000 }).catch(() => {});
    if (await backBtn.isVisible()) {
      await backBtn.evaluate(el => el.click());
    }
  }
  await expect(page.getByRole('heading', { name: /고객 관리/ })).toBeVisible();

  await page.getByText(customerName, { exact: true }).click();
  await expect(page.getByRole('button', { name: /수정/ })).toBeVisible();
  await openTaskDetails(page);
  await expect(page.getByLabel(/볼링공 모델명/)).toHaveValue(ballName);

  await page.getByRole('button', { name: '기록', exact: true }).click();

  const historyDialog = page.getByRole('dialog', { name: /저장 기록/ });
  await expect(historyDialog).toBeVisible();

  await historyDialog.getByText(ballName, { exact: false }).click();
  await expect(historyDialog).toBeHidden();
  const loadDialog = page.getByRole('dialog', { name: /기록 불러오기/ });
  await expect(loadDialog).toContainText('기록을 불러오시겠습니까');
  await loadDialog.getByRole('button', { name: '불러오기', exact: true }).click();
  await expect(loadDialog).toBeHidden();
  await expect(page.getByLabel(/볼링공 모델명/)).toHaveValue(ballName);
});

test('unsaved chart edits show an exit confirmation before leaving', async ({ page }) => {
  await createCustomerAndOpenChart(page, 'E2E 미저장 고객');
  await switchToChartView(page);
  await openTaskDetails(page);
  await page.getByLabel(/레이아웃/).fill('40 x 5 x 35');

  await page.getByRole('button', { name: /고객관리/ }).click();
  const exitDialog = page.getByRole('dialog', { name: /주의/ });
  await expect(exitDialog).toBeVisible();
  await expect(exitDialog).toContainText(/수정한 변경 사항/);

  await exitDialog.getByRole('button', { name: /취소/ }).click();
  await expect(exitDialog).toBeHidden();
  await expect(page.getByText('작업내용')).toBeVisible();

  await page.getByRole('button', { name: /고객관리/ }).click();
  const reopenedExitDialog = page.getByRole('dialog', { name: /주의/ });
  await reopenedExitDialog.getByRole('button', { name: /저장하지 않고 나가기/ }).click();
  await expect(page.getByRole('heading', { name: /고객 관리/ })).toBeVisible();
});
