import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/features/auth'
import { useExpertContext } from '@/features/expert-context'
import { demoScenario, expertDataSource, isExpertDemo } from '@/lib/expert-data-source'
import { ApiError } from '@/lib/api-client'
import { getExpertDashboard } from '../api/expertDashboardApi'

export function useExpertDashboard() {
  const context = useExpertContext()
  const userId = useAuthStore((s) => s.user?.id)
  const sessionScope = useAuthStore((s) => s.sessionScope)
  const scenario = isExpertDemo ? demoScenario() : 'normal'
  return useQuery({
    queryKey: ['private', `${userId ?? 'demo'}:${sessionScope}`, 'expert-dashboard', expertDataSource, scenario, context.data?.version],
    queryFn: ({ signal }) => getExpertDashboard(signal, scenario),
    enabled: context.data?.portalAccess.allowed === true && !context.isError,
    staleTime: 30_000, refetchOnWindowFocus: true,
    retry: (count, error) => !(error instanceof ApiError && [401, 403].includes(error.status ?? 0)) && count < 1,
  })
}
