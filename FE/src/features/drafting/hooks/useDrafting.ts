import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import { useAuthStore } from '@/features/auth/store/authStore'
import { useSearchParams } from 'react-router-dom'
import { draftApi } from '../api/draftApi'
import { isDraftMock } from '../api/dataSource'
import { draftKeys } from '../api/queryKeys'
import { draftScenarios } from '../constants'
import type { RequestContext } from '../types'

export function useDraftContext(): RequestContext {
  const session = useAuthStore((state) => state.sessionScope)
  const userId = useAuthStore((state) => state.user?.id)
  const [params] = useSearchParams()
  const requested =
    params.get('scenario') ??
    import.meta.env.VITE_DRAFT_MOCK_SCENARIO ??
    'ready'
  const scenario =
    isDraftMock && draftScenarios.some((value) => value === requested)
      ? requested
      : 'ready'
  return { scope: `${userId ?? 'isolated-preview'}:${session}`, scenario }
}
export function useDraftHref() {
  const ctx = useDraftContext()
  return useCallback(
    (to: string) => {
      if (!isDraftMock) return to
      const [pathname, search] = to.split('?')
      const params = new URLSearchParams(search)
      params.set('scenario', ctx.scenario)
      return `${pathname}?${params}`
    },
    [ctx.scenario]
  )
}
export function useTemplates() {
  const ctx = useDraftContext()
  return useQuery({
    queryKey: draftKeys.item(ctx.scope, ctx.scenario, 'templates'),
    queryFn: ({ signal }) => draftApi.templates({ ...ctx, signal }),
  })
}
export function useTemplate(id?: string) {
  const ctx = useDraftContext()
  return useQuery({
    queryKey: draftKeys.item(ctx.scope, ctx.scenario, 'template', id),
    queryFn: ({ signal }) => draftApi.template(id!, { ...ctx, signal }),
    enabled: Boolean(id),
  })
}
export function useWorkspaces() {
  const ctx = useDraftContext()
  return useQuery({
    queryKey: draftKeys.item(ctx.scope, ctx.scenario, 'workspaces'),
    queryFn: ({ signal }) => draftApi.list({ ...ctx, signal }),
  })
}
export function useWorkspace(id?: string) {
  const ctx = useDraftContext()
  return useQuery({
    queryKey: draftKeys.item(ctx.scope, ctx.scenario, 'workspace', id),
    queryFn: ({ signal }) => draftApi.workspace(id!, { ...ctx, signal }),
    enabled: Boolean(id),
  })
}
export function useHistory(id?: string) {
  const ctx = useDraftContext()
  return useQuery({
    queryKey: draftKeys.item(ctx.scope, ctx.scenario, 'history', id),
    queryFn: ({ signal }) => draftApi.history(id!, { ...ctx, signal }),
    enabled: Boolean(id),
  })
}
export function useGeneration(id?: string) {
  const ctx = useDraftContext()
  return useQuery({
    queryKey: draftKeys.item(ctx.scope, ctx.scenario, 'job', id),
    queryFn: ({ signal }) => draftApi.job(id!, { ...ctx, signal }),
    enabled: Boolean(id),
    retry: false,
    refetchInterval: (query) =>
      !query.state.error &&
      query.state.dataUpdateCount < 60 &&
      ['QUEUED', 'RUNNING'].includes(query.state.data?.status ?? '')
        ? 1200
        : false,
  })
}
export function useDraftVersion(id?: string) {
  const ctx = useDraftContext()
  return useQuery({
    queryKey: draftKeys.item(ctx.scope, ctx.scenario, 'draft', id),
    queryFn: ({ signal }) => draftApi.draft(id!, { ...ctx, signal }),
    enabled: Boolean(id),
    retry: false,
    refetchInterval: (query) =>
      !query.state.error &&
      query.state.dataUpdateCount < 20 &&
      query.state.data?.assessment.status === 'PENDING'
        ? 1200
        : false,
  })
}
export function useDraftAction<T, V>(
  run: (value: V, ctx: RequestContext) => Promise<T>
) {
  const ctx = useDraftContext()
  const client = useQueryClient()
  return useMutation({
    mutationFn: (value: V) => run(value, ctx),
    onSuccess: () =>
      client.invalidateQueries({
        queryKey: draftKeys.scope(ctx.scope, ctx.scenario),
      }),
  })
}
