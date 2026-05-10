import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

const execNode = (args) =>
  execFileSync(process.execPath, args, {
    cwd: process.cwd(),
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 10,
  });

const hasSection = (output, file) => output.includes(`## ${file}\n`);

const canonicalDocs = [
  'GEMINI.md',
  'docs/VIBE_CODING_GUIDE.md',
  'docs/UI_GUIDE.md',
  'docs/GEMINI_TASK_TEMPLATE.md',
  'docs/PROJECT_CONTEXT.md',
  'docs/SESSION_STATE.md',
];

test('context-pack modes include canonical docs plus related source and test bodies', () => {
  const modeCases = {
    light: {
      args: ['scripts/context-pack.mjs', '--light'],
      expectedFiles: ['src/App.jsx', 'src/main.jsx', 'test/siteSmoke.test.js', 'test/projectContracts.test.js'],
    },
    ui: {
      args: ['scripts/context-pack.mjs', '--mode', 'ui'],
      expectedFiles: [
        'src/components/ui/Button.jsx',
        'src/components/ui/DisclosureSection.jsx',
        'src/components/ui/SelectField.jsx',
        'src/components/ui/KeypadField.jsx',
        'src/pages/CustomerManager.jsx',
        'src/pages/ChartDetail.jsx',
        'src/pages/chartDetail/ChartTopBar.jsx',
        'src/pages/chartDetail/useMemoOverlay.jsx',
        'test/siteSmoke.test.js',
        'test/projectContracts.test.js',
      ],
    },
    data: {
      args: ['scripts/context-pack.mjs', '--mode', 'data'],
      expectedFiles: [
        'src/lib/storageKeys.js',
        'src/lib/customerStorage.js',
        'src/lib/chartHistoryStorage.js',
        'src/pages/chartDetail/useHistoryRecords.js',
        'test/helpers/mockStorage.js',
        'test/customerStorage.test.js',
        'test/customerSchema.test.js',
        'test/chartHistoryStorage.test.js',
      ],
    },
    e2e: {
      args: ['scripts/context-pack.mjs', '--mode', 'e2e'],
      expectedFiles: [
        'docs/CI_CD.md',
        'playwright.config.js',
        'scripts/serve-dist.mjs',
        'e2e/app-flow.spec.js',
        'e2e/storage-history.spec.js',
        'e2e/pwa.spec.js',
        'src/App.jsx',
        'src/lib/chartHistoryStorage.js',
        'test/siteSmoke.test.js',
      ],
    },
    full: {
      args: ['scripts/context-pack.mjs'],
      expectedFiles: [
        'docs/CI_CD.md',
        'scripts/context-pack.mjs',
        'scripts/gemini-prompt.mjs',
        'src/pages/ChartDetail.jsx',
        'src/lib/chartHistoryStorage.js',
        'test/chartHistoryStorage.test.js',
        'e2e/app-flow.spec.js',
      ],
    },
  };

  for (const [mode, { args, expectedFiles }] of Object.entries(modeCases)) {
    const output = execNode(args);

    assert.match(output, new RegExp(`Mode: ${mode}`));
    assert.match(output, /Required read order: GEMINI\.md/);
    assert.match(output, /Do not change localStorage keys/);
    assert.match(output, /Do not add native alert\/confirm\/prompt/);

    for (const file of canonicalDocs) {
      assert.equal(hasSection(output, file), true, `${mode} should include ${file}`);
    }

    for (const file of expectedFiles) {
      assert.equal(hasSection(output, file), true, `${mode} should include ${file}`);
    }
  }
});

test('gemini prompts keep the canonical read list and common forbidden conditions', () => {
  const promptCases = {
    ui: 'npm run context -- --mode ui',
    fix: 'npm run context:light',
    e2e: 'npm run context -- --mode e2e',
    data: 'npm run context -- --mode data',
  };

  for (const [mode, contextCommand] of Object.entries(promptCases)) {
    const output = execNode(['scripts/gemini-prompt.mjs', mode]);

    assert.match(output, /먼저 아래 필수 파일을 읽고 작업해줘/);
    assert.match(output, /CI\/E2E\/배포 작업이면 docs\/CI_CD\.md도 읽어줘/);
    assert.match(output, new RegExp(contextCommand.replaceAll('/', '\\/')));

    for (const file of canonicalDocs) {
      assert.match(output, new RegExp(`- ${file.replaceAll('.', '\\.')}`), `${mode} should mention ${file}`);
    }

    assert.match(output, /요청하지 않은 새 버튼\/새 화면\/새 사용자 흐름 추가 금지/);
    assert.match(output, /localStorage 키와 기존 고객\/히스토리 데이터 구조 변경 금지/);
    assert.match(output, /관련 없는 리팩터링, 파일 이동, 새 라이브러리 추가 금지/);
    assert.match(output, /native alert\/confirm\/prompt 추가 금지/);
  }
});
