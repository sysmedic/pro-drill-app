import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const root = process.cwd()

const canonicalReadFiles = [
  'GEMINI.md',
  'docs/VIBE_CODING_GUIDE.md',
  'docs/UI_GUIDE.md',
  'docs/GEMINI_TASK_TEMPLATE.md',
  'docs/PROJECT_CONTEXT.md',
  'docs/SESSION_STATE.md',
  'package.json',
]

const ciFiles = [
  'docs/CI_CD.md',
  'vite.config.js',
  'playwright.config.js',
  'eslint.config.js',
  'tailwind.config.js',
  'postcss.config.js',
  'index.html',
  'e2e/app-flow.spec.js',
  'scripts/serve-dist.mjs',
  '.github/workflows/ci.yml',
  '.github/workflows/deploy-pages.yml',
]

const ignoredDirs = new Set(['node_modules', 'dist', 'dev-dist', '.git', 'playwright-report', 'test-results'])
const ignoredFiles = new Set(['.DS_Store'])

const walk = (dir, depth = 0) => {
  if (depth > 3) return []

  return readdirSync(dir)
    .filter((name) => !ignoredDirs.has(name))
    .filter((name) => !ignoredFiles.has(name))
    .flatMap((name) => {
      const fullPath = join(dir, name)
      const relPath = relative(root, fullPath)
      const stat = statSync(fullPath)

      if (stat.isDirectory()) return walk(fullPath, depth + 1)
      return relPath
    })
    .sort()
}

const filesUnder = (dir) => {
  const fullPath = join(root, dir)
  if (!existsSync(fullPath)) return []
  return walk(fullPath)
}

const unique = (files) => [...new Set(files)]

const sourceModes = {
  light: [
    'index.html',
    'src/main.jsx',
    'src/App.jsx',
    'test/siteSmoke.test.js',
    'test/projectContracts.test.js',
  ],
  ui: [
    'index.html',
    'tailwind.config.js',
    'src/index.css',
    'src/App.jsx',
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
    'src/pages/CustomerManager.jsx',
    'src/pages/customerManager/CustomerFormModal.jsx',
    'src/pages/customerManager/CustomerHeader.jsx',
    'src/pages/customerManager/CustomerList.jsx',
    'src/pages/ChartDetail.jsx',
    'src/pages/chartDetail/BowlerSpecCard.jsx',
    'src/pages/chartDetail/ChartBlueprintView.jsx',
    'src/pages/chartDetail/ChartInputForm.jsx',
    'src/pages/chartDetail/ChartModals.jsx',
    'src/pages/chartDetail/ChartTopBar.jsx',
    'src/pages/chartDetail/FractionKeypad.jsx',
    'src/pages/chartDetail/TaskDetailsCard.jsx',
    'src/pages/chartDetail/UtilitySheet.jsx',
    'src/pages/chartDetail/chartOptions.js',
    'src/pages/chartDetail/useHistoryRecords.js',
    'src/pages/chartDetail/useMemoOverlay.jsx',
    'test/siteSmoke.test.js',
    'test/projectContracts.test.js',
  ],
  data: [
    'src/lib/storageKeys.js',
    'src/lib/customerStorage.js',
    'src/lib/customerSchema.js',
    'src/lib/chartHistoryStorage.js',
    'src/pages/CustomerManager.jsx',
    'src/pages/ChartDetail.jsx',
    'src/pages/chartDetail/useHistoryRecords.js',
    'test/helpers/mockStorage.js',
    'test/customerStorage.test.js',
    'test/customerSchema.test.js',
    'test/chartHistoryStorage.test.js',
    'test/projectContracts.test.js',
  ],
  e2e: [
    'src/App.jsx',
    'src/pages/CustomerManager.jsx',
    'src/pages/ChartDetail.jsx',
    'src/pages/chartDetail/ChartTopBar.jsx',
    'src/pages/chartDetail/UtilitySheet.jsx',
    'src/pages/chartDetail/useHistoryRecords.js',
    'src/lib/storageKeys.js',
    'src/lib/chartHistoryStorage.js',
    'test/siteSmoke.test.js',
    'test/projectContracts.test.js',
    ...filesUnder('e2e'),
  ],
}

const fullSourceFiles = unique([
  'README.md',
  ...filesUnder('scripts'),
  ...filesUnder('src'),
  ...filesUnder('test'),
  ...filesUnder('e2e'),
])

const modeConfigs = {
  light: {
    description: 'Routine orientation and small fixes. Includes app entry and smoke/contract tests.',
    files: unique([...canonicalReadFiles, ...sourceModes.light]),
    command: 'npm run context:light',
  },
  ui: {
    description: 'UI/component work. Includes shared primitives, page components, CSS, and UI contract tests.',
    files: unique([...canonicalReadFiles, ...sourceModes.ui]),
    command: 'npm run context -- --mode ui',
  },
  data: {
    description: 'Storage/schema/migration work. Includes localStorage contracts and related tests.',
    files: unique([...canonicalReadFiles, ...sourceModes.data]),
    command: 'npm run context -- --mode data',
  },
  e2e: {
    description: 'Browser-flow work. Includes Playwright config/specs plus app code touched by flows.',
    files: unique([...canonicalReadFiles, ...ciFiles, ...sourceModes.e2e]),
    command: 'npm run context -- --mode e2e',
  },
  full: {
    description: 'Full coding session context. Includes docs, config, scripts, src, test, and e2e files.',
    files: unique([...canonicalReadFiles, ...ciFiles, ...fullSourceFiles]),
    command: 'npm run context',
  },
}

const parseMode = () => {
  if (process.argv.includes('--light')) return 'light'

  const modeFlag = process.argv.find((arg) => arg.startsWith('--mode='))
  if (modeFlag) return modeFlag.slice('--mode='.length)

  const modeIndex = process.argv.indexOf('--mode')
  if (modeIndex !== -1) return process.argv[modeIndex + 1]

  const positionalMode = process.argv.slice(2).find((arg) => !arg.startsWith('-'))
  return positionalMode || 'full'
}

const mode = parseMode()
const config = modeConfigs[mode]

if (!config) {
  console.error(`Unknown context mode: ${mode}`)
  console.error(`Available modes: ${Object.keys(modeConfigs).join(', ')}`)
  process.exit(1)
}

const includeFiles = config.files

const printSection = (title, body) => {
  console.log(`\n\n## ${title}\n`)
  console.log(body.trimEnd())
}

printSection('How to use', [
  `Mode: ${mode}`,
  `Purpose: ${config.description}`,
  `Command: ${config.command}`,
  `Available modes: ${Object.keys(modeConfigs).join(', ')}`,
  'Paste this whole output into Gemini Web at the start of a coding session.',
  'Use mode-specific context before pasting the task so Gemini sees the relevant source and test files.',
  'Required read order: GEMINI.md, docs/VIBE_CODING_GUIDE.md, docs/UI_GUIDE.md, docs/GEMINI_TASK_TEMPLATE.md, docs/PROJECT_CONTEXT.md, docs/SESSION_STATE.md.',
  'For CI, E2E, deployment, or workflow changes, also read docs/CI_CD.md.',
  'Do not change localStorage keys, existing customer/history data contracts, requested scope, or UI flows unless the task explicitly asks.',
  'Do not add native alert/confirm/prompt, new button styles, new color palettes, or unrelated refactors.',
  'Ask it to follow GEMINI.md and update docs/SESSION_STATE.md when it finishes.',
].join('\n'))

printSection('Project file map', mode === 'full' ? walk(root).join('\n') : includeFiles.join('\n'))

printSection('Included file bodies', includeFiles.join('\n'))

for (const file of includeFiles) {
  const fullPath = join(root, file)
  if (!existsSync(fullPath)) continue
  printSection(file, readFileSync(fullPath, 'utf8'))
}
