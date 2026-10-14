import { useId, useState, type FormEvent, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import {
  Check,
  Hourglass,
  Info,
  Scale,
  ShieldCheck,
  Star,
  TriangleAlert,
} from 'lucide-react'
import { FormField } from '@/components/ui/forms/form-field'
import { DISPUTE_SLA_HOURS } from '@/features/disputes-escrow/constants'
import { cn } from '@/lib/utils'
import type { ReviewCase, TaskCode } from '../types'
import { Countdown, Deadline, FilePicker } from './CaseUi'
import { fieldClass, useCaseFormat } from '../ui'

const TASKS: TaskCode[] = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6']
// Payment window of the case; a single payOS link lasts 15 minutes and can be recreated
const PAYMENT_WINDOW_MS = 24 * 3_600_000

export interface PanelActions {
  pay: () => void
  answer: (text: string) => void
  expire: () => void
  requestCancel: () => void
  requestEarlyCancel: () => void
  requestChallenge: () => void
  rate: (stars: number, comment: string) => void
}

function Frame({
  who,
  title,
  icon,
  children,
}: {
  who: string
  title: string
  icon?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="paper p-6 md:p-8" aria-labelledby="case-next">
      <p className="eyebrow flex items-center gap-2">
        {icon}
        {who}
      </p>
      <h2
        id="case-next"
        className="text-h2 text-fg-strong mt-2 max-w-[40ch] font-serif"
      >
        {title}
      </h2>
      <div className="mt-4 space-y-6">{children}</div>
    </section>
  )
}

const Body = ({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) => <p className={cn('max-w-[65ch]', className)}>{children}</p>

export function CasePanel({
  c,
  actions,
}: {
  c: ReviewCase
  actions: PanelActions
}) {
  const { t } = useTranslation('reviewCase')
  const f = useCaseFormat()
  const name = c.expert.name
  const who = {
    you: t('next.you'),
    expert: t('next.expert'),
    admin: t('next.admin'),
    closed: t('next.closed'),
  }
  const cancelButton = (
    <button
      type="button"
      onClick={actions.requestCancel}
      className="btn btn-ghost text-danger hover:text-danger -ml-4"
    >
      {t('panel.IN_REVIEW.cancel')}
    </button>
  )
  // Withdraw (before ACCEPT) or cancel (before START); the label depends on the stage
  const earlyCancelButton = (label: string) => (
    <button
      type="button"
      onClick={actions.requestEarlyCancel}
      className="btn btn-ghost text-danger hover:text-danger -ml-4"
    >
      {label}
    </button>
  )

  switch (c.status) {
    case 'PENDING_EXPERT_RESPONSE':
      return (
        <Frame
          who={who.expert}
          title={t('panel.PENDING_EXPERT_RESPONSE.title', { name })}
          icon={<Hourglass size={13} aria-hidden="true" />}
        >
          <Body>{t('panel.PENDING_EXPERT_RESPONSE.body')}</Body>
          {c.due?.response && (
            <Deadline
              label={t('panel.PENDING_EXPERT_RESPONSE.due')}
              dueAt={c.due.response}
              onExpire={actions.expire}
            />
          )}
          {earlyCancelButton(t('panel.PENDING_EXPERT_RESPONSE.cancel'))}
        </Frame>
      )

    case 'DECLINED_BY_EXPERT':
    case 'EXPERT_RESPONSE_TIMEOUT':
    case 'WITHDRAWN':
    case 'CANCELLED_UNPAID': {
      const k = c.status
      return (
        <Frame who={who.closed} title={t(`panel.${k}.title`, { name })}>
          <Body className="verdict">{t(`panel.${k}.body`)}</Body>
          <Link to="/marketplace" className="btn btn-press btn-primary">
            {t(`panel.${k}.cta`)}
          </Link>
        </Frame>
      )
    }

    case 'AWAITING_PAYMENT':
      return (
        <Frame who={who.you} title={t('panel.AWAITING_PAYMENT.title')}>
          <Body>{t('panel.AWAITING_PAYMENT.body', { name })}</Body>
          <div className="bg-sunken rounded-surface grid gap-6 p-5 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] md:p-6">
            <div>
              <p className="eyebrow">{t('panel.AWAITING_PAYMENT.timer')}</p>
              <p className="text-fg-strong mt-1 text-[2.5rem] leading-none font-semibold tracking-tight">
                {c.due?.payment && (
                  <Countdown
                    dueAt={c.due.payment}
                    totalMs={PAYMENT_WINDOW_MS}
                    urgentMs={2 * 3_600_000}
                    onExpire={actions.expire}
                  />
                )}
              </p>
            </div>
            <div className="sm:border-border sm:border-l sm:pl-6">
              <p className="eyebrow">{t('panel.AWAITING_PAYMENT.amount')}</p>
              <p className="num text-fg-strong text-h2 mt-1 font-semibold">
                {f.money(c.amount)}
              </p>
              <p className="text-fg-muted text-sm">
                {t('panel.AWAITING_PAYMENT.method')}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <button
              type="button"
              onClick={actions.pay}
              className="btn btn-press btn-primary"
            >
              {t('panel.AWAITING_PAYMENT.cta', { amount: f.money(c.amount) })}
            </button>
            <p className="text-fg-muted flex items-start gap-2 text-sm">
              <ShieldCheck
                size={16}
                aria-hidden="true"
                className="text-success mt-0.5 shrink-0"
              />
              {t('panel.AWAITING_PAYMENT.escrow')}
            </p>
          </div>
          <p className="text-fg-muted text-sm">
            {t('panel.AWAITING_PAYMENT.link')}
          </p>
          {earlyCancelButton(t('panel.AWAITING_PAYMENT.cancel'))}
        </Frame>
      )

    case 'PAYMENT_CONFIRMED':
      return (
        <Frame
          who={who.expert}
          title={t('panel.PAYMENT_CONFIRMED.title')}
          icon={<Hourglass size={13} aria-hidden="true" />}
        >
          <Body>{t('panel.PAYMENT_CONFIRMED.body')}</Body>
          {c.due?.start && (
            <Deadline
              label={t('panel.PAYMENT_CONFIRMED.due')}
              dueAt={c.due.start}
              onExpire={actions.expire}
            />
          )}
          {earlyCancelButton(t('panel.PAYMENT_CONFIRMED.cancel'))}
        </Frame>
      )

    case 'IN_REVIEW': {
      const current = TASKS.find((k) => !c.tasks.includes(k) && k !== 'T4')
      // After the delivery deadline the countdown switches to the grace period
      const deliveryDue = c.due?.grace ?? c.due?.delivery
      return (
        <Frame who={who.expert} title={t('panel.IN_REVIEW.title')}>
          <Body>{t('panel.IN_REVIEW.body')}</Body>
          {c.overdue && (
            <p className="para-check text-warning flex items-start gap-2 text-sm">
              <TriangleAlert
                size={15}
                aria-hidden="true"
                className="mt-0.5 shrink-0"
              />
              {t('panel.IN_REVIEW.overdue')}
            </p>
          )}
          {deliveryDue && (
            <Deadline
              label={t(
                c.overdue ? 'panel.IN_REVIEW.grace' : 'panel.IN_REVIEW.due'
              )}
              dueAt={deliveryDue}
              onExpire={actions.expire}
            />
          )}
          <div>
            <h3 className="eyebrow">{t('panel.IN_REVIEW.progress')}</h3>
            <ol className="mt-3 grid gap-x-8 sm:grid-cols-2">
              {TASKS.map((k) => {
                const state = c.tasks.includes(k)
                  ? 'done'
                  : k === current
                    ? 'current'
                    : 'todo'
                return (
                  <li
                    key={k}
                    className="border-border-subtle flex items-center gap-3 border-b py-2.5"
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        'grid size-6 shrink-0 place-items-center rounded-full border text-[11px] font-bold',
                        state === 'done' &&
                          'bg-success border-success text-paper',
                        state === 'current' &&
                          'border-indicator text-accent-text border-2',
                        state === 'todo' &&
                          'border-border-control text-fg-muted'
                      )}
                    >
                      {state === 'done' ? (
                        <Check size={13} strokeWidth={3} />
                      ) : (
                        k.slice(1)
                      )}
                    </span>
                    <span
                      className={cn(
                        'min-w-0 flex-1 text-sm',
                        state === 'todo' ? 'text-fg-muted' : 'text-fg-strong'
                      )}
                    >
                      {t(`tasks.${k}`)}
                    </span>
                    <span
                      className={cn(
                        'text-caption shrink-0',
                        state === 'current'
                          ? 'text-accent-text font-semibold'
                          : 'text-fg-muted'
                      )}
                    >
                      {t(`tasks.${state}`)}
                    </span>
                  </li>
                )
              })}
            </ol>
          </div>
          {c.infoRequest?.response && (
            <details className="text-sm">
              <summary className="text-fg-strong cursor-pointer font-semibold">
                {t('panel.AWAITING_USER_INFORMATION.answered')}
              </summary>
              <p className="mnote mnote-cite mt-2">{c.infoRequest.response}</p>
            </details>
          )}
          {cancelButton}
        </Frame>
      )
    }

    case 'AWAITING_USER_INFORMATION':
      return (
        <Frame who={who.you} title={t('panel.AWAITING_USER_INFORMATION.title')}>
          {c.infoRequest && (
            <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_auto]">
              <div className="mnote mnote-edit !text-base">
                <span className="mnote-label text-fg-strong">
                  {t('panel.AWAITING_USER_INFORMATION.from', {
                    name,
                    date: f.at(c.infoRequest.sentAt),
                  })}
                </span>
                <span className="text-fg-strong">{c.infoRequest.message}</span>
                <span className="text-fg-muted mt-2 text-sm">
                  {t('panel.AWAITING_USER_INFORMATION.items')}
                </span>
                <ul className="list-disc space-y-1 pl-5">
                  {c.infoRequest.items.map((i) => (
                    <li key={i}>{i}</li>
                  ))}
                </ul>
              </div>
              {c.due?.info && (
                <Deadline
                  label={t('panel.AWAITING_USER_INFORMATION.due')}
                  dueAt={c.due.info}
                  onExpire={actions.expire}
                />
              )}
            </div>
          )}
          <p className="para-check text-warning flex items-start gap-2 text-sm">
            <TriangleAlert
              size={15}
              aria-hidden="true"
              className="mt-0.5 shrink-0"
            />
            {t('panel.AWAITING_USER_INFORMATION.warning')}
          </p>
          <InfoResponseForm onSubmit={actions.answer} />
          {cancelButton}
        </Frame>
      )

    case 'AWAITING_ACCEPTANCE':
      return (
        <Frame who={who.you} title={t('panel.AWAITING_ACCEPTANCE.title')}>
          <Body>{t('panel.AWAITING_ACCEPTANCE.body')}</Body>
          {c.due?.acceptance && (
            <Deadline
              label={t('panel.AWAITING_ACCEPTANCE.due')}
              dueAt={c.due.acceptance}
              onExpire={actions.expire}
            />
          )}
          <p className="text-fg-muted flex items-start gap-2 text-sm">
            <Info size={15} aria-hidden="true" className="mt-0.5 shrink-0" />
            {t('panel.AWAITING_ACCEPTANCE.principle')}
          </p>
        </Frame>
      )

    case 'COMPLETED':
      return (
        <Frame who={who.closed} title={t('panel.COMPLETED.title')}>
          <Body className="verdict verdict-refund">
            {t(
              c.settlement?.rule === 'AUTO_CONFIRMED'
                ? 'panel.COMPLETED.AUTO_CONFIRMED'
                : 'panel.COMPLETED.USER_ACCEPTED'
            )}
          </Body>
          <Rating rating={c.rating} onRate={actions.rate} />
        </Frame>
      )

    case 'DISPUTED':
      return (
        <Frame
          who={who.admin}
          title={t('panel.DISPUTED.title')}
          icon={<Scale size={13} aria-hidden="true" />}
        >
          <Body className="verdict verdict-waiting">
            {t('panel.DISPUTED.body')}
          </Body>
          {c.dispute && (
            <dl className="grid gap-x-8 gap-y-4 text-sm sm:grid-cols-[10rem_minmax(0,1fr)]">
              <dt className="text-fg-muted">{t('panel.DISPUTED.issue')}</dt>
              <dd className="text-fg-strong font-semibold">
                {c.dispute.issue
                  ? t(`dialogs.report.issues.${c.dispute.issue}`)
                  : t('panel.TERMINATED.challengeIssue')}
              </dd>
              <dt className="text-fg-muted">
                {t('panel.DISPUTED.description')}
              </dt>
              <dd className="text-fg-strong max-w-[65ch]">
                {c.dispute.description}
              </dd>
              <dt className="text-fg-muted">{t('panel.DISPUTED.opened')}</dt>
              <dd className="num text-fg-strong">{f.at(c.dispute.openedAt)}</dd>
            </dl>
          )}
          <p className="text-fg-muted max-w-[65ch] text-sm">
            {t('panel.DISPUTED.sla', { hours: DISPUTE_SLA_HOURS })}{' '}
            {t('panel.DISPUTED.escalation')}
          </p>
        </Frame>
      )

    case 'RESOLVED': {
      const d = c.dispute?.decision
      return (
        <Frame who={who.closed} title={t('panel.RESOLVED.title')}>
          {d && (
            <dl className="grid gap-x-8 gap-y-4 text-sm sm:grid-cols-[10rem_minmax(0,1fr)]">
              <dt className="text-fg-muted">{t('panel.RESOLVED.decision')}</dt>
              <dd className="verdict text-fg-strong font-semibold">
                {t(`settlement.rules.${d.outcome}`)}
              </dd>
              <dt className="text-fg-muted">{t('panel.RESOLVED.reason')}</dt>
              <dd className="text-fg-strong max-w-[65ch]">{d.reason}</dd>
              <dt className="text-fg-muted">{t('panel.RESOLVED.decidedBy')}</dt>
              <dd className="text-fg-strong">{d.decidedBy}</dd>
              <dt className="text-fg-muted">{t('panel.RESOLVED.decidedAt')}</dt>
              <dd className="num text-fg-strong">{f.at(d.decidedAt)}</dd>
            </dl>
          )}
          <Rating rating={c.rating} onRate={actions.rate} />
        </Frame>
      )
    }

    case 'CANCELLED': {
      // No settlement means the client cancelled before paying
      const rule = c.settlement?.rule
      const k =
        rule === 'EXPERT_START_TIMEOUT' ||
        rule === 'USER_CANCELLED_BEFORE_START'
          ? rule
          : 'UNPAID'
      return (
        <Frame who={who.closed} title={t(`panel.CANCELLED.${k}.title`)}>
          <Body className="verdict verdict-refund">
            {t(`panel.CANCELLED.${k}.body`)}
          </Body>
        </Frame>
      )
    }

    case 'TERMINATED': {
      const rule = c.termination ?? 'SYSTEM_ERROR'
      const challenge = c.dispute?.kind === 'USER_NON_RESPONSE_CHALLENGE'
      return (
        <Frame who={who.closed} title={t('panel.TERMINATED.title')}>
          <Body
            className={cn(
              'verdict',
              rule === 'EXPERT_ABANDON' || rule === 'SYSTEM_ERROR'
                ? 'verdict-refund'
                : 'verdict-negative'
            )}
          >
            {t(`panel.TERMINATED.${rule}`)}
          </Body>
          {rule === 'USER_NON_RESPONSE' && !c.settlement && !challenge && (
            <>
              <Body>{t('panel.TERMINATED.challengeBody')}</Body>
              {c.due?.challenge && (
                <Deadline
                  label={t('panel.TERMINATED.challengeDue')}
                  dueAt={c.due.challenge}
                  onExpire={actions.expire}
                />
              )}
              <button
                type="button"
                onClick={actions.requestChallenge}
                className="btn btn-press btn-secondary"
              >
                {t('panel.TERMINATED.challenge')}
              </button>
            </>
          )}
          {challenge && c.dispute && !c.dispute.decision && (
            <>
              <Body className="verdict verdict-waiting">
                {t('panel.TERMINATED.challengeOpen')}
              </Body>
              <dl className="grid gap-x-8 gap-y-4 text-sm sm:grid-cols-[10rem_minmax(0,1fr)]">
                <dt className="text-fg-muted">
                  {t('panel.DISPUTED.description')}
                </dt>
                <dd className="text-fg-strong max-w-[65ch]">
                  {c.dispute.description}
                </dd>
                <dt className="text-fg-muted">{t('panel.DISPUTED.opened')}</dt>
                <dd className="num text-fg-strong">
                  {f.at(c.dispute.openedAt)}
                </dd>
              </dl>
              <p className="text-fg-muted max-w-[65ch] text-sm">
                {t('panel.DISPUTED.sla', { hours: DISPUTE_SLA_HOURS })}
              </p>
            </>
          )}
        </Frame>
      )
    }
  }
}

function InfoResponseForm({ onSubmit }: { onSubmit: (text: string) => void }) {
  const { t } = useTranslation('reviewCase')
  const id = useId()
  const [text, setText] = useState('')
  const [files, setFiles] = useState(0)
  const [error, setError] = useState(false)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!text.trim() && files === 0) return setError(true)
    onSubmit(text.trim())
  }

  return (
    <form noValidate onSubmit={submit} className="border-border border-t pt-6">
      <FormField
        label={t('panel.AWAITING_USER_INFORMATION.response')}
        htmlFor={`${id}-text`}
        hint={t('panel.AWAITING_USER_INFORMATION.responseHint')}
        hintId={`${id}-hint`}
        error={
          error ? t('panel.AWAITING_USER_INFORMATION.required') : undefined
        }
        errorId={`${id}-error`}
      >
        <textarea
          id={`${id}-text`}
          rows={5}
          maxLength={2000}
          value={text}
          aria-invalid={error}
          aria-describedby={error ? `${id}-error` : `${id}-hint`}
          onChange={(e) => {
            setText(e.target.value)
            setError(false)
          }}
          className={cn(fieldClass, 'resize-y')}
        />
      </FormField>
      <FormField
        label={t('panel.AWAITING_USER_INFORMATION.files')}
        htmlFor={`${id}-files`}
        hint={t('panel.AWAITING_USER_INFORMATION.filesHint')}
        hintId={`${id}-files-hint`}
      >
        <FilePicker
          id={`${id}-files`}
          hintId={`${id}-files-hint`}
          onCount={(n) => {
            setFiles(n)
            setError(false)
          }}
        />
      </FormField>
      <button type="submit" className="btn btn-press btn-primary">
        {t('panel.AWAITING_USER_INFORMATION.submit')}
      </button>
    </form>
  )
}

function Stars({ n }: { n: number }) {
  return (
    <span className="flex gap-0.5" aria-hidden="true">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={20}
          className={
            i <= n ? 'fill-indicator text-indicator' : 'text-border-control'
          }
        />
      ))}
    </span>
  )
}

/* Đánh giá một lần sau khi hồ sơ đóng có kết quả; hiện công khai trên hồ sơ chuyên gia */
function Rating({
  rating,
  onRate,
}: {
  rating: ReviewCase['rating']
  onRate: (stars: number, comment: string) => void
}) {
  const { t } = useTranslation('reviewCase')
  const id = useId()
  const [stars, setStars] = useState(0)
  const [comment, setComment] = useState('')
  const [error, setError] = useState(false)

  if (rating)
    return (
      <div className="border-border border-t pt-6">
        <h3 className="eyebrow">{t('rating.yours')}</h3>
        <div className="mt-2 flex items-center gap-3">
          <Stars n={rating.stars} />
          <span className="text-fg-strong text-sm font-semibold">
            {t('rating.star', { count: rating.stars })}
          </span>
        </div>
        {rating.comment && (
          <p className="mt-2 max-w-[65ch]">{rating.comment}</p>
        )}
      </div>
    )

  return (
    <form
      noValidate
      className="border-border border-t pt-6"
      onSubmit={(e) => {
        e.preventDefault()
        if (!stars) return setError(true)
        onRate(stars, comment.trim())
      }}
    >
      <fieldset aria-describedby={error ? `${id}-error` : `${id}-hint`}>
        <legend className="text-fg-strong font-semibold">
          {t('rating.title')}
        </legend>
        <p id={`${id}-hint`} className="text-fg-muted mt-1 text-sm">
          {t('rating.hint')}
        </p>
        <div className="mt-3 flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <label
              key={n}
              className="has-[:focus-visible]:outline-ink relative cursor-pointer rounded p-1 has-[:focus-visible]:outline-2"
            >
              <input
                type="radio"
                name={`${id}-stars`}
                value={n}
                checked={stars === n}
                onChange={() => {
                  setStars(n)
                  setError(false)
                }}
                className="sr-only"
              />
              <Star
                size={28}
                aria-hidden="true"
                className={
                  n <= stars
                    ? 'fill-indicator text-indicator'
                    : 'text-border-control hover:text-indicator'
                }
              />
              <span className="sr-only">{t('rating.star', { count: n })}</span>
            </label>
          ))}
        </div>
        {error && (
          <p
            id={`${id}-error`}
            role="alert"
            className="text-danger mt-1 text-sm"
          >
            {t('rating.required')}
          </p>
        )}
      </fieldset>
      <FormField
        label={t('rating.comment')}
        htmlFor={`${id}-comment`}
        hint={t('rating.commentHint')}
        hintId={`${id}-comment-hint`}
        className="mt-5"
      >
        <textarea
          id={`${id}-comment`}
          rows={3}
          maxLength={1000}
          value={comment}
          aria-describedby={`${id}-comment-hint`}
          onChange={(e) => setComment(e.target.value)}
          className={cn(fieldClass, 'resize-y')}
        />
      </FormField>
      <button type="submit" className="btn btn-press btn-secondary">
        {t('rating.submit')}
      </button>
    </form>
  )
}
