import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ChevronRight, CircleAlert, TriangleAlert } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface AttentionItem {
  text: string
  to: string
  urgent?: boolean
}

/* "Cần xử lý ngay": mỗi việc gấp là một link tới màn xử lý, việc khẩn có icon cảnh báo */
export function AttentionList({ items, loading }: { items: AttentionItem[]; loading: boolean }) {
  const { t } = useTranslation('admin')
  return (
    <section className="paper mt-8" aria-labelledby="dash-attention">
      <h2 id="dash-attention" className="text-h2 px-5 pt-5">
        {t('dashboard.attention.title')}
      </h2>
      {items.length === 0 ? (
        <p className="text-fg-muted px-5 py-6 text-sm">
          {loading ? t('dashboard.loading') : t('dashboard.attention.empty')}
        </p>
      ) : (
        <ul className="divide-border-subtle mt-3 divide-y">
          {items.map((a) => (
            <li key={a.to}>
              <Link
                to={a.to}
                className="hover:bg-desk-2 flex items-center gap-3 px-5 py-3 text-sm no-underline transition-colors"
              >
                {a.urgent ? (
                  <TriangleAlert size={16} aria-hidden="true" className="text-warning shrink-0" />
                ) : (
                  <CircleAlert size={16} aria-hidden="true" className="text-fg-muted shrink-0" />
                )}
                <span className={cn('flex-1', a.urgent ? 'text-fg-strong font-semibold' : 'text-fg')}>{a.text}</span>
                <ChevronRight size={16} aria-hidden="true" className="text-fg-muted shrink-0" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
