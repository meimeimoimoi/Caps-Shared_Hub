import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Save } from 'lucide-react'
import { ApiError } from '@/lib/api-client'
import { Button } from '@/components/ui/actions/button'
import { HelpTip } from '@/components/ui/feedback/help-tip'
import { useExpertPresentation } from '@/features/expert-dashboard/hooks/useExpertPresentation'
import { useAvailability } from '@/features/expert-availability/hooks/useAvailability'

const ERRORS = ['CAPACITY_INVALID', 'SERVICE_NOT_APPROVED', 'EXPERT_NOT_FOUND'] as const
type AvailabilityError = (typeof ERRORS)[number]
const isKnownError = (code?: string): code is AvailabilityError =>
  (ERRORS as readonly (string | undefined)[]).includes(code)

/** How many cases the expert runs at once, and the per-service switch for new requests (BR-M01) */
export default function ExpertAvailabilityPage() {
  const { t } = useTranslation('expert')
  const display = useExpertPresentation()
  const { query, capacity, toggle } = useAvailability()
  // null = show the saved capacity; a string while the expert is typing
  const [draft, setDraft] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const data = query.data
  const busy = capacity.isPending || toggle.isPending
  const fail = (e: unknown) =>
    setError(
      e instanceof ApiError && isKnownError(e.code)
        ? t(`availabilityPage.errors.${e.code}`, { max: data?.maxCapacity })
        : t('availabilityPage.errors.failed')
    )

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (draft == null) return
    setError(null)
    capacity.mutate(Number(draft), {
      onSuccess: () => setDraft(null),
      onError: fail,
    })
  }

  return (
    <>
      <div className="ep-page-heading">
        <div>
          <h1 className="inline-flex items-center gap-2">
            {t('availabilityPage.title')}
            <HelpTip label={t('availabilityPage.title')}>
              {t('availabilityPage.description')}
            </HelpTip>
          </h1>
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
            <h2 className="inline-flex items-center gap-2 font-semibold text-[var(--ep-ink)]">
              {t('availabilityPage.capacityTitle')}
              <HelpTip label={t('availabilityPage.capacityTitle')}>
                {t('availabilityPage.capacityHelp', { max: data.maxCapacity })}
              </HelpTip>
            </h2>
            <form
              onSubmit={submit}
              className="mt-4 flex flex-wrap items-end gap-3 text-sm"
            >
              <label className="flex flex-col gap-1">
                {t('availabilityPage.capacityLabel')}
                <input
                  type="number"
                  name="capacity"
                  inputMode="numeric"
                  required
                  min={1}
                  max={data.maxCapacity}
                  step={1}
                  value={draft ?? (data.capacity > 0 ? String(data.capacity) : '')}
                  onChange={(e) => setDraft(e.target.value)}
                  className="min-h-11 w-32 rounded-lg border border-[var(--ep-border)] bg-[var(--ep-bg)] px-3"
                />
              </label>
              <Button
                type="submit"
                className="min-h-11"
                disabled={busy || draft == null}
              >
                <Save size={16} aria-hidden="true" />
                {t('availabilityPage.save')}
              </Button>
            </form>
            <p
              className="mt-4 text-sm"
              data-state={
                data.capacity === 0
                  ? 'unset'
                  : data.activeCases >= data.capacity
                    ? 'full'
                    : 'open'
              }
            >
              {data.capacity === 0
                ? t('availabilityPage.capacityUnset')
                : data.activeCases >= data.capacity
                  ? t('availabilityPage.capacityFull', {
                      active: data.activeCases,
                      capacity: data.capacity,
                    })
                  : t('availabilityPage.capacityUsage', {
                      active: data.activeCases,
                      capacity: data.capacity,
                    })}
            </p>
          </section>

          <section className="mt-6 rounded-lg border border-[var(--ep-border)] bg-[var(--ep-surface)] p-5">
            <h2 className="inline-flex items-center gap-2 font-semibold text-[var(--ep-ink)]">
              {t('availabilityPage.servicesTitle')}
              <HelpTip label={t('availabilityPage.servicesTitle')}>
                {t('availabilityPage.servicesHelp')}
              </HelpTip>
            </h2>
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
        </>
      )}
    </>
  )
}
