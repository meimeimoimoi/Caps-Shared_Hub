import { focusInvalidField } from '@/lib/validation/formValidation'
import { collectFormIssues } from '@/lib/validation/formIssues'
import { normalizeVietnamPhone } from '@/lib/validation/vietnamPhone'
import { useTranslation } from 'react-i18next'
import type { RegistrationMessage } from '../types/messages'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { criteria, initial } from '../constants'
import type { Profile } from '../types'

export interface UseRegistrationFormProps {
  onRegistrationSubmit: () => void
}

export function useRegistrationForm({
  onRegistrationSubmit,
}: UseRegistrationFormProps) {
  const { t } = useTranslation('expertRegistration')
  const [profile, setProfile] = useState<Profile>(initial)
  const [step, setStep] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [files, setFiles] = useState<Record<string, File[]>>({})
  const [fields, setFields] = useState<string[]>([])
  const [activeCriterion, setActiveCriterion] = useState<string>(criteria[0]!)
  const [confirmed, setConfirmed] = useState(false)
  const [error, setError] = useState<RegistrationMessage | null>(null)
  const [notice, setNotice] = useState<RegistrationMessage | null>(null)
  const [avatar, setAvatar] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState('')
  const [independent, setIndependent] = useState(true)
  const [draftSaved, setDraftSaved] = useState(false)
  const [formErrors, setFormErrors] = useState<
    Record<string, RegistrationMessage>
  >({})
  const heading = useRef<HTMLHeadingElement>(null)
  const errorRef = useRef<HTMLParagraphElement>(null)

  useEffect(() => {
    if (error && errorRef.current) {
      errorRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      errorRef.current.focus()
    }
  }, [error])

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
      if (!files.CV?.length) errors.CV = { key: 'validation.cv' }
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

  function chooseFiles(key: string, incoming: FileList | null) {
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
    setFiles((p) => ({ ...p, [key]: [...(p[key] ?? []), ...selected] }))
    clearFormError(key)
    setError(null)
  }

  function advance(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (submitting) return
    setError(null)

    if (!validateForm(e.currentTarget)) return

    if (step < 3) {
      move(step + 1)
      return
    }
    if (!confirmed) {
      setError({ key: 'validation.confirmed' })
      return
    }
    setSubmitting(true)
    setTimeout(() => {
      setSubmitting(false)
      onRegistrationSubmit()
    }, 800)
  }

  function clearFormError(key: string) {
    if (formErrors[key])
      setFormErrors((p) => {
        const next = { ...p }
        delete next[key]
        return next
      })
  }

  function updateAvatar(f: File | null, preview: string) {
    setAvatar(f)
    setAvatarPreview(preview)
  }

  function setIndependentStatus(val: boolean) {
    setIndependent(val)
    if (val) update('company', '')
  }

  function toggleField(f: string) {
    setFields((p) => (p.includes(f) ? p.filter((x) => x !== f) : [...p, f]))
    clearFormError('expertise')
  }

  function removeFile(criterion: string, i: number) {
    setFiles((p) => ({
      ...p,
      [criterion]: p[criterion]!.filter((_, n) => n !== i),
    }))
  }

  function toggleConfirmed(val: boolean) {
    setConfirmed(val)
    clearFormError('confirmed')
  }

  function saveDraft() {
    setDraftSaved(true)
    setNotice({ key: 'messages.draftSaved' })
    setTimeout(() => setDraftSaved(false), 2000)
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
    avatarPreview,
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
