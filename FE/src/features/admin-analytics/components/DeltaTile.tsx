import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DeltaTileProps {
  label: string
  value: string
  /** Kỳ này / kỳ trước; tăng là tốt (doanh thu, người dùng) */
  current: number
  previous: number
  /** Chữ so sánh, vd. "so với 09/2026" */
  versus: string
  /** Định dạng % CÓ DẤU (+12% / −8%) để hướng đọc được bằng chữ, không chỉ bằng màu */
  formatPercent: (ratio: number) => string
}

/* Thẻ số có so sánh với kỳ trước: màu theo hướng, luôn kèm mũi tên và % (không chỉ màu) */
export function DeltaTile({ label, value, current, previous, versus, formatPercent }: DeltaTileProps) {
  // Kỳ trước = 0 thì không có % (chia cho 0), hiện gạch ngang thay vì "0%" gây hiểu nhầm là đứng yên
  const ratio = previous ? (current - previous) / previous : null
  const flat = ratio === null || Math.abs(ratio) < 0.005
  const Icon = flat ? Minus : ratio > 0 ? ArrowUpRight : ArrowDownRight

  return (
    <div className="paper p-4">
      <p className="text-fg-muted text-sm">{label}</p>
      {/* Số lớn đứng riêng: chữ số tỷ lệ, không tabular */}
      <p className="text-fg-strong mt-2 text-2xl leading-none font-semibold tracking-tight">{value}</p>
      <p className="text-caption mt-2 flex flex-wrap items-center gap-x-1.5">
        <span
          className={cn(
            'inline-flex items-center gap-0.5 font-semibold',
            flat ? 'text-fg-muted' : ratio > 0 ? 'text-success' : 'text-danger'
          )}
        >
          <Icon size={14} aria-hidden="true" />
          {ratio === null ? '—' : formatPercent(flat ? 0 : ratio)}
        </span>
        <span className="text-fg-muted">{versus}</span>
      </p>
    </div>
  )
}
