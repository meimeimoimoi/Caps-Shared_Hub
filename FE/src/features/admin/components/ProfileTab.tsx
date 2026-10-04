import type { ReactNode } from 'react'
import type { ApplicationDetail } from '../types'
import { formatDate } from '../utils/applications'

interface ProfileTabProps {
  detail: ApplicationDetail
  onOpenDocument: (code: string) => void
}

function InfoSection({
  title,
  rows,
}: {
  title: string
  rows: { label: string; value: ReactNode }[]
}) {
  return (
    <section className="paper p-5 md:p-6">
      <h2 className="text-h2">{title}</h2>
      <dl className="divide-border-subtle mt-3 divide-y">
        {rows.map(({ label, value }) => (
          <div
            key={label}
            className="grid gap-x-6 gap-y-1 py-2.5 sm:grid-cols-[160px_1fr]"
          >
            <dt className="text-fg-muted text-sm">{label}</dt>
            <dd className="text-fg-strong">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

export function ProfileTab({ detail, onOpenDocument }: ProfileTabProps) {
  const cv = detail.documents.find((d) => d.code === 'CV')

  return (
    <div className="space-y-4 md:space-y-6">
      <InfoSection
        title="Thông tin cá nhân"
        rows={[
          { label: 'Họ và tên', value: detail.name },
          {
            label: 'Ngày sinh',
            value: <span className="num">{formatDate(detail.birthDate)}</span>,
          },
          {
            label: 'Chức danh, đơn vị',
            value: `${detail.jobTitle}, ${detail.company}`,
          },
          { label: 'Tỉnh/Thành phố', value: detail.location },
          { label: 'Giới thiệu', value: detail.bio },
        ]}
      />
      <InfoSection
        title="Kinh nghiệm"
        rows={[
          {
            label: 'Số năm kinh nghiệm',
            value: (
              <>
                <span className="num">{detail.years}</span> năm
              </>
            ),
          },
          { label: 'Lĩnh vực', value: detail.fields.join(', ') },
          {
            label: 'CV',
            value: cv ? (
              <button
                type="button"
                onClick={() => onOpenDocument(cv.code)}
                className="text-accent-text font-semibold underline underline-offset-4"
              >
                {cv.name}
              </button>
            ) : (
              <span className="text-fg-muted">Chưa nộp CV</span>
            ),
          },
          { label: 'Kinh nghiệm nổi bật', value: detail.highlights },
        ]}
      />
    </div>
  )
}
