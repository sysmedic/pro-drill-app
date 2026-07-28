import { expect, test } from '@playwright/test';

test('customer creation and chart save flow works', async ({ page }) => {
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
  await expect(page.getByRole('button', { name: '백업' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: '복원' })).toHaveCount(0);

  await page.getByRole('button', { name: '신규' }).click();
  await page.getByPlaceholder('고객 이름').fill('E2E 고객');
  await page.getByPlaceholder('연락처 (자동 하이픈 입력)').fill('01012345678');
  await page.getByRole('button', { name: '고객 등록 완료' }).click();

  await expect(page.getByText('E2E 고객')).toBeVisible();
  await page.getByText('E2E 고객').click();

  await expect(page.getByText('핸드 컨디션')).toBeVisible();
  const chartViewBtn = page.getByRole('button', { name: '차트 보기로 전환' });
  await chartViewBtn.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
  if (await chartViewBtn.isVisible()) {
    await chartViewBtn.click();
  }
  await expect(page.getByText('작업내용')).toBeVisible();
  await page.getByLabel(/볼링공 모델명/).fill('E2E 테스트볼');

  await page.getByRole('button', { name: '저장', exact: true }).click();
  const nameModalConfirm = page.getByRole('button', { name: '저장 / 확인' });
  await nameModalConfirm.waitFor({ state: 'visible', timeout: 8000 });
  await nameModalConfirm.click();
  await expect(page.getByRole('status')).toContainText('기록이 저장되었습니다.');
  await page.waitForTimeout(200);

  await page.getByLabel('뒤로').click();
  await expect(page.getByRole('heading', { name: /고객 관리/ })).toBeVisible();
});
