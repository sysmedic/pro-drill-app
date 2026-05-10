import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const root = process.cwd()

const includeFiles = [
  'GEMINI.md',
  'docs/VIBE_CODING_GUIDE.md',
  'docs/PROJECT_CONTEXT.md',
  'docs/SESSION_STATE.md',
  'docs/CI_CD.md',
  'package.json',
  'vite.config.js',
  'playwright.config.js',
  'eslint.config.js',
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

const printSection = (title, body) => {
  console.log(`\n\n## ${title}\n`)
  console.log(body.trimEnd())
}

printSection('How to use', [
  'Paste this whole output into Gemini Web at the start of a coding session.',
  'Ask it to follow GEMINI.md and update docs/SESSION_STATE.md when it finishes.',
].join('\n'))

printSection('Project file map', walk(root).join('\n'))

for (const file of includeFiles) {
  const fullPath = join(root, file)
  if (!existsSync(fullPath)) continue
  printSection(file, readFileSync(fullPath, 'utf8'))
}
