import assert from 'node:assert/strict'
import test from 'node:test'
import { foldVietnamese, waitedDays } from './applications.ts'

test('folds Vietnamese diacritics and đ for search', () => {
  assert.equal(foldVietnamese('Nguyễn Minh Anh'), 'nguyen minh anh')
  assert.equal(foldVietnamese('Đỗ Văn Khánh'), 'do van khanh')
  assert.ok(
    foldVietnamese('Trịnh Bảo Ngọc').includes(foldVietnamese('bảo ngoc'))
  )
})

test('counts whole waited days', () => {
  const now = new Date('2026-09-27T12:00:00Z').getTime()
  assert.equal(waitedDays('2026-09-19T12:00:00Z', now), 8)
  assert.equal(waitedDays('2026-09-27T00:00:00Z', now), 0)
})
