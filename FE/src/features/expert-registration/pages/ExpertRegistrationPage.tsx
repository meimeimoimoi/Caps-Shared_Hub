import { Link } from 'react-router-dom'
import { Check, FileText, Briefcase, UserRound, ChevronDown } from 'lucide-react'
import sharedHubLogo from '@/shared/assets/shared-hub-logo.png'
import { useRegistrationMotion } from '../hooks/useRegistrationMotion'
import { useWizardMotion } from '../hooks/useWizardMotion'
import { useScrollReveal } from '@/shared/hooks/useScrollReveal'

import { steps } from '../model/constants'
import { AccountCreation } from '../components/AccountCreation'
import { AccountIntroduction } from '../components/AccountIntroduction'
import { ApplicationStatus } from '../components/ApplicationStatus'
import { WizardFooter } from '../components/WizardFooter'
import { PersonalInformation } from '../components/steps/PersonalInformation'
import { ProfessionalExperience } from '../components/steps/ProfessionalExperience'
import { SupportingDocuments } from '../components/steps/SupportingDocuments'
import { RegistrationSummary } from '../components/steps/RegistrationSummary'
import { ReviewSubmit } from '../components/steps/ReviewSubmit'
import { useRegistrationForm } from '../hooks/useRegistrationForm'
import { useApplicationLifecycle } from '../hooks/useApplicationLifecycle'

/* ── Shared sub-components ── */

/* ── Reusable style constants ── */
// Add entries only when genuine Privacy, Terms and Help routes are implemented.
const onboardingFooterLinks: { label: string; to: string }[] = []

const panelCls =
  'bg-ex-panel rounded-lg p-8 shadow-[0_8px_28px_#25302509] max-md:p-[18px_24px]'

export default function ExpertRegistrationPage() {
  const motionRef = useRegistrationMotion()
  const scrollRevealRef = useScrollReveal()
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
    supplementFile,
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
    onRegistrationSubmit: completeRegistrationSubmission,
  })
  const wizardBodyRef = useWizardMotion(step, account && !submitted)
  const visibleNotice = [notice, lifecycleNotice].find((message) => message && !/demo/i.test(message)) ?? ''
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

  const stepHeading = (
    <div className="expert-wizard-heading">
      <div className="expert-wizard-heading-bar" aria-hidden="true" />
      <span className="expert-wizard-heading-badge">
        Step {step + 1} of {steps.length}
      </span>
      <h1 ref={heading} tabIndex={-1} className="expert-wizard-heading-title">
        {steps[step]}
      </h1>
    </div>
  )

  return (
    <div ref={(el) => {
        // Merge both refs into the same DOM node
        (motionRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
        (scrollRevealRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
      }} className={`${!account ? 'expert-welcome' : 'expert-application'} bg-ex-bg text-ex-ink [&_::selection]:bg-ex-selection [&_a]:text-ex-accent [&_h1,&_h2,&_h3]:text-ex-heading [&_:focus-visible]:outline-ex-focus [&_input[type='checkbox']]:accent-ex-accent [&_summary]:text-ex-accent min-h-screen font-[Arial,sans-serif] text-[15px] leading-[1.6] [color-scheme:light] [&_*]:box-border [&_:focus-visible]:outline-3 [&_:focus-visible]:outline-offset-4 [&_a]:underline-offset-4 [&_button,&_input,&_select,&_textarea]:font-[inherit] [&_fieldset]:my-[22px] [&_fieldset]:border-0 [&_fieldset]:p-0 [&_h1]:mt-0 [&_h1]:mb-4 [&_h1]:text-[clamp(28px,3.3vw,42px)] [&_h1]:tracking-tight [&_h1,&_h2,&_h3]:font-[Georgia,'Times_New_Roman',serif] [&_h1,&_h2,&_h3]:leading-tight [&_h2]:mt-0 [&_h2]:mb-[18px] [&_h2]:text-[27px] [&_h3]:mt-[22px] [&_h3]:mb-3 [&_h3]:text-xl [&_input[type='checkbox']]:h-[17px] [&_input[type='checkbox']]:w-[17px] [&_input[type='checkbox']]:shrink-0 [&_legend]:mb-3 [&_legend]:font-semibold [&_p]:mt-0 [&_p]:mb-[18px] [&_p]:max-w-[72ch] [&_summary]:cursor-pointer [&_summary]:py-3 [&_summary]:underline [&_summary]:underline-offset-4`}>
      {/* ── Header ── */}
      <header className="border-ex-border border-b">
        <div className="mx-auto flex max-w-[1240px] items-center gap-6 px-6 py-5 max-md:gap-3 max-md:px-4">
          <Link
            to="/"
            aria-label="Shared Hub home"
            className="relative block h-[44px] w-[200px] shrink-0 overflow-hidden no-underline max-md:h-[34px] max-md:w-[150px]"
          >
            <img
              src={sharedHubLogo}
              alt="Shared Hub"
              width={1774}
              height={887}
              className="absolute top-1/2 left-1/2 h-auto w-[108%] max-w-none -translate-x-1/2 -translate-y-[50.5%]"
            />
          </Link>
          <span className="border-ex-header-divider border-l pl-[25px] max-md:pl-3 max-md:text-xs">
            Expert registration
          </span>
        </div>
      </header>

      {/* ── Main ── */}
      <main
        className={`${submitted ? 'expert-status-main' : ''} mx-auto max-w-[1240px] max-md:px-4 max-md:py-7 max-md:pb-10 ${!account ? 'expert-welcome-main grid grid-cols-[1.15fr_1fr] items-start gap-20 px-6 py-12 pb-14 max-lg:gap-10 max-md:grid-cols-1' : 'px-6 py-12 pb-[70px]'}`}
      >
        {!account ? (
          <>
            {/* ── Account creation: left ── */}
            <AccountIntroduction />

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
            <div className="expert-status-layout">
              <ApplicationStatus
                profileName={profile.name}
                stage={stage}
                supplement={supplement}
                terminal={terminal}
                timeline={timeline}
                progress={progress}
                history={history}
                supplementFormProps={{
                  file: supplementFile,
                  explanation,
                  submitting: lifecycleSubmitting,
                  onExplanationChange: setExplanation,
                  onFileChange: setSupplementFile,
                  onError: setLifecycleError,
                  onBack: cancelSupplement,
                  onSubmit: submitSupplement,
                }}
                onStageChange={changeStage}
                onRequestSupplement={requestSupplement}
                onPreviewServiceReview={previewServiceReview}
              />
              <aside className="expert-status-profile">
                <div className="expert-status-profile-heading">
                  <FileText size={20} aria-hidden="true" />
                  <h3>Submitted application</h3>
                </div>
                <div className="expert-status-applicant">
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="" />
                  ) : (
                    <span className="expert-status-avatar">
                      <UserRound size={26} aria-hidden="true" />
                    </span>
                  )}
                  <div>
                    <strong>{profile.name}</strong>
                    <span>Expert applicant</span>
                  </div>
                </div>
                <dl className="expert-status-facts">
                  <div>
                    <dt>
                      <Briefcase size={16} aria-hidden="true" />
                      Experience
                    </dt>
                    <dd>{profile.years} years</dd>
                  </div>
                  <div>
                    <dt>
                      <FileText size={16} aria-hidden="true" />
                      Documents
                    </dt>
                    <dd>
                      {Object.values(files).reduce(
                        (n, list) => n + list.length,
                        0
                      )}{' '}
                      selected locally
                    </dd>
                  </div>
                </dl>
                <p className="expert-status-profile-note">
                  Selected documents are awaiting verification. File count does
                  not indicate approval.
                </p>
                <a
                  className="expert-status-view-link"
                  href="#submitted-dossier"
                  onClick={() => {
                    const dossier = document.getElementById('submitted-dossier')
                    if (dossier instanceof HTMLDetailsElement)
                      dossier.open = true
                  }}
                >
                  View full application{' '}
                  <ChevronDown size={16} aria-hidden="true" />
                </a>
              </aside>
              <details className="expert-status-dossier" id="submitted-dossier" data-reveal>
                <summary><span>Application details<small>Your submitted information and supporting documents</small></span><ChevronDown size={20} aria-hidden="true" /></summary>
                <RegistrationSummary profile={profile} avatarPreview={avatarPreview} independent={independent} fields={fields} files={files} />
              </details>
            </div>
          </>
        ) : (
          /* ── Wizard ── */
          <section
            className={`${panelCls} expert-wizard ${step === 0 ? 'expert-wizard-personal' : ''}`}
          >
            <nav
              aria-label="Application steps"
              className="expert-wizard-stepper mb-4"
            >
              <ol className="expert-stepper-list">
                {steps.map((s, i) => (
                  <li className="expert-stepper-item" key={s}>
                    <button
                      type="button"
                      disabled={i > step}
                      onClick={() => move(i)}
                      aria-label={`Step ${i + 1}: ${s}${i < step ? ', completed' : ''}`}
                      aria-current={i === step ? 'step' : undefined}
                      className="expert-stepper-btn"
                    >
                      <span
                        className={`expert-stepper-bubble ${
                          i < step
                            ? 'expert-stepper-bubble--done'
                            : i === step
                              ? 'expert-stepper-bubble--active'
                              : 'expert-stepper-bubble--upcoming'
                        }`}
                      >
                        {i < step ? (
                          <Check size={15} strokeWidth={3} aria-hidden="true" />
                        ) : (
                          i + 1
                        )}
                      </span>
                      <span
                        className={`expert-stepper-label ${
                          i < step
                            ? 'expert-stepper-label--done'
                            : i === step
                              ? 'expert-stepper-label--active'
                              : 'expert-stepper-label--upcoming'
                        }`}
                      >
                        {s}
                      </span>
                    </button>

                    {/* Connecting line */}
                    {i < steps.length - 1 && (
                      <div className="expert-stepper-track" aria-hidden="true">
                        <div
                          className={`expert-stepper-track-fill ${i < step ? 'expert-stepper-track-fill--done' : ''}`}
                        />
                      </div>
                    )}
                  </li>
                ))}
              </ol>
            </nav>
            <form noValidate onSubmit={advance}>
              <div
                ref={wizardBodyRef}
                className="expert-wizard-body pt-4 pb-[30px]"
                key={step}
              >
                {step !== 0 && stepHeading}
                {step === 0 && (
                  <PersonalInformation
                    heading={stepHeading}
                    profile={profile}
                    formErrors={formErrors}
                    avatar={avatar}
                    avatarPreview={avatarPreview}
                    independent={independent}
                    onUpdate={(key, value) => {
                      update(key, value)
                      clearFormError(key)
                    }}
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
                    onUpdate={(key, value) => {
                      update(key, value)
                      clearFormError(key)
                    }}
                    onToggleField={toggleField}
                    onCvFilesSelected={(f) => chooseFiles('CV', f)}
                    onRemoveCvFile={(i) => removeFile('CV', i)}
                  />
                )}
                {step === 2 && (
                  <SupportingDocuments
                    formErrors={formErrors}
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
          <p
            className="bg-ex-error-bg text-ex-error-text animate-expert-fade-in col-span-full rounded-[5px] p-[15px] motion-reduce:animate-none"
            role="alert"
            ref={error ? errorRef : lifecycleErrorRef}
            tabIndex={-1}
          >
            {error || lifecycleError}
          </p>
        )}
        {visibleNotice && (
          <p
            className="text-ex-notice-text bg-ex-notice-bg animate-expert-fade-in col-span-full !mt-5 p-[15px] motion-reduce:animate-none"
            role="status"
          >
            {visibleNotice}
          </p>
        )}
      </main>

      {/* ── Footer ── */}
      <footer data-reveal="fade" className="expert-onboarding-footer border-ex-footer-border text-ex-muted mx-auto flex max-w-[1240px] justify-between border-t px-6 py-[22px] text-[13px] max-md:flex-wrap max-md:gap-2">
        <span>Shared Hub</span>
        {onboardingFooterLinks.length > 0 && (
          <nav
            aria-label="Support and policies"
            className="expert-footer-links"
          >
            {onboardingFooterLinks.map(({ label, to }) => (
              <Link key={to} to={to}>
                {label}
              </Link>
            ))}
          </nav>
        )}
      </footer>
    </div>
  )
}
