import { collectFormErrors, focusInvalidField } from '@/lib/validation/formValidation'
import { normalizeVietnamPhone, vietnamPhoneError } from '@/lib/validation/vietnamPhone'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { criteria, initial } from '../constants'
import type { Profile } from '../types'

export interface UseRegistrationFormProps {
  onRegistrationSubmit: () => void
}

export function useRegistrationForm({ onRegistrationSubmit }: UseRegistrationFormProps) {
  const [profile, setProfile] = useState<Profile>(initial)
  const [step, setStep] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [files, setFiles] = useState<Record<string, File[]>>({})
  const [fields, setFields] = useState<string[]>([])
  const [activeCriterion, setActiveCriterion] = useState(criteria[0]!)
  const [confirmed, setConfirmed] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [avatar, setAvatar] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState('')
  const [independent, setIndependent] = useState(true)
  const [draftSaved, setDraftSaved] = useState(false)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const heading = useRef<HTMLHeadingElement>(null)
  const errorRef = useRef<HTMLParagraphElement>(null)

  useEffect(() => {
    if (error && errorRef.current) {
      errorRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      errorRef.current.focus()
    }
  }, [error])

  const validateForm = (form: HTMLFormElement): boolean => {
    const result = collectFormErrors(form)
    const errors = result.errors
    let firstInvalid = result.firstInvalid
    const phoneInput = form.querySelector<HTMLInputElement>('input[name="phone"]')
    if (phoneInput) {
      const phoneError = vietnamPhoneError(phoneInput.value)
      if (phoneError) {
        errors.phone = phoneError
        firstInvalid ??= phoneInput
      } else {
        setProfile((current) => ({ ...current, phone: normalizeVietnamPhone(phoneInput.value) ?? phoneInput.value.trim() }))
      }
    }
    if (step === 1) {
      if (!fields.length) errors.expertise = 'Select at least one area of expertise.'
      if (!files.CV?.length) errors.CV = 'Choose your CV to continue.'
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
    setError('')
    setNotice('')
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
      setFormErrors((p) => ({ ...p, [key]: 'This file selection could not be added. Choose PDF, JPG or PNG files, each no larger than 10 MB.' }))
      return
    }
    setFiles((p) => ({ ...p, [key]: [...(p[key] ?? []), ...selected] }))
    clearFormError(key)
    setError('')
  }

  function advance(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (submitting) return
    setError('')

    if (!validateForm(e.currentTarget)) return

    if (step < 3) {
      move(step + 1)
      return
    }
    if (!confirmed) {
      setError('Confirm that your application is accurate before continuing.')
      return
    }
    setSubmitting(true)
    setTimeout(() => {
      setSubmitting(false)
      onRegistrationSubmit()
    }, 800)
  }

  function clearFormError(key: string) {
    if (formErrors[key]) setFormErrors((p) => ({ ...p, [key]: '' }))
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
    setFields((p) => p.includes(f) ? p.filter((x) => x !== f) : [...p, f])
    clearFormError('expertise')
  }

  function removeFile(criterion: string, i: number) {
    setFiles((p) => ({ ...p, [criterion]: p[criterion]!.filter((_, n) => n !== i) }))
  }

  function toggleConfirmed(val: boolean) {
    setConfirmed(val)
    if (formErrors.confirmed) setFormErrors((p) => ({ ...p, confirmed: '' }))
  }

  function saveDraft() {
    setDraftSaved(true)
    setNotice('Draft saved in memory for this session. Nothing was sent to the server.')
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
    error,
    setError,
    notice,
    avatar,
    avatarPreview,
    independent,
    draftSaved,
    formErrors,
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
