import test from 'node:test'
import assert from 'node:assert/strict'
import { lineDiff } from '../src/features/review-case/components/fieldText.ts'

const render = (d) => d.map((l) => l.kind + l.text)

test('an edited line shows as removed then added, the rest stays', () => {
  assert.deepEqual(
    render(lineDiff('Thuế suất 20%\nB4: 0\nGhi chú', 'Thuế suất 17%\nB4: 0\nGhi chú')),
    ['-Thuế suất 20%', '+Thuế suất 17%', ' B4: 0', ' Ghi chú']
  )
})

test('a new field is all added, a removed one all removed', () => {
  assert.deepEqual(render(lineDiff('', 'a\nb')), ['+a', '+b'])
  assert.deepEqual(render(lineDiff('a', '')), ['-a'])
})

test('an inserted line keeps the lines around it', () => {
  assert.deepEqual(render(lineDiff('a\nc', 'a\nb\nc')), [' a', '+b', ' c'])
})
