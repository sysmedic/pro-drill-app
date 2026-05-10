import { expect, test } from '@playwright/test';

test('customer creation and chart save flow works', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  await expect(page.getByRole('heading', { name: /고객 관리/ })).toBeVisible();
  await expect(page.getByRole('button', { name: '백업' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: '복원' })).toHaveCount(0);

  await page.getByRole('button', { name: '+ 신규' }).click();
  await page.getByPlaceholder('고객 이름').fill('E2E 고객');
  await page.getByPlaceholder('연락처 (자동 하이픈 입력)').fill('01012345678');
  await page.getByRole('button', { name: '고객 등록 완료' }).click();

  await expect(page.getByText('E2E 고객')).toBeVisible();
  await page.getByText('E2E 고객').click();

  await expect(page.getByText('핸드 컨디션')).toBeVisible();
  await page.getByRole('button', { name: '📄 차트' }).click();
  await expect(page.getByText('작업내용')).toBeVisible();

  page.once('dialog', async (dialog) => {
    expect(dialog.message()).toContain('안전하게 저장');
    await dialog.accept();
  });
  await page.getByRole('button', { name: 'Save' }).click();

  await page.getByRole('button', { name: '◀ Back' }).click();
  await expect(page.getByRole('heading', { name: /고객 관리/ })).toBeVisible();
});
