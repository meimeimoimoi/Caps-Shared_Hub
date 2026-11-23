import { useTranslation } from 'react-i18next'
import { useEffect } from 'react'
import { useFormatters } from '@/hooks/useFormatters'
import { useLocation, useNavigate } from 'react-router-dom'
import { FileText, Briefcase, UserRound, ChevronDown } from 'lucide-react'
import { useRegistrationMotion } from '../../features/expert-registration/hooks/useRegistrationMotion'
import { useWizardMotion } from '../../features/expert-registration/hooks/useWizardMotion'
import { useScrollReveal } from '@/hooks/useScrollReveal'
import { mergeRefs } from '@/lib/merge-refs'

import {
  DOCUMENTS_STEP,
  PROFILE_STEP,
  REVIEW_STEP,
  steps,
} from '../../features/expert-registration/constants'
import { ApplicationStatus } from '../../features/expert-registration/components/ApplicationStatus'
import { WizardFooter } from '../../features/expert-registration/components/WizardFooter'
import { ExpertProfileStep } from '../../features/expert-registration/components/steps/ExpertProfileStep'
import { SupportingDocuments } from '../../features/expert-registration/components/steps/SupportingDocuments'
import { RegistrationSummary } from '../../features/expert-registration/components/steps/RegistrationSummary'
import { ReviewSubmit } from '../../features/expert-registration/components/steps/ReviewSubmit'
import { useRegistrationForm } from '../../features/expert-registration/hooks/useRegistrationForm'
import { useApplicationLifecycle } from '../../features/expert-registration/hooks/useApplicationLifecycle'
import { useExpertApplication } from '../../features/expert-registration/hooks/useExpertApplication'
import { useQualificationOverview } from '@/features/expert-qualifications/hooks/useQualifications'
import type { Stage } from '../../features/expert-registration/types'
import { ApplicationProgressRail } from '../../features/expert-registration/components/ApplicationProgressRail'
import { expertPageCls } from './expertPageClass'

/* ── Shared sub-components ── */

/* ── Reusable style constants ── */

/** The signed-in user's expert application inside the Expert Portal: the draft wizard, then its review status. */
export default function ExpertApplicationPage() {
  const { t } = useTranslation('expertRegistration')
  const format = useFormatters()
  const { i18n } = useTranslation()
  const i18nLocale = i18n.language?.startsWith('en') ? 'en-GB' : 'vi-VN'
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
  } = useExpertApplication()
  const location = useLocation()
  const navigate = useNavigate()
  useEffect(() => {
    if (location.state)
      navigate(location.pathname + location.search, {
        replace: true,
        state: null,
      })
  }, [location.pathname, location.search, location.state, navigate])
  const {
    submitted,
    stage: applicationStage,
    history,
    eligibilityIssues,
    reapplyAt,
    decidedAt,
    decisionNote,
    supplement,
    explanation,
    error: lifecycleError,
    setError: setLifecycleError,
    notice: lifecycleNotice,
    submitting: lifecycleSubmitting,
    errorRef: lifecycleErrorRef,
    submitSupplement,
    requestSupplement,
    setSupplementFile,
    setExplanation,
    cancelSupplement,
    supplementFile,
  } = useApplicationLifecycle({
    application,
    setApplication,
  })

  const {
    profile,
    step,
    submitting,
    files,
    fields,
    activeCriterion,
    setActiveCriterion,
    declarations,
    agreed,
    toggleAgreed,
    supplementing,
    supplementNote,
    setSupplementNote,
    autoSave,
    flushAutoSave,
    retryAutoSave,
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
    update,
    move,
    furthest,
    returnToReview,
    chooseFiles,
    addCvLink,
    addEvidenceLink,
    advance,
    clearFormError,
    updateAvatar,
    toggleField,
    removeFile,
    saveDraft,
  } = useRegistrationForm({ application, setApplication })
  // While more information is requested the wizard opens again: details, files and an explanation,
  // then the last step resubmits (same Application)
  const showWizard = !submitted || (supplement && supplementing)
  useEffect(() => {
    if (supplement && application && !supplementing) cancelSupplement()
  }, [supplement, application, supplementing, cancelSupplement])
  const wizardBodyRef = useWizardMotion(step, showWizard)
  const visibleNotice =
    [notice, lifecycleNotice].find(Boolean) ?? ''
  // Eligibility only opens the service step: the furthest service qualification decides where the expert is
  const overview = useQualificationOverview()
  const serviceStep = (
    [
      ['APPROVED_FOR_SERVICE', 'approved'],
      ['PENDING_FINAL_APPROVAL', 'final'],
      ['COMPETENCY_REVIEW', 'competency'],
      ['NEED_MORE_INFORMATION', 'competency'],
    ] as const
  )
    .map(([status, step]) => ({ step: step as Stage, service: overview.data?.services.find((s) => s.status === status) }))
    .find((x) => x.service)
  const stage: Stage =
    applicationStage === 'eligible' && serviceStep ? serviceStep.step : applicationStage
  const terminal = stage === 'ineligible' || stage === 'failed'
  // No AI screening step yet: submission goes straight to the eligibility review (Gate 1)
  const timeline = [
    t('timeline.submission'),
    t('timeline.eligibility'),
    t('timeline.competency'),
    t('timeline.final'),
  ]
  const progress = stage === 'approved' ? timeline.length : [
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
      }
    : undefined

  // Auto-save status of the draft (only after the user changed something), shown beside the save button
  const autoSaveStatus =
    autoSave.status === 'idle' ? null : (
    <>
      {autoSave.status === 'saving'
        ? t('autoSave.saving')
        : autoSave.status === 'saved'
          ? t('autoSave.saved', {
              time: autoSave.at?.toLocaleTimeString(i18nLocale, {
                hour: '2-digit',
                minute: '2-digit',
              }),
            })
          : (
              <>
                {t('autoSave.failed')}{' '}
                <button
                  type="button"
                  className="underline underline-offset-4"
                  onClick={retryAutoSave}
                >
                  {t('autoSave.retry')}
                </button>
              </>
            )}
    </>
    )

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
        ) : !showWizard ? (
          <>
            <div className="expert-status-layout">
              <ApplicationStatus
                profileName={profile.name}
                stage={stage}
                serviceName={serviceStep?.service?.serviceName}
                eligibilityIssues={eligibilityIssues}
                reapplyAt={reapplyAt}
                decidedAt={decidedAt}
                decisionNote={decisionNote}
                rounds={application?.rounds}
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
                onRequestSupplement={requestSupplement}
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
              className={`expert-wizard ${step === PROFILE_STEP ? 'expert-wizard-personal' : ''}`}
            >
              <form noValidate onSubmit={advance} onBlurCapture={flushAutoSave}>
                <div
                  ref={wizardBodyRef}
                  className="expert-wizard-body pt-4 pb-[30px]"
                  key={step}
                >
                  {step !== PROFILE_STEP && stepHeading}
                  {step === PROFILE_STEP && (
                    <ExpertProfileStep
                      heading={stepHeading}
                      profile={profile}
                      fields={fields}
                      cvFiles={files.CV ?? []}
                      minYearsExperience={application?.minYearsExperience}
                      uploadQuota={uploadQuota}
                      formErrors={formErrors}
                      avatar={avatar}
                      avatarPreview={avatarPreview}
                      onUpdate={(key, value) => {
                        update(key, value)
                        clearFormError(key)
                      }}
                      onToggleField={toggleField}
                      onCvFilesSelected={(f) => chooseFiles('CV', f)}
                      onRemoveCvFile={(i) => removeFile('CV', i)}
                      onAddCvLink={addCvLink}
                      onAvatarChange={updateAvatar}
                      onError={setError}
                    />
                  )}
                  {step === DOCUMENTS_STEP && (
                    <SupportingDocuments
                      declarations={declarations}
                      agreed={agreed}
                      onAgreedChange={toggleAgreed}
                      requiredEvidence={application?.requiredEvidence ?? []}
                      formErrors={formErrors}
                      activeCriterion={activeCriterion}
                      files={files}
                      uploadQuota={uploadQuota}
                      onCriterionSelect={setActiveCriterion}
                      onFilesSelected={chooseFiles}
                      onAddLink={addEvidenceLink}
                      onRemoveFile={removeFile}
                    />
                  )}
                  {step === REVIEW_STEP && (
                    <ReviewSubmit
                      profile={profile}
                      avatarPreview={avatarPreview}
                      independent={independent}
                      fields={fields}
                      files={files}
                      requiredEvidence={application?.requiredEvidence ?? []}
                      changesRequired={application?.changesRequired ?? []}
                      declarations={declarations}
                      agreed={agreed}
                      formErrors={formErrors}
                      onAgreedChange={toggleAgreed}
                      onEditStep={move}
                      supplement={
                        supplementing
                          ? {
                              note: supplementNote,
                              onNoteChange: setSupplementNote,
                              reviewerNote: decisionNote,
                            }
                          : undefined
                      }
                    />
                  )}
                </div>
                <WizardFooter
                  step={step}
                  supplementing={supplementing}
                  returnToReview={returnToReview}
                  submitting={submitting}
                  draftSaved={draftSaved}
                  status={autoSaveStatus}
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
            className="text-ex-notice-text bg-ex-notice-bg animate-expert-fade-in col-span-full !mt-5 rounded-[5px] p-[15px] motion-reduce:animate-none"
            role="status"
          >
            {visibleNotice}
          </p>
        )}
      </div>
    </div>
  )
}
