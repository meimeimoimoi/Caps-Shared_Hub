import { api } from '@/lib/api-client'
import { isKnowledgeDemo } from '@/lib/knowledge-data-source'
import type { ManagedTemplate, NewTemplateInput } from '../types'
import {
  fromAdminSummary,
  fromAdminTemplate,
  type AdminTemplateDto,
  type AdminTemplateSummaryDto,
} from './mappers'

/* Quản lý template cho Knowledge Admin. Dev chạy demo thì đọc fixtures; mutation demo sửa thẳng fixtures.
 * API mode uses the workflow admin endpoints (permission KnowledgeManage). */
const fixtures = () => import('./fixtures')
const ADMIN = '/api/v1/admin/templates'

interface Envelope<T> {
  success: boolean
  data: T
  message?: string
}

export async function getTemplates(signal?: AbortSignal) {
  if (isKnowledgeDemo) return structuredClone((await fixtures()).mockTemplates)
  const res = await api.get<Envelope<AdminTemplateSummaryDto[]>>(ADMIN, {
    signal,
  })
  return res.data.map(fromAdminSummary)
}

export async function getTemplate(
  id: string,
  signal?: AbortSignal
): Promise<ManagedTemplate | null> {
  if (isKnowledgeDemo) {
    const tpl = (await fixtures()).mockTemplates.find((x) => x.id === id)
    return tpl ? structuredClone(tpl) : null
  }
  const res = await api.get<Envelope<AdminTemplateDto>>(
    `${ADMIN}/${encodeURIComponent(id)}`,
    { signal }
  )
  return fromAdminTemplate(res.data)
}

/** The sample .docx of one version, drafts included (only when the version hasFile) */
export async function getTemplateFile(
  id: string,
  versionId: string,
  signal?: AbortSignal
) {
  const blob = await api.get<Blob>(
    `${ADMIN}/${encodeURIComponent(id)}/versions/${encodeURIComponent(versionId)}/file`,
    { responseType: 'blob', signal, timeout: 60_000 }
  )
  return new File([blob], 'template.docx', { type: blob.type })
}

/** Publishes the newest draft; the version users saw before becomes DEPRECATED */
export async function publishTemplate(id: string) {
  await api.post(`${ADMIN}/${encodeURIComponent(id)}/publish`)
}

/** Tạm ngưng / kích hoạt lại; bản nháp đang ghim phiên bản cũ không bị ảnh hưởng */
export async function setTemplateStatus(
  id: string,
  status: ManagedTemplate['status'],
  actor: string
) {
  if (isKnowledgeDemo) {
    const tpl = (await fixtures()).mockTemplates.find((x) => x.id === id)
    if (!tpl) return
    tpl.status = status
    tpl.history.unshift({
      at: new Date().toISOString(),
      actor,
      text:
        status === 'ACTIVE' ? 'Kích hoạt lại template' : 'Tạm ngưng template',
    })
    return
  }
  // A template is activated by publishing its draft; the server cannot hide a published one yet
  if (status === 'ACTIVE') return publishTemplate(id)
  throw new Error('Chức năng tạm ngưng template chưa được kết nối với máy chủ.')
}

/** Puts the sample .docx on the template's draft version; the server refuses when there is no draft */
export async function uploadTemplateFile(id: string, file: File) {
  const form = new FormData()
  form.append('file', file)
  await api.put(`${ADMIN}/${encodeURIComponent(id)}/file`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 60_000,
  })
}

/** Saves the fields as the template's draft, then uploads the sample .docx to that draft; users see it once published */
export async function createTemplate(
  file: File | null,
  input: NewTemplateInput,
  actor: string
): Promise<string> {
  if (isKnowledgeDemo) {
    const list = (await fixtures()).mockTemplates
    const at = new Date().toISOString()
    const id = `tpl-${Date.now().toString(36)}`
    list.unshift({
      id,
      code: input.code,
      title: input.title,
      description: input.description,
      category: input.category,
      status: 'INACTIVE',
      versions: [
        {
          id: `${id}-v1`,
          version: 1,
          publishedAt: at,
          publishedBy: actor,
          changelog: input.changelog,
          fileName: input.fileName,
          fields: input.fields,
          workspaces: 0,
        },
      ],
      history: [
        {
          at,
          actor,
          text: input.fileName
            ? `Tải lên ${input.fileName}, phát hành v1 (đang tạm ngưng)`
            : 'Tạo template, phát hành v1 (đang tạm ngưng)',
        },
      ],
    })
    return id
  }
  const res = await api.post<Envelope<{ templateId: string }>>(ADMIN, {
    code: input.code,
    name: input.title,
    description: input.description,
    fieldSchema: input.fields,
  })
  const id = res.data.templateId
  if (file) {
    // Saving again overwrites the same draft, so a retry after a failed upload is safe
    await uploadTemplateFile(id, file).catch((err: Error) => {
      throw new Error(
        `Đã lưu các trường nhưng chưa tải được file mẫu (${err.message}). Bấm Tạo template lần nữa để thử lại.`
      )
    })
  }
  return id
}
