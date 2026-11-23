import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Camera, Check } from 'lucide-react'
import { authApi } from '../api/authApi'

const TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_BYTES = 2 * 1024 * 1024

interface AvatarUploaderProps {
  name: string
  avatarUrl?: string
  /** URL ảnh mới sau khi tải lên; null = đã gỡ ảnh */
  onChange: (avatarUrl: string | null) => void
}

/** Chữ viết tắt: 2 chữ đầu của tên, cùng cách tính với AppAccountMenu */
const initialsOf = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()

/* Ảnh đại diện + nút đổi/gỡ; kiểm tra định dạng và dung lượng trước khi tải lên */
export function AvatarUploader({ name, avatarUrl, onChange }: AvatarUploaderProps) {
  const { t } = useTranslation('auth')
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const run = (action: Promise<string | null>, message: string) => {
    setBusy(true)
    setError(null)
    setNotice(null)
    action
      .then((url) => {
        onChange(url)
        setNotice(message)
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setBusy(false))
  }

  const pick = (file?: File) => {
    if (!file) return
    if (!TYPES.includes(file.type)) return setError(t('avatar.typeError'))
    if (file.size > MAX_BYTES) return setError(t('avatar.sizeError'))
    run(authApi.uploadAvatar(file), t('avatar.updated'))
  }

  return (
    <div className="flex flex-wrap items-center gap-4">
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={t('avatar.alt', { name })}
          className="size-16 shrink-0 rounded-full object-cover"
        />
      ) : (
        <span
          aria-hidden="true"
          className="bg-accent-soft text-accent-text grid size-16 shrink-0 place-items-center rounded-full text-lg font-semibold"
        >
          {initialsOf(name)}
        </span>
      )}
      <div className="min-w-0">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => input.current?.click()}
            className="btn btn-press btn-secondary h-9 px-3 text-sm"
          >
            <Camera size={16} aria-hidden="true" />
            {busy ? t('avatar.uploading') : avatarUrl ? t('avatar.change') : t('avatar.upload')}
          </button>
          {avatarUrl && (
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                run(authApi.removeAvatar().then(() => null), t('avatar.removed'))
              }
              className="btn btn-ghost h-9 px-3 text-sm"
            >
              {t('avatar.remove')}
            </button>
          )}
        </div>
        <p className="text-fg-muted text-caption mt-1.5">{t('avatar.hint')}</p>
        {error && (
          <p role="alert" className="text-danger text-caption mt-1">
            {error}
          </p>
        )}
        {notice && (
          <p role="status" className="text-success text-caption mt-1 flex items-center gap-1">
            <Check size={13} aria-hidden="true" />
            {notice}
          </p>
        )}
      </div>
      <input
        ref={input}
        type="file"
        accept={TYPES.join(',')}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => {
          pick(e.target.files?.[0])
          e.target.value = '' // cho phép chọn lại cùng file
        }}
      />
    </div>
  )
}
