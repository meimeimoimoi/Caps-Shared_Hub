import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Modal } from '@/components/ui/feedback/modal'
import { CustomSelect } from '@/components/ui/forms/custom-select'
import { FormField } from '@/components/ui/forms/form-field'
import { cn } from '@/lib/utils'
import { SETTLEMENT_POLICY, settle } from '../settlement'
import type { IssueCode } from '../types'
import { fieldClass, useCaseFormat } from '../ui'

const ISSUES: IssueCode[] = [
  'DELIVERABLE_INCOMPLETE',
  'SLA_BREACH',
  'OBLIGATION_NOT_MET',
  'PROFESSIONAL_JUDGMENT',
]

export function AcceptDialog({
  onConfirm,
  onClose,
}: {
  onConfirm: () => void
  onClose: () => void
}) {
  const { t } = useTranslation(['reviewCase', 'common'])
  return (
    <Modal
      title={t('dialogs.accept.title')}
      description={t('dialogs.accept.body')}
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} className="btn btn-secondary">
            {t('common:actions.cancel')}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="btn btn-press btn-primary"
          >
            {t('dialogs.accept.confirm')}
          </button>
        </>
      }
    />
  )
}

export function CancelDialog({
  amount,
  onConfirm,
  onClose,
}: {
  amount: number
  onConfirm: () => void
  onClose: () => void
}) {
  const { t } = useTranslation('reviewCase')
  const f = useCaseFormat()
  const s = settle(amount, 'USER_CANCELLED')
  const pct = SETTLEMENT_POLICY.USER_CANCELLED.split
  return (
    <Modal
      title={t('dialogs.cancel.title')}
      description={t('dialogs.cancel.body')}
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} className="btn btn-secondary">
            {t('dialogs.cancel.keep')}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="btn btn-press bg-danger text-paper hover:opacity-90"
          >
            {t('dialogs.cancel.confirm')}
          </button>
        </>
      }
    >
      <dl className="mt-4 text-sm">
        {(
          [
            ['refund', s.refund, pct[0]],
            ['expert', s.expert, pct[1]],
            ['platform', s.platform, pct[2]],
          ] as const
        ).map(([k, v, p]) => (
          <div
            key={k}
            className="border-border-subtle flex justify-between gap-4 border-b py-2.5"
          >
            <dt>
              {t(`settlement.${k}`)}{' '}
              <span className="num text-fg-muted">{p}%</span>
            </dt>
            <dd className="num text-fg-strong font-semibold">{f.money(v)}</dd>
          </div>
        ))}
      </dl>
    </Modal>
  )
}

/** Withdraw or cancel before the expert starts: nothing is charged, or the payment is refunded in full */
export function EarlyCancelDialog({
  stage,
  onConfirm,
  onClose,
}: {
  stage: 'PENDING_EXPERT_RESPONSE' | 'AWAITING_PAYMENT' | 'PAYMENT_CONFIRMED'
  onConfirm: () => void
  onClose: () => void
}) {
  const { t } = useTranslation('reviewCase')
  return (
    <Modal
      title={t(`dialogs.earlyCancel.${stage}.title`)}
      description={t(`dialogs.earlyCancel.${stage}.body`)}
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} className="btn btn-secondary">
            {t('dialogs.earlyCancel.keep')}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="btn btn-press bg-danger text-paper hover:opacity-90"
          >
            {t(`dialogs.earlyCancel.${stage}.confirm`)}
          </button>
        </>
      }
    />
  )
}

/** Challenge a USER_NON_RESPONSE termination; opens a separate dispute and the case stays TERMINATED */
export function ChallengeDialog({
  onSubmit,
  onClose,
}: {
  onSubmit: (description: string) => void
  onClose: () => void
}) {
  const { t } = useTranslation(['reviewCase', 'common'])
  const id = useId()
  const [text, setText] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const textError = submitted && text.trim().length < 20

  return (
    <Modal
      title={t('dialogs.challenge.title')}
      description={t('dialogs.challenge.body')}
      onClose={onClose}
      onSubmit={() => {
        setSubmitted(true)
        if (text.trim().length >= 20) onSubmit(text.trim())
      }}
      footer={
        <>
          <button type="button" onClick={onClose} className="btn btn-secondary">
            {t('common:actions.cancel')}
          </button>
          <button type="submit" className="btn btn-press btn-primary">
            {t('dialogs.challenge.submit')}
          </button>
        </>
      }
    >
      <FormField
        label={t('dialogs.challenge.description')}
        htmlFor={`${id}-desc`}
        hint={t('dialogs.challenge.descriptionHint')}
        hintId={`${id}-hint`}
        error={textError ? t('dialogs.report.descriptionRequired') : undefined}
        errorId={`${id}-error`}
        className="mt-5 mb-0"
      >
        <textarea
          id={`${id}-desc`}
          rows={4}
          maxLength={2000}
          value={text}
          aria-invalid={textError}
          aria-describedby={textError ? `${id}-error` : `${id}-hint`}
          onChange={(e) => setText(e.target.value)}
          className={cn(fieldClass, 'resize-y')}
        />
      </FormField>
    </Modal>
  )
}

export function ReportDialog({
  onSubmit,
  onClose,
}: {
  onSubmit: (issue: IssueCode, description: string) => void
  onClose: () => void
}) {
  const { t } = useTranslation(['reviewCase', 'common'])
  const id = useId()
  const [issue, setIssue] = useState<IssueCode | ''>('')
  const [text, setText] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const issueError = submitted && !issue
  const textError = submitted && text.trim().length < 20

  return (
    <Modal
      title={t('dialogs.report.title')}
      description={t('dialogs.report.body')}
      onClose={onClose}
      onSubmit={() => {
        setSubmitted(true)
        if (issue && text.trim().length >= 20) onSubmit(issue, text.trim())
      }}
      footer={
        <>
          <button type="button" onClick={onClose} className="btn btn-secondary">
            {t('common:actions.cancel')}
          </button>
          <button type="submit" className="btn btn-press btn-primary">
            {t('dialogs.report.submit')}
          </button>
        </>
      }
    >
      <div className="mt-5">
        <CustomSelect
          label={t('dialogs.report.issue')}
          placeholder={t('dialogs.report.issuePlaceholder')}
          value={issue}
          options={ISSUES.map((v) => ({
            value: v,
            label: t(`dialogs.report.issues.${v}`),
          }))}
          onChange={setIssue}
          error={issueError ? t('dialogs.report.issueRequired') : undefined}
          className="mb-[22px] flex flex-col gap-[7px] text-sm font-semibold"
        />
        <FormField
          label={t('dialogs.report.description')}
          htmlFor={`${id}-desc`}
          hint={t('dialogs.report.descriptionHint')}
          hintId={`${id}-hint`}
          error={
            textError ? t('dialogs.report.descriptionRequired') : undefined
          }
          errorId={`${id}-error`}
          className="mb-0"
        >
          <textarea
            id={`${id}-desc`}
            rows={4}
            maxLength={2000}
            value={text}
            aria-invalid={textError}
            aria-describedby={textError ? `${id}-error` : `${id}-hint`}
            onChange={(e) => setText(e.target.value)}
            className={cn(fieldClass, 'resize-y')}
          />
        </FormField>
      </div>
    </Modal>
  )
}
