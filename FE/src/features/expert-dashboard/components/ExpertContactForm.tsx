import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { ApiError } from '@/lib/api-client'
import { formControlClassName as inputCls } from '@/components/ui/forms/form-control'
import { FormField } from '@/components/ui/forms/form-field'
import {
  formatVietnamPhone,
  normalizeVietnamPhone,
} from '@/lib/validation/vietnamPhone'
// Direct file import: the expert-context index re-exports hooks that import the auth feature
import { updateExpertContact } from '@/features/expert-context/api/expertContextApi'
import { PhoneAccountNotice } from '@/features/auth/components/PhoneAccountNotice'

/* Professional name and contact phone shown to reviewers and customers. Saving does not reopen any
 * review, and submitted applications keep the details they were reviewed with. */
export function ExpertContactForm({
  displayName,
  phone,
  onSaved,
}: {
  displayName: string
  phone: string | null | undefined
  onSaved: () => void
}) {
  const { t } = useTranslation('expert')
  const [name, setName] = useState(displayName)
  const [contactPhone, setContactPhone] = useState(
    phone ? formatVietnamPhone(phone) : ''
  )
  const [errors, setErrors] = useState<{ name?: string; phone?: string }>({})
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<'saved' | 'failed' | null>(null)

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const normalized = normalizeVietnamPhone(contactPhone)
    const next = {
      name: name.trim() ? undefined : t('contact.nameRequired'),
      phone: !contactPhone.trim()
        ? t('contact.phoneRequired')
        : normalized
          ? undefined
          : t('contact.phoneInvalid'),
    }
    setErrors(next)
    if (next.name || next.phone || !normalized) return
    setSaving(true)
    setMessage(null)
    try {
      await updateExpertContact({ displayName: name.trim(), phone: normalized })
      setMessage('saved')
      onSaved()
    } catch (e) {
      setMessage('failed')
      if (e instanceof ApiError && e.code === 'CONTACT_REQUIRED')
        setErrors({ name: t('contact.nameRequired') })
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} noValidate className="mt-2 grid max-w-[560px] gap-4">
      <FormField
        htmlFor="expert-contact-name"
        label={t('fullName')}
        hint={t('contact.nameHint')}
        error={errors.name}
        errorId="expert-contact-name-error"
      >
        <input
          id="expert-contact-name"
          value={name}
          maxLength={128}
          autoComplete="name"
          onChange={(e) => setName(e.target.value)}
          aria-invalid={errors.name ? true : undefined}
          className={inputCls}
        />
      </FormField>
      <FormField
        htmlFor="expert-contact-phone"
        label={t('contact.phone')}
        hint={t('contact.phoneHint')}
        error={errors.phone}
        errorId="expert-contact-phone-error"
      >
        <input
          id="expert-contact-phone"
          type="tel"
          value={contactPhone}
          maxLength={32}
          autoComplete="tel"
          onChange={(e) => setContactPhone(e.target.value)}
          aria-invalid={errors.phone ? true : undefined}
          className={inputCls}
        />
        <PhoneAccountNotice phone={contactPhone} />
      </FormField>
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          aria-busy={saving}
          className="ep-button ep-button-primary"
        >
          {saving ? t('contact.saving') : t('contact.save')}
        </button>
        <span role="status" className="text-[13px] text-[var(--ep-muted)]">
          {message === 'saved'
            ? t('contact.saved')
            : message === 'failed'
              ? t('contact.failed')
              : ''}
        </span>
      </div>
    </form>
  )
}

export default ExpertContactForm
