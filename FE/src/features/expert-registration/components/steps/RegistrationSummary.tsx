import { formatVietnamPhone } from '@/lib/validation/vietnamPhone'
import { UserCircle, Briefcase, FolderOpen, FileText, FileImage, Clock3 } from 'lucide-react'
import type { Profile } from '../../types'

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
  return (
    <div className="expert-registration-summary grid grid-cols-2 gap-8 max-md:grid-cols-1 mb-8">
      {/* ── Personal Information ── */}
      <section className="expert-pro-section">
        <div className="expert-pro-section-header">
          <span className="expert-pro-section-icon" style={{ background: '#f5efe9', color: '#a34524' }}>
            <UserCircle size={18} aria-hidden="true" />
          </span>
          <h3 className="expert-pro-section-title">Personal information</h3>
          <span className="expert-pro-section-line" aria-hidden="true" />
        </div>

        {avatarPreview && (
          <img
            src={avatarPreview}
            alt="Profile"
            className="w-16 h-16 rounded-full object-cover shadow-sm border-2 border-white mb-4"
          />
        )}

        <dl className="m-0 flex flex-col gap-3">
          {[
            ['Full name', profile.name],
            ['Email', profile.email],
            ['Phone', formatVietnamPhone(profile.phone)],
            ['Date of birth', profile.birth],
            ['Current title', profile.title],
            ['Location', profile.location],
            ['Introduction', profile.bio],
          ].map(([k, v]) => (
            <div key={k} className="bg-ex-chip-bg px-4 py-3 rounded-lg border border-ex-border">
              <dt className="text-ex-muted text-[12.5px] font-semibold uppercase tracking-wider mb-1">{k}</dt>
              <dd className="m-0 text-[14.5px] text-ex-ink whitespace-pre-wrap font-medium">
                {v || <span className="text-gray-400 italic font-normal">Not provided</span>}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      {/* ── Right Column ── */}
      <div className="flex flex-col gap-8">
        {/* Professional Experience */}
        <section className="expert-pro-section">
          <div className="expert-pro-section-header">
            <span className="expert-pro-section-icon" style={{ background: '#f5efe9', color: '#a34524' }}>
              <Briefcase size={18} aria-hidden="true" />
            </span>
            <h3 className="expert-pro-section-title">Professional experience</h3>
            <span className="expert-pro-section-line" aria-hidden="true" />
          </div>

          <dl className="m-0 flex flex-col gap-3">
            <div className="bg-ex-chip-bg px-4 py-3 rounded-lg border border-ex-border">
              <dt className="text-ex-muted text-[12.5px] font-semibold uppercase tracking-wider mb-1">
                Tax and accounting experience
              </dt>
              <dd className="m-0 text-[14.5px] text-ex-ink font-medium">
                {profile.years} years
              </dd>
            </div>
            <div className="bg-ex-chip-bg px-4 py-3 rounded-lg border border-ex-border">
              <dt className="text-ex-muted text-[12.5px] font-semibold uppercase tracking-wider mb-1">Areas of expertise</dt>
              <dd className="m-0 text-[14.5px] text-ex-ink font-medium">
                {fields.length > 0 ? fields.join(', ') : <span className="text-gray-400 italic font-normal">None selected</span>}
              </dd>
            </div>
            <div className="bg-ex-chip-bg px-4 py-3 rounded-lg border border-ex-border">
              <dt className="text-ex-muted text-[12.5px] font-semibold uppercase tracking-wider mb-1">Experience highlights</dt>
              <dd className="m-0 text-[14.5px] text-ex-ink whitespace-pre-wrap font-medium">
                {profile.highlights || <span className="text-gray-400 italic font-normal">Not provided</span>}
              </dd>
            </div>
          </dl>
        </section>

        {/* Supporting Documents */}
        <section className="expert-pro-section">
          <div className="expert-pro-section-header">
            <span className="expert-pro-section-icon" style={{ background: '#f5efe9', color: '#a34524' }}>
              <FolderOpen size={18} aria-hidden="true" />
            </span>
            <h3 className="expert-pro-section-title">Supporting documents</h3>
            <span className="expert-pro-section-line" aria-hidden="true" />
          </div>

          <div className="expert-summary-documents">
            {Object.entries(files).filter(([, list]) => list.length).length === 0 ? (
              <p className="expert-summary-documents-empty">No documents selected.</p>
            ) : Object.entries(files).filter(([, list]) => list.length).map(([category, list]) => (
              <div key={category} className="expert-summary-document-group">
                <div className="expert-summary-document-heading"><strong>{category}</strong><span>{list.length} {list.length === 1 ? 'file' : 'files'}</span></div>
                <ul className="expert-summary-document-list">
                  {list.map((file, index) => {
                    const extension = file.name.split('.').pop()?.toUpperCase() ?? 'FILE'
                    const isImage = /^(PNG|JPG|JPEG)$/.test(extension)
                    const size = file.size < 1024 * 1024 ? `${Math.max(1, Math.round(file.size / 1024))} KB` : `${(file.size / (1024 * 1024)).toFixed(1)} MB`
                    return (
                      <li className="expert-summary-document" key={`${file.name}-${index}`}>
                        <span className="expert-summary-document-icon" aria-hidden="true">{isImage ? <FileImage size={22} /> : <FileText size={22} />}</span>
                        <div className="expert-summary-document-info">
                          <p className="expert-summary-document-name">{file.name}</p>
                          <span className="expert-summary-document-meta">{extension} ? {size} ? Selected locally</span>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))}
          </div>
          <p className="expert-summary-document-note"><Clock3 size={15} aria-hidden="true" /><span>Documents are awaiting verification.</span></p>
        </section>
      </div>
    </div>
  )
}
