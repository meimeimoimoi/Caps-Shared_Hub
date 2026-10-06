import { spawnSync } from 'node:child_process'
import { access, mkdtemp, rm, symlink } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const frontend = fileURLToPath(new URL('../', import.meta.url))
const repository = path.dirname(frontend.replace(/[\\/]$/, ''))
const checks = [
  'check-architecture.mjs',
  'check-i18n.mjs',
  'check-ui-config.mjs',
]
const all = process.argv.includes('--all')
let snapshot

function git(args, options = {}) {
  const result = spawnSync('git', args, {
    cwd: repository,
    encoding: 'utf8',
    ...options,
  })
  if (result.status !== 0)
    throw new Error(
      result.stderr || result.error?.message || 'Git operation failed'
    )
  return result.stdout
}

try {
  let directory = frontend
  if (!all) {
    const changed = git([
      'diff',
      '--cached',
      '--name-only',
      '-z',
      '--diff-filter=ACDMRTUXB',
    ]).split('\0')
    if (
      !changed.some(
        (name) => name.startsWith('FE/') || name.startsWith('.githooks/')
      )
    ) {
      console.log('[FE checks] No staged frontend/hook changes; skipped.')
      process.exit(0)
    }
    await access(path.join(frontend, 'node_modules/typescript/package.json'))
    const files = git(['ls-files', '-z', '--full-name', '--', 'FE'])
      .split('\0')
      .filter(Boolean)
    snapshot = await mkdtemp(path.join(os.tmpdir(), 'shared-hub-commit-'))
    const prefix = snapshot.replaceAll('\\', '/') + '/'
    git(['checkout-index', '--prefix=' + prefix, '-z', '--stdin'], {
      input: files.join('\0') + '\0',
    })
    directory = path.join(snapshot, 'FE')
    await symlink(
      path.join(frontend, 'node_modules'),
      path.join(directory, 'node_modules'),
      process.platform === 'win32' ? 'junction' : 'dir'
    )
    console.log(
      '[FE checks] Checking staged content; unstaged edits are preserved.'
    )
  }

  const failures = []
  for (const check of checks) {
    console.log(`\n[FE checks] ${check}`)
    const result = spawnSync(
      process.execPath,
      [path.join(directory, 'scripts', check)],
      {
        cwd: directory,
        stdio: 'inherit',
      }
    )
    if (result.status !== 0) failures.push(check)
  }
  if (failures.length) {
    console.error(
      `\n[FE checks] ${all ? 'Checks failed' : 'Commit blocked'}: ${failures.join(', ')}. Fix the reported files${all ? '' : ', stage the fixes and commit again'}.`
    )
    process.exitCode = 1
  } else
    console.log(
      `\n[FE checks] All 3 checks passed${all ? '.' : '; commit may proceed.'}`
    )
} catch (error) {
  console.error(
    `[FE checks] Unable to validate: ${error.message}. Run npm install in FE and retry.`
  )
  process.exitCode = 1
} finally {
  if (snapshot) await rm(snapshot, { recursive: true, force: true })
}
