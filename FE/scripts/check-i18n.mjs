import { readFile, readdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = fileURLToPath(new URL('../src/lib/i18n/locales/', import.meta.url))

export function flattenResources(value, prefix = '', output = {}) {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error(`Invalid resource object: ${prefix}`)
  for (const [key, child] of Object.entries(value)) {
    const name = prefix ? `${prefix}.${key}` : key
    if (typeof child === 'string') {
      if (!child.trim()) throw new Error(`Empty translation: ${name}`)
      output[name] = child
    } else flattenResources(child, name, output)
  }
  return output
}

export function compareResources(vi, en) {
  const errors = []
  const plural = /_(zero|one|two|few|many|other)$/
  const logical = (key) => key.replace(plural, '')
  const placeholders = (text) =>
    [...text.matchAll(/{{\s*(-?\s*[\w.]+)(?:\s*,[^}]+)?\s*}}/g)]
      .map((match) => match[1].replace(/\s/g, ''))
      .sort()
      .join(',')
  const groups = {}
  for (const [locale, resource] of Object.entries({ vi, en })) {
    const flat = flattenResources(resource)
    groups[locale] = new Map()
    for (const [key, text] of Object.entries(flat)) {
      const base = logical(key)
      const variants = groups[locale].get(base) ?? []
      variants.push({ key, text, category: key.match(plural)?.[1] })
      groups[locale].set(base, variants)
    }
    const categories = new Intl.PluralRules(locale).resolvedOptions()
      .pluralCategories
    for (const [base, variants] of groups[locale]) {
      const forms = variants.filter((item) => item.category)
      if (forms.length) {
        if (forms.length !== variants.length)
          errors.push(`${locale}: mixed singular/plural key ${base}`)
        for (const category of categories) {
          if (!forms.some((item) => item.category === category))
            errors.push(`${locale}: missing plural ${base}_${category}`)
        }
        for (const form of forms) {
          if (form.category !== 'zero' && !categories.includes(form.category))
            errors.push(`${locale}: unsupported plural ${form.key}`)
        }
      }
    }
  }
  for (const base of new Set([...groups.vi.keys(), ...groups.en.keys()])) {
    const left = groups.vi.get(base)
    const right = groups.en.get(base)
    if (!left || !right) {
      errors.push(`Missing logical key: ${base}`)
      continue
    }
    if (!!left[0].category !== !!right[0].category)
      errors.push(`Plural mismatch: ${base}`)
    const signatures = new Set(
      [...left, ...right].map((item) => placeholders(item.text))
    )
    if (signatures.size !== 1) errors.push(`Placeholder mismatch: ${base}`)
  }
  return errors
}

export async function checkTranslations() {
  const names = await Promise.all(
    ['vi', 'en'].map((locale) => readdir(path.join(root, locale)))
  )
  const namespaces = new Set(
    names.flat().filter((name) => name.endsWith('.json'))
  )
  const errors = []
  for (const namespace of namespaces) {
    if (!names.every((list) => list.includes(namespace))) {
      errors.push(`Missing namespace: ${namespace}`)
      continue
    }
    const [vi, en] = await Promise.all(
      ['vi', 'en'].map(async (locale) =>
        JSON.parse(await readFile(path.join(root, locale, namespace), 'utf8'))
      )
    )
    errors.push(
      ...compareResources(vi, en).map((error) => `${namespace}: ${error}`)
    )
  }
  if (!namespaces.size) errors.push('No translation namespaces found')
  if (errors.length) throw new Error(errors.join('\n'))
  console.log(
    `Translation checks passed (${namespaces.size} migrated namespace).`
  )
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  await checkTranslations()
}
