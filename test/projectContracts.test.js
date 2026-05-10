import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

test('html document declares Korean language', () => {
  const html = readFileSync('index.html', 'utf8');
  assert.match(html, /<html lang="ko">/);
});

test('PWA manifest config uses local icons and Korean metadata', () => {
  const config = readFileSync('vite.config.js', 'utf8');
  assert.match(config, /lang: 'ko'/);
  assert.match(config, /src: '\/icon-192\.png'/);
  assert.match(config, /src: '\/icon-512\.png'/);
  assert.match(config, /src: '\/maskable-icon-512\.png'/);
  assert.match(config, /src: '\/favicon\.svg'/);
  assert.match(config, /purpose: 'maskable'/);
  assert.doesNotMatch(config, /placeholder\.com/);
});

test('Tailwind includes the animation tokens used by the UI', () => {
  const config = readFileSync('tailwind.config.js', 'utf8');
  assert.match(config, /'fade-in'/);
  assert.match(config, /'slide-up'/);
  assert.match(config, /'scale-up'/);
  assert.match(config, /400: '400ms'/);
});

test('large UI flows stay split into stable component files', () => {
  const expectedFiles = [
    'src/pages/chartDetail/BowlerSpecCard.jsx',
    'src/pages/chartDetail/ChartBlueprintView.jsx',
    'src/pages/chartDetail/ChartInputForm.jsx',
    'src/pages/chartDetail/ChartModals.jsx',
    'src/pages/chartDetail/ChartTopBar.jsx',
    'src/pages/chartDetail/TaskDetailsCard.jsx',
    'src/pages/chartDetail/UtilitySheet.jsx',
    'src/pages/customerManager/CustomerFormModal.jsx',
    'src/pages/customerManager/CustomerHeader.jsx',
    'src/pages/customerManager/CustomerList.jsx',
  ];

  for (const file of expectedFiles) {
    assert.equal(existsSync(file), true, `${file} should exist`);
  }
});
