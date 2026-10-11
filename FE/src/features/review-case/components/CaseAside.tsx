import { useTranslation } from 'react-i18next'
import { FileText, Lock } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ReviewCase } from '../types'
import { fundsOf, useCaseFormat } from '../ui'

export function CaseAside({ c }: { c: ReviewCase }) {
  const { t } = useTranslation('reviewCase')
  const f = useCaseFormat()
  const pkg = c.package
  const funds = fundsOf(c)

  return (
    <aside className="min-w-0 space-y-6">
      <section className="paper p-5" aria-labelledby="pkg-title">
        <div className="flex items-start justify-between gap-3">
          <h2 id="pkg-title" className="eyebrow font-sans">
            {t('package.title')}
          </h2>
          {pkg && (
            <Lock size={15} aria-hidden="true" className="text-fg-strong" />
          )}
        </div>
        {pkg ? (
          <>
            <p className="num text-fg-strong text-h2 mt-2 font-semibold">
              {pkg.version}
            </p>
            <p className="text-fg-muted num text-sm">
              {t('package.locked', { date: f.at(pkg.lockedAt) })}
            </p>
            <dl className="mt-4 space-y-2.5 text-sm">
              {(
                [
                  ['aiDraft', pkg.aiDraft],
                  ['snapshot', pkg.snapshot],
                  ['template', pkg.template],
                  ['citations', String(pkg.citations)],
                ] as const
              ).map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4">
                  <dt className="text-fg-muted shrink-0">
                    {t(`package.${k}`)}
                  </dt>
                  <dd className="text-fg-strong text-right">{v}</dd>
                </div>
              ))}
            </dl>
            <p className="text-fg-muted mt-4 text-sm">
              {t('package.documents')}
            </p>
            <ul className="mt-1.5 space-y-1.5 text-sm">
              {pkg.documents.map((d) => (
                <li key={d} className="text-fg-strong flex items-start gap-2">
                  <FileText
                    size={14}
                    aria-hidden="true"
                    className="text-fg-muted mt-1 shrink-0"
                  />
                  <span className="min-w-0 break-words">{d}</span>
                </li>
              ))}
            </ul>
            <p className="mnote mnote-ai text-fg-muted mt-5">
              {t('package.note')}
            </p>
          </>
        ) : (
          <p className="text-fg-muted mt-2 text-sm">{t('package.pending')}</p>
        )}
      </section>

      <section className="paper p-5" aria-labelledby="funds-title">
        <h2 id="funds-title" className="eyebrow font-sans">
          {t('funds.title')}
        </h2>
        <p className="num text-fg-strong text-h2 mt-2 font-semibold">
          {f.money(c.amount)}
        </p>
        <p className="mt-1 flex items-center gap-2 text-sm">
          <span
            aria-hidden="true"
            className={cn(
              'size-2 rounded-full',
              funds === 'none' && 'bg-border-control',
              funds === 'held' && 'bg-indicator',
              funds === 'locked' && 'bg-warning',
              funds === 'settled' && 'bg-success'
            )}
          />
          {t(`funds.${funds}`)}
        </p>
      </section>

      <section
        aria-labelledby="log-title"
        className="border-border border-t pt-5"
      >
        <h2 id="log-title" className="eyebrow font-sans">
          {t('timeline.title')}
        </h2>
        <ol className="border-border mt-4 space-y-4 border-l pl-4">
          {c.timeline.map((e, i) => (
            <li key={`${e.event}-${e.at}`} className="relative">
              <span
                aria-hidden="true"
                className={cn(
                  'absolute top-1.5 -left-[21px] size-2 rounded-full',
                  i === 0 ? 'bg-indicator' : 'bg-border-control'
                )}
              />
              <p
                className={cn(
                  'text-sm',
                  i === 0 ? 'text-fg-strong font-semibold' : 'text-fg'
                )}
              >
                {t(`timeline.events.${e.event}`)}
              </p>
              <p className="text-fg-muted text-caption num">
                {t(`timeline.actors.${e.actor}`)} · {f.at(e.at)}
              </p>
            </li>
          ))}
        </ol>
      </section>
    </aside>
  )
}
