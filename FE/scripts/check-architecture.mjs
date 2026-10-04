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
        if (sourceParts[0] === 'shared' && targetParts[0] !== 'shared') fail('shared must only depend on shared')
        if (sourceFeature && targetParts[0] === 'app') fail('features must not depend on app')
        if (sourceFeature && targetFeature === sourceFeature && value.startsWith('@/')) fail('use relative imports inside a feature')
        if (targetFeature && targetFeature !== sourceFeature) {
          const entry = targetParts.slice(2).join('/')
          if (entry && !/^index(?:\.ts)?$/.test(entry)) fail('use the feature public entry point')
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
