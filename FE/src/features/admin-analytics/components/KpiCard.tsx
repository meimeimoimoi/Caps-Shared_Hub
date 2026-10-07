import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'

/* Thẻ chỉ số: số lớn + một dòng phụ cho biết có vấn đề không */
export function KpiCard(props: { label: string; value: ReactNode; note: string; warn?: boolean; to: string }) {
  return (
    <Link to={props.to} className="paper hover:bg-desk-2 block p-4 no-underline transition-colors">
      <p className="text-fg-muted text-sm">{props.label}</p>
      <p className="text-fg-strong num mt-2 text-3xl leading-none font-semibold tracking-tight">{props.value}</p>
      <p className={cn('text-caption mt-2', props.warn ? 'text-warning font-semibold' : 'text-fg-muted')}>
        {props.note}
      </p>
    </Link>
  )
}
