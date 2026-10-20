import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/features/auth'
import { expertDataSource, demoScenario, isExpertDemo } from '@/lib/expert-data-source'
import { ApiError } from '@/lib/api-client'
import { getExpertContext } from '../api/expertContextApi'
import { expertContextKeys } from '../api/queryKeys'

export function useExpertContext() {
  const token = useAuthStore((s) => s.token)
  const userId = useAuthStore((s) => s.user?.id)
  const sessionScope = useAuthStore((s) => s.sessionScope)
  const scenario = isExpertDemo ? demoScenario() : 'normal'
  return useQuery({
    queryKey: expertContextKeys.context(`${userId ?? 'demo'}:${sessionScope}`, expertDataSource, scenario),
    queryFn: ({ signal }) => getExpertContext(signal, scenario),
    enabled: isExpertDemo || Boolean(token && userId),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    retry: (count, error) => !(error instanceof ApiError && [401, 403].includes(error.status ?? 0)) && count < 1,
  })
}
