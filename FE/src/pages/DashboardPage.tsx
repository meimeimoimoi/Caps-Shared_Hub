import { Button } from '@/components/ui/actions/button'
import { useAuthStore } from '@/features/auth'
import { useNavigate, Navigate } from 'react-router-dom'
import { useExpertContext } from '@/features/expert-context'
import { ApiError } from '@/lib/api-client'

export default function DashboardPage() {
  const context = useExpertContext()
  const user = useAuthStore((s) => s.user)
  const clearSession = useAuthStore((s) => s.clearSession)
  const navigate = useNavigate()

  const logout = () => {
    clearSession()
    navigate('/login', { replace: true })
  }

  if (context.isPending) return <div className="p-8" role="status">Checking workspace access…</div>
  if (!context.isError && context.data?.portalAccess.allowed) return <Navigate to="/expert/overview" replace />

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-sm text-slate-400">
            Welcome, {user?.name ?? 'user'} ({user?.email ?? '-'})
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={logout}>
          Logout
        </Button>
      </div>
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 text-sm text-slate-300">
        Architecture shell is running. Business modules (workflow / ingestion /
        RAG) plug in here as lazy routes.
      </div>
      {context.isError && !(context.error instanceof ApiError && context.error.status === 403) && <div role="alert" className="space-y-3 text-sm text-slate-300"><p>Expert workspace access could not be verified. You can retry when the service is available.</p><Button variant="outline" onClick={() => void context.refetch()} disabled={context.isFetching}>Retry access check</Button></div>}
    </div>
  )
}
