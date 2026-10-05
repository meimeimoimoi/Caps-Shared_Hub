import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const root = fileURLToPath(new URL('../src/', import.meta.url))
const errors = []
const dependencies = new Map()

async function walk(directory) {
  const files = []
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const location = path.join(directory, entry.name)
    if (entry.isDirectory()) files.push(...await walk(location))
    else if (/\.(tsx?|mjs)$/.test(entry.name)) files.push(location)
  }
  return files
}

for (const file of await walk(root)) {
  const relative = path.relative(root, file).replaceAll('\\', '/')
  const sourceParts = relative.split('/')
  if (sourceParts[0] === 'shared' || (sourceParts[0] === 'features' && ['model', 'pages'].includes(sourceParts[2]))) {
    errors.push(`${relative}: use the team's components/hooks/store/api/types structure; screens belong in src/pages`)
  }
  const sourceFeature = sourceParts[0] === 'features' ? sourceParts[1] : undefined
  const source = ts.createSourceFile(file, await readFile(file, 'utf8'), ts.ScriptTarget.Latest, true)

  function inspect(node) {
    let specifier
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) specifier = node.moduleSpecifier
    else if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) specifier = node.arguments[0]
    if (specifier && ts.isStringLiteral(specifier)) {
      const value = specifier.text
      const target = value.startsWith('@/') ? path.join(root, value.slice(2))
        : value.startsWith('.') ? path.resolve(path.dirname(file), value) : undefined
      if (target) {
        const targetParts = path.relative(root, target).replaceAll('\\', '/').split('/')
        const targetFeature = targetParts[0] === 'features' ? targetParts[1] : undefined
        const fail = (message) => errors.push(`${relative}: ${value} — ${message}`)
        const common = ['lib', 'hooks', 'types', 'utils'].includes(sourceParts[0]) || (sourceParts[0] === 'components' && sourceParts[1] === 'ui')
        if (common && ['features', 'app', 'pages'].includes(targetParts[0])) fail('common modules must not depend on screens or business features')
        if (sourceFeature && ['app', 'pages'].includes(targetParts[0])) fail('features must not depend on application composition or screens')
        if (value.startsWith('@/shared/') || /(?:^|\/)model(?:\/|$)/.test(value)) fail('obsolete shared/model import')
        if (targetFeature && targetFeature !== sourceFeature) {
          if (sourceFeature) {
            if (!dependencies.has(sourceFeature)) dependencies.set(sourceFeature, new Set())
            dependencies.get(sourceFeature).add(targetFeature)
          }
        }
      }
    }
    ts.forEachChild(node, inspect)
  }
  inspect(source)
}

function visit(feature, trail = []) {
  if (trail.includes(feature)) {
    errors.push(`Circular feature dependency: ${[...trail, feature].join(' -> ')}`)
    return
  }
  for (const dependency of dependencies.get(feature) ?? []) visit(dependency, [...trail, feature])
}
for (const feature of dependencies.keys()) visit(feature)

if (errors.length) {
  console.error(errors.join('\n'))
  process.exitCode = 1
} else console.log('Architecture boundaries passed.')
