import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useFormatters } from '@/hooks/useFormatters'
import { CountUp } from './CountUp'

/* Thẻ chỉ số: số lớn (đếm lên khi có dữ liệu) + một dòng phụ cho biết có vấn đề không.
 * value undefined = đang tải, hiện "…" thay vì 0 để không trông như mọi thứ đang ổn */
export function KpiCard(props: {
  label: string
  value: number | undefined
  /** Mặc định định dạng số thường; tiền thì truyền f.money */
  format?: (n: number) => string
  note: string
  warn?: boolean
  /** Drill-down page; without it the card is not a link (e.g. that page is not connected yet) */
  to?: string
}) {
  const f = useFormatters()
  const body = (
    <>
      <p className="text-fg-muted text-sm">{props.label}</p>
      <p className="text-fg-strong num mt-2 text-3xl leading-none font-semibold tracking-tight">
        {props.value === undefined ? (
          '…'
        ) : (
          <CountUp
            value={props.value}
            format={props.format ?? ((n) => f.number(n))}
          />
        )}
      </p>
      <p
        className={cn(
          'text-caption mt-2',
          props.warn ? 'text-warning font-semibold' : 'text-fg-muted'
        )}
      >
        {props.note}
      </p>
    </>
  )
  return props.to ? (
    <Link
      to={props.to}
      className="paper motion-lift hover:bg-desk-2 block p-4 no-underline"
    >
      {body}
    </Link>
  ) : (
    <div className="paper p-4">{body}</div>
  )
}
