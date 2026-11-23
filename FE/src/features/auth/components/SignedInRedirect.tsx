import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Loader2 } from 'lucide-react'
// Direct file import: the expert-context index re-exports hooks that import this feature
import { hasExpertApplication } from '@/features/expert-context/api/expertContextApi'
import { useAuthStore } from '../store/authStore'
import { hasAnyPermission, Permission, staffHomePath } from '../utils/permissions'
import { DEFAULT_HOME } from '../utils/returnPath'

/* Pages for signed-out visitors (sign-up, the one-time role question opened directly) send an account
 * that is already signed in to its own area: staff home, the Expert Portal when it has an application,
 * otherwise the customer home. */
export function SignedInRedirect() {
  const { t } = useTranslation('auth')
  const user = useAuthStore((s) => s.user)
  const [target, setTarget] = useState<string | null>(() => {
    if (!user) return DEFAULT_HOME
    if (user.status === 'PENDING_VERIFICATION') return '/verify-email'
    return (
      staffHomePath(user) ??
      (hasAnyPermission(user, [Permission.ServiceManage, Permission.CaseWork])
        ? '/expert'
        : null)
    )
  })

  useEffect(() => {
    if (target) return
    let cancelled = false
    hasExpertApplication()
      .then((has) => !cancelled && setTarget(has ? '/expert' : DEFAULT_HOME))
      // Unknown: the customer home still offers "Become an expert" and the portal link
      .catch(() => !cancelled && setTarget(DEFAULT_HOME))
    return () => {
      cancelled = true
    }
  }, [target])

  if (target) return <Navigate to={target} replace />
  return (
    <div role="status" className="relative z-2 py-6 text-center text-white/75">
      <Loader2
        aria-hidden="true"
        size={28}
        className="mx-auto mb-3 animate-spin motion-reduce:animate-none"
      />
      <p className="text-[14px]">{t('roleChoice.checking')}</p>
    </div>
  )
}

export default SignedInRedirect
