import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ChevronRight, CircleAlert, CircleCheck, CircleX, TriangleAlert } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface AttentionItem {
  text: string
  to: string
  /** danger = đang hỏng (lỗi, tiền kẹt), warning = sắp/đã quá hạn; bỏ trống = cảnh báo nhẹ */
  tone?: 'danger' | 'warning'
}

/* Màu, icon, chữ theo mức độ: icon khác hình nên không chỉ dựa vào màu */
const TONE = {
  danger: { Icon: CircleX, icon: 'text-danger', text: 'text-fg-strong font-semibold' },
  warning: { Icon: TriangleAlert, icon: 'text-warning', text: 'text-fg-strong font-semibold' },
  info: { Icon: CircleAlert, icon: 'text-fg-muted', text: 'text-fg' },
}

/* "Cần xử lý ngay": khác hẳn các thẻ khác khi có việc gấp (viền trái theo mức nặng nhất + số việc),
 * trở về khung thường kèm dấu tích khi không có gì */
export function AttentionList({ items, loading }: { items: AttentionItem[]; loading: boolean }) {
  const { t } = useTranslation('admin')
  const worst = items.some((a) => a.tone === 'danger')
    ? 'border-l-danger'
    : items.some((a) => a.tone === 'warning')
      ? 'border-l-warning'
      : null
  return (
    <section className={cn('paper mt-8', worst && ['border-l-4', worst])} aria-labelledby="dash-attention">
      <div className="flex items-center gap-3 px-5 pt-5">
        <h2 id="dash-attention" className="text-h2">
          {t('dashboard.attention.title')}
        </h2>
        {items.length > 0 && (
          <span className="bg-sunken text-fg-strong num rounded-full px-2.5 py-0.5 text-sm font-semibold">
            {t('dashboard.attention.count', { count: items.length })}
          </span>
        )}
      </div>
      {items.length === 0 ? (
        <p className="text-fg-muted flex items-center gap-2 px-5 py-6 text-sm">
          {!loading && <CircleCheck size={16} aria-hidden="true" className="text-success shrink-0" />}
          {loading ? t('dashboard.loading') : t('dashboard.attention.empty')}
        </p>
      ) : (
        <ul className="divide-border-subtle mt-3 divide-y">
          {items.map((a) => {
            const tone = TONE[a.tone ?? 'info']
            return (
              <li key={a.to + a.text}>
                <Link
                  to={a.to}
                  className="hover:bg-desk-2 flex items-center gap-3 px-5 py-3 text-sm no-underline transition-colors"
                >
                  <tone.Icon size={16} aria-hidden="true" className={cn('shrink-0', tone.icon)} />
                  <span className={cn('flex-1', tone.text)}>{a.text}</span>
                  <ChevronRight size={16} aria-hidden="true" className="text-fg-muted shrink-0" />
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
