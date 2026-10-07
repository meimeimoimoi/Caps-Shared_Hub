import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { cn, formatDayMonth } from '@/lib/utils'
import { StatusBadge } from '@/components/ui/display/status-badge'
import { KnowledgeLayout } from '@/app/layouts/knowledge/KnowledgeLayout'
import { useKnowledgeNav } from '@/app/layouts/knowledge/useKnowledgeNav'
import { TEMPLATE_CATEGORY, TEMPLATE_STATUS } from '../../features/knowledgeAdmin-templates/constants'
import { useTemplates } from '../../features/knowledgeAdmin-templates/hooks/useTemplates'

const rowCls = 'border-border-subtle border-t [&>td]:px-4 [&>td]:py-3'
const headCls = 'bg-sunken text-fg-muted [&>th]:px-4 [&>th]:py-3 [&>th]:font-semibold'

/* Danh sách template soạn nháp: mỗi dòng là một template với phiên bản đang phát hành */
export default function KnowledgeTemplatesPage() {
  const nav = useKnowledgeNav()
  const { data = [], isLoading, error } = useTemplates()
  const [category, setCategory] = useState<string | null>(null)
  useEffect(() => {
    document.title = 'Template | Shared Hub'
  }, [])

  const rows = data.filter((tpl) => !category || tpl.category === category)

  return (
    <KnowledgeLayout {...nav} section="templates" breadcrumb="Template">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <h1 className="text-h1">Template</h1>
        <Link to="/knowledge/templates/new" className="btn btn-press btn-primary no-underline">
          <Plus size={16} aria-hidden="true" />
          Tạo template
        </Link>
      </div>
      <p className="text-fg-muted mt-3 max-w-[65ch]">
        Mẫu văn bản người dùng chọn khi soạn nháp. Mỗi bản nháp giữ nguyên phiên bản template lúc tạo, nên tạm ngưng hay
        phát hành phiên bản mới không làm đổi bản nháp đang có.
      </p>

      <div role="group" aria-label="Lọc theo nhóm" className="mt-8 flex flex-wrap gap-2">
        {[null, ...Object.keys(TEMPLATE_CATEGORY)].map((c) => (
          <button
            key={c ?? 'all'}
            type="button"
            aria-pressed={category === c}
            onClick={() => setCategory(c)}
            className={cn(
              'rounded-control border px-3 py-1.5 text-sm transition-colors',
              category === c
                ? 'bg-selected text-on-selected border-transparent font-semibold'
                : 'border-border-control text-fg-muted hover:text-fg-strong'
            )}
          >
            {c ? TEMPLATE_CATEGORY[c] : 'Tất cả'}
          </button>
        ))}
      </div>

      <section className="paper mt-4 overflow-x-auto">
        <table className="w-full min-w-200 text-sm">
          <thead>
            <tr className={headCls}>
              <th className="text-left">Template</th>
              <th className="text-left">Phiên bản</th>
              <th className="text-left">Trạng thái</th>
              <th className="text-right">Trường</th>
              <th className="text-right">Bản nháp đang dùng</th>
              <th className="text-right">Phát hành</th>
              <th>
                <span className="sr-only">Thao tác</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((tpl) => {
              const cur = tpl.versions[0]
              return (
                <tr key={tpl.id} className={rowCls}>
                  <td>
                    <p className="text-fg-strong">{tpl.title}</p>
                    <p className="text-fg-muted text-caption">{TEMPLATE_CATEGORY[tpl.category] ?? tpl.category}</p>
                  </td>
                  <td className="num">v{cur.version}</td>
                  <td>
                    <StatusBadge status={TEMPLATE_STATUS[tpl.status]} />
                  </td>
                  <td className="num text-right">{cur.fields.length || '—'}</td>
                  <td className="num text-right">{tpl.versions.reduce((s, v) => s + v.workspaces, 0)}</td>
                  <td className="num text-fg-muted text-right">{formatDayMonth(cur.publishedAt)}</td>
                  <td className="text-right">
                    <Link
                      to={`/knowledge/templates/${tpl.id}`}
                      aria-label={`Xem chi tiết template ${tpl.title}`}
                      className="btn btn-press btn-secondary no-underline"
                    >
                      Xem chi tiết
                    </Link>
                  </td>
                </tr>
              )
            })}
            {rows.length === 0 && (
              <tr className="border-border-subtle border-t">
                <td colSpan={7} className="text-fg-muted px-4 py-10 text-center">
                  {isLoading ? 'Đang tải…' : (error?.message ?? 'Không có template nào trong nhóm này.')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </KnowledgeLayout>
  )
}
