import { Link } from 'react-router-dom'
import {
  Check,
  ShieldCheck,
} from 'lucide-react'

import {
  steps,
  AccountCreation,
  ApplicationStatus,
  WizardFooter,
  PersonalInformation,
  ProfessionalExperience,
  SupportingDocuments,
  RegistrationSummary,
  ReviewSubmit,
  useRegistrationForm,
  useApplicationLifecycle,
} from '@/features/expert-registration'

/* ── Shared sub-components ── */

/* ── Reusable style constants ── */
const btnBase =
  'cursor-pointer inline-flex items-center justify-center gap-2 min-h-11 px-[17px] py-[9px] border border-ex-btn-border rounded-md bg-white text-ex-ink font-semibold transition-[background,border-color,opacity] duration-150 ease-in-out hover:bg-ex-btn-hover disabled:cursor-not-allowed disabled:opacity-55 motion-reduce:transition-none'
const panelCls = 'bg-ex-panel rounded-lg p-8 shadow-[0_8px_28px_#25302509] max-md:p-[18px_24px]'
const mutedCls = 'text-[13px] text-ex-muted font-normal'
const stepBubbleCls =
  'flex items-center justify-center w-6 h-6 border border-ex-step-border rounded-full text-xs'
const stepBubbleActiveCls =
  'flex items-center justify-center w-6 h-6 border border-ex-accent rounded-full text-xs bg-ex-accent text-white'

export default function ExpertRegistrationPage() {
  const {
    account,
    submitted,
    stage,
    history,
    supplement,
    explanation,
    error: lifecycleError,
    setError: setLifecycleError,
    notice: lifecycleNotice,
    submitting: lifecycleSubmitting,
    errorRef: lifecycleErrorRef,
    beginTask,
    completeAccountCreation,
    completeRegistrationSubmission,
    submitSupplement,
    changeStage,
    requestSupplement,
    previewServiceReview,
    setSupplementFile,
    setExplanation,
    cancelSupplement,
  } = useApplicationLifecycle()

  const {
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
  } = useRegistrationForm({
    onRegistrationSubmit: completeRegistrationSubmission
  })
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
            <AccountCreation
              profile={profile}
              formErrors={formErrors}
              submitting={lifecycleSubmitting}
              onUpdate={(key, value) => {
                update(key, value)
                clearFormError(key)
              }}
              onSubmit={(e) => {
                e.preventDefault()
                if (lifecycleSubmitting) return
                if (!validateForm(e.currentTarget)) return
                beginTask()
                setTimeout(() => {
                  completeAccountCreation()
                }, 600)
              }}
            />
          </>
        ) : submitted ? (
          <>
            <div className="grid grid-cols-[2fr_1fr] gap-6 items-start max-md:grid-cols-1">
            <ApplicationStatus
              profileName={profile.name}
              stage={stage}
              supplement={supplement}
              terminal={terminal}
              timeline={timeline}
              progress={progress}
              history={history}
              supplementFormProps={{
                explanation,
                submitting: lifecycleSubmitting,
                onExplanationChange: setExplanation,
                onFileChange: setSupplementFile,
                onError: setLifecycleError,
                onBack: cancelSupplement,
                onSubmit: submitSupplement
              }}
              onStageChange={changeStage}
              onRequestSupplement={requestSupplement}
              onPreviewServiceReview={previewServiceReview}
            />
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
                  <div className="block">
                    <RegistrationSummary
                      profile={profile}
                      avatarPreview={avatarPreview}
                      independent={independent}
                      fields={fields}
                      files={files}
                    />
                  </div>
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
                  <PersonalInformation
                    profile={profile}
                    formErrors={formErrors}
                    avatar={avatar}
                    avatarPreview={avatarPreview}
                    independent={independent}
                    onUpdate={update}
                    onAvatarChange={updateAvatar}
                    onIndependentChange={setIndependentStatus}
                    onError={setError}
                  />
                )}
                {step === 1 && (
                  <ProfessionalExperience
                    profile={profile}
                    fields={fields}
                    cvFiles={files.CV ?? []}
                    formErrors={formErrors}
                    onUpdate={update}
                    onToggleField={toggleField}
                    onCvFilesSelected={(f) => chooseFiles('CV', f)}
                    onRemoveCvFile={(i) => removeFile('CV', i)}
                  />
                )}
                {step === 2 && (
                  <SupportingDocuments
                    activeCriterion={activeCriterion}
                    files={files}
                    onCriterionSelect={setActiveCriterion}
                    onFilesSelected={chooseFiles}
                    onRemoveFile={removeFile}
                  />
                )}
                {step === 3 && (
                  <ReviewSubmit
                    profile={profile}
                    avatarPreview={avatarPreview}
                    independent={independent}
                    fields={fields}
                    files={files}
                    confirmed={confirmed}
                    formErrors={formErrors}
                    onConfirmedChange={toggleConfirmed}
                    onEdit={() => move(0)}
                  />
                )}
              </div>
              <WizardFooter
                step={step}
                submitting={submitting}
                draftSaved={draftSaved}
                onSaveDraft={saveDraft}
                onBack={() => move(step - 1)}
              />
            </form>
          </section>
        )}
        {(error || lifecycleError) && (
          <p className="bg-ex-error-bg text-ex-error-text p-[15px] rounded-[5px] animate-expert-fade-in motion-reduce:animate-none" role="alert" ref={error ? errorRef : lifecycleErrorRef} tabIndex={-1}>
            {error || lifecycleError}
          </p>
        )}
        {(notice || lifecycleNotice) && (
          <p className="p-[15px] text-ex-notice-text bg-ex-notice-bg !mt-5 animate-expert-fade-in motion-reduce:animate-none" role="status">
            {notice || lifecycleNotice}
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
