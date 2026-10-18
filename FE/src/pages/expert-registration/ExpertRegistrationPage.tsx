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

  // Signed in already, or the account and its draft were just created: the application has its own page.
  // Waiting for submitting to end keeps the phone number saved in the draft before the page loads it.
  if (account && !submitting)
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
        </div>
      </main>
    </div>
  )
}
