import { expect, test } from '@playwright/test';

const dispatchCompositionInput = async (locator, value) => {
  await locator.focus();
  await locator.evaluate((element, nextValue) => {
    const setNativeValue = (target, targetValue) => {
      const ownDescriptor = Object.getOwnPropertyDescriptor(target, 'value');
      const prototypeDescriptor = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(target), 'value');
      const valueSetter = prototypeDescriptor?.set || ownDescriptor?.set;

      valueSetter.call(target, targetValue);
    };

    element.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true, data: '' }));
    setNativeValue(element, nextValue.slice(0, 1));
    element.dispatchEvent(new InputEvent('input', {
      bubbles: true,
      data: nextValue.slice(0, 1),
      inputType: 'insertCompositionText',
      isComposing: true,
    }));
    element.dispatchEvent(new CompositionEvent('compositionupdate', { bubbles: true, data: nextValue }));
    setNativeValue(element, nextValue);
    element.dispatchEvent(new InputEvent('input', {
      bubbles: true,
      data: nextValue,
      inputType: 'insertCompositionText',
      isComposing: true,
    }));
    element.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true, data: nextValue }));
    element.dispatchEvent(new InputEvent('input', {
      bubbles: true,
      data: nextValue,
      inputType: 'insertText',
    }));
  }, value);
};

test('Korean composition input remains intact in modal fields', async ({ page }) => {
  const customerName = '홍길동';

  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.getByRole('heading', { name: /고객 관리/ })).toBeVisible();

  await page.getByRole('button', { name: /신규/ }).click();
  const nameInput = page.getByPlaceholder('고객 이름');
  await dispatchCompositionInput(nameInput, customerName);
  await expect(nameInput).toHaveValue(customerName);

  await page.getByRole('button', { name: /고객 등록 완료/ }).click();
  await expect(page.getByText(customerName, { exact: true })).toBeVisible();
});
