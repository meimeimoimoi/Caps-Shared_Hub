import { focusInvalidField } from '@/lib/validation/formValidation'
import { collectFormIssues } from '@/lib/validation/formIssues'
import { normalizeVietnamPhone } from '@/lib/validation/vietnamPhone'
import { useTranslation } from 'react-i18next'
import { useCallback } from 'react'
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { ApiError } from '@/lib/api-client'
import { authApi } from '@/features/auth/api/authApi'
import { useAuthStore } from '@/features/auth/store/authStore'
import type { RegistrationMessage } from '../types/messages'
import {
  criteria,
  initial,
  PROFILE_STEP,
  DOCUMENTS_STEP,
  DECLARED_CRITERIA,
  REVIEW_STEP,
} from '../constants'
import type { EvidenceFile, Profile } from '../types'
import {
  applicationApi,
  evidenceCode,
  toFields,
  toFiles,
  toProfile,
  type ExpertApplication,
} from '../api/applicationApi'
import { messageFor } from './useApplicationLifecycle'

export interface UseRegistrationFormProps {
  application: ExpertApplication | null
  setApplication: (app: ExpertApplication) => void
}

export type AutoSaveStatus = 'idle' | 'saving' | 'saved' | 'failed'

/** Wait after the last keystroke before saving the draft */
const AUTO_SAVE_DELAY_MS = 1500

/**
 * The application wizard: drafting, and supplementing when more information is requested (same steps,
 * the last one resubmits). Only verified accounts reach it (route guard), so it never asks for verification.
 */
export function useRegistrationForm({
  application,
  setApplication,
}: UseRegistrationFormProps) {
  const { t, i18n } = useTranslation('expertRegistration')
  const supplementing = application?.status === 'NEED_MORE_INFORMATION'
  const user = useAuthStore((s) => s.user)
  const [profile, setProfile] = useState<Profile>(initial)
  const [step, setStep] = useState(0)
  // Furthest step reached: every step up to it stays open, so going back never locks the later ones
  const [furthest, setFurthest] = useState(0)
  // Editing a section from the review step: "continue" saves and goes straight back to review
  const [returnToReview, setReturnToReview] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  // File đang tải lên (chưa có trong phản hồi máy chủ) theo từng nhóm
  const [uploading, setUploading] = useState<Record<string, EvidenceFile[]>>({})
  const [fields, setFields] = useState<string[]>([])
  const [activeCriterion, setActiveCriterion] = useState<string>(criteria[0]!)
  // Agreed declaration codes; the wording shown comes from the server
  const [agreed, setAgreed] = useState<string[]>([])
  // Explanation sent with a supplement (optional when details or files changed)
  const [supplementNote, setSupplementNote] = useState('')
  const [error, setError] = useState<RegistrationMessage | null>(null)
  const [notice, setNotice] = useState<RegistrationMessage | null>(null)
  // Ảnh chọn khi email chưa xác nhận: tải lên lúc nộp (API ảnh đại diện cần tài khoản đã kích hoạt)
  const [avatar, setAvatar] = useState<File | null>(null)
  const [localPreview, setLocalPreview] = useState('')
  const [independent, setIndependent] = useState(true)
  const [draftSaved, setDraftSaved] = useState(false)
  // Auto-save runs only after the user edits something: pre-filled values never create a draft
  const dirty = useRef(false)
  // Set by the first edit in this visit; unlike `dirty`, it is not cleared by saving
  const edited = useRef(false)
  const saving = useRef(false)
  const [autoSave, setAutoSave] = useState<{
    status: AutoSaveStatus
    at?: Date
  }>({ status: 'idle' })
  const [formErrors, setFormErrors] = useState<
    Record<string, RegistrationMessage>
  >({})
  const heading = useRef<HTMLHeadingElement>(null)
  const errorRef = useRef<HTMLParagraphElement>(null)
  // Nạp dữ liệu từ máy chủ một lần cho mỗi hồ sơ (điều chỉnh state ngay khi render, không qua effect);
  // sau đó form là nguồn dữ liệu đang sửa
  const [hydratedKey, setHydratedKey] = useState<string | null>(null)
  const sourceKey = application?.id ?? (user ? `user:${user.id}` : null)
  if (sourceKey && sourceKey !== hydratedKey) {
    setHydratedKey(sourceKey)
    // The first save of a new draft only gives it an id: keep what the user is typing. A reload
    // can also see the account before the saved draft arrives; nothing was typed then, so load it.
    if (application && hydratedKey?.startsWith('user:') && edited.current) {
      // nothing to load
    } else if (application) {
      const next = toProfile(application)
      // Pre-fill the contact phone from the account; filling it does not save the draft
      if (!next.phone && user?.phone) next.phone = user.phone
      setProfile(next)
      setFields(toFields(application))
      setIndependent(!next.company)
    } else if (user) {
      setProfile((p) => ({
        ...p,
        name: p.name || user.name,
        email: user.email,
        phone: p.phone || user.phone || '',
      }))
    }
  }

  useEffect(() => {
    if (error && errorRef.current) {
      errorRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      errorRef.current.focus()
    }
  }, [error])

  const files = useMemo(() => {
    const saved = application ? toFiles(application) : {}
    for (const [key, list] of Object.entries(uploading))
      saved[key] = [...(saved[key] ?? []), ...list]
    return saved
  }, [application, uploading])

  // Statements in the interface language (Vietnamese when the server has none in it)
  const declarationLanguage = i18n.language?.startsWith('en') ? 'en' : 'vi'
  const declarations = useMemo(() => {
    const all = application?.declarations ?? []
    const inLanguage = all.filter((d) => d.language === declarationLanguage)
    const codes = [...new Set(all.map((d) => d.code))]
    return codes.map(
      (code) =>
        inLanguage.find((d) => d.code === code) ??
        all.find((d) => d.code === code)!
    )
  }, [application?.declarations, declarationLanguage])
  const allAgreed =
    declarations.length > 0 && declarations.every((d) => agreed.includes(d.code))

  const editable = !application || application.canEdit || supplementing

  /** Saves the draft when the user changed something; one request at a time, retried after a change. */
  const autoSaveNow = useCallback(async () => {
    if (!dirty.current || saving.current || !editable) return
    saving.current = true
    dirty.current = false
    setAutoSave({ status: 'saving' })
    let failed = false
    try {
      await persistRef.current()
      setAutoSave({ status: 'saved', at: new Date() })
    } catch {
      failed = true
      dirty.current = true
      setAutoSave({ status: 'failed' })
    } finally {
      saving.current = false
      // Edits made while saving are saved right after; a failure waits for "Retry" or the next edit
      if (dirty.current && !failed) void autoSaveNowRef.current()
    }
  }, [editable])
  const autoSaveNowRef = useRef(autoSaveNow)
  autoSaveNowRef.current = autoSaveNow

  useEffect(() => {
    if (!dirty.current) return
    const id = setTimeout(() => void autoSaveNowRef.current(), AUTO_SAVE_DELAY_MS)
    return () => clearTimeout(id)
  }, [profile, fields, independent])

  const validateForm = (form: HTMLFormElement): boolean => {
    const result = collectFormIssues(form)
    const errors: Record<string, RegistrationMessage> = Object.fromEntries(
      Object.entries(result.errors).map(([field, issue]) => [
        field,
        { key: `validation.${issue.code}`, params: issue.params },
      ])
    )
    let firstInvalid = result.firstInvalid
    const phoneInput = form.querySelector<HTMLInputElement>(
      'input[name="phone"]'
    )
    if (phoneInput) {
      const phoneError = !phoneInput.value.trim()
        ? 'validation.phoneRequired'
        : !normalizeVietnamPhone(phoneInput.value)
          ? 'validation.phoneInvalid'
          : undefined
      if (phoneError) {
        errors.phone = { key: phoneError }
        firstInvalid ??= phoneInput
      } else {
        setProfile((current) => ({
          ...current,
          phone:
            normalizeVietnamPhone(phoneInput.value) ?? phoneInput.value.trim(),
        }))
      }
    }
    // The review confirmation says what is missing instead of the generic "required"
    if (errors.confirmed) errors.confirmed = { key: 'validation.confirmed' }
    if (step === PROFILE_STEP) {
      if (!fields.length) errors.expertise = { key: 'validation.expertise' }
      if (!files.CV?.some((f) => !f.uploading))
        errors.CV = { key: 'validation.cv' }
    }
    if (step >= DOCUMENTS_STEP) {
      const missingGroup = criteria.find((criterion) =>
        application?.requiredEvidence.includes(evidenceCode(criterion)) &&
        !files[criterion]?.some((file) => !file.uploading)
      )
      if (missingGroup) {
        errors[missingGroup] = { key: 'validation.evidenceRequired' }
        setActiveCriterion(missingGroup)
        if (step === REVIEW_STEP) setStep(DOCUMENTS_STEP)
      }
      if (!agreed.includes('PROFESSIONAL_CONDUCT')) {
        errors.conduct = { key: 'validation.conductRequired' }
        if (!missingGroup) setActiveCriterion(criteria.find((c) => DECLARED_CRITERIA.includes(evidenceCode(c)))!)
        if (step === REVIEW_STEP) setStep(DOCUMENTS_STEP)
      }
    }
    setFormErrors(errors)
    if (Object.keys(errors).length) {
      requestAnimationFrame(() => focusInvalidField(form, firstInvalid))
      return false
    }
    return true
  }

  const update = (key: keyof Profile, value: string) => {
    dirty.current = true
    edited.current = true
    setProfile((p: Profile) => ({ ...p, [key]: value }))
  }

  function move(next: number) {
    if (next > step) {
      const form = heading.current?.closest('form')
      if (form && !validateForm(form)) return
    }
    setStep(next)
    setFurthest((f) => Math.max(f, next))
    // Leaving the review step to fix something: come back to it, not through every step again
    setReturnToReview(
      next < REVIEW_STEP && (furthest >= REVIEW_STEP || step === REVIEW_STEP)
    )
    setError(null)
    setNotice(null)
    setFormErrors({})
    requestAnimationFrame(() => heading.current?.focus())
  }

  /** Saves the draft; the phone is normalised the same way as when checking the form */
  async function persist() {
    const phone = normalizeVietnamPhone(profile.phone) ?? profile.phone
    const saved = await applicationApi.save(
      { ...profile, phone, company: independent ? '' : profile.company },
      fields
    )
    setApplication(saved)
    return saved
  }
  const persistRef = useRef(persist)
  persistRef.current = persist

  /** Saves right away when leaving a field */
  const flushAutoSave = () => void autoSaveNowRef.current()
  const retryAutoSave = () => {
    dirty.current = true
    void autoSaveNowRef.current()
  }


  async function chooseFiles(key: string, incoming: FileList | null) {
    if (!incoming) return
    const selected = Array.from(incoming)
    if (
      selected.some(
        (f) => !/\.(pdf|png|jpe?g)$/i.test(f.name) || f.size > 10 * 1024 * 1024
      )
    ) {
      setFormErrors((p) => ({ ...p, [key]: { key: 'validation.file' } }))
      return
    }
    clearFormError(key)
    setError(null)
    // Tải lần lượt để thứ tự file giữ đúng như người dùng chọn
    for (const file of selected) {
      const placeholder: EvidenceFile = {
        id: '',
        name: file.name,
        size: file.size,
        canRemove: false,
        uploading: true,
      }
      setUploading((p) => ({ ...p, [key]: [...(p[key] ?? []), placeholder] }))
      try {
        // An upload can create the draft: keep the form as typed when its id arrives
        edited.current = true
        setApplication(await applicationApi.upload(evidenceCode(key), file))
      } catch (e) {
        setFormErrors((p) => ({ ...p, [key]: messageFor(e) }))
      } finally {
        setUploading((p) => ({
          ...p,
          [key]: (p[key] ?? []).filter((x) => x !== placeholder),
        }))
      }
    }
  }

  async function advance(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (submitting) return
    setError(null)

    if (!validateForm(e.currentTarget)) return
    if (step === REVIEW_STEP && !allAgreed) {
      setError({ key: 'validation.confirmed' })
      return
    }

    setSubmitting(true)
    try {
      // Every "Continue" saves the draft so nothing is lost when the page closes
      await persist()
      if (step < REVIEW_STEP) {
        move(returnToReview ? REVIEW_STEP : step + 1)
        return
      }
      await submitNow()
    } catch (err) {
      setError(messageFor(err))
    } finally {
      setSubmitting(false)
    }
  }

  async function addEvidenceLink(criterion: string, sourceUrl: string): Promise<boolean> {
    if (submitting) return false
    setSubmitting(true)
    clearFormError(criterion)
    try {
      edited.current = true
      setApplication(await applicationApi.addLink(evidenceCode(criterion), sourceUrl))
      return true
    } catch (e) {
      const message: RegistrationMessage =
        e instanceof ApiError && e.code === 'EVIDENCE_DUPLICATE'
          ? { key: 'links.duplicate' }
          : messageFor(e)
      setFormErrors((p) => ({ ...p, [criterion]: message }))
      return false
    } finally {
      setSubmitting(false)
    }
  }

  async function submitNow() {
    if (avatar && useAuthStore.getState().user?.status === 'ACTIVE') {
      const url = await authApi.uploadAvatar(avatar)
      useAuthStore.getState().updateUser({ avatarUrl: url })
      setAvatar(null)
    }
    // Only the codes and the language go to the server; it stores its own wording of each statement
    setApplication(
      supplementing
        ? await applicationApi.supplement(
            supplementNote.trim(),
            agreed,
            declarationLanguage
          )
        : await applicationApi.submit(agreed, declarationLanguage)
    )
    setAgreed([])
    setSupplementNote('')
    if (supplementing) setNotice({ key: 'messages.supplementSent' })
  }

  function clearFormError(key: string) {
    setFormErrors((p) => {
      if (!p[key]) return p
      const next = { ...p }
      delete next[key]
      return next
    })
  }

  async function updateAvatar(f: File | null, preview: string) {
    setLocalPreview(preview)
    setAvatar(f)
    if (!f || useAuthStore.getState().user?.status !== 'ACTIVE') return
    try {
      const url = await authApi.uploadAvatar(f)
      useAuthStore.getState().updateUser({ avatarUrl: url })
      setAvatar(null)
    } catch {
      setError({ key: 'personal.photoError' })
    }
  }

  function setIndependentStatus(val: boolean) {
    dirty.current = true
    edited.current = true
    setIndependent(val)
    if (val) update('company', '')
  }

  function toggleField(f: string) {
    dirty.current = true
    edited.current = true
    setFields((p) => (p.includes(f) ? p.filter((x) => x !== f) : [...p, f]))
    clearFormError('expertise')
  }

  async function removeFile(criterion: string, i: number) {
    const item = files[criterion]?.[i]
    if (!item?.id || !item.canRemove) return
    try {
      setApplication(await applicationApi.remove(item.id))
    } catch (e) {
      setError(messageFor(e))
    }
  }

  function toggleAgreed(code: string, val: boolean) {
    setAgreed((p) => (val ? [...new Set([...p, code])] : p.filter((c) => c !== code)))
    clearFormError('confirmed')
    if (code === 'PROFESSIONAL_CONDUCT') clearFormError('conduct')
  }

  async function saveDraft() {
    if (submitting) return
    setSubmitting(true)
    setError(null)
    try {
      await persist()
      // Confirmed inline next to the button (WizardFooter), not as a page-wide notice
      setDraftSaved(true)
      setTimeout(() => setDraftSaved(false), 4000)
    } catch (e) {
      setError(messageFor(e))
    } finally {
      setSubmitting(false)
    }
  }

  return {
    profile,
    step,
    submitting,
    files,
    fields,
    activeCriterion,
    setActiveCriterion,
    declarations,
    agreed,
    allAgreed,
    toggleAgreed,
    supplementing,
    supplementNote,
    setSupplementNote,
    autoSave,
    flushAutoSave,
    retryAutoSave,
    error: error ? t(error.key, error.params) : '',
    setError,
    notice: notice ? t(notice.key, notice.params) : '',
    avatar,
    avatarPreview: localPreview || user?.avatarUrl || '',
    independent,
    draftSaved,
    formErrors: Object.fromEntries(
      Object.entries(formErrors).map(([field, issue]) => [
        field,
        t(issue.key, issue.params),
      ])
    ),
    heading,
    errorRef,
    validateForm,
    update,
    move,
    furthest,
    returnToReview,
    chooseFiles,
    addCvLink: (url: string) => addEvidenceLink('CV', url),
    addEvidenceLink,
    advance,
    clearFormError,
    updateAvatar,
    setIndependentStatus,
    toggleField,
    removeFile,
    saveDraft,
  }
}
