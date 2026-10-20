import { useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { ArrowRight, Loader2, LogOut } from 'lucide-react'
import { authApi } from '../api/authApi'
import { useAuthStore } from '../store/authStore'

export interface SignedInNoticeProps {
  /** Where the current account continues (its own workspace or application) */
  continueTo: string
  /** Styling per page: the sign-up pages use different visual themes */
  classes: {
    card: string
    title: string
    body: string
    primary: string
    secondary: string
  }
}

/* Sign-up pages opened while a session is active (e.g. restored through the refresh cookie):
 * say which account is signed in instead of redirecting silently, and let the user sign out
 * to create a new account on the same page. */
export function SignedInNotice({ continueTo, classes }: SignedInNoticeProps) {
  const { t } = useTranslation('auth')
  const user = useAuthStore((s) => s.user)
  const [signingOut, setSigningOut] = useState(false)

  const signOut = async () => {
    setSigningOut(true)
    // Revoke the refresh cookie; network failures still allow local sign-out.
    await authApi.logout().catch(() => undefined)
    // A public page has no route guard, so the sign-up form simply renders once the session is gone.
    useAuthStore.getState().clearSession()
  }

  return (
    <section className={classes.card} aria-labelledby="signed-in-title">
      <h2 id="signed-in-title" className={classes.title}>
        {t('register.signedInTitle')}
      </h2>
      <p className={classes.body}>
        <Trans
          t={t}
          i18nKey="register.signedInBody"
          values={{ name: user?.name ?? '', email: user?.email ?? '' }}
          components={{ strong: <strong /> }}
        />
      </p>
      <div className="mt-6 flex flex-col gap-3">
        <Link to={continueTo} replace className={classes.primary}>
          {t('register.continue')}
          <ArrowRight aria-hidden="true" size={16} />
        </Link>
        <button
          type="button"
          onClick={() => void signOut()}
          disabled={signingOut}
          aria-busy={signingOut}
          className={classes.secondary}
        >
          {signingOut ? (
            <Loader2 aria-hidden="true" size={16} className="animate-spin" />
          ) : (
            <LogOut aria-hidden="true" size={16} />
          )}
          {signingOut ? t('register.signingOut') : t('register.signOut')}
        </button>
      </div>
    </section>
  )
}
