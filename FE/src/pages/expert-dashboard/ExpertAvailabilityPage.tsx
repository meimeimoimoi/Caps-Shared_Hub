import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { CalendarPlus, Trash2 } from 'lucide-react'
import { ApiError } from '@/lib/api-client'
import { Button } from '@/components/ui/actions/button'
import { useExpertPresentation } from '@/features/expert-dashboard/hooks/useExpertPresentation'
import { useAvailability } from '@/features/expert-availability/hooks/useAvailability'

const ERRORS = [
  'SLOT_IN_PAST',
  'SLOT_TOO_FAR_AHEAD',
  'SLOT_LENGTH_INVALID',
  'SLOT_LIMIT',
  'SLOT_OVERLAP',
  'SLOT_NOT_FOUND',
  'SLOT_LOCKED',
  'SERVICE_NOT_APPROVED',
  'EXPERT_NOT_FOUND',
] as const
type AvailabilityError = (typeof ERRORS)[number]
const isKnownError = (code?: string): code is AvailabilityError =>
  (ERRORS as readonly (string | undefined)[]).includes(code)

// Slots are entered in Vietnam time (UTC+7, no daylight saving)
const toIso = (date: string, time: string) => `${date}T${time}:00+07:00`

/** Open slots shared by every service, and the per-service switch for new requests (BR-M01) */
export default function ExpertAvailabilityPage() {
  const { t } = useTranslation('expert')
  const display = useExpertPresentation()
  const { query, add, remove, toggle } = useAvailability()
  const [date, setDate] = useState('')
  const [start, setStart] = useState('09:00')
  const [end, setEnd] = useState('12:00')
  const [error, setError] = useState<string | null>(null)
  const data = query.data
  const busy = add.isPending || remove.isPending || toggle.isPending
  const fail = (e: unknown) =>
    setError(
      e instanceof ApiError && isKnownError(e.code)
        ? t(`availabilityPage.errors.${e.code}`)
        : t('availabilityPage.errors.failed')
    )
  const time = (at: string) =>
    display.timestamp(at, 'Asia/Ho_Chi_Minh', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!date) return
    setError(null)
    add.mutate(
      { startAt: toIso(date, start), endAt: toIso(date, end) },
      { onError: fail }
    )
  }

  return (
    <>
      <div className="ep-page-heading">
        <div>
          <h1>{t('availabilityPage.title')}</h1>
          <p>{t('availabilityPage.description')}</p>
        </div>
      </div>

      {error && (
        <p
          role="alert"
          className="mt-4 rounded-lg bg-[var(--ep-danger-bg)] p-3 text-sm text-[var(--ep-danger)]"
        >
          {error}
        </p>
      )}
      {query.isLoading && (
        <p className="mt-6 text-sm text-[var(--ep-muted)]">
          {t('availabilityPage.loading')}
        </p>
      )}
      {query.isError && (
        <p role="alert" className="mt-6 text-sm text-[var(--ep-danger)]">
          {t('availabilityPage.errors.loadFailed')}
        </p>
      )}

      {data && (
        <>
          <section className="mt-6 rounded-lg border border-[var(--ep-border)] bg-[var(--ep-surface)] p-5">
            <h2 className="font-semibold text-[var(--ep-ink)]">
              {t('availabilityPage.servicesTitle')}
            </h2>
            <p className="mt-1 text-sm text-[var(--ep-muted)]">
              {t('availabilityPage.servicesHelp')}
            </p>
            {data.services.length === 0 ? (
              <p className="mt-3 text-sm text-[var(--ep-muted)]">
                {t('availabilityPage.noServices')}
              </p>
            ) : (
              <ul className="mt-3 divide-y divide-[var(--ep-line)]">
                {data.services.map((s) => (
                  <li
                    key={s.serviceCode}
                    className="flex flex-wrap items-center justify-between gap-3 py-3"
                  >
                    <div>
                      <p className="font-medium text-[var(--ep-ink)]">
                        {s.serviceName}
                      </p>
                      <p className="text-sm text-[var(--ep-muted)]">
                        {display.qualification(s.qualificationStatus)}
                      </p>
                    </div>
                    <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        role="switch"
                        className="size-5 accent-[var(--ep-accent)]"
                        checked={s.acceptingRequests}
                        disabled={busy || (!s.acceptingRequests && !s.canTurnOn)}
                        onChange={(e) => {
                          setError(null)
                          toggle.mutate(
                            {
                              serviceCode: s.serviceCode,
                              accepting: e.target.checked,
                            },
                            { onError: fail }
                          )
                        }}
                      />
                      {s.acceptingRequests
                        ? t('availabilityPage.accepting')
                        : t('availabilityPage.notAccepting')}
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="mt-6 rounded-lg border border-[var(--ep-border)] bg-[var(--ep-surface)] p-5">
            <h2 className="font-semibold text-[var(--ep-ink)]">
              {t('availabilityPage.slotsTitle')}
            </h2>
            <p className="mt-1 text-sm text-[var(--ep-muted)]">
              {t('availabilityPage.slotsHelp', {
                min: data.minHours,
                max: data.maxHours,
                count: data.maxOpenSlots,
                days: data.maxDaysAhead,
              })}
            </p>
            <form
              onSubmit={submit}
              className="mt-4 flex flex-wrap items-end gap-3 text-sm"
            >
              <label className="flex flex-col gap-1">
                {t('availabilityPage.date')}
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="min-h-11 rounded-lg border border-[var(--ep-border)] bg-[var(--ep-bg)] px-3"
                />
              </label>
              <label className="flex flex-col gap-1">
                {t('availabilityPage.from')}
                <input
                  type="time"
                  required
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                  className="min-h-11 rounded-lg border border-[var(--ep-border)] bg-[var(--ep-bg)] px-3"
                />
              </label>
              <label className="flex flex-col gap-1">
                {t('availabilityPage.to')}
                <input
                  type="time"
                  required
                  value={end}
                  onChange={(e) => setEnd(e.target.value)}
                  className="min-h-11 rounded-lg border border-[var(--ep-border)] bg-[var(--ep-bg)] px-3"
                />
              </label>
              <Button type="submit" className="min-h-11" disabled={busy}>
                <CalendarPlus size={16} aria-hidden="true" />
                {t('availabilityPage.add')}
              </Button>
            </form>
            {data.slots.length === 0 ? (
              <p className="mt-4 text-sm text-[var(--ep-muted)]">
                {t('availabilityPage.noSlots')}
              </p>
            ) : (
              <ul className="mt-4 divide-y divide-[var(--ep-line)] text-sm">
                {data.slots.map((slot) => (
                  <li
                    key={slot.id}
                    className="flex items-center justify-between gap-3 py-2"
                  >
                    <span>
                      {time(slot.startAt)} – {time(slot.endAt)}
                    </span>
                    <Button
                      variant="outline"
                      className="min-h-11"
                      disabled={busy}
                      aria-label={t('availabilityPage.remove', {
                        time: time(slot.startAt),
                      })}
                      onClick={() => {
                        setError(null)
                        remove.mutate(slot.id, { onError: fail })
                      }}
                    >
                      <Trash2 size={16} aria-hidden="true" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </>
  )
}
