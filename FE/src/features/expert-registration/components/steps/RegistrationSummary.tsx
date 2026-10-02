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
  independent,
  fields,
  files,
}: RegistrationSummaryProps) {
  return (
    <div className="grid grid-cols-2 gap-[30px] mb-[25px] break-all max-md:grid-cols-1">
      <section>
        <h3>Personal information</h3>
        {avatarPreview && (
          <img
            src={avatarPreview}
            alt="Profile"
            className="w-14 h-14 rounded-full object-cover border border-ex-border mb-3"
          />
        )}
        <dl className="m-0">
          {[
            ['Full name', profile.name],
            ['Email', profile.email],
            ['Phone', profile.phone],
            ['Date of birth', profile.birth],
            ['Current title', profile.title],
            [
              'Organization',
              independent
                ? 'Independent professional'
                : profile.company || 'Not provided',
            ],
            ['Location', profile.location],
            ['Introduction', profile.bio],
          ].map(([k, v]) => (
            <div key={k} className="py-2.5 border-b border-ex-file-border">
              <dt className="text-ex-muted text-[13px]">{k}</dt>
              <dd className="mt-0.5 ml-0 whitespace-pre-wrap">
                {v || 'Not provided'}
              </dd>
            </div>
          ))}
        </dl>
      </section>
      <section>
        <h3>Professional experience</h3>
        <dl className="m-0">
          <div className="py-2.5 border-b border-ex-file-border">
            <dt className="text-ex-muted text-[13px]">
              Tax and accounting experience
            </dt>
            <dd className="mt-0.5 ml-0 whitespace-pre-wrap">
              {profile.years} years
            </dd>
          </div>
          <div className="py-2.5 border-b border-ex-file-border">
            <dt className="text-ex-muted text-[13px]">Areas of expertise</dt>
            <dd className="mt-0.5 ml-0 whitespace-pre-wrap">
              {fields.join(', ')}
            </dd>
          </div>
          <div className="py-2.5 border-b border-ex-file-border">
            <dt className="text-ex-muted text-[13px]">Experience highlights</dt>
            <dd className="mt-0.5 ml-0 whitespace-pre-wrap">
              {profile.highlights || 'Not provided'}
            </dd>
          </div>
        </dl>
        <h3>Supporting documents</h3>
        {Object.entries(files)
          .filter(([, list]) => list.length)
          .map(([key, list]) => (
            <div key={key}>
              <strong>{key}</strong>
              {list.map((f, i) => (
                <p className="text-[13px] mb-2" key={i}>
                  {f.name}
                </p>
              ))}
            </div>
          ))}
        <p>Documents selected here have not been verified.</p>
      </section>
    </div>
  )
}
