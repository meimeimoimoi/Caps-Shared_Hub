import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, SearchX } from 'lucide-react'
import { DecisionBar } from '@/components/ui/actions/decision-bar'
import { Toast } from '@/components/ui/feedback/toast'
import { CustomSelect } from '@/components/ui/forms/custom-select'
import { CaseHeader } from '@/components/ui/layout/case-header'
import { CASE_RAIL_STEP } from '@/lib/constants'
import { CaseAside } from '@/features/review-case/components/CaseAside'
import {
  AcceptDialog,
  CancelDialog,
  ChallengeDialog,
  EarlyCancelDialog,
  ReportDialog,
} from '@/features/review-case/components/CaseDialogs'
import { CasePanel } from '@/features/review-case/components/CasePanel'
import { useCaseFormat } from '@/features/review-case/ui'
import { ReviewResultView } from '@/features/review-case/components/ReviewResultView'
import { SettlementReceipt } from '@/features/review-case/components/SettlementReceipt'
import {
  DEMO_CASES,
  SCENARIOS,
  demoCase,
  isScenario,
} from '@/features/review-case/fixtures'
import type { SettlementRule } from '@/features/review-case/settlement'
import type {
  Actor,
  CaseStatus,
  ReviewCase,
  TimelineEvent,
} from '@/features/review-case/types'

/* Flow 5 phía User: một trang theo dõi Review Case từ lúc gửi yêu cầu tới quyết toán.
 * Explicit isolated demo: trạng thái đổi trong bộ nhớ; thay bằng API review-case khi BE có. */

const RAIL = ['accept', 'payment', 'start', 'review', 'acceptance'] as const
const HOUR = 3_600_000
const GRACE_HOURS = 24
const CHALLENGE_WINDOW_HOURS = 72

/** Deadline passed in a status -> [new status, settlement rule, event] (business tab 04, section 2) */
const ON_EXPIRE: Partial<
  Record<CaseStatus, [CaseStatus, SettlementRule | null, TimelineEvent]>
> = {
  PENDING_EXPERT_RESPONSE: ['EXPERT_RESPONSE_TIMEOUT', null, 'responseTimeout'],
  AWAITING_PAYMENT: ['CANCELLED_UNPAID', null, 'paymentExpired'],
  PAYMENT_CONFIRMED: ['CANCELLED', 'EXPERT_START_TIMEOUT', 'startTimeout'],
  AWAITING_ACCEPTANCE: ['COMPLETED', 'AUTO_CONFIRMED', 'autoConfirmed'],
}

export default function ReviewCasePage() {
  const { t } = useTranslation(['reviewCase', 'common'])
  const { caseId } = useParams()
  const [params, setParams] = useSearchParams()
  const raw = params.get('scenario')
  const scenario = isScenario(raw) ? raw : undefined
  const initial = demoCase(caseId, scenario)

  useEffect(() => {
    document.title = `${caseId ?? t('pageTitle')} | Shared Hub`
  }, [caseId, t])

  if (!initial)
    return (
      <div className="paper mx-auto max-w-lg p-8 text-center">
        <SearchX
          size={28}
          aria-hidden="true"
          className="text-fg-muted mx-auto"
        />
        <h1 className="text-h2 mt-4 font-serif">{t('notFound.title')}</h1>
        <p className="text-fg-muted mt-2">{t('notFound.body')}</p>
        <Link to="/cases" className="btn btn-secondary mt-6">
          {t('nav.cases')}
        </Link>
      </div>
    )

  return (
    <>
      <div className="mb-6 flex sm:justify-end">
        <CustomSelect
          label={t('common:demo.scenario')}
          value={scenario ?? DEMO_CASES.find((d) => d.id === caseId)!.scenario}
          options={SCENARIOS.map((v) => ({
            value: v,
            label: t(`demo.scenarios.${v}`),
          }))}
          onChange={(v) => setParams({ scenario: v }, { replace: true })}
          className="flex min-w-0 flex-col items-start gap-2 text-sm sm:flex-row sm:items-center"
          triggerClassName="!w-72 !max-w-full"
          menuClassName="!left-auto !right-0 !w-72 !max-w-[calc(100vw-32px)]"
        />
      </div>
      <CaseView key={`${caseId}-${scenario}`} initial={initial} />
    </>
  )
}

function CaseView({ initial }: { initial: ReviewCase }) {
  const { t } = useTranslation('reviewCase')
  const f = useCaseFormat()
  const [c, setC] = useState(initial)
  const [dialog, setDialog] = useState<
    'accept' | 'cancel' | 'earlyCancel' | 'report' | 'challenge' | null
  >(null)
  const [toast, setToast] = useState<string | null>(null)

  /** Chuyển trạng thái; guard theo `from` để thao tác lặp (retry, StrictMode) không ghi hai lần */
  const move = (
    from: CaseStatus[],
    patch: (p: ReviewCase, now: string) => Partial<ReviewCase>,
    actor: Actor,
    event: TimelineEvent,
    toastKey?:
      | 'paid'
      | 'answered'
      | 'accepted'
      | 'disputed'
      | 'cancelled'
      | 'expired'
      | 'withdrawn'
      | 'cancelledEarly'
      | 'challenged'
  ) => {
    setC((p) => {
      if (!from.includes(p.status)) return p
      const now = new Date().toISOString()
      return {
        ...p,
        ...patch(p, now),
        timeline: [{ at: now, actor, event }, ...p.timeline],
      }
    })
    setDialog(null)
    if (toastKey) setToast(t(`toast.${toastKey}`))
  }
  const closeWith = (
    status: CaseStatus,
    rule: SettlementRule | null,
    now: string
  ): Partial<ReviewCase> => ({
    status,
    due: undefined,
    settlement: rule
      ? { rule, settledAt: now, ref: `STL-${c.id.slice(3)}-01` }
      : undefined,
  })
  const inHours = (h: number) => new Date(Date.now() + h * HOUR).toISOString()

  const actions = {
    pay: () =>
      move(
        ['AWAITING_PAYMENT'],
        () => ({ status: 'PAYMENT_CONFIRMED', due: { start: inHours(24) } }),
        'USER',
        'paid',
        'paid'
      ),
    answer: (text: string) =>
      move(
        ['AWAITING_USER_INFORMATION'],
        (p) => ({
          status: 'IN_REVIEW',
          due: { delivery: p.due?.delivery ?? inHours(72) },
          infoRequest: p.infoRequest && {
            ...p.infoRequest,
            response: text || '—',
          },
          tasks: [...new Set([...p.tasks, 'T4' as const])],
        }),
        'USER',
        'infoAnswered',
        'answered'
      ),
    expire: () => {
      // Delivery deadline only flags OVERDUE; EXPERT_ABANDON comes after the grace period
      if (c.status === 'IN_REVIEW') {
        if (!c.overdue)
          return move(
            ['IN_REVIEW'],
            () => ({ overdue: true, due: { grace: inHours(GRACE_HOURS) } }),
            'SYSTEM',
            'overdue'
          )
        return move(
          ['IN_REVIEW'],
          (_, now) => ({
            ...closeWith('TERMINATED', 'EXPERT_ABANDON', now),
            termination: 'EXPERT_ABANDON',
          }),
          'SYSTEM',
          'terminated'
        )
      }
      // USER_NON_RESPONSE keeps the funds held until the challenge window ends
      if (c.status === 'AWAITING_USER_INFORMATION')
        return move(
          ['AWAITING_USER_INFORMATION'],
          () => ({
            status: 'TERMINATED',
            termination: 'USER_NON_RESPONSE',
            due: { challenge: inHours(CHALLENGE_WINDOW_HOURS) },
          }),
          'SYSTEM',
          'terminated'
        )
      if (c.status === 'TERMINATED' && c.due?.challenge && !c.dispute)
        return move(
          ['TERMINATED'],
          (_, now) => closeWith('TERMINATED', 'USER_NON_RESPONSE', now),
          'SYSTEM',
          'settled'
        )
      const rule = ON_EXPIRE[c.status]
      if (!rule) return
      const [status, settlement, event] = rule
      move(
        [c.status],
        (_, now) => closeWith(status, settlement, now),
        'SYSTEM',
        event,
        c.status === 'AWAITING_PAYMENT' ? 'expired' : undefined
      )
    },
    requestCancel: () => setDialog('cancel'),
    requestEarlyCancel: () => setDialog('earlyCancel'),
    requestChallenge: () => setDialog('challenge'),
    rate: (stars: number, comment: string) => {
      setC((p) =>
        p.rating
          ? p
          : { ...p, rating: { stars, comment, at: new Date().toISOString() } }
      )
      setToast(t('toast.rated'))
    },
  }

  const step = CASE_RAIL_STEP[c.status]

  return (
    <>
      <nav
        aria-label="Breadcrumb"
        className="text-fg-muted mb-6 flex items-center gap-2 text-sm"
      >
        <Link
          to="/cases"
          className="hover:text-fg-strong inline-flex items-center gap-1.5"
        >
          <ArrowLeft size={15} aria-hidden="true" />
          {t('nav.cases')}
        </Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page" className="num text-fg-strong">
          {c.id}
        </span>
      </nav>

      <CaseHeader
        code={c.id}
        title={c.title}
        meta={[
          [t('meta.expert'), c.expert.name],
          [t('meta.service'), c.serviceName],
          [t('meta.fee'), f.money(c.amount)],
          [t('meta.requested'), f.at(c.requestedAt)],
        ]}
        rail={{
          steps: RAIL.map((k) => t(`rail.${k}`)),
          current: step,
          label: t(`status.${c.status}`),
        }}
      />

      <div className="mt-10 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_20rem] xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0 space-y-8">
          <CasePanel c={c} actions={actions} />
          {c.settlement && (
            <SettlementReceipt amount={c.amount} settlement={c.settlement} />
          )}
          {c.result && (
            <ReviewResultView
              result={c.result}
              caseId={c.id}
              expert={c.expert}
            />
          )}
        </div>
        <CaseAside c={c} />
      </div>

      {c.status === 'AWAITING_ACCEPTANCE' && (
        <DecisionBar
          className="rounded-surface shadow-overlay mt-10"
          blockers={[]}
          secondary={
            <button
              type="button"
              onClick={() => setDialog('report')}
              className="btn btn-press btn-secondary"
            >
              {t('panel.AWAITING_ACCEPTANCE.report')}
            </button>
          }
          primary={{
            label: t('panel.AWAITING_ACCEPTANCE.accept'),
            onClick: () => setDialog('accept'),
          }}
        />
      )}

      {dialog === 'accept' && (
        <AcceptDialog
          onClose={() => setDialog(null)}
          onConfirm={() =>
            move(
              ['AWAITING_ACCEPTANCE'],
              (_, now) => closeWith('COMPLETED', 'USER_ACCEPTED', now),
              'USER',
              'userAccepted',
              'accepted'
            )
          }
        />
      )}
      {dialog === 'cancel' && (
        <CancelDialog
          amount={c.amount}
          onClose={() => setDialog(null)}
          onConfirm={() =>
            move(
              ['IN_REVIEW', 'AWAITING_USER_INFORMATION'],
              (_, now) => ({
                ...closeWith('TERMINATED', 'USER_CANCELLED', now),
                termination: 'USER_CANCELLED',
              }),
              'USER',
              'terminated',
              'cancelled'
            )
          }
        />
      )}
      {dialog === 'earlyCancel' &&
        (c.status === 'PENDING_EXPERT_RESPONSE' ||
          c.status === 'AWAITING_PAYMENT' ||
          c.status === 'PAYMENT_CONFIRMED') && (
          <EarlyCancelDialog
            stage={c.status}
            onClose={() => setDialog(null)}
            onConfirm={() =>
              c.status === 'PENDING_EXPERT_RESPONSE'
                ? move(
                    ['PENDING_EXPERT_RESPONSE'],
                    (_, now) => closeWith('WITHDRAWN', null, now),
                    'USER',
                    'withdrawn',
                    'withdrawn'
                  )
                : move(
                    ['AWAITING_PAYMENT', 'PAYMENT_CONFIRMED'],
                    (p, now) =>
                      closeWith(
                        'CANCELLED',
                        p.status === 'PAYMENT_CONFIRMED'
                          ? 'USER_CANCELLED_BEFORE_START'
                          : null,
                        now
                      ),
                    'USER',
                    'cancelled',
                    'cancelledEarly'
                  )
            }
          />
        )}
      {dialog === 'challenge' && (
        <ChallengeDialog
          onClose={() => setDialog(null)}
          onSubmit={(description) =>
            move(
              ['TERMINATED'],
              (_, now) => ({
                due: undefined,
                dispute: {
                  kind: 'USER_NON_RESPONSE_CHALLENGE',
                  description,
                  openedAt: now,
                },
              }),
              'USER',
              'challenged',
              'challenged'
            )
          }
        />
      )}
      {dialog === 'report' && (
        <ReportDialog
          onClose={() => setDialog(null)}
          onSubmit={(issue, description) =>
            move(
              ['AWAITING_ACCEPTANCE'],
              (_, now) => ({
                status: 'DISPUTED',
                due: undefined,
                dispute: {
                  kind: 'DELIVERY_ISSUE',
                  issue,
                  description,
                  openedAt: now,
                },
              }),
              'USER',
              'disputed',
              'disputed'
            )
          }
        />
      )}
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </>
  )
}
