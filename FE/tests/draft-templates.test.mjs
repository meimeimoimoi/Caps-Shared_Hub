import test from 'node:test'
import assert from 'node:assert/strict'
import { toTemplateVersion } from '../src/features/drafting/api/templateMappers.ts'

test('a published template becomes the version drafts pin, with its fields', () => {
  const version = toTemplateVersion(
    {
      id: 'tpl-1',
      code: '03/TNDN',
      name: 'Tờ khai quyết toán thuế TNDN',
      description: null,
      versionId: 'old-version',
      versionNo: 1,
      updatedAt: '2026-11-06T03:00:00Z',
    },
    {
      templateId: 'tpl-1',
      templateVersionId: 'ver-2',
      versionNo: 2,
      fieldSchema: [
        { id: 'revenue', label: 'Doanh thu', group: 'Kết quả', type: 'money' },
      ],
    }
  )
  // The schema call is the later read, so its version wins over the list
  assert.equal(version.id, 'ver-2')
  assert.equal(version.version, 2)
  assert.equal(version.templateId, 'tpl-1')
  assert.equal(version.status, 'ACTIVE')
  assert.equal(version.category, '03/TNDN')
  assert.equal(version.description, '')
  assert.equal(version.fields[0].type, 'money')
  assert.equal(version.fields[0].required, true)
})
