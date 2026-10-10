import { useTranslation } from 'react-i18next'
import { formatVietnamPhone } from '@/lib/validation/vietnamPhone'
import {
  UserCircle,
  Briefcase,
  FolderOpen,
  FileText,
  FileImage,
  Clock3,
} from 'lucide-react'
import type { Profile } from '../../types'
import { useFormatters } from '@/hooks/useFormatters'
import { criterionKey, expertiseKey } from '../../constants'

export interface RegistrationSummaryProps {
  profile: Profile
  avatarPreview: string
  independent: boolean
  fields: string[]
  files: Record<string, File[]>
}

export function RegistrationSummary({
  profile,
  avatarPreview,
  fields,
  files,
}: RegistrationSummaryProps) {
  const { t } = useTranslation('expertRegistration')
  const format = useFormatters()

  return (
    <div className="expert-registration-summary">
      {/* ── Personal Information ── */}
      <section className="expert-pro-section">
        <div className="expert-pro-section-header">
          <span
            className="expert-pro-section-icon"
            style={{ background: 'var(--ui-accent-soft)', color: 'var(--ui-accent-text)' }}
          >
            <UserCircle size={18} aria-hidden="true" />
          </span>
          <h3 className="expert-pro-section-title">{t('personal.heading')}</h3>
          <span className="expert-pro-section-line" aria-hidden="true" />
        </div>

        {avatarPreview && (
          <img
            src={avatarPreview}
            alt={t('personal.profile')}
            className="expert-review-avatar"
          />
        )}

        <dl className="expert-review-details">
          {[
            ['fields.fullName', profile.name],
            ['fields.email', profile.email],
            ['fields.phone', formatVietnamPhone(profile.phone)],
            ['fields.birth', profile.birth ? format.dateOnly(profile.birth) : ''],
            ['fields.title', profile.title],
            ['fields.location', profile.location],
            ['fields.introduction', profile.bio],
          ].map(([k, v]) => (
            <div
              key={k}
              className="expert-review-detail"
            >
              <dt className="expert-review-label">
                {t(k as 'fields.fullName' | 'fields.email' | 'fields.phone' | 'fields.birth' | 'fields.title' | 'fields.location' | 'fields.introduction')}
              </dt>
              <dd className="text-ex-ink m-0 text-[14.5px] font-medium whitespace-pre-wrap">
                {v || (
                  <span className="font-normal text-text-muted italic">
                    {t('experience.missing')}
                  </span>
                )}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      {/* ── Right Column ── */}
      <div className="expert-review-secondary">
        {/* Professional Experience */}
        <section className="expert-pro-section">
          <div className="expert-pro-section-header">
            <span
              className="expert-pro-section-icon"
              style={{ background: 'var(--ui-accent-soft)', color: 'var(--ui-accent-text)' }}
            >
              <Briefcase size={18} aria-hidden="true" />
            </span>
            <h3 className="expert-pro-section-title">
              {t('experience.heading')}
            </h3>
            <span className="expert-pro-section-line" aria-hidden="true" />
          </div>

          <dl className="expert-review-details">
            <div className="expert-review-detail">
              <dt className="expert-review-label">
                {t('experience.taxAccounting')}
              </dt>
              <dd className="text-ex-ink m-0 text-[14.5px] font-medium">
                {t('counts.years', { years: profile.years ? format.number(Number(profile.years)) : '—' })}
              </dd>
            </div>
            <div className="expert-review-detail">
              <dt className="expert-review-label">
                {t('experience.expertise')}
              </dt>
              <dd className="text-ex-ink m-0 text-[14.5px] font-medium">
                {fields.length > 0 ? (
                  <span className="expert-review-tags">{fields.map((field) => <span key={field}>{expertiseKey(field) ? t(expertiseKey(field)!) : field}</span>)}</span>
                ) : (
                  <span className="font-normal text-text-muted italic">
                    {t('experience.none')}
                  </span>
                )}
              </dd>
            </div>
            <div className="expert-review-detail">
              <dt className="expert-review-label">
                {t('experience.highlights')}
              </dt>
              <dd className="text-ex-ink m-0 text-[14.5px] font-medium whitespace-pre-wrap">
                {profile.highlights || (
                  <span className="font-normal text-text-muted italic">
                    {t('experience.missing')}
                  </span>
                )}
              </dd>
            </div>
          </dl>
        </section>

        {/* Supporting Documents */}
        <section className="expert-pro-section">
          <div className="expert-pro-section-header">
            <span
              className="expert-pro-section-icon"
              style={{ background: 'var(--ui-accent-soft)', color: 'var(--ui-accent-text)' }}
            >
              <FolderOpen size={18} aria-hidden="true" />
            </span>
            <h3 className="expert-pro-section-title">
              {t('documents.heading')}
            </h3>
            <span className="expert-pro-section-line" aria-hidden="true" />
          </div>

          <div className="expert-summary-documents">
            {Object.entries(files).filter(([, list]) => list.length).length ===
            0 ? (
              <p className="expert-summary-documents-empty">
                {t('documents.empty')}
              </p>
            ) : (
              Object.entries(files)
                .filter(([, list]) => list.length)
                .map(([category, list]) => (
                  <div key={category} className="expert-summary-document-group">
                    <div className="expert-summary-document-heading">
                      <strong>{category === 'CV' ? t('experience.cv') : criterionKey(category) ? t(criterionKey(category)!) : category}</strong>
                      <span>
                        {t('counts.file', { count: list.length })}
                      </span>
                    </div>
                    <ul className="expert-summary-document-list">
                      {list.map((file, index) => {
                        const extension =
                          file.name.split('.').pop()?.toUpperCase() ?? 'FILE'
                        const isImage = /^(PNG|JPG|JPEG)$/.test(extension)
                        const size =
                          file.size < 1024 * 1024
                            ? `${format.number(Math.max(1, Math.round(file.size / 1024)))} KB`
                            : `${format.number(file.size / (1024 * 1024), { minimumFractionDigits: 1, maximumFractionDigits: 1 })} MB`
                        return (
                          <li
                            className="expert-summary-document"
                            key={`${file.name}-${index}`}
                          >
                            <span
                              className="expert-summary-document-icon"
                              aria-hidden="true"
                            >
                              {isImage ? (
                                <FileImage size={22} />
                              ) : (
                                <FileText size={22} />
                              )}
                            </span>
                            <div className="expert-summary-document-info">
                              <p className="expert-summary-document-name">
                                {file.name}
                              </p>
                              <span className="expert-summary-document-meta">
                                {t('files.meta', { extension, size })}
                              </span>
                            </div>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                ))
            )}
          </div>
          <p className="expert-summary-document-note">
            <Clock3 size={15} aria-hidden="true" />
            <span>{t('documents.verification')}</span>
          </p>
        </section>
      </div>
    </div>
  )
}
