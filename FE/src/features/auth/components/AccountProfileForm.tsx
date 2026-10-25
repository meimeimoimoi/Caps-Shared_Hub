import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { formControlClassName as inputCls } from '@/components/ui/forms/form-control'
import { FormField } from '@/components/ui/forms/form-field'
import {
  formatVietnamPhone,
  normalizeVietnamPhone,
} from '@/lib/validation/vietnamPhone'
import { authApi } from '../api/authApi'
import { useAuthStore } from '../store/authStore'

/* Name and phone of the signed-in account (every role uses the same API). The email stays read-only. */
export function AccountProfileForm() {
  const { t } = useTranslation('auth')
  const user = useAuthStore((s) => s.user)
  const updateUser = useAuthStore((s) => s.updateUser)
  const [name, setName] = useState(user?.name ?? '')
  const [phone, setPhone] = useState(
    user?.phone ? formatVietnamPhone(user.phone) : ''
  )
  const [errors, setErrors] = useState<{ name?: string; phone?: string }>({})
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<'saved' | 'failed' | null>(null)

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    // The phone is optional for an account; when given it must be a valid Vietnamese number
    const normalized = phone.trim() ? normalizeVietnamPhone(phone) : null
    const next = {
      name: name.trim() ? undefined : t('accountProfile.nameRequired'),
      phone:
        phone.trim() && !normalized ? t('accountProfile.phoneInvalid') : undefined,
    }
    setErrors(next)
    if (next.name || next.phone) return
    setSaving(true)
    setMessage(null)
    try {
      const saved = await authApi.updateProfile({
        displayName: name.trim(),
        phone: normalized,
      })
      updateUser({ name: saved.name, phone: saved.phone })
      setMessage('saved')
    } catch {
      setMessage('failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} noValidate className="mt-5 grid gap-4">
      <FormField
        htmlFor="account-name"
        label={t('accountSettings.fullName')}
        error={errors.name}
        errorId="account-name-error"
      >
        <input
          id="account-name"
          value={name}
          maxLength={128}
          autoComplete="name"
          onChange={(e) => setName(e.target.value)}
          aria-invalid={errors.name ? true : undefined}
          className={inputCls}
        />
      </FormField>
      <FormField
        htmlFor="account-phone"
        label={t('accountProfile.phone')}
        hint={t('accountProfile.phoneHint')}
        error={errors.phone}
        errorId="account-phone-error"
      >
        <input
          id="account-phone"
          type="tel"
          value={phone}
          maxLength={32}
          autoComplete="tel"
          onChange={(e) => setPhone(e.target.value)}
          aria-invalid={errors.phone ? true : undefined}
          className={inputCls}
        />
      </FormField>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          aria-busy={saving}
          className="btn btn-press btn-primary"
        >
          {saving ? t('accountProfile.saving') : t('accountProfile.save')}
        </button>
        <span role="status" className="text-fg-muted text-sm">
          {message === 'saved'
            ? t('accountProfile.saved')
            : message === 'failed'
              ? t('accountProfile.failed')
              : ''}
        </span>
      </div>
    </form>
  )
}

export default AccountProfileForm
