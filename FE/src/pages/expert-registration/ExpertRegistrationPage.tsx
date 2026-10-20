import { useTranslation } from 'react-i18next'
import { useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { useRegistrationMotion } from '../../features/expert-registration/hooks/useRegistrationMotion'
import { useScrollReveal } from '@/hooks/useScrollReveal'
import { mergeRefs } from '@/lib/merge-refs'
import { AccountCreation } from '../../features/expert-registration/components/AccountCreation'
import { AccountIntroduction } from '../../features/expert-registration/components/AccountIntroduction'
import { useRegistrationForm } from '../../features/expert-registration/hooks/useRegistrationForm'
import { useApplicationLifecycle } from '../../features/expert-registration/hooks/useApplicationLifecycle'
import { useExpertApplication } from '../../features/expert-registration/hooks/useExpertApplication'
import { expertPageCls } from './expertPageClass'
import { SignedInNotice } from '@/features/auth'
import { formButtonClassName as btnBase } from '@/components/ui/forms/form-control'

const signedInClasses = {
  card: 'relative bg-ex-panel rounded-[3px] p-8 md:p-10 shadow-ex-dossier max-md:p-[24px] before:absolute before:top-0 before:left-8 before:right-8 before:h-px before:bg-ex-ink',
  title: 'text-center text-[30px] leading-tight font-semibold text-ex-ink',
  body: 'mt-3 text-center text-[15px] leading-[1.55] text-ex-muted [&_strong]:text-ex-ink',
  primary: `${btnBase} w-full !bg-ex-accent !border-ex-accent !text-on-accent hover:!bg-ex-accent-hover`,
  secondary: `${btnBase} w-full !bg-transparent hover:!bg-ex-btn-hover`,
}

/** Expert sign-up: creates the account and a first draft, then continues at /expert/application. */
export default function ExpertRegistrationPage() {
  const { t } = useTranslation('expertRegistration')
  useEffect(() => {
    document.title = `${t('page.title')} | Shared Hub`
  }, [t])

  const motionRef = useRegistrationMotion()
  const scrollRevealRef = useScrollReveal()
  const { application, setApplication, syncVerifiedSession } =
    useExpertApplication({ enabled: false })
  const {
    account,
    notice,
    submitting,
    createAccount,
    accountEmailError,
    accountError,
    clearAccountEmailError,
  } = useApplicationLifecycle({
    application,
    setApplication,
    syncVerifiedSession,
  })
  const { profile, formErrors, validateForm, update, clearFormError } =
    useRegistrationForm({ application, setApplication, syncVerifiedSession })

  // The account and its draft were just created: the application has its own page.
  // Waiting for submitting to end keeps the phone number saved in the draft before the page loads it.
  // A session that was already active gets the signed-in notice instead of a silent redirect.
  if (account && notice && !submitting)
    return (
      <Navigate
        to="/expert/application"
        replace
        state={notice ? { accountCreated: true } : undefined}
      />
    )

  return (
    <div
      ref={mergeRefs(motionRef, scrollRevealRef)}
      className={`expert-welcome expert-signup bg-ex-bg min-h-screen ${expertPageCls}`}
    >
      <main className="expert-signup-layout">
        <AccountIntroduction />
        <div className="expert-signup-form-pane">
          {account && !notice && !submitting ? (
            <SignedInNotice
              continueTo="/expert/application"
              classes={signedInClasses}
            />
          ) : (
            <AccountCreation
              profile={profile}
              formErrors={formErrors}
              submitting={submitting}
              serverEmailError={accountEmailError}
              serverError={accountError}
              onUpdate={(key, value) => {
                update(key, value)
                clearFormError(key)
                if (key === 'email') clearAccountEmailError()
              }}
              onSubmit={(e, password) => {
                e.preventDefault()
                if (submitting) return
                if (!validateForm(e.currentTarget)) return
                void createAccount(profile, password)
              }}
            />
          )}
        </div>
      </main>
    </div>
  )
}
