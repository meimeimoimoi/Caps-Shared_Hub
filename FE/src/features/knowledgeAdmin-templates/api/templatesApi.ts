import { api } from '@/lib/api-client'
import { isExpertDemo } from '@/lib/expert-data-source'
import type { ManagedTemplate, NewTemplateInput } from '../types'

/* Quản lý template cho Knowledge Admin. Dev chạy demo thì đọc fixtures; mutation demo sửa thẳng fixtures.
 * TODO(api): BE chưa có API quản lý template (DRAFTING.md chỉ có API đọc cho người soạn nháp). */
const fixtures = () => import('./fixtures')
const BASE = '/api/knowledge/templates'

export async function getTemplates(signal?: AbortSignal) {
  if (isExpertDemo) return structuredClone((await fixtures()).mockTemplates)
  return api.get<ManagedTemplate[]>(BASE, { signal })
}

export async function getTemplate(id: string, signal?: AbortSignal): Promise<ManagedTemplate | null> {
  if (isExpertDemo) {
    const tpl = (await fixtures()).mockTemplates.find((x) => x.id === id)
    return tpl ? structuredClone(tpl) : null
  }
  return api.get<ManagedTemplate>(`${BASE}/${id}`, { signal })
}

/** Tạm ngưng / kích hoạt lại; bản nháp đang ghim phiên bản cũ không bị ảnh hưởng */
export async function setTemplateStatus(id: string, status: ManagedTemplate['status'], actor: string) {
  if (isExpertDemo) {
    const tpl = (await fixtures()).mockTemplates.find((x) => x.id === id)
    if (!tpl) return
    tpl.status = status
    tpl.history.unshift({
      at: new Date().toISOString(),
      actor,
      text: status === 'ACTIVE' ? 'Kích hoạt lại template' : 'Tạm ngưng template',
    })
    return
  }
  await api.put(`${BASE}/${id}/status`, { status })
}

/** Tạo template mới: phát hành v1 ở trạng thái Tạm ngưng để admin kiểm tra trước khi người dùng thấy */
export async function createTemplate(input: NewTemplateInput, actor: string): Promise<string> {
  if (isExpertDemo) {
    const list = (await fixtures()).mockTemplates
    const at = new Date().toISOString()
    const id = `tpl-${Date.now().toString(36)}`
    list.unshift({
      id,
      title: input.title,
      description: input.description,
      category: input.category,
      status: 'INACTIVE',
      versions: [
        { id: `${id}-v1`, version: 1, publishedAt: at, publishedBy: actor, changelog: input.changelog, fields: input.fields, workspaces: 0 },
      ],
      history: [{ at, actor, text: 'Tạo template, phát hành v1 (đang tạm ngưng)' }],
    })
    return id
  }
  const { id } = await api.post<{ id: string }>(BASE, input)
  return id
}
