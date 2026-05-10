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

test('source UI does not use raw emoji glyphs directly', () => {
  const files = listFiles('src').filter((file) => /\.(jsx|js)$/.test(file));
  const blockedGlyphs = ['📱', '🎳', '✨', '✏️', '📝', '📜', '📷', '⚠️', '🚨', '✅', '👇', '🔍'];

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

test('native browser dialogs stay quarantined to known legacy call sites', () => {
  const allowedDialogLines = {
    'src/components/ui/SelectField.jsx': [
      'const customValue = window.prompt(customPrompt || `${label || \'항목\'} 수치를 직접 입력하세요:`);',
    ],
    'src/pages/ChartDetail.jsx': [
      'alert(`${customer.name} 고객님의 기록이 안전하게 저장되었습니다.`);',
      'onSelect={(record) => { if (window.confirm(`${record.timestamp} 기록을 불러오시겠습니까?`)) loadRecord(record); }}',
      'const newName = window.prompt(\'새로운 이름을 입력하세요:\', currentName);',
    ],
    'src/pages/CustomerManager.jsx': [
      'alert(\'디바이스 화면 높이가 최적화되었습니다.\');',
      'if (!customerData.name.trim()) return alert("이름을 입력해주세요!");',
      'if (window.confirm(`1차 경고\\n${customerName} 고객 정보를 삭제하시겠습니까?`)) {',
      'if (window.confirm(`2차 경고\\n정말로 영구 삭제하시겠습니까?\\n삭제 후에는 고객의 모든 지공 기록이 함께 영구히 삭제되며 절대 복원할 수 없습니다.`)) {',
    ],
  };
  const sourceFiles = listFiles('src').filter((file) => /\.(jsx|js)$/.test(file));
  const unapproved = [];

  for (const file of sourceFiles) {
    const source = readFileSync(file, 'utf8');
    const sourceLines = source.split('\n').map((line) => line.trim());
    const allowedLines = allowedDialogLines[file] || [];

    for (const line of sourceLines) {
      if (!/\b(?:window\.)?(?:alert|confirm|prompt)\s*\(/.test(line)) continue;
      if (!allowedLines.includes(line)) unapproved.push(`${file}: ${line}`);
    }

    for (const allowedLine of allowedLines) {
      assert.equal(sourceLines.includes(allowedLine), true, `${file} should keep legacy native dialog allowlist explicit`);
    }
  }

  assert.deepEqual(unapproved, []);
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
