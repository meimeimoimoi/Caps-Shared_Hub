import { useTranslation } from 'react-i18next'
import { useEffect, useState } from 'react'
import { useFormatters } from '@/hooks/useFormatters'
import { useLocation, useNavigate } from 'react-router-dom'
import { FileText, Briefcase, UserRound, ChevronDown } from 'lucide-react'
import { useRegistrationMotion } from '../../features/expert-registration/hooks/useRegistrationMotion'
import { useWizardMotion } from '../../features/expert-registration/hooks/useWizardMotion'
import { useScrollReveal } from '@/hooks/useScrollReveal'
import { mergeRefs } from '@/lib/merge-refs'

import { steps } from '../../features/expert-registration/constants'
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
import { ApplicationProgressRail } from '../../features/expert-registration/components/ApplicationProgressRail'
import { expertPageCls } from './expertPageClass'

/* ── Shared sub-components ── */

/* ── Reusable style constants ── */

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
  const navigate = useNavigate()
  // Set by /expert/register right after the account is created. Read once, then cleared from history
  // so a reload or a later visit does not show the notice again.
  const [accountCreated] = useState(
    () =>
      (location.state as { accountCreated?: boolean } | null)
        ?.accountCreated === true
  )
  useEffect(() => {
    if (location.state)
      navigate(location.pathname + location.search, {
        replace: true,
        state: null,
      })
  }, [location.pathname, location.search, location.state, navigate])
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
    furthest,
    returnToReview,
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
      accountCreated && step === 0 ? t('messages.accountCreated') : '',
    ].find(Boolean) ?? ''
  const terminal = stage === 'ineligible' || stage === 'failed'
  // No AI screening step yet: submission goes straight to the eligibility review (Gate 1)
  const timeline = [
    t('timeline.submission'),
    t('timeline.eligibility'),
    t('timeline.competency'),
    t('timeline.final'),
  ]
  const progress = [
    'screening',
    'eligibility',
    'additional',
    'eligible',
    'ineligible',
  ].includes(stage)
    ? 1
    : ['competency', 'failed', 'returned'].includes(stage)
      ? 2
      : 3

  // Files held by the whole application against the server's current limit
  const uploadQuota = application
    ? {
        used: application.evidence.length,
        max: application.maxFiles,
        verified: application.emailVerified,
        onVerify: openVerification,
      }
    : undefined

  const stepHeading = (
    <div className="expert-wizard-heading">
      <h1 ref={heading} tabIndex={-1} className="expert-wizard-heading-title">
        {t(steps[step])}
      </h1>
    </div>
  )

  // The portal layout already pads and caps the page width; content uses all of it, like other portal pages
  const widthCls = 'w-full'

  return (
    <div
      ref={mergeRefs(motionRef, scrollRevealRef)}
      className={`expert-application ${expertPageCls}`}
    >
      {/* ── Content (the Expert Portal layout owns <main>) ── */}
      <div className={`${widthCls} ${submitted ? 'expert-status-main' : ''}`}>
        {loading || loadFailed ? (
          <section className="expert-wizard" aria-busy={loading}>
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
          /* ── Wizard: form beside its progress rail ── */
          <div className="expert-application-layout">
            <section
              className={`expert-wizard ${step === 0 ? 'expert-wizard-personal' : ''}`}
            >
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
                      uploadQuota={uploadQuota}
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
                      uploadQuota={uploadQuota}
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
                      onEditStep={move}
                    />
                  )}
                </div>
                <WizardFooter
                  step={step}
                  returnToReview={returnToReview}
                  submitting={submitting}
                  draftSaved={draftSaved}
                  onSaveDraft={saveDraft}
                  onBack={() => move(step - 1)}
                />
              </form>
            </section>
            <ApplicationProgressRail
              steps={steps}
              step={step}
              furthest={furthest}
              onMove={move}
              email={profile.email}
              emailVerified={application?.emailVerified ?? false}
              onVerify={openVerification}
              missing={application?.missingRequirements ?? []}
            />
          </div>
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
