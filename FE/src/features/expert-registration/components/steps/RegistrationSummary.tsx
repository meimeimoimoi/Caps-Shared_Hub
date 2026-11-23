import { useTranslation } from 'react-i18next'
import { useState } from 'react'
import { HelpTip } from '@/components/ui/feedback/help-tip'
import { applicationApi, evidenceCode } from '../../api/applicationApi'
import { formatVietnamPhone } from '@/lib/validation/vietnamPhone'
import {
  CircleCheck,
  FileText,
  FileImage,
  ExternalLink,
  PencilLine,
} from 'lucide-react'
import type { EvidenceFile, Profile } from '../../types'
import { useFormatters } from '@/hooks/useFormatters'
import {
  criteria,
  criterionKey,
  DECLARED_CRITERIA,
  expertiseKey,
} from '../../constants'
import { DOCUMENTS_STEP, PROFILE_STEP } from '../../constants'

export interface RegistrationSummaryProps {
  profile: Profile
  avatarPreview: string
  independent: boolean
  fields: string[]
  files: Record<string, EvidenceFile[]>
  /** Server codes of the groups that need a file; an empty group outside it reads as optional */
  requiredEvidence?: string[]
  /** Whether the ethics and confidentiality commitment is accepted; omitted when not shown */
  conductAgreed?: boolean
  /** Opens the wizard step that holds a section (profile or documents); omitted when read-only */
  onEditStep?: (step: number) => void
}

export function RegistrationSummary({
  profile,
  avatarPreview,
  fields,
  files,
  requiredEvidence,
  conductAgreed,
  onEditStep,
}: RegistrationSummaryProps) {
  const { t } = useTranslation('expertRegistration')
  const format = useFormatters()
  const [openingId, setOpeningId] = useState<string | null>(null)
  const [fileError, setFileError] = useState<{
    id: string
    message: string
  } | null>(null)

  const groupLabel = (category: string) =>
    category === 'CV'
      ? t('experience.cv')
      : category === 'SUPPLEMENT'
        ? t('supplement.document')
        : criterionKey(category)
          ? t(criterionKey(category)!)
          : category
  // CV first, then the eligibility groups in policy order, then supplements and anything else
  const isOptional = (category: string) =>
    !!requiredEvidence &&
    category !== 'CV' &&
    criteria.includes(category) &&
    !requiredEvidence.includes(evidenceCode(category))
  const order = ['CV', ...criteria]
  // Ethics and confidentiality are proven by the commitment, so they appear only when a file was added
  const documentGroups: [string, EvidenceFile[]][] = [
    ...order
      .map((c): [string, EvidenceFile[]] => [c, files[c] ?? []])
      .filter(
        ([c, list]) =>
          list.length > 0 || !DECLARED_CRITERIA.includes(evidenceCode(c))
      ),
    ...Object.entries(files).filter(
      ([c, list]) => !order.includes(c) && list.length > 0
    ),
  ]

  async function openFile(file: EvidenceFile) {
    if (file.sourceUrl && /^https?:\/\//i.test(file.sourceUrl)) {
      window.open(file.sourceUrl, '_blank', 'noopener,noreferrer')
      return
    }
    setFileError(null)
    const preview = window.open('about:blank', '_blank')
    if (!preview) {
      setFileError({ id: file.id, message: t('files.popupBlocked') })
      return
    }
    preview.opener = null
    preview.document.title = file.name
    preview.document.body.textContent = t('files.opening')
    setOpeningId(file.id)
    try {
      const blob = await applicationApi.file(file.id)
      if (!preview.closed) {
        const url = URL.createObjectURL(blob)
        preview.location.replace(url)
        window.setTimeout(() => URL.revokeObjectURL(url), 300_000)
      }
    } catch {
      preview.close()
      setFileError({ id: file.id, message: t('files.openError') })
    } finally {
      setOpeningId(null)
    }
  }

  const editButton = (target: number, section: string) =>
    onEditStep && (
      <button
        type="button"
        className="expert-summary-edit"
        onClick={() => onEditStep(target)}
        aria-label={t('actions.editSection', { section })}
      >
        <PencilLine size={14} aria-hidden="true" />
        {t('actions.editShort')}
      </button>
    )

  return (
    <div className="expert-registration-summary">
      {/* ── Personal Information ── */}
      <section className="expert-pro-section">
        <div className="expert-pro-section-header">
          <h3 className="expert-pro-section-title">{t('personal.heading')}</h3>
          {editButton(PROFILE_STEP, t('personal.heading'))}
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
            [
              'fields.birth',
              profile.birth ? format.dateOnly(profile.birth) : '',
            ],
            ['fields.title', profile.title],
            ['fields.location', profile.location],
            ['fields.introduction', profile.bio],
          ].map(([k, v]) => (
            <div key={k} className="expert-review-detail">
              <dt className="expert-review-label">
                {t(
                  k as
                    | 'fields.fullName'
                    | 'fields.email'
                    | 'fields.phone'
                    | 'fields.birth'
                    | 'fields.title'
                    | 'fields.location'
                    | 'fields.introduction'
                )}
              </dt>
              <dd className="text-ex-ink m-0 text-[14.5px] font-medium whitespace-pre-wrap">
                {v || (
                  <span className="text-text-muted font-normal italic">
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
            <h3 className="expert-pro-section-title">
              {t('experience.heading')}
            </h3>
            {editButton(PROFILE_STEP, t('experience.heading'))}
          </div>

          <dl className="expert-review-details">
            <div className="expert-review-detail">
              <dt className="expert-review-label">
                {t('experience.taxAccounting')}
              </dt>
              <dd className="text-ex-ink m-0 text-[14.5px] font-medium">
                {t('counts.years', {
                  years: profile.years
                    ? format.number(Number(profile.years))
                    : '—',
                })}
              </dd>
            </div>
            <div className="expert-review-detail">
              <dt className="expert-review-label">
                {t('experience.expertise')}
              </dt>
              <dd className="text-ex-ink m-0 text-[14.5px] font-medium">
                {fields.length > 0 ? (
                  <span className="expert-review-tags">
                    {fields.map((field) => (
                      <span key={field}>
                        {expertiseKey(field) ? t(expertiseKey(field)!) : field}
                      </span>
                    ))}
                  </span>
                ) : (
                  <span className="text-text-muted font-normal italic">
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
                  <span className="text-text-muted font-normal italic">
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
            <h3 className="expert-pro-section-title">
              {t('documents.heading')}
            </h3>
            <HelpTip label={t('helpFor', { label: t('documents.heading') })}>
              {t('documents.countNote')}
            </HelpTip>
            {editButton(DOCUMENTS_STEP, t('documents.heading'))}
          </div>

          {/* Every group in a fixed order, empty ones included, so gaps are visible before submitting */}
          <div className="expert-doc-list">
            {documentGroups.map(([category, list]) => (
              <section
                key={category}
                className="expert-doc-group"
                aria-label={groupLabel(category)}
              >
                <header className="expert-doc-group-head">
                  <h4>{groupLabel(category)}</h4>
                  <span data-empty={list.length === 0 || undefined}>
                    {list.length > 0
                      ? t('counts.file', { count: list.length })
                      : t(
                          isOptional(category)
                            ? 'documents.optional'
                            : 'documents.none'
                        )}
                  </span>
                </header>
                {list.length > 0 && (
                  <ul>
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
                          className="expert-doc-row"
                          key={file.id || `${file.name}-${index}`}
                        >
                          <span className="expert-doc-icon" aria-hidden="true">
                            {isImage ? (
                              <FileImage size={18} />
                            ) : (
                              <FileText size={18} />
                            )}
                          </span>
                          <span className="expert-doc-info">
                            <span className="expert-doc-name" title={file.name}>
                              {file.name}
                            </span>
                            <span className="expert-doc-meta">
                              {file.sourceUrl
                                ? t('links.saved')
                                : t('files.meta', { extension, size })}
                            </span>
                            {fileError?.id === file.id && (
                              <span role="alert" className="expert-doc-error">
                                {fileError.message}
                              </span>
                            )}
                          </span>
                          <button
                            type="button"
                            className="expert-doc-open"
                            disabled={
                              !file.id || file.uploading || openingId !== null
                            }
                            aria-label={t('files.openNamed', {
                              name: file.name,
                            })}
                            onClick={() => void openFile(file)}
                          >
                            <ExternalLink size={14} aria-hidden="true" />
                            {openingId === file.id
                              ? t('files.opening')
                              : t('files.view')}
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </section>
            ))}
            {conductAgreed !== undefined && (
              <section
                className="expert-doc-group"
                aria-label={t('commitment.sectionTitle')}
              >
                <header className="expert-doc-group-head">
                  <h4>{t('commitment.sectionTitle')}</h4>
                  <span
                    className="expert-doc-commitment"
                    data-accepted={conductAgreed || undefined}
                  >
                    {conductAgreed && (
                      <CircleCheck size={14} aria-hidden="true" />
                    )}
                    {t(
                      conductAgreed
                        ? 'commitment.accepted'
                        : 'commitment.pending'
                    )}
                  </span>
                </header>
              </section>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
