import { useState } from 'react'
import { Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import { StatusBadge } from '@/components/ui/status-badge'
import {
  DISPUTE_OUTCOME,
  DISPUTE_SLA_HOURS,
  type DisputeOutcome,
} from '../constants'

interface DisputeDecisionProps {
  hoursLeft: number
  decided: boolean
  onDecide: (outcome: DisputeOutcome, reason: string) => void
}

/* Thẻ "Quyết định trọng tài": chọn kết quả + lý do, gửi cho cả Client và chuyên gia */
export function DisputeDecision({
  hoursLeft,
  decided,
  onDecide,
}: DisputeDecisionProps) {
  const [outcome, setOutcome] = useState<DisputeOutcome>()
  const [reason, setReason] = useState('')

  return (
    <form
      className="paper p-5 md:p-6"
      // `required` trên radio + textarea đã chặn submit khi thiếu
      onSubmit={(e) => {
        e.preventDefault()
        if (outcome) onDecide(outcome, reason)
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-h2">Quyết định trọng tài</h2>
        <StatusBadge
          status={{
            label: `Còn ${hoursLeft} giờ / ${DISPUTE_SLA_HOURS} giờ`,
            tone: 'warning',
          }}
        />
      </div>

      <div className="bg-sunken rounded-surface mt-4 flex gap-2 p-3 text-sm">
        <Info size={16} aria-hidden="true" className="mt-0.5 shrink-0" />
        <div>
          <p className="text-fg-strong font-semibold">Tiền đang bị khóa</p>
          <p className="text-fg-muted">
            Không giải ngân tự động cho tới khi có quyết định.
          </p>
        </div>
      </div>

      <fieldset disabled={decided} className="mt-5">
        <legend className="text-sm font-semibold">Kết quả (bắt buộc)</legend>
        <div className="mt-2 space-y-2">
          {Object.entries(DISPUTE_OUTCOME).map(([key, o]) => (
            <label
              key={key}
              className={cn(
                'rounded-control flex cursor-pointer gap-3 border p-3',
                outcome === key
                  ? 'border-border-strong bg-sunken shadow-pressed'
                  : 'border-border-control shadow-control'
              )}
            >
              <input
                type="radio"
                name="outcome"
                required
                checked={outcome === key}
                onChange={() => setOutcome(key as DisputeOutcome)}
                className="accent-ink mt-1"
              />
              <span className="text-sm">
                <span className="text-fg-strong block font-semibold">
                  {o.label}
                </span>
                <span className="block">{o.hint}</span>
                <span className="text-fg-muted text-caption num block">
                  {o.split}
                </span>
              </span>
            </label>
          ))}
        </div>

        <label className="mt-5 flex flex-col gap-2 text-sm font-semibold">
          Lý do quyết định (bắt buộc)
          <textarea
            required
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Gửi cho cả Client và chuyên gia"
            className="border-border-control rounded-control shadow-control bg-paper placeholder:text-fg-muted resize-y border px-3 py-2 text-base font-normal"
          />
        </label>

        <button type="submit" className="btn btn-press btn-primary mt-4 w-full">
          {decided ? 'Đã ra quyết định' : 'Ra quyết định'}
        </button>
      </fieldset>
    </form>
  )
}
