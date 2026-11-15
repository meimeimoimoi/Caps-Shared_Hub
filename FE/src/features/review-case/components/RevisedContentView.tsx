import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'

export const fieldText = (v: unknown) =>
  typeof v === 'string' ? v : JSON.stringify(v, null, 2)

type Change = 'changed' | 'added' | 'removed' | null

const changeOf = (
  key: string,
  source: Record<string, unknown>,
  revised: Record<string, unknown>
): Change =>
  !(key in revised)
    ? 'removed'
    : !(key in source)
      ? 'added'
      : fieldText(source[key]) !== fieldText(revised[key])
        ? 'changed'
        : null

/**
 * The expert's copy of an AI draft beside the original: edited fields carry a bar, a red * and "old -> new",
 * removed ones are struck through, so the client finds every change at a glance.
 */
export function RevisedContentView({
  source,
  revised,
}: {
  source: Record<string, unknown>
  revised: Record<string, unknown>
}) {
  const { t } = useTranslation('reviewCase')
  // ponytail: shows the raw field keys; use the template's field titles once the draft API returns them
  const rows = [
    ...new Set([...Object.keys(source), ...Object.keys(revised)]),
  ].map((key) => ({ key, change: changeOf(key, source, revised) }))
  const count = (c: Change) => rows.filter((r) => r.change === c).length
  const total = rows.length - count(null)
  const parts = (['changed', 'removed', 'added'] as const)
    .filter((c) => count(c) > 0)
    .map((c) => t(`live.revised.${c}Count`, { count: count(c) }))

  return (
    <section className="paper p-6 md:p-8">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="eyebrow font-sans">{t('live.revised.title')}</h2>
        <p className="text-fg-muted text-caption">
          {total
            ? [t('live.revised.count', { count: total }), ...parts].join(' · ')
            : t('live.revised.none')}
        </p>
      </div>
      <dl className="mt-5 space-y-5">
        {rows.map(({ key, change }) => (
          <div
            key={key}
            className={cn(
              'border-l-2 pl-4',
              change === 'removed'
                ? 'border-border'
                : change
                  ? 'border-accent'
                  : 'border-transparent'
            )}
          >
            <dt className="flex flex-wrap items-center gap-x-2 text-sm font-semibold">
              <span className="text-fg-strong">{key}</span>
              {change && (
                <span
                  className={cn(
                    'text-caption font-semibold',
                    change === 'removed' ? 'text-fg-muted' : 'text-accent-text'
                  )}
                >
                  {change !== 'removed' && (
                    <span aria-hidden="true" className="text-danger mr-0.5">
                      *
                    </span>
                  )}
                  {t(`live.revised.${change}`)}
                </span>
              )}
            </dt>
            <dd className="mt-1 flex flex-wrap items-baseline gap-x-2 wrap-break-word whitespace-pre-wrap">
              {change === 'changed' || change === 'removed' ? (
                <del className="text-fg-muted">
                  <span className="sr-only">{t('live.revised.before')} </span>
                  {fieldText(source[key])}
                </del>
              ) : null}
              {change === 'changed' && (
                <span aria-hidden="true" className="text-fg-muted">
                  →
                </span>
              )}
              {change === 'changed' || change === 'added' ? (
                <ins className="text-fg-strong font-medium no-underline">
                  <span className="sr-only">{t('live.revised.after')} </span>
                  {fieldText(revised[key])}
                </ins>
              ) : null}
              {change === null && (
                <span className="text-fg-strong">
                  {fieldText(revised[key])}
                </span>
              )}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
