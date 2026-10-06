import { readdir, readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const source = fileURLToPath(new URL('../src/', import.meta.url))
const violations = []
const definitions = new Set()
const references = new Set()

async function inspect(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const filename = path.join(directory, entry.name)
    if (entry.isDirectory()) {
      await inspect(filename)
      continue
    }
    if (!/\.(css|tsx)$/.test(filename)) continue
    const relative = path.relative(source, filename).replaceAll('\\', '/')
    const content = await readFile(filename, 'utf8')
    for (const match of content.matchAll(/(--ui-[\w-]+)\s*:/g))
      definitions.add(match[1])
    for (const match of content.matchAll(/var\((--ui-[\w-]+)/g))
      references.add(match[1])
    if (relative === 'styles/theme.css') continue
    content.split('\n').forEach((line, index) => {
      // Only actual logo/flag artwork is exempt, not its surrounding UI.
      const artwork =
        relative === 'components/auth/GoogleIcon.tsx' ||
        (relative.endsWith('/AccountCreation.tsx') &&
          /fill="#(?:da251d|ffff00)"/.test(line))
      if (/var\(--[\w-]*var\(/.test(line))
        violations.push(
          `${relative}:${index + 1}: malformed CSS variable reference`
        )
      if (!artwork && /#[\da-fA-F]{3,8}\b|(?:rgba?|hsla?)\(\s*\d/.test(line))
        violations.push(
          `${relative}:${index + 1}: move UI color to styles/theme.css`
        )
      if (
        /font-family:\s*(?!var\(|inherit)[\w'"]/.test(line) ||
        /font-\[(?:Arial|Georgia)|font-family:(?:Geist|'Plus_Jakarta)/.test(
          line
        )
      )
        violations.push(`${relative}:${index + 1}: use shared font tokens`)
    })
  }
}

await inspect(source)
for (const reference of references) {
  if (!definitions.has(reference))
    violations.push(`Undefined semantic token: ${reference}`)
}
if (violations.length) {
  console.error(violations.join('\n'))
  process.exitCode = 1
} else {
  console.log(
    'Shared UI color/font configuration passed; semantic token references resolve.'
  )
}
