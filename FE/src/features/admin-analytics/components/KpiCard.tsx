import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { useFormatters } from '@/hooks/useFormatters'
import { CountUp } from './CountUp'

/* KPI card: a big number (counts up once loaded) and one note line saying whether anything is wrong.
 * value undefined = loading ("…") or failed ("—"); the note then says which instead of showing zeros */
export function KpiCard(props: {
  label: string
  value: number | undefined
  /** Plain number by default; pass f.money for money */
  format?: (n: number) => string
  note: string
  warn?: boolean
  /** The query behind the value failed */
  failed?: boolean
  /** The backend for this figure is not connected yet: say so instead of showing a number */
  unavailable?: boolean
  /** Note shown when unavailable; defaults to "not connected" */
  unavailableNote?: string
  /** Drill-down page; without it the card is not a link (e.g. that page is not connected yet) */
  to?: string
  /** A row inside a shared ledger panel instead of a card of its own */
  bare?: boolean
}) {
  const f = useFormatters()
  const { t } = useTranslation('admin')
  const missing = props.unavailable || props.value === undefined
  const note = props.unavailable
    ? (props.unavailableNote ?? '')
    : !missing
      ? props.note
      : props.failed
        ? t('dashboard.kpi.failed')
        : t('dashboard.loading')
  const body = (
    <>
      <p className="text-fg-muted text-sm">{props.label}</p>
      {props.unavailable ? (
        // Not connected is a status, not a figure: no hero numeral or dash
        <p className="text-fg mt-2 text-base font-semibold">
          {t('navigation.notConnected')}
        </p>
      ) : (
      <p className="text-fg-strong num mt-2 text-3xl leading-none font-semibold tracking-tight">
        {props.value === undefined ? (
          <>
            <span aria-hidden="true">
              {props.failed ? '—' : '…'}
            </span>
            <span className="sr-only">{note}</span>
          </>
        ) : (
          <CountUp
            value={props.value}
            format={props.format ?? ((n) => f.number(n))}
          />
        )}
      </p>
      )}
      <p
        className={cn(
          'text-caption mt-2',
          props.warn && !missing
            ? 'text-warning font-semibold'
            : 'text-fg-muted'
        )}
        aria-hidden={(missing && !props.unavailable) || undefined}
      >
        {note}
      </p>
    </>
  )
  const frame = props.bare ? 'block px-5 py-4' : 'paper block p-4'
  return props.to ? (
    <Link
      to={props.to}
      className={cn(
        frame,
        'hover:bg-desk-2 no-underline',
        props.bare ? 'motion-interactive' : 'motion-lift'
      )}
    >
      {body}
    </Link>
  ) : (
    <div className={frame}>{body}</div>
  )
}
