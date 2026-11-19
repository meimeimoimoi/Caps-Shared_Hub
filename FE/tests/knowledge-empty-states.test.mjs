import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

const require = createRequire(import.meta.url)
const root = fileURLToPath(new URL('../src/', import.meta.url))
const messages = JSON.parse(
  fs.readFileSync(path.join(root, 'lib/i18n/locales/vi/knowledge.json'), 'utf8')
)
const translate = (key) =>
  key.split('.').reduce((value, part) => value?.[part], messages) ?? key

// Render the real page branches with controlled API results, without a browser or server.
function renderPage(name, overrides = {}) {
  const cache = new Map()
  const mocks = {
    KnowledgeLayout: ({ children }) =>
      React.createElement('main', null, children),
    useKnowledgeNav: () => ({}),
    useMotion: () => null,
    useNavToast: () => ({ toast: null }),
    useTemplates: () => ({ data: [], isLoading: false }),
    useManagedTemplate: () => ({
      template: { title: 'Test template', versions: [] },
    }),
    useReviewQueue: () => ({
      rows: [],
      total: 0,
      query: '',
      setQuery() {},
      isLoading: false,
    }),
    useCollection: () => ({
      data: { sources: [], runs: [], schedule: null },
      isLoading: false,
    }),
    useDocumentReview: () => ({ review: null, isLoading: false }),
    useDocumentDetail: () => ({ data: null, isLoading: false }),
    useVersionReview: () => ({ comparison: null, isLoading: false }),
    TemplatePreview: () => null,
    openOriginal: () => {},
    ...overrides,
  }
  function load(filename) {
    if (cache.has(filename)) return cache.get(filename).exports
    const module = { exports: {} }
    cache.set(filename, module)
    const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        jsx: ts.JsxEmit.ReactJSX,
        esModuleInterop: true,
      },
    }).outputText
    const localRequire = (specifier) => {
      if (specifier === 'react-router-dom')
        return {
          Link: ({ to, children, ...props }) =>
            React.createElement('a', { ...props, href: to }, children),
          useParams: () => ({ id: 'test' }),
          useSearchParams: () => [new URLSearchParams(), () => {}],
          useNavigate: () => () => {},
        }
      if (specifier === 'react-i18next')
        return { useTranslation: () => ({ t: translate }) }
      if (specifier.endsWith('/useTemplates'))
        return {
          useTemplates: mocks.useTemplates,
          useManagedTemplate: mocks.useManagedTemplate,
        }
      if (specifier === '@/lib/utils')
        return {
          cn: (...args) => args.filter(Boolean).join(' '),
          formatDayMonth: () => 'date',
        }
      const mocked = Object.keys(mocks).filter(
        (key) =>
          specifier.endsWith('/' + key) ||
          (specifier.endsWith('/motion') && key === 'useMotion')
      )
      if (mocked.length)
        return Object.fromEntries(mocked.map((key) => [key, mocks[key]]))
      if (!specifier.startsWith('.') && !specifier.startsWith('@/'))
        return require(specifier)
      const target = specifier.startsWith('@/')
        ? path.join(root, specifier.slice(2))
        : path.resolve(path.dirname(filename), specifier)
      const resolved = [
        target + '.tsx',
        target + '.ts',
        path.join(target, 'index.ts'),
      ].find(fs.existsSync)
      return load(resolved)
    }
    vm.runInThisContext(`(function(require,module,exports){${source}\n})`, {
      filename,
    })(localRequire, module, module.exports)
    return module.exports
  }
  return renderToStaticMarkup(
    React.createElement(
      load(path.join(root, 'pages/knowledge-admin', name + '.tsx')).default
    )
  )
}

test('templates without versions render safely in the list and detail', () => {
  const detail = renderPage('KnowledgeTemplatePage')
  assert.match(detail, /Template chưa có phiên bản/)
  assert.match(detail, /href="\/knowledge\/templates"/)
  assert.doesNotMatch(detail, /Phát hành v/)
  const list = renderPage('KnowledgeTemplatesPage', {
    useTemplates: () => ({
      data: [
        {
          id: 'test',
          title: 'Test',
          category: 'OTHER',
          status: 'INACTIVE',
          versions: [],
        },
      ],
    }),
  })
  assert.match(list, /Chưa có phiên bản/)
})

test('empty document storage offers upload; unmatched search offers clearing the search', () => {
  assert.match(renderPage('KnowledgeDocumentsPage'), /Tải tài liệu lên/)
  const search = renderPage('KnowledgeDocumentsPage', {
    useReviewQueue: () => ({
      rows: [],
      total: 2,
      query: 'unmatched',
      setQuery() {},
    }),
  })
  assert.match(search, /Không có văn bản khớp với tìm kiếm/)
  assert.match(search, /Xóa tìm kiếm/)
  assert.doesNotMatch(search, /Chưa có văn bản trong kho/)
})

test('empty sources and history explain the next step and disable collection', () => {
  const html = renderPage('KnowledgeSourcesPage')
  assert.match(html, /Chưa có nguồn thu thập/)
  assert.match(html, /Chưa có lịch sử thu thập/)
  assert.match(html, /disabled=""[^>]*>Chạy thu thập ngay/)
  assert.match(html, /Thêm nguồn/)
})

test('missing review, document and comparison include a route back', () => {
  for (const [name, route] of [
    ['KnowledgeReviewPage', 'queue'],
    ['KnowledgeDocumentPage', 'documents'],
    ['KnowledgeVersionPage', 'queue'],
  ]) {
    const html = renderPage(name)
    assert.match(html, new RegExp(`href="/knowledge/${route}"`))
    assert.match(html, /Quay lại/)
  }
})

test('API errors are not presented as empty storage', () => {
  const html = renderPage('KnowledgeDocumentsPage', {
    useReviewQueue: () => ({
      rows: [],
      total: 0,
      query: '',
      error: new Error('API unavailable'),
    }),
  })
  assert.match(html, /API unavailable/)
  assert.doesNotMatch(html, /Chưa có văn bản trong kho/)
})

test('empty queue offers upload and collection source configuration', () => {
  const html = renderPage('KnowledgeQueuePage')
  assert.match(html, /Không có văn bản ở bước này/)
  assert.match(html, /Tải tài liệu lên/)
  assert.match(html, /Cấu hình nguồn thu thập/)
})
