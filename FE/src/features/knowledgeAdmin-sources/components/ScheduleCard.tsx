import { useState } from 'react'
import { formatDateTime } from '@/lib/utils'
import { FREQUENCY, type Frequency } from '../constants'
import type { CollectionSchedule } from '../types'

interface ScheduleCardProps {
  schedule: CollectionSchedule
  onSave: (frequency: Frequency) => Promise<unknown>
}

/* "Lịch thu thập định kỳ": đổi tần suất rồi bấm Lưu lịch */
export function ScheduleCard({ schedule, onSave }: ScheduleCardProps) {
  const [frequency, setFrequency] = useState(schedule.frequency)
  const [saving, setSaving] = useState(false)

  return (
    <section className="paper p-5 md:p-6">
      <h2 className="text-h2">Lịch thu thập định kỳ</h2>
      <div className="mt-4 grid items-start gap-6 sm:grid-cols-3">
        <label className="flex flex-col gap-1.5 text-sm font-semibold">
          Tần suất
          <select
            value={frequency}
            onChange={(e) => setFrequency(e.target.value as Frequency)}
            className="border-border-control rounded-control shadow-control bg-paper h-control border px-3 text-base font-normal"
          >
            {Object.entries(FREQUENCY).map(([key, f]) => (
              <option key={key} value={key}>
                {f.label}
              </option>
            ))}
          </select>
          <span className="text-fg-muted text-caption font-normal">
            {FREQUENCY[frequency].hint}
          </span>
        </label>
        <div className="text-sm">
          <p className="text-fg-muted">Lần chạy gần nhất</p>
          <p className="text-fg-strong mt-1">
            {schedule.lastRunAt ? (
              <>
                <span className="num">{formatDateTime(schedule.lastRunAt)}</span>
                {' · '}
                {schedule.lastRunOk ? 'thành công' : 'có lỗi'}
              </>
            ) : (
              'Chưa chạy'
            )}
          </p>
        </div>
        <div className="text-sm">
          <p className="text-fg-muted">Lần chạy tiếp theo</p>
          <p className="text-fg-strong num mt-1">
            {formatDateTime(schedule.nextRunAt)}
          </p>
        </div>
      </div>
      <button
        type="button"
        disabled={saving || frequency === schedule.frequency}
        onClick={() => {
          setSaving(true)
          onSave(frequency).finally(() => setSaving(false))
        }}
        className="btn btn-press btn-secondary mt-4"
      >
        {saving ? 'Đang lưu…' : 'Lưu lịch'}
      </button>
    </section>
  )
}
