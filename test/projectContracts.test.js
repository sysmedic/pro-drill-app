import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import {
  CHART_HISTORY_PREFIX,
  CUSTOMERS_KEY,
  LEGACY_CHART_HISTORY_PREFIX,
  PRE_V7_CHART_HISTORY_PREFIX,
} from '../src/lib/storageKeys.js';

const listFiles = (dir) => {
  const files = [];

  for (const name of readdirSync(dir)) {
    const fullPath = join(dir, name);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      files.push(...listFiles(fullPath));
    } else {
      files.push(relative(process.cwd(), fullPath));
    }
  }

  return files;
};

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
    'src/pages/chartDetail/useHistoryRecords.js',
    'src/pages/chartDetail/useMemoOverlay.jsx',
    'src/pages/customerManager/CustomerFormModal.jsx',
    'src/pages/customerManager/CustomerHeader.jsx',
    'src/pages/customerManager/CustomerList.jsx',
  ];

  for (const file of expectedFiles) {
    assert.equal(existsSync(file), true, `${file} should exist`);
  }
});

test('AI workflow docs stay available for vibe coding sessions', () => {
  const expectedDocs = [
    'GEMINI.md',
    'docs/VIBE_CODING_GUIDE.md',
    'docs/UI_GUIDE.md',
    'docs/GEMINI_TASK_TEMPLATE.md',
    'docs/PROJECT_CONTEXT.md',
    'docs/SESSION_STATE.md',
    'docs/CI_CD.md',
  ];

  for (const file of expectedDocs) {
    assert.equal(existsSync(file), true, `${file} should exist`);
  }
});

test('shared frontend primitives exist before page-specific styling grows', () => {
  const expectedFiles = [
    'src/components/layout/PageShell.jsx',
    'src/components/layout/TopBarShell.jsx',
    'src/components/ui/Badge.jsx',
    'src/components/ui/Button.jsx',
    'src/components/ui/Card.jsx',
    'src/components/ui/DisclosureSection.jsx',
    'src/components/ui/Dialogs.jsx',
    'src/components/ui/Field.jsx',
    'src/components/ui/Icon.jsx',
    'src/components/ui/KeypadField.jsx',
    'src/components/ui/ModalShell.jsx',
    'src/components/ui/SelectField.jsx',
    'src/components/ui/classNames.js',
  ];

  for (const file of expectedFiles) {
    assert.equal(existsSync(file), true, `${file} should exist`);
  }
});

test('chart input density stays controlled by shared primitives', () => {
  const disclosureSource = readFileSync('src/components/ui/DisclosureSection.jsx', 'utf8');
  const selectSource = readFileSync('src/components/ui/SelectField.jsx', 'utf8');
  const keypadSource = readFileSync('src/components/ui/KeypadField.jsx', 'utf8');
  const chartInputSource = readFileSync('src/pages/chartDetail/ChartInputForm.jsx', 'utf8');

  assert.match(disclosureSource, /compact:/);
  assert.match(selectSource, /compact:/);
  assert.match(keypadSource, /compact:/);
  assert.match(chartInputSource, /const FORM_DENSITY = 'compact'/);
  assert.match(chartInputSource, /<DisclosureSection density=\{FORM_DENSITY\}/);
});

test('source UI does not use raw emoji glyphs directly', () => {
  const files = listFiles('src').filter((file) => /\.(jsx|js)$/.test(file));
  const blockedGlyphs = ['📱', '🎳', '✏️', '📝', '📜', '📷', '⚠️', '🚨', '✅', '👇', '🔍'];

  for (const file of files) {
    const source = readFileSync(file, 'utf8');
    for (const glyph of blockedGlyphs) {
      assert.equal(source.includes(glyph), false, `${file} should not contain ${glyph}`);
    }
  }
});

test('storage key constants remain backward compatible', () => {
  assert.equal(CUSTOMERS_KEY, 'bowling_customers');
  assert.equal(CHART_HISTORY_PREFIX, 'chart_history_v8_');
  assert.equal(LEGACY_CHART_HISTORY_PREFIX, 'chart_history_v7_');
  assert.equal(PRE_V7_CHART_HISTORY_PREFIX, 'chart_history_');
});

test('source UI creates ids through the shared local id helper', () => {
  const sourceFiles = listFiles('src').filter((file) => (
    /\.(jsx|js)$/.test(file) && file !== 'src/lib/ids.js'
  ));
  const matches = [];

  for (const file of sourceFiles) {
    const source = readFileSync(file, 'utf8');
    if (/Date\.now\s*\(/.test(source)) matches.push(file);
  }

  assert.deepEqual(matches, []);
});

test('source UI does not call native browser dialogs', () => {
  const sourceFiles = listFiles('src').filter((file) => /\.(jsx|js)$/.test(file));
  const matches = [];

  for (const file of sourceFiles) {
    const source = readFileSync(file, 'utf8');
    const sourceLines = source.split('\n').map((line) => line.trim());

    for (const line of sourceLines) {
      if (!/\b(?:window\.)?(?:alert|confirm|prompt)\s*\(/.test(line)) continue;
      matches.push(`${file}: ${line}`);
    }
  }

  assert.deepEqual(matches, []);
});

test('source UI does not expose unavailable future-action placeholders', () => {
  const sourceFiles = listFiles('src').filter((file) => /\.(jsx|js)$/.test(file));
  const matches = [];

  for (const file of sourceFiles) {
    const source = readFileSync(file, 'utf8');
    if (source.includes('사진첨부')) matches.push(`${file}: 사진첨부`);
    if (/icon=["']image["']/.test(source)) matches.push(`${file}: image icon usage`);
  }

  assert.deepEqual(matches, []);
});

test('shared button variants stay flat and baseline-stable', () => {
  const source = readFileSync('src/components/ui/Button.jsx', 'utf8');

  assert.doesNotMatch(source, /bg-gradient/);
  assert.doesNotMatch(source, /translate-y/);
  assert.match(source, /leading-none/);
});

test('package scripts expose lightweight Gemini harness commands', () => {
  const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));

  assert.equal(packageJson.scripts['context:light'], 'node scripts/context-pack.mjs --light');
  assert.equal(packageJson.scripts['prompt:ui'], 'node scripts/gemini-prompt.mjs ui');
  assert.equal(packageJson.scripts['prompt:fix'], 'node scripts/gemini-prompt.mjs fix');
  assert.equal(packageJson.scripts['prompt:e2e'], 'node scripts/gemini-prompt.mjs e2e');
  assert.equal(packageJson.scripts['prompt:data'], 'node scripts/gemini-prompt.mjs data');
  assert.equal(existsSync('scripts/gemini-prompt.mjs'), true);
});
