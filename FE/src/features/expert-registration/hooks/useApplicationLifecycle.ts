import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { ApiError } from '@/lib/api-client'
import { useFormatters } from '@/hooks/useFormatters'
import { criterionKey, labels } from '../constants'
import type { Stage } from '../types'
import type { RegistrationMessage } from '../types/messages'
import {
  applicationApi,
  criterionOf,
  stageOf,
  SUPPLEMENT_CODE,
  type ApplicationStatus,
  type ExpertApplication,
} from '../api/applicationApi'

/** i18n key of a Gate 1 criterion label (EV-01…EV-06) */
export function eligibilityCriterionKey(code: string) {
  return code === 'EV-06'
    ? 'criteria.experience'
    : criterionKey(criterionOf(code) ?? '')
}

/** Maps API errors to the shared i18n messages of the expert registration page */
export function messageFor(e: unknown): RegistrationMessage {
  if (e instanceof ApiError) {
    if (e.status === 429) return { key: 'messages.tooManyRequests' }
    if (e.status == null || e.status >= 500)
      return { key: 'messages.unavailable' }
    switch (e.code) {
      case 'EMAIL_DISPOSABLE':
        return { key: 'messages.emailDisposable' }
      case 'EMAIL_DOMAIN_INVALID':
        return { key: 'messages.emailDomain' }
      case 'EMAIL_NOT_VERIFIED':
        return { key: 'messages.verifyBeforeSubmit' }
      case 'APPLICATION_INCOMPLETE':
        return { key: 'messages.incomplete' }
      case 'APPLICATION_LOCKED':
        return { key: 'messages.locked' }
      case 'MATERIAL_CHANGE_REQUIRED':
        // The review step's warning names the criteria (from changesRequired), so the message stays general
        return { key: 'messages.materialChange' }
      case 'ALREADY_ELIGIBLE':
        return { key: 'messages.alreadyEligible' }
      case 'EVIDENCE_INVALID_TYPE':
      case 'EVIDENCE_TOO_LARGE':
        return { key: 'validation.file' }
      case 'EVIDENCE_DUPLICATE':
        return { key: 'validation.duplicateCv' }
      case 'EVIDENCE_INVALID_URL':
        return { key: 'links.invalid' }
      case 'EVIDENCE_LIMIT':
        return { key: 'messages.fileLimit' }
    }
  }
  return { key: 'messages.failed' }
}

const STATUS_LABEL: Record<ApplicationStatus, Stage> = {
  DRAFT: 'screening',
  SUBMITTED: 'eligibility',
  AI_SCREENING: 'screening',
  NEED_MORE_INFORMATION: 'additional',
  NOT_ELIGIBLE: 'ineligible',
  ELIGIBLE: 'eligible',
  CAPABILITY_REVIEW: 'competency',
  APPROVED: 'approved',
  REJECTED: 'failed',
}

export interface UseApplicationLifecycleProps {
  application: ExpertApplication | null
  setApplication: (app: ExpertApplication) => void
}

export function useApplicationLifecycle({
  application,
  setApplication,
}: UseApplicationLifecycleProps) {
  const { t } = useTranslation('expertRegistration')
  const format = useFormatters()
  // Chỉ dùng ở chế độ demo khi dev: xem thử giao diện các giai đoạn, không đổi dữ liệu thật

  const [supplement, setSupplement] = useState(false)
  const [supplementFile, setSupplementFile] = useState<File | null>(null)
  const [explanation, setExplanation] = useState('')

  const [error, setError] = useState<RegistrationMessage | null>(null)
  const [notice, setNotice] = useState<RegistrationMessage | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const errorRef = useRef<HTMLParagraphElement>(null)

  useEffect(() => {
    if (error && errorRef.current) {
      errorRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      errorRef.current.focus()
    }
  }, [error])

  const submitted = !!application && application.status !== 'DRAFT'
  const stage: Stage = application ? stageOf(application.status) : 'screening'

  const history = (application?.history ?? [])
    .filter((h) => h.fromStatus != null)
    .map((h) => {
      const when = format.timestamp(h.at, 'Asia/Ho_Chi_Minh')
      const label = t(labels[STATUS_LABEL[h.toStatus]])
      return h.note ? `${when} · ${label}: ${h.note}` : `${when} · ${label}`
    })

  // Gate 1 requirements to supplement or not met, with the reviewer's note (BR-E28); NOT_APPLICABLE needs no action
  const eligibilityIssues = (application?.eligibility ?? [])
    .filter(
      (c): c is typeof c & { result: 'FAIL' | 'NEED_MORE_INFORMATION' } =>
        c.result === 'FAIL' || c.result === 'NEED_MORE_INFORMATION'
    )
    .map((c) => {
      const key = eligibilityCriterionKey(c.code)
      return {
        code: c.code,
        label: key ? t(key) : c.code,
        result: c.result,
        note: c.note ?? '',
      }
    })
  const reapplyAt = application?.earliestReapplyAt
    ? format.timestamp(application.earliestReapplyAt, 'Asia/Ho_Chi_Minh')
    : null
  const decidedAt = application?.decidedAt
    ? format.timestamp(application.decidedAt, 'Asia/Ho_Chi_Minh')
    : null

  async function submitSupplement(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (submitting) return
    if (!supplementFile && !explanation.trim()) {
      setError({ key: 'validation.supplement' })
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      if (supplementFile)
        await applicationApi.upload(SUPPLEMENT_CODE, supplementFile)
      setApplication(await applicationApi.supplement(explanation.trim()))
      setSupplement(false)
      setSupplementFile(null)
      setExplanation('')
      setNotice({ key: 'messages.supplementSent' })
    } catch (err) {
      setError(messageFor(err))
    } finally {
      setSubmitting(false)
    }
  }

  return {
    submitted,
    stage,
    history,
    eligibilityIssues,
    reapplyAt,
    decidedAt,
    decisionNote: application?.decisionNote ?? null,
    supplement,
    supplementFile,
    setSupplementFile,
    explanation,
    setExplanation,
    error: error ? t(error.key, error.params) : '',
    setError,
    notice: notice ? t(notice.key, notice.params) : '',
    setNotice,
    submitting,
    errorRef,
    submitSupplement,
    requestSupplement: () => setSupplement(true),
    cancelSupplement: () => setSupplement(false),
  }
}
