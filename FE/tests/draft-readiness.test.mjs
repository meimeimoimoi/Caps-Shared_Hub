import test from 'node:test'
import assert from 'node:assert/strict'
import { toAssessment } from '../src/features/drafting/api/readiness.ts'

const citations = [
  { document_number: '78/2014/TT-BTC' },
  { document_number: '96/2015/TT-BTC' },
]

test('the BE verdict is shown instead of a fixed READY_WITH_WARNINGS', () => {
  for (const result of ['READY', 'READY_WITH_WARNINGS', 'NOT_READY']) {
    assert.equal(toAssessment(result, [], citations).result, result)
  }
})

test('issues keep severity, type and description; blocking ones come first', () => {
  const a = toAssessment(
    'NOT_READY',
    [
      {
        code: 'MISSING_OPTIONAL_FIELD',
        type: 'TEMPLATE_COMPLETENESS',
        severity: 'WARNING',
        description: 'Thiếu thông tin tùy chọn',
        fieldId: 'note',
      },
      {
        code: 'FABRICATED_LEGAL_BASIS',
        type: 'GROUNDING_ISSUE',
        severity: 'BLOCKING',
        description: 'Căn cứ không có trong kho',
      },
    ],
    citations
  )
  assert.deepEqual(
    a.issues.map((i) => [i.severity, i.type, i.message]),
    [
      ['blocking', 'GROUNDING_ISSUE', 'Căn cứ không có trong kho'],
      ['warning', 'TEMPLATE_COMPLETENESS', 'Thiếu thông tin tùy chọn'],
    ]
  )
  assert.equal(a.issues[1].fieldId, 'note')
  assert.equal(new Set(a.issues.map((i) => i.id)).size, 2)
})

test('a citation issue points at the citation shown in the draft', () => {
  const issue = (citationId) => ({
    code: 'INCOMPLETE_CITATION_METADATA',
    type: 'CITATION_TRACEABILITY',
    severity: 'WARNING',
    description: 'x',
    citationId,
  })
  const a = toAssessment(
    'READY_WITH_WARNINGS',
    [issue('96/2015/TT-BTC'), issue('0'), issue('unknown')],
    citations
  )
  assert.deepEqual(
    a.issues.map((i) => i.citationId),
    ['1', '0', undefined]
  )
})

test('versions assessed before PR #109 keep the old neutral verdict', () => {
  const legacy = toAssessment('AI_GENERATED_UNAUTHORIZED_NUMBERS', null, [])
  assert.equal(legacy.result, 'READY_WITH_WARNINGS')
  assert.equal(legacy.issues[0].id, 'unverified-numbers')
  assert.deepEqual(toAssessment(null, null, []).issues, [])
})
