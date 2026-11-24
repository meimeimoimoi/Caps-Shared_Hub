import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { fieldText, lineDiff } from './fieldText'

type Change = 'changed' | 'added' | 'removed' | null

/** One removed or added line; screen readers hear "before"/"after" instead of the colour. */
const DiffText = ({
  tag: Tag,
  label,
  text,
}: {
  tag: 'del' | 'ins'
  label: string
  text: string
}) => (
  <Tag className="text-fg-strong min-w-0 flex-1 wrap-break-word whitespace-pre-wrap no-underline">
    <span className="sr-only">{label} </span>
    {text || ' '}
  </Tag>
)

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
 * The expert's copy of an AI draft beside the original: edited fields carry a bar and a red *, and their text shows
 * as a line diff (removed lines red, added lines green), so the client finds every change at a glance.
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
            {change === null ? (
              <dd className="text-fg-strong mt-1 wrap-break-word whitespace-pre-wrap">
                {fieldText(revised[key])}
              </dd>
            ) : (
              // Code-review style: removed lines red with "-", added lines green with "+", kept lines plain
              <dd className="border-border rounded-control mt-2 overflow-hidden border text-sm">
                {lineDiff(
                  key in source ? fieldText(source[key]) : '',
                  key in revised ? fieldText(revised[key]) : ''
                ).map((line, i) => (
                  <div
                    key={i}
                    className={cn(
                      'flex gap-3 px-3 py-0.5',
                      line.kind === '-' && 'bg-danger-soft',
                      line.kind === '+' && 'bg-success-soft'
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        'w-3 shrink-0 font-mono select-none',
                        line.kind === '-' && 'text-danger',
                        line.kind === '+' && 'text-success'
                      )}
                    >
                      {line.kind}
                    </span>
                    {line.kind === ' ' ? (
                      <span className="text-fg min-w-0 flex-1 wrap-break-word whitespace-pre-wrap">
                        {line.text || ' '}
                      </span>
                    ) : (
                      <DiffText
                        tag={line.kind === '-' ? 'del' : 'ins'}
                        label={t(
                          line.kind === '-'
                            ? 'live.revised.before'
                            : 'live.revised.after'
                        )}
                        text={line.text}
                      />
                    )}
                  </div>
                ))}
              </dd>
            )}
          </div>
        ))}
      </dl>
    </section>
  )
}
