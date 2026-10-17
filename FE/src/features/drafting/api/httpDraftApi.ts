import { api, apiClient, ApiError } from '@/lib/api-client'
import type { DraftApi, RequestContext } from '../types'

// Proposed direct DTO contract, not a statement that these endpoints already exist.
// With the existing /api fallback, omit a duplicate prefix. Absolute gateway URLs retain /api.
const base = `${
  String(apiClient.defaults.baseURL ?? '')
    .replace(/\/$/, '')
    .endsWith('/api')
    ? ''
    : '/api'
}/drafting`
const path = (id: string) => encodeURIComponent(id)
const config = (ctx: RequestContext, key?: string) => ({
  signal: ctx.signal,
  headers: key ? { 'Idempotency-Key': key } : undefined,
})
export const httpDraftApi: DraftApi = {
  templates: (ctx) => api.get(`${base}/templates`, config(ctx)),
  template: (id, ctx) => api.get(`${base}/templates/${path(id)}`, config(ctx)),
  list: (ctx) => api.get(`${base}/workspaces`, config(ctx)),
  workspace: (id, ctx) =>
    api.get(`${base}/workspaces/${path(id)}`, config(ctx)),
  create: (templateVersionId, key, ctx) =>
    api.post(`${base}/workspaces`, { templateVersionId }, config(ctx, key)),
  save: (id, input, expectedRevision, ctx) =>
    api.put(
      `${base}/workspaces/${path(id)}/input`,
      { input, expectedRevision },
      config(ctx)
    ),
  confirm: (id, input, expectedRevision, key, ctx) =>
    api.post(
      `${base}/workspaces/${path(id)}/confirm`,
      { input, expectedRevision },
      config(ctx, key)
    ),
  generate: (id, snapshotId, key, ctx) =>
    api.post(
      `${base}/workspaces/${path(id)}/generations`,
      { snapshotId },
      config(ctx, key)
    ),
  job: (id, ctx) => api.get(`${base}/generations/${path(id)}`, config(ctx)),
  history: (id, ctx) =>
    api.get(`${base}/workspaces/${path(id)}/drafts`, config(ctx)),
  draft: (id, ctx) => api.get(`${base}/drafts/${path(id)}`, config(ctx)),
  assess: (id, key, ctx) =>
    api.post(`${base}/drafts/${path(id)}/assessments`, {}, config(ctx, key)),
  // Charging and Flow 5 contracts are intentionally unavailable until agreed.
  quote: async () => {
    throw new ApiError(
      'Export formats and charging policy are not connected yet.',
      501
    )
  },
  export: async () => {
    throw new ApiError(
      'Export is not connected yet. No transaction was submitted.',
      501
    )
  },
  exportResult: async () => {
    throw new ApiError('Export reconciliation is not connected yet.', 501)
  },
  review: async () => {
    throw new ApiError(
      'Expert review handoff is not connected yet. No booking was submitted.',
      501
    )
  },
  reset: async () => {
    throw new ApiError('Demo reset is unavailable in API mode.', 403)
  },
}
