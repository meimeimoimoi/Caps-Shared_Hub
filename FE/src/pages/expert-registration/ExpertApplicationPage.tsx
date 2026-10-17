import { useTranslation } from 'react-i18next'
import { useEffect } from 'react'
import { useFormatters } from '@/hooks/useFormatters'
import { useLocation } from 'react-router-dom'
import {
  Check,
  FileText,
  Briefcase,
  UserRound,
  ChevronDown,
} from 'lucide-react'
import { useRegistrationMotion } from '../../features/expert-registration/hooks/useRegistrationMotion'
import { useWizardMotion } from '../../features/expert-registration/hooks/useWizardMotion'
import { useScrollReveal } from '@/hooks/useScrollReveal'
import { mergeRefs } from '@/lib/merge-refs'

import {
  steps,
  stepShortLabels,
} from '../../features/expert-registration/constants'
import { ApplicationStatus } from '../../features/expert-registration/components/ApplicationStatus'
import { WizardFooter } from '../../features/expert-registration/components/WizardFooter'
import { PersonalInformation } from '../../features/expert-registration/components/steps/PersonalInformation'
import { ProfessionalExperience } from '../../features/expert-registration/components/steps/ProfessionalExperience'
import { SupportingDocuments } from '../../features/expert-registration/components/steps/SupportingDocuments'
import { RegistrationSummary } from '../../features/expert-registration/components/steps/RegistrationSummary'
import { ReviewSubmit } from '../../features/expert-registration/components/steps/ReviewSubmit'
import { useRegistrationForm } from '../../features/expert-registration/hooks/useRegistrationForm'
import { useApplicationLifecycle } from '../../features/expert-registration/hooks/useApplicationLifecycle'
import { useExpertApplication } from '../../features/expert-registration/hooks/useExpertApplication'
import { EmailVerificationNotice } from '../../features/expert-registration/components/EmailVerificationNotice'
import { EmailVerificationReminder } from '../../features/expert-registration/components/EmailVerificationReminder'
import { expertPageCls } from './expertPageClass'

/* ── Shared sub-components ── */

/* ── Reusable style constants ── */

const panelCls = 'bg-ex-panel rounded-lg p-8 shadow-paper max-md:p-[18px_24px]'

/** The signed-in user's expert application inside the Expert Portal: the draft wizard, then its review status. */
export default function ExpertApplicationPage() {
  const { t } = useTranslation('expertRegistration')
  const format = useFormatters()
  useEffect(() => {
    document.title = `${t('page.title')} | Shared Hub`
  }, [t])

  const motionRef = useRegistrationMotion()
  const scrollRevealRef = useScrollReveal()
  const {
    application,
    setApplication,
    loading,
    loadFailed,
    reload,
    syncVerifiedSession,
  } = useExpertApplication()
  const location = useLocation()
  // Set by /expert/register right after the account is created
  const accountCreated =
    (location.state as { accountCreated?: boolean } | null)?.accountCreated ===
    true
  const {
    submitted,
    stage,
    history,
    eligibilityIssues,
    reapplyAt,
    decisionNote,
    supplement,
    explanation,
    error: lifecycleError,
    setError: setLifecycleError,
    notice: lifecycleNotice,
    submitting: lifecycleSubmitting,
    errorRef: lifecycleErrorRef,
    canPreviewStages,
    submitSupplement,
    changeStage,
    requestSupplement,
    previewServiceReview,
    setSupplementFile,
    setExplanation,
    cancelSupplement,
    supplementFile,
  } = useApplicationLifecycle({
    application,
    setApplication,
    syncVerifiedSession,
  })

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
    verifyOpen,
    verifyPurpose,
    closeVerify,
    openVerification,
    checkVerifiedAndSubmit,
    formErrors,
    heading,
    errorRef,
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
  } = useRegistrationForm({ application, setApplication, syncVerifiedSession })
  const wizardBodyRef = useWizardMotion(step, !submitted)
  const visibleNotice =
    [
      notice,
      lifecycleNotice,
      accountCreated ? t('messages.accountCreated') : '',
    ].find(Boolean) ?? ''
  const terminal = stage === 'ineligible' || stage === 'failed'
  const timeline = [
    t('timeline.submission'),
    t('timeline.screening'),
    t('timeline.eligibility'),
    t('timeline.competency'),
    t('timeline.final'),
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
      <h1 ref={heading} tabIndex={-1} className="expert-wizard-heading-title">
        {t(steps[step])}
      </h1>
    </div>
  )

  return (
    <div
      ref={mergeRefs(motionRef, scrollRevealRef)}
      className={`expert-application ${expertPageCls}`}
    >
      {/* ── Content (the Expert Portal layout owns <main>) ── */}
      <div
        className={`${submitted ? 'expert-status-main' : ''} mx-auto max-w-[1240px] px-6 py-12 pb-[70px] max-md:px-4 max-md:py-7 max-md:pb-10`}
      >
        {loading || loadFailed ? (
          <section className={`${panelCls} expert-wizard`} aria-busy={loading}>
            {loading ? (
              <p role="status" className="text-ex-muted !mb-0">
                {t('page.loading')}
              </p>
            ) : (
              <div role="alert">
                <p>{t('messages.loadFailed')}</p>
                <button
                  type="button"
                  className="underline underline-offset-4"
                  onClick={() => void reload()}
                >
                  {t('page.retry')}
                </button>
              </div>
            )}
          </section>
        ) : submitted ? (
          <>
            <div className="expert-status-layout">
              <ApplicationStatus
                profileName={profile.name}
                stage={stage}
                eligibilityIssues={eligibilityIssues}
                reapplyAt={reapplyAt}
                decisionNote={decisionNote}
                supplement={supplement}
                terminal={terminal}
                timeline={timeline}
                progress={progress}
                history={history}
                showScenario={canPreviewStages}
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
                  <h3>{t('page.submitted')}</h3>
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
                    <span>{t('page.applicant')}</span>
                  </div>
                </div>
                <dl className="expert-status-facts">
                  <div>
                    <dt>
                      <Briefcase size={16} aria-hidden="true" />
                      {t('page.experience')}
                    </dt>
                    <dd>
                      {t('counts.years', {
                        years: profile.years
                          ? format.number(Number(profile.years))
                          : '—',
                      })}
                    </dd>
                  </div>
                  <div>
                    <dt>
                      <FileText size={16} aria-hidden="true" />
                      {t('documents.countLabel')}
                    </dt>
                    <dd>
                      {t('counts.selected', {
                        count: Object.values(files).reduce(
                          (n, list) => n + list.length,
                          0
                        ),
                      })}
                    </dd>
                  </div>
                </dl>
                <p className="expert-status-profile-note">
                  {t('documents.countNote')}
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
                  {t('page.view')} <ChevronDown size={16} aria-hidden="true" />
                </a>
              </aside>
              <details className="expert-status-dossier" id="submitted-dossier">
                <summary>
                  <span>
                    {t('page.details')}
                    <small>{t('page.submittedInfo')}</small>
                  </span>
                  <ChevronDown size={20} aria-hidden="true" />
                </summary>
                <RegistrationSummary
                  profile={profile}
                  avatarPreview={avatarPreview}
                  independent={independent}
                  fields={fields}
                  files={files}
                />
              </details>
            </div>
          </>
        ) : (
          /* ── Wizard ── */
          <section
            className={`${panelCls} expert-wizard ${step === 0 ? 'expert-wizard-personal' : ''}`}
          >
            <nav
              aria-label={t('page.steps')}
              className="expert-wizard-stepper mb-4"
            >
              <ol className="expert-stepper-list">
                {steps.map((s, i) => (
                  <li className="expert-stepper-item" key={s}>
                    <button
                      type="button"
                      disabled={i > step}
                      onClick={() => move(i)}
                      aria-label={t(
                        i < step ? 'counts.completedStep' : 'counts.stepLabel',
                        { step: format.number(i + 1), label: t(s) }
                      )}
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
                        {t(stepShortLabels[i])}
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
            {application && !application.emailVerified && (
              <EmailVerificationReminder
                email={profile.email}
                onVerify={openVerification}
              />
            )}
            {verifyOpen && application && !application.emailVerified && (
              <EmailVerificationNotice
                email={profile.email}
                onCheck={checkVerifiedAndSubmit}
                purpose={verifyPurpose}
                onClose={closeVerify}
              />
            )}
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
      </div>
    </div>
  )
}
