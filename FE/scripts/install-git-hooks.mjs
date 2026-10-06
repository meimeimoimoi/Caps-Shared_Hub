import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

if (process.env.CI) {
  console.log(
    '[FE hooks] CI runs checks directly; local hook installation skipped.'
  )
  process.exit(0)
}

const cwd = fileURLToPath(new URL('../', import.meta.url))
const root = spawnSync('git', ['rev-parse', '--show-toplevel'], {
  cwd,
  encoding: 'utf8',
})
if (root.status !== 0) {
  console.log('[FE hooks] Not a Git checkout; hook installation skipped.')
  process.exit(0)
}
const current = spawnSync('git', ['config', '--get', 'core.hooksPath'], {
  cwd,
  encoding: 'utf8',
}).stdout.trim()
if (current && current !== '.githooks') {
  console.error(
    `[FE hooks] Existing hooksPath '${current}' was preserved. Integrate the FE pre-commit check into your existing hooks.`
  )
  process.exit(1)
}
const installed = spawnSync(
  'git',
  ['config', '--local', 'core.hooksPath', '.githooks'],
  {
    cwd,
    stdio: 'inherit',
  }
)
if (installed.status !== 0) process.exit(1)
console.log('[FE hooks] Installed pre-commit checks for this clone.')
