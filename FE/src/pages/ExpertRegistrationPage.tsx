import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  Check,
  FileText,
  Save,
  Upload,
  User,
  X,
  ShieldCheck,
} from 'lucide-react'

const steps = [
  'Personal information',
  'Professional experience',
  'Supporting documents',
  'Review and submit',
]
const criteria = [
  'Legal eligibility',
  'Professional qualifications',
  'Continuing professional development',
  'Professional ethics',
  'Confidentiality',
]
type Stage =
  | 'screening'
  | 'eligibility'
  | 'additional'
  | 'eligible'
  | 'competency'
  | 'final'
  | 'approved'
  | 'ineligible'
  | 'failed'
  | 'returned'
const labels: Record<Stage, string> = {
  screening: 'AI-assisted screening',
  eligibility: 'Eligibility review',
  additional: 'Additional information required',
  eligible: 'Eligibility approved',
  competency: 'Service competency review',
  final: 'Pending final approval',
  approved: 'Approved for service',
  ineligible: 'Not eligible',
  failed: 'Competency assessment failed',
  returned: 'Returned for review',
}
const initial = {
  name: '',
  email: '',
  phone: '',
  birth: '',
  title: '',
  company: '',
  location: '',
  bio: '',
  years: '',
  highlights: '',
}
type Profile = typeof initial

/* ── Shared sub-components ── */

function Field({
  label,
  children,
  hint,
  error,
  errorId,
}: {
  label: string
  children: ReactNode
  hint?: string
  error?: string
  errorId?: string
}) {
  return (
    <div className="flex flex-col gap-[7px] mb-[22px]">
      <label className="font-semibold text-sm flex flex-col gap-[7px]">
        <span>{label}</span>
        {children}
      </label>
      {hint && !error && <small className="text-[13px] text-ex-muted font-normal">{hint}</small>}
      {error && (
        <p id={errorId} role="alert" className="text-[13px] text-ex-error-text font-normal m-0">
          {error}
        </p>
      )}
    </div>
  )
}

/* ── Reusable style constants ── */
const inputCls =
  'w-full px-3 py-2.5 border border-ex-input-border rounded-[5px] bg-white text-ex-ink min-h-11 font-normal caret-ex-accent transition-[border-color,box-shadow] duration-150 ease-in-out focus:border-ex-accent focus:shadow-[0_0_0_3px_var(--color-ex-ring)] motion-reduce:transition-none'
const btnBase =
  'cursor-pointer inline-flex items-center justify-center gap-2 min-h-11 px-[17px] py-[9px] border border-ex-btn-border rounded-md bg-white text-ex-ink font-semibold transition-[background,border-color,opacity] duration-150 ease-in-out hover:bg-ex-btn-hover disabled:cursor-not-allowed disabled:opacity-55 motion-reduce:transition-none'
const btnPrimary = `${btnBase} !bg-ex-accent !border-ex-accent !text-white hover:!bg-ex-accent-hover`
const panelCls = 'bg-ex-panel rounded-lg p-8 shadow-[0_8px_28px_#25302509] max-md:p-[18px_24px]'
const noteCls = 'px-[18px] py-4 bg-ex-note-bg rounded-[5px] my-5 text-sm [&>p:last-child]:mb-0'
const mutedCls = 'text-[13px] text-ex-muted font-normal'
const stepBubbleCls =
  'flex items-center justify-center w-6 h-6 border border-ex-step-border rounded-full text-xs'
const stepBubbleActiveCls =
  'flex items-center justify-center w-6 h-6 border border-ex-accent rounded-full text-xs bg-ex-accent text-white'

export default function ExpertRegistrationPage() {
  const [profile, setProfile] = useState<Profile>(initial)
  const [account, setAccount] = useState(false)
  const [step, setStep] = useState(0)
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [stage, setStage] = useState<Stage>('screening')
  const [files, setFiles] = useState<Record<string, File[]>>({})
  const [fields, setFields] = useState<string[]>([])
  const [activeCriterion, setActiveCriterion] = useState(criteria[0]!)
  const [confirmed, setConfirmed] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [supplement, setSupplement] = useState(false)
  const [supplementFile, setSupplementFile] = useState<File | null>(null)
  const [explanation, setExplanation] = useState('')
  const [history, setHistory] = useState<string[]>([])
  const [avatar, setAvatar] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState('')
  const [independent, setIndependent] = useState(false)
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
    if (form.checkValidity()) {
      setFormErrors({})
      return true
    }
    const errors: Record<string, string> = {}
    let firstInvalid: HTMLElement | null = null
    for (const el of Array.from(form.elements)) {
      const inputEl = el as HTMLInputElement
      if (inputEl.validity && !inputEl.validity.valid && inputEl.name) {
        if (!firstInvalid) firstInvalid = inputEl
        if (inputEl.validity.valueMissing) {
          errors[inputEl.name] = 'This field is required.'
        } else if (inputEl.validity.typeMismatch) {
          if (inputEl.type === 'email') errors[inputEl.name] = 'Please enter a valid email address.'
          else errors[inputEl.name] = 'Please enter a valid value.'
        } else if (inputEl.validity.rangeUnderflow) {
          errors[inputEl.name] = `Value must be at least ${inputEl.min}.`
        } else if (inputEl.validity.rangeOverflow) {
          errors[inputEl.name] = `Value must be at most ${inputEl.max}.`
        } else {
          errors[inputEl.name] = 'Invalid value.'
        }
      }
    }
    setFormErrors(errors)
    firstInvalid?.focus()
    return false
  }

  const update = (key: keyof Profile, value: string) =>
    setProfile((p) => ({ ...p, [key]: value }))
  
  const input = (key: keyof Profile, required = false, type = 'text') => {
    const isInvalid = !!formErrors[key]
    return (
      <input
        name={key}
        type={type}
        value={profile[key]}
        required={required}
        onChange={(e) => {
          update(key, e.target.value)
          if (formErrors[key]) setFormErrors((p) => ({ ...p, [key]: '' }))
        }}
        aria-invalid={isInvalid}
        aria-describedby={isInvalid ? `error-${key}` : undefined}
        className={`${inputCls} ${isInvalid ? '!border-ex-error-text focus:shadow-[0_0_0_3px_#d9302533]' : ''}`}
      />
    )
  }

  function move(next: number) {
    setStep(next)
    setError('')
    setNotice('')
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
      setError(
        'Choose PDF, JPG or PNG files up to 10 MB each. This limit is for the demo.'
      )
      return
    }
    setFiles((p) => ({ ...p, [key]: [...(p[key] ?? []), ...selected] }))
    setError('')
  }
  function uploader(key: string) {
    return (
      <div className="mb-6">
        <label className="flex items-center flex-col gap-2 border border-dashed border-ex-chip-border rounded-md py-6 px-4 bg-ex-drop-bg cursor-pointer text-center transition-[border-color,background] duration-150 ease-in-out hover:border-ex-accent hover:bg-ex-drop-hover motion-reduce:transition-none">
          <Upload size={22} />
          <strong>Choose supporting files</strong>
          <span className="text-xs text-ex-muted">PDF, JPG or PNG · up to 10 MB each (demo)</span>
          <input
            aria-label={`Choose files for ${key}`}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            multiple
            className="max-w-full text-[13px]"
            onChange={(e) => {
              chooseFiles(key, e.target.files)
              e.target.value = ''
            }}
          />
        </label>
        {(files[key] ?? []).map((f, i) => (
          <div className="flex gap-2.5 items-center py-3 border-b border-ex-file-border text-sm" key={`${f.name}-${i}`}>
            <FileText size={18} />
            <span className="flex-1 break-all min-w-0">
              {f.name}
              <small className="block text-ex-muted">{(f.size / 1024).toFixed(0)} KB · Selected locally</small>
            </span>
            <button
              type="button"
              className={`${btnBase} !border-0 !p-2`}
              aria-label={`Remove ${f.name}`}
              onClick={() =>
                setFiles((p) => ({
                  ...p,
                  [key]: p[key]!.filter((_, n) => n !== i),
                }))
              }
            >
              <X size={18} />
            </button>
          </div>
        ))}
      </div>
    )
  }
  function advance(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (submitting) return
    setError('')
    
    if (!validateForm(e.currentTarget)) return

    if (step === 1 && (!fields.length || !files.CV?.length)) {
      setError('Select at least one area of expertise and choose your CV.')
      return
    }
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
      setSubmitted(true)
      setSubmitting(false)
      setStage('screening')
      setHistory(['Application submitted in this demo.'])
      setNotice('Demo application received. No data was sent to the server.')
    }, 800)
  }
  function summary() {
    return (
      <div className="grid grid-cols-2 gap-[30px] mb-[25px] break-all max-md:grid-cols-1">
        <section>
          <h3>Personal information</h3>
          {avatarPreview && (
            <img src={avatarPreview} alt="Profile" className="w-14 h-14 rounded-full object-cover border border-ex-border mb-3" />
          )}
          <dl className="m-0">
            {[
              ['Full name', profile.name],
              ['Email', profile.email],
              ['Phone', profile.phone],
              ['Date of birth', profile.birth],
              ['Current title', profile.title],
              ['Organization', independent ? 'Independent professional' : (profile.company || 'Not provided')],
              ['Location', profile.location],
              ['Introduction', profile.bio],
            ].map(([k, v]) => (
              <div key={k} className="py-2.5 border-b border-ex-file-border">
                <dt className="text-ex-muted text-[13px]">{k}</dt>
                <dd className="mt-0.5 ml-0 whitespace-pre-wrap">{v || 'Not provided'}</dd>
              </div>
            ))}
          </dl>
        </section>
        <section>
          <h3>Professional experience</h3>
          <dl className="m-0">
            <div className="py-2.5 border-b border-ex-file-border">
              <dt className="text-ex-muted text-[13px]">Tax and accounting experience</dt>
              <dd className="mt-0.5 ml-0 whitespace-pre-wrap">{profile.years} years</dd>
            </div>
            <div className="py-2.5 border-b border-ex-file-border">
              <dt className="text-ex-muted text-[13px]">Areas of expertise</dt>
              <dd className="mt-0.5 ml-0 whitespace-pre-wrap">{fields.join(', ')}</dd>
            </div>
            <div className="py-2.5 border-b border-ex-file-border">
              <dt className="text-ex-muted text-[13px]">Experience highlights</dt>
              <dd className="mt-0.5 ml-0 whitespace-pre-wrap">{profile.highlights || 'Not provided'}</dd>
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
  const terminal = stage === 'ineligible' || stage === 'failed'
  const timeline = [
    'Submission',
    'AI screening',
    'Eligibility review',
    'Service competency',
    'Final approval',
  ]
  const progress =
    stage === 'screening'
      ? 1
      : ['eligibility', 'additional', 'eligible', 'ineligible'].includes(stage)
        ? 2
        : ['competency', 'failed', 'returned'].includes(stage)
          ? 3
          : 4

  return (
    <div className="min-h-screen bg-ex-bg text-ex-ink font-[Arial,sans-serif] text-[15px] leading-[1.6] [color-scheme:light] [&_*]:box-border [&_::selection]:bg-ex-selection [&_a]:text-ex-accent [&_a]:underline-offset-4 [&_button,&_input,&_select,&_textarea]:font-[inherit] [&_h1,&_h2,&_h3]:font-[Georgia,'Times_New_Roman',serif] [&_h1,&_h2,&_h3]:leading-tight [&_h1,&_h2,&_h3]:text-ex-heading [&_h1]:text-[clamp(28px,3.3vw,42px)] [&_h1]:tracking-tight [&_h1]:mt-0 [&_h1]:mb-4 [&_h2]:text-[27px] [&_h2]:mt-0 [&_h2]:mb-[18px] [&_h3]:text-xl [&_h3]:mt-[22px] [&_h3]:mb-3 [&_p]:mt-0 [&_p]:mb-[18px] [&_p]:max-w-[72ch] [&_:focus-visible]:outline-3 [&_:focus-visible]:outline-ex-focus [&_:focus-visible]:outline-offset-4 [&_input[type='checkbox']]:accent-ex-accent [&_input[type='checkbox']]:w-[17px] [&_input[type='checkbox']]:h-[17px] [&_input[type='checkbox']]:shrink-0 [&_fieldset]:border-0 [&_fieldset]:p-0 [&_fieldset]:my-[22px] [&_legend]:font-semibold [&_legend]:mb-3 [&_summary]:cursor-pointer [&_summary]:text-ex-accent [&_summary]:py-3 [&_summary]:underline [&_summary]:underline-offset-4">
      {/* ── Header ── */}
      <header className="flex items-center gap-7 px-[4%] py-5 border-b border-ex-border [&>a:last-child]:ml-auto [&>a:last-child]:font-semibold">
        <Link to="/login" className="text-[22px] font-extrabold tracking-[-0.04em] !text-ex-brand no-underline flex gap-[5px] items-center">
          Shared Hub
          <span className="w-[7px] h-[7px] bg-ex-accent" />
        </Link>
        <span className="border-l border-ex-header-divider pl-[25px] max-md:hidden">Expert registration</span>
        <Link to="/login">Sign in</Link>
      </header>

      {/* ── Demo banner ── */}
      <div className="bg-ex-demo-bg border-b border-ex-demo-border flex gap-3.5 py-[11px] px-[4%] text-[13px] text-ex-demo-text max-md:flex-col max-md:gap-0.5">
        <strong>Interactive preview</strong>
        <span>
          Sample workflow · nothing is uploaded or saved to a server. Refreshing
          clears your draft. Use sample information only.
        </span>
      </div>

      {/* ── Main ── */}
      <main className={`max-w-[1100px] mx-auto max-md:px-4 max-md:py-7 max-md:pb-10 ${!account ? 'max-w-[1050px] grid grid-cols-2 gap-[70px] items-center min-h-[75vh] px-6 py-12 pb-[70px] max-md:grid-cols-1 max-md:gap-7' : 'px-6 py-12 pb-[70px]'}`}>
        {!account ? (
          <>
            {/* ── Account creation: left ── */}
            <div>
              <h1 className="!text-[clamp(36px,4vw,52px)] max-md:!text-[38px]">
                Bring your expertise.
                <br />
                Make a difference.
              </h1>
              <p className="text-[17px]">
                Join Shared Hub as a tax and accounting expert. Create your
                account preview, then prepare your application.
              </p>
              <div className="flex gap-3 border-t border-ex-trust-border pt-6 mt-8 text-sm [&>svg]:shrink-0 [&>svg]:text-ex-accent">
                <ShieldCheck size={20} />
                <span>
                  Expert approval requires eligibility and service-specific
                  competency reviews.
                </span>
              </div>
            </div>

            {/* ── Account creation: right ── */}
            <form
              noValidate
              className={`${panelCls} [&_.ex-btn-full]:w-full`}
              onSubmit={(e) => {
                e.preventDefault()
                if (submitting) return
                if (!validateForm(e.currentTarget)) return
                setSubmitting(true)
                setTimeout(() => {
                  setAccount(true)
                  setSubmitting(false)
                  setNotice(
                    'Account preview created locally. No real account has been created.'
                  )
                }, 600)
              }}
            >
              <h2>Create an expert account</h2>
              <p className={mutedCls}>
                Already registered? <Link to="/login">Sign in</Link>
              </p>
              <Field label="Full name *" error={formErrors.name} errorId="error-name">{input('name', true)}</Field>
              <Field label="Email address *" error={formErrors.email} errorId="error-email">
                {input('email', true, 'email')}
              </Field>
              <Field label="Phone number" error={formErrors.phone} errorId="error-phone">{input('phone', false, 'tel')}</Field>
              <p className={noteCls}>
                This preview does not collect a password or create a real
                account. Account verification and terms acceptance will be
                connected with the registration API.
              </p>
              <button className={`${btnPrimary} w-full ${submitting ? 'ex-loading' : ''}`} disabled={submitting}>
                {submitting ? 'Creating…' : 'Continue to application'} {!submitting && <ArrowRight size={16} />}
              </button>
            </form>
          </>
        ) : submitted ? (
          <>
            {/* ── Status: top ── */}
            <div className="flex justify-between gap-7 max-md:flex-col">
              <div>
                <p className={mutedCls}>
                  Demo application · {profile.name}
                </p>
                <h1>{labels[stage]}</h1>
                <p>
                  {stage === 'eligible'
                    ? 'Your next step is a separate qualification for each service.'
                    : 'Track your application and see what happens next.'}
                </p>
              </div>
              <label className="text-xs min-w-[230px]">
                Preview a scenario
                <select
                  value={stage}
                  className={`${inputCls} block mt-1.5 !text-[13px]`}
                  onChange={(e) => {
                    setStage(e.target.value as Stage)
                    setSupplement(false)
                    setNotice('')
                    setError('')
                  }}
                >
                  {Object.entries(labels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {/* ── Timeline ── */}
            <ol className="flex list-none my-7 mb-10 p-0 gap-[22px] max-md:flex-col max-md:gap-3">
              {timeline.map((s, i) => (
                <li
                  key={s}
                  className={`flex-1 text-[13px] border-t-2 pt-3 max-md:flex max-md:items-center max-md:gap-3 ${i <= progress ? 'border-ex-accent' : 'border-ex-timeline-border'}`}
                  aria-current={i === progress ? 'step' : undefined}
                >
                  <span className={`mb-2 max-md:mb-0 ${i <= progress ? stepBubbleActiveCls : stepBubbleCls}`}>
                    {i < progress ? <Check size={14} /> : i + 1}
                  </span>
                  {s}
                  {i === progress && (
                    <small className="block text-ex-muted max-md:ml-auto">
                      {terminal
                        ? 'Not approved'
                        : stage === 'approved'
                          ? 'Approved for service'
                          : 'Current stage'}
                    </small>
                  )}
                </li>
              ))}
            </ol>

            {/* ── Status grid ── */}
            <div className="grid grid-cols-[2fr_1fr] gap-6 items-start max-md:grid-cols-1">
              <section className={panelCls}>
                <h2>
                  {supplement
                    ? 'Provide additional information'
                    : terminal
                      ? 'Your application needs a new assessment'
                      : stage === 'approved'
                        ? 'Approved for the selected service'
                        : 'Your next step'}
                </h2>
                {supplement ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault()
                      if (submitting) return
                      if (!supplementFile && !explanation.trim()) {
                        setError('Add a document or an explanation.')
                        return
                      }
                      setSubmitting(true)
                      setTimeout(() => {
                        setHistory((p) => [
                          ...p,
                          `Additional response recorded locally${supplementFile ? `: ${supplementFile.name}` : ''}.`,
                        ])
                        setSupplement(false)
                        setStage('eligibility')
                        setNotice(
                          'Response recorded in this demo. The same application returns to eligibility review.'
                        )
                        setSupplementFile(null)
                        setExplanation('')
                        setError('')
                        setSubmitting(false)
                      }, 600)
                    }}
                  >
                    <p>
                      Professional qualifications: provide a readable copy or
                      clarify the information in your existing evidence. This is
                      an illustrative request.
                    </p>
                    <Field
                      label="Replacement document"
                      hint="PDF, JPG or PNG · maximum 10 MB (demo)"
                    >
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        className={inputCls}
                        onChange={(e) => {
                          const f = e.target.files?.[0]
                          if (
                            f &&
                            (!/\.(pdf|png|jpe?g)$/i.test(f.name) ||
                              f.size > 10485760)
                          ) {
                            setError('Choose a PDF, JPG or PNG under 10 MB.')
                            setSupplementFile(null)
                            e.target.value = ''
                            return
                          }
                          setSupplementFile(f ?? null)
                          setError('')
                        }}
                      />
                    </Field>
                    <Field label="Explanation">
                      <textarea
                        value={explanation}
                        onChange={(e) => setExplanation(e.target.value)}
                        className={`${inputCls} min-h-[110px] resize-y`}
                      />
                    </Field>
                    <div className="flex items-center justify-between gap-[18px] border-t border-ex-border-light pt-[22px] max-md:flex-wrap">
                      <button
                        type="button"
                        className={btnBase}
                        onClick={() => setSupplement(false)}
                      >
                        Back
                      </button>
                      <button className={`${btnPrimary} ${submitting ? 'ex-loading' : ''}`} disabled={submitting}>
                        {submitting ? 'Sending…' : 'Send additional information'}
                      </button>
                    </div>
                  </form>
                ) : stage === 'additional' ? (
                  <>
                    <p>
                      Additional evidence is needed during eligibility review.
                      Your application remains open; no reapplication waiting
                      period applies.
                    </p>
                    <div className={noteCls}>
                      <strong>Professional qualifications</strong>
                      <p>
                        The qualification document needs clarification. Provide
                        a readable replacement or an explanation.
                      </p>
                      <small>
                        Illustrative request. No response deadline has been
                        configured.
                      </small>
                    </div>
                    <button
                      className={btnPrimary}
                      onClick={() => setSupplement(true)}
                    >
                      Provide information <ArrowRight size={16} />
                    </button>
                  </>
                ) : terminal ? (
                  <>
                    <p>
                      {stage === 'ineligible'
                        ? 'The eligibility requirements have not been met.'
                        : 'The competency requirements for the selected service have not been met. Other service approvals are unaffected.'}
                    </p>
                    <div className={noteCls}>
                      <strong>Illustrative assessment outcome</strong>
                      <p>
                        {stage === 'ineligible'
                          ? 'The submitted evidence does not demonstrate the required tax and accounting experience.'
                          : 'The submitted service evidence does not yet demonstrate the required competency.'}
                      </p>
                    </div>
                    <p>
                      The current policy requires at least{' '}
                      {stage === 'ineligible' ? '30' : '90'} days before
                      reapplying, plus relevant new or updated evidence. Your
                      actual decision date, earliest reapplication date and
                      failed criteria must come from the assessment service.
                    </p>
                    <p>
                      Corrections to reviewer or system errors use a controlled
                      reassessment process instead.
                    </p>
                  </>
                ) : stage === 'approved' ? (
                  <>
                    <p>
                      Your approval applies to{' '}
                      <strong>
                        CIT document review (illustrative service)
                      </strong>
                      .
                    </p>
                    <p>
                      Next, configure your service price and submit it for
                      approval. Marketplace visibility requires an active
                      account, active service, service approval and an approved
                      price that is currently effective.
                    </p>
                    <div className={noteCls}>
                      Pricing setup is not connected yet. Service availability
                      and payout settings will be handled in the next
                      implementation phase.
                    </div>
                  </>
                ) : stage === 'eligible' ? (
                  <>
                    <p>
                      Your general eligibility is approved. You can now prepare
                      competency evidence for each service you wish to offer.
                    </p>
                    <p>
                      Service selection and the C1–C5 evidence requirements will
                      use the confirmed service catalogue.
                    </p>
                    <button
                      onClick={() => setStage('competency')}
                      className={btnPrimary}
                    >
                      Preview service review <ArrowRight size={16} />
                    </button>
                  </>
                ) : stage === 'returned' ? (
                  <p>
                    The final approver has returned the qualification to service
                    competency review. This is not a new rejection or
                    reapplication. The assigned reviewer will address the
                    governance findings.
                  </p>
                ) : (
                  <>
                    <p>
                      {stage === 'screening'
                        ? 'AI assists with extracting information and identifying missing or inconsistent evidence. An authorized reviewer makes the eligibility decision.'
                        : stage === 'eligibility'
                          ? 'An authorized reviewer is checking your eligibility evidence. You do not need to take action right now.'
                          : stage === 'competency'
                            ? 'An authorized reviewer is assessing your evidence for CIT document review (illustrative service). This decision applies only to this service.'
                            : 'Eligibility and service competency reviews have passed. A System Admin will perform the final governance check.'}
                    </p>
                    <p className={mutedCls}>
                      No review completion date has been configured.
                    </p>
                  </>
                )}
                {history.length > 0 && (
                  <details className="border-t border-ex-history-border mt-6">
                    <summary>Demo activity history</summary>
                    <ul>
                      {history.map((h, i) => (
                        <li key={i}>{h}</li>
                      ))}
                    </ul>
                  </details>
                )}
              </section>
              <aside className={`${panelCls} [&>h3]:mt-0 [&_.summary-block]:block`}>
                <h3>Submitted application</h3>
                <p>{profile.name}</p>
                <p>{profile.years} years of experience</p>
                <p>
                  {Object.values(files).reduce((n, list) => n + list.length, 0)}{' '}
                  files selected locally
                </p>
                <p className={mutedCls}>
                  File count does not indicate approval.
                </p>
                <details>
                  <summary>View full application</summary>
                  <div className="block">{summary()}</div>
                </details>
              </aside>
            </div>
          </>
        ) : (
          /* ── Wizard ── */
          <section className={panelCls}>
            <nav aria-label="Application steps">
              <ol className="flex list-none pb-[26px] m-0 border-b border-ex-border-light gap-5 max-md:gap-2.5">
                {steps.map((s, i) => (
                  <li className="flex-1" key={s}>
                    <button
                      type="button"
                      disabled={i > step}
                      onClick={() => move(i)}
                      aria-current={i === step ? 'step' : undefined}
                      className={`${btnBase} !border-0 !p-0 flex-col !items-start !bg-transparent text-left !text-[13px] max-md:!text-[11px]`}
                    >
                      <span className={i <= step ? stepBubbleActiveCls : stepBubbleCls}>
                        {i < step ? <Check size={14} /> : i + 1}
                      </span>
                      {s}
                    </button>
                  </li>
                ))}
              </ol>
            </nav>
            <form noValidate onSubmit={advance}>
              <div className="py-[30px] animate-expert-enter motion-reduce:animate-none" key={step}>
                <p className={mutedCls}>Step {step + 1} of 4</p>
                <h1 ref={heading} tabIndex={-1} className="!text-[32px]">
                  {steps[step]}
                </h1>
                {step === 0 && (
                  <>
                    <p>
                      Tell us about your professional background. Required
                      fields are marked with an asterisk.
                    </p>

                    {/* ── Profile photo ── */}
                    <div className="flex items-center gap-5 mb-7">
                      <div className="relative shrink-0">
                        {avatarPreview ? (
                          <img
                            src={avatarPreview}
                            alt="Profile preview"
                            className="w-20 h-20 rounded-full object-cover border-2 border-ex-border"
                          />
                        ) : (
                          <div className="w-20 h-20 rounded-full bg-ex-note-bg border-2 border-dashed border-ex-chip-border flex items-center justify-center text-ex-muted">
                            <User size={28} />
                          </div>
                        )}
                        <label className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-ex-accent text-white flex items-center justify-center cursor-pointer shadow-md hover:bg-ex-accent-hover transition-colors duration-150 motion-reduce:transition-none">
                          <Camera size={14} />
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            className="sr-only"
                            onChange={(e) => {
                              const f = e.target.files?.[0]
                              if (!f) return
                              if (!/\.(jpe?g|png|webp)$/i.test(f.name) || f.size > 5 * 1024 * 1024) {
                                setError('Choose a JPG, PNG or WebP image up to 5 MB.')
                                e.target.value = ''
                                return
                              }
                              setAvatar(f)
                              setAvatarPreview(URL.createObjectURL(f))
                              setError('')
                              e.target.value = ''
                            }}
                          />
                        </label>
                      </div>
                      <div>
                        <p className="!mb-1 font-semibold text-sm">Profile photo</p>
                        <p className={`${mutedCls} !mb-0`}>
                          {avatar ? avatar.name : 'JPG, PNG or WebP \u00b7 up to 5 MB (demo)'}
                        </p>
                        {avatar && (
                          <button
                            type="button"
                            className="text-ex-accent text-[13px] underline underline-offset-2 mt-1 p-0 border-0 bg-transparent cursor-pointer"
                            onClick={() => {
                              setAvatar(null)
                              setAvatarPreview('')
                            }}
                          >
                            Remove photo
                          </button>
                        )}
                      </div>
                    </div>

                    {/* ── Personal fields ── */}
                    <div className="grid grid-cols-2 gap-x-6 max-md:grid-cols-1">
                      <Field label="Full name *" error={formErrors.name} errorId="error-name">{input('name', true)}</Field>
                      <Field label="Date of birth" error={formErrors.birth} errorId="error-birth">
                        {input('birth', false, 'date')}
                      </Field>
                      <Field label="Current professional title" error={formErrors.title} errorId="error-title">
                        {input('title')}
                      </Field>
                      <Field label="City / region" error={formErrors.location} errorId="error-location">{input('location')}</Field>
                      <Field label="Email address *" error={formErrors.email} errorId="error-email">
                        {input('email', true, 'email')}
                      </Field>
                      <Field label="Phone number" error={formErrors.phone} errorId="error-phone">{input('phone', false, 'tel')}</Field>
                    </div>

                    {/* ── Independent professional toggle ── */}
                    <div className={`flex items-start gap-3 p-4 rounded-md mb-6 border transition-colors duration-150 motion-reduce:transition-none ${
                      independent
                        ? 'bg-ex-chip-bg border-ex-accent'
                        : 'bg-ex-note-bg border-transparent'
                    }`}>
                      <input
                        type="checkbox"
                        id="independent-toggle"
                        checked={independent}
                        onChange={(e) => {
                          setIndependent(e.target.checked)
                          if (e.target.checked) update('company', '')
                        }}
                      />
                      <label htmlFor="independent-toggle" className="cursor-pointer">
                        <span className="font-semibold text-sm block">I work as an independent professional</span>
                        <span className={mutedCls}>
                          {independent
                            ? 'Your profile will show \u201cIndependent professional\u201d instead of an organization.'
                            : 'Check this if you are not affiliated with a firm or organization.'}
                        </span>
                      </label>
                    </div>

                    {!independent && (
                      <Field
                        label="Organization"
                        hint="The firm or company you currently represent."
                        error={formErrors.company} errorId="error-company"
                      >
                        {input('company')}
                      </Field>
                    )}

                    <Field
                      label="Short introduction"
                      hint="Your public profile can appear once marketplace eligibility requirements are met."
                      error={formErrors.bio} errorId="error-bio"
                    >
                      <textarea
                        name="bio"
                        value={profile.bio}
                        maxLength={1000}
                        onChange={(e) => {
                          update('bio', e.target.value)
                          if (formErrors.bio) setFormErrors(p => ({ ...p, bio: '' }))
                        }}
                        aria-invalid={!!formErrors.bio}
                        aria-describedby={formErrors.bio ? 'error-bio' : undefined}
                        placeholder="Describe your experience and the clients you support."
                        className={`${inputCls} min-h-[110px] resize-y ${formErrors.bio ? '!border-ex-error-text focus:shadow-[0_0_0_3px_#d9302533]' : ''}`}
                      />
                    </Field>
                  </>
                )}
                {step === 1 && (
                  <>
                    <p>
                      Help reviewers understand your tax and accounting
                      experience.
                    </p>
                    <Field label="Years of tax and accounting experience *" error={formErrors.years} errorId="error-years">
                      <input
                        name="years"
                        required
                        type="number"
                        min="0"
                        max="80"
                        step="1"
                        value={profile.years}
                        onChange={(e) => {
                          update('years', e.target.value)
                          if (formErrors.years) setFormErrors((p) => ({ ...p, years: '' }))
                        }}
                        aria-invalid={!!formErrors.years}
                        aria-describedby={formErrors.years ? 'error-years' : undefined}
                        className={`${inputCls} ${formErrors.years ? '!border-ex-error-text focus:shadow-[0_0_0_3px_#d9302533]' : ''}`}
                      />
                    </Field>
                    {profile.years !== '' && Number(profile.years) < 5 && (
                      <p className="bg-ex-error-bg text-ex-error-text p-[15px] rounded-[5px] animate-expert-fade-in motion-reduce:animate-none">
                        The current eligibility policy requires at least 5
                        years. You can prepare this demo draft; an authorized
                        reviewer makes the eligibility decision.
                      </p>
                    )}
                    <fieldset>
                      <legend>Areas of expertise *</legend>
                      <div className="flex flex-wrap gap-2.5">
                        {[
                          'Corporate income tax',
                          'Tax finalization',
                          'Corporate accounting',
                          'Financial reporting',
                          'Audit',
                          'Tax advisory',
                          'Transfer pricing',
                        ].map((f) => (
                          <label key={f} className="border border-ex-chip-border py-[9px] px-3 rounded-md cursor-pointer text-sm flex items-center gap-2 transition-[background,border-color] duration-150 ease-in-out has-[input:checked]:bg-ex-chip-bg has-[input:checked]:border-ex-accent motion-reduce:transition-none">
                            <input
                              type="checkbox"
                              checked={fields.includes(f)}
                              onChange={() =>
                                setFields((p) =>
                                  p.includes(f)
                                    ? p.filter((x) => x !== f)
                                    : [...p, f]
                                )
                              }
                            />
                            {f}
                          </label>
                        ))}
                      </div>
                      <p className={`${mutedCls} mt-2.5`}>
                        These describe your background. They do not grant
                        approval to offer a service.
                      </p>
                    </fieldset>
                    <h3>Curriculum vitae *</h3>
                    {uploader('CV')}
                    <Field label="Experience highlights" error={formErrors.highlights} errorId="error-highlights">
                      <textarea
                        name="highlights"
                        value={profile.highlights}
                        onChange={(e) => {
                          update('highlights', e.target.value)
                          if (formErrors.highlights) setFormErrors((p) => ({ ...p, highlights: '' }))
                        }}
                        aria-invalid={!!formErrors.highlights}
                        aria-describedby={formErrors.highlights ? 'error-highlights' : undefined}
                        placeholder="Describe relevant responsibilities and experience."
                        className={`${inputCls} min-h-[110px] resize-y ${formErrors.highlights ? '!border-ex-error-text focus:shadow-[0_0_0_3px_#d9302533]' : ''}`}
                      />
                    </Field>
                  </>
                )}
                {step === 2 && (
                  <>
                    <p>
                      Organize evidence by eligibility criterion. The final
                      required documents will be determined by the approved
                      policy.
                    </p>
                    <div className={noteCls}>
                      Preview requirements only: no fixed five-document
                      checklist. Experience evidence is collected in the
                      previous step.
                    </div>
                    <div className="grid grid-cols-[220px_1fr] gap-7 mt-7 max-md:grid-cols-1">
                      <div
                        className="flex flex-col gap-1.5 max-md:grid max-md:grid-cols-2"
                        aria-label="Evidence categories"
                      >
                        {criteria.map((c) => (
                          <button
                            type="button"
                            key={c}
                            aria-pressed={activeCriterion === c}
                            className={`${btnBase} flex-col !items-start text-left !text-[13px] transition-[background,border-color] duration-150 ease-in-out motion-reduce:transition-none ${activeCriterion === c ? '!bg-ex-chip-bg !border-ex-accent' : ''}`}
                            onClick={() => setActiveCriterion(c)}
                          >
                            {c}
                            <small className="font-normal text-ex-muted">
                              {files[c]?.length ?? 0} files selected
                            </small>
                          </button>
                        ))}
                      </div>
                      <section>
                        <h3 className="!mt-0">{activeCriterion}</h3>
                        <p>
                          Provide relevant supporting evidence. Accepted
                          document types and applicability must be confirmed by
                          the eligibility policy.
                        </p>
                        {uploader(activeCriterion)}
                      </section>
                    </div>
                  </>
                )}
                {step === 3 && (
                  <>
                    <p>
                      Review your information before submitting this demo
                      application.
                    </p>
                    {summary()}
                    <button type="button" className={btnBase} onClick={() => move(0)}>
                      Edit application
                    </button>
                    <div className={noteCls}>
                      AI supports screening. Authorized reviewers assess
                      eligibility and service competency. A System Admin
                      performs final approval.
                    </div>
                    <div className="flex flex-col gap-1.5 mt-5">
                      <label className="flex items-start gap-3">
                        <input
                          name="confirmed"
                          type="checkbox"
                          checked={confirmed}
                          onChange={(e) => {
                            setConfirmed(e.target.checked)
                            if (formErrors.confirmed) setFormErrors((p) => ({ ...p, confirmed: '' }))
                          }}
                          aria-invalid={!!formErrors.confirmed}
                          aria-describedby={formErrors.confirmed ? 'error-confirmed' : undefined}
                          required
                        />
                        I have reviewed the information in this demo application.
                      </label>
                      {formErrors.confirmed && (
                        <p id="error-confirmed" role="alert" className="text-[13px] text-ex-error-text font-normal m-0 pl-[29px]">
                          {formErrors.confirmed}
                        </p>
                      )}
                    </div>
                  </>
                )}
              </div>
              <footer className="flex items-center justify-between gap-[18px] border-t border-ex-border-light pt-[22px] max-md:flex-wrap [&>div]:flex [&>div]:gap-3 max-md:[&>div]:w-full max-md:[&>div]:justify-between">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    className={`${btnBase} gap-1.5`}
                    onClick={() => {
                      setDraftSaved(true)
                      setNotice('Draft saved in memory for this session. Nothing was sent to the server.')
                      setTimeout(() => setDraftSaved(false), 2000)
                    }}
                  >
                    <Save size={15} />
                    {draftSaved ? 'Saved' : 'Save draft'}
                  </button>
                  <span className={`${mutedCls} max-md:hidden`}>
                    In-memory only · clears on refresh
                  </span>
                </div>
                <div>
                  {step > 0 && (
                    <button type="button" className={btnBase} onClick={() => move(step - 1)}>
                      <ArrowLeft size={16} /> Back
                    </button>
                  )}
                  <button className={`${btnPrimary} ${step === 3 && submitting ? 'ex-loading' : ''}`} disabled={step === 3 && submitting}>
                    {step === 3 && submitting ? 'Submitting…' : step === 3 ? 'Submit demo application' : 'Continue'}
                    {!(step === 3 && submitting) && <ArrowRight size={16} />}
                  </button>
                </div>
              </footer>
            </form>
          </section>
        )}
        {error && (
          <p className="bg-ex-error-bg text-ex-error-text p-[15px] rounded-[5px] animate-expert-fade-in motion-reduce:animate-none" role="alert" ref={errorRef} tabIndex={-1}>
            {error}
          </p>
        )}
        {notice && (
          <p className="p-[15px] text-ex-notice-text bg-ex-notice-bg !mt-5 animate-expert-fade-in motion-reduce:animate-none" role="status">
            {notice}
          </p>
        )}
      </main>

      {/* ── Footer ── */}
      <footer className="max-w-[1050px] mx-auto py-[22px] px-6 border-t border-ex-footer-border flex justify-between text-[13px] text-ex-muted max-md:flex-wrap max-md:gap-2">
        Shared Hub <span>Expert onboarding · Corporate income tax</span>
      </footer>
    </div>
  )
}
