import { expect, test } from '@playwright/test';

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
  await expectHorizontallyAligned(toolbar, editSurface, 16);

  await testInfo.attach(`chart-edit-${testInfo.project.name}`, {
    body: await page.screenshot({ fullPage: true }),
    contentType: 'image/png',
  });

  await page.getByRole('button', { name: '차트 보기로 전환' }).click();
  const chartSurface = page.getByTestId('chart-blueprint-surface');
  await expect(chartSurface).toBeVisible();
  await expectHorizontallyAligned(toolbar, chartSurface, 16);

  // 유틸 버튼 임시 비활성화 처리에 따라 해당 레이아웃 검증 스킵
  // await page.getByRole('button', { name: '유틸', exact: true }).click();
  // const utilitySheet = page.getByTestId('utility-sheet-surface');
  // await expect(utilitySheet).toBeVisible();
  // await expectHorizontallyAligned(toolbar, utilitySheet);

  await testInfo.attach(`chart-view-${testInfo.project.name}`, {
    body: await page.screenshot({ fullPage: true }),
    contentType: 'image/png',
  });
});
