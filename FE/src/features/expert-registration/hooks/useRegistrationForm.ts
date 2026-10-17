import { focusInvalidField } from '@/lib/validation/formValidation'
import { collectFormIssues } from '@/lib/validation/formIssues'
import { normalizeVietnamPhone } from '@/lib/validation/vietnamPhone'
import { useTranslation } from 'react-i18next'
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { ApiError } from '@/lib/api-client'
import { authApi } from '@/features/auth/api/authApi'
import { useAuthStore } from '@/features/auth/store/authStore'
import type { RegistrationMessage } from '../types/messages'
import { criteria, initial } from '../constants'
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

export type VerifyPurpose = 'submit' | 'upload'

export interface UseRegistrationFormProps {
  application: ExpertApplication | null
  setApplication: (app: ExpertApplication) => void
  syncVerifiedSession: () => Promise<void>
}

export function useRegistrationForm({
  application,
  setApplication,
  syncVerifiedSession,
}: UseRegistrationFormProps) {
  const { t } = useTranslation('expertRegistration')
  const user = useAuthStore((s) => s.user)
  const [profile, setProfile] = useState<Profile>(initial)
  const [step, setStep] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  // File đang tải lên (chưa có trong phản hồi máy chủ) theo từng nhóm
  const [uploading, setUploading] = useState<Record<string, EvidenceFile[]>>({})
  const [fields, setFields] = useState<string[]>([])
  const [activeCriterion, setActiveCriterion] = useState<string>(criteria[0]!)
  const [confirmed, setConfirmed] = useState(false)
  const [error, setError] = useState<RegistrationMessage | null>(null)
  const [notice, setNotice] = useState<RegistrationMessage | null>(null)
  // Ảnh chọn khi email chưa xác nhận: tải lên lúc nộp (API ảnh đại diện cần tài khoản đã kích hoạt)
  const [avatar, setAvatar] = useState<File | null>(null)
  const [localPreview, setLocalPreview] = useState('')
  const [independent, setIndependent] = useState(true)
  const [draftSaved, setDraftSaved] = useState(false)
  // The code dialog opens when submitting, or when uploading past the unverified file limit;
  // once verified it submits (submit) or just closes so uploading can continue (upload)
  const [verifyOpen, setVerifyOpen] = useState(false)
  const [verifyPurpose, setVerifyPurpose] = useState<VerifyPurpose>('submit')
  // Nhập mã và tín hiệu "đã xác nhận" có thể báo cùng lúc: chỉ nộp một lần
  const verifyCheck = useRef(false)
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
    if (application) {
      const next = toProfile(application)
      setProfile(next)
      setFields(toFields(application))
      setIndependent(!next.company)
    } else if (user) {
      setProfile((p) => ({
        ...p,
        name: p.name || user.name,
        email: user.email,
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
    if (step === 1) {
      if (!fields.length) errors.expertise = { key: 'validation.expertise' }
      if (!files.CV?.some((f) => !f.uploading))
        errors.CV = { key: 'validation.cv' }
    }
    setFormErrors(errors)
    if (Object.keys(errors).length) {
      requestAnimationFrame(() => focusInvalidField(form, firstInvalid))
      return false
    }
    return true
  }

  const update = (key: keyof Profile, value: string) =>
    setProfile((p: Profile) => ({ ...p, [key]: value }))

  function move(next: number) {
    setStep(next)
    setError(null)
    setNotice(null)
    setFormErrors({})
    requestAnimationFrame(() => heading.current?.focus())
  }

  /** Lưu nháp lên máy chủ; số điện thoại chuẩn hóa giống lúc kiểm tra form */
  async function persist() {
    const phone = normalizeVietnamPhone(profile.phone) ?? profile.phone
    const saved = await applicationApi.save(
      { ...profile, phone, company: independent ? '' : profile.company },
      fields
    )
    setApplication(saved)
    return saved
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
        setApplication(await applicationApi.upload(evidenceCode(key), file))
      } catch (e) {
        setFormErrors((p) => ({ ...p, [key]: messageFor(e) }))
        // The remaining files would hit the same limit: ask for verification instead
        if (e instanceof ApiError && e.code === 'EVIDENCE_LIMIT_UNVERIFIED') {
          setVerifyPurpose('upload')
          setVerifyOpen(true)
          break
        }
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
    if (step === 3 && !confirmed) {
      setError({ key: 'validation.confirmed' })
      return
    }

    setSubmitting(true)
    try {
      // Mỗi lần "Tiếp tục" đều lưu nháp để không mất dữ liệu khi đóng trang
      const saved = await persist()
      if (step < 3) {
        move(step + 1)
        return
      }
      // The expert service reads verification from the token: refresh it first in case the
      // email was verified in another tab or on another device, then re-read the application
      const verified = saved.emailVerified || (await refreshVerification())
      if (!verified) {
        setVerifyPurpose('submit')
        setVerifyOpen(true)
        return
      }
      await submitNow()
    } catch (err) {
      setError(messageFor(err))
    } finally {
      setSubmitting(false)
    }
  }

  async function submitNow() {
    await syncVerifiedSession()
    if (avatar && useAuthStore.getState().user?.status === 'ACTIVE') {
      const url = await authApi.uploadAvatar(avatar)
      useAuthStore.getState().updateUser({ avatarUrl: url })
      setAvatar(null)
    }
    setApplication(await applicationApi.submit())
  }

  /** Refreshes the session and reports whether the application now sees a verified email. */
  async function refreshVerification() {
    await syncVerifiedSession()
    const latest = await applicationApi.get()
    if (latest) setApplication(latest)
    return !!latest?.emailVerified
  }

  /** Runs after the code is entered or the link is opened (another tab): once verified, closes the
   * dialog and submits, or only lifts the upload limit when the dialog was opened by an upload. */
  async function checkVerifiedAndSubmit() {
    if (verifyCheck.current) return
    verifyCheck.current = true
    try {
      await syncVerifiedSession()
      const latest = await applicationApi.get()
      if (latest) setApplication(latest)
      if (!latest?.emailVerified) return
      if (verifyPurpose === 'upload') {
        setVerifyOpen(false)
        setFormErrors((p) =>
          Object.fromEntries(
            Object.entries(p).filter(
              ([, issue]) => issue.key !== 'messages.verifyForMoreFiles'
            )
          )
        )
        return
      }
      if (latest.status !== 'DRAFT') return
      setVerifyOpen(false)
      setSubmitting(true)
      setError(null)
      await submitNow()
    } catch (err) {
      setError(messageFor(err))
    } finally {
      verifyCheck.current = false
      setSubmitting(false)
    }
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
    setIndependent(val)
    if (val) update('company', '')
  }

  function toggleField(f: string) {
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

  function toggleConfirmed(val: boolean) {
    setConfirmed(val)
    clearFormError('confirmed')
  }

  async function saveDraft() {
    if (submitting) return
    setSubmitting(true)
    setError(null)
    try {
      await persist()
      setDraftSaved(true)
      setNotice({ key: 'messages.draftSaved' })
      setTimeout(() => setDraftSaved(false), 2000)
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
    confirmed,
    error: error ? t(error.key, error.params) : '',
    setError,
    notice: notice ? t(notice.key, notice.params) : '',
    avatar,
    avatarPreview: localPreview || user?.avatarUrl || '',
    independent,
    draftSaved,
    verifyOpen,
    verifyPurpose,
    closeVerify: () => setVerifyOpen(false),
    checkVerifiedAndSubmit,
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
    chooseFiles,
    advance,
    clearFormError,
    updateAvatar,
    setIndependentStatus,
    toggleField,
    removeFile,
    toggleConfirmed,
    saveDraft,
  }
}
