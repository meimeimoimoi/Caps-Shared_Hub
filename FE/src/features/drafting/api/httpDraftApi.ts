import { api, apiClient, ApiError } from '@/lib/api-client'
import type { DraftApi, RequestContext } from '../types'
import {
  toTemplateVersion,
  type TemplateSchemaDto,
  type TemplateSummaryDto,
} from './templateMappers'

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

// The template catalog is served by workflow; the workspace endpoints below are still a proposal
const TEMPLATES = '/api/v1/templates'
interface Envelope<T> {
  success: boolean
  data: T
  message?: string
}

async function publishedTemplates(ctx: RequestContext) {
  const res = await api.get<Envelope<TemplateSummaryDto[]>>(
    TEMPLATES,
    config(ctx)
  )
  return res.data
}

async function withFields(summary: TemplateSummaryDto, ctx: RequestContext) {
  const res = await api.get<Envelope<TemplateSchemaDto>>(
    `${TEMPLATES}/${path(summary.id)}/schema`,
    config(ctx)
  )
  return toTemplateVersion(summary, res.data)
}

export const httpDraftApi: DraftApi = {
  // shortcut: one schema request per template because the list has no fields; add them to the list when the catalog grows
  templates: async (ctx) =>
    Promise.all((await publishedTemplates(ctx)).map((s) => withFields(s, ctx))),
  // Drafts pin a version id but the API looks templates up by template id, so find it in the published list
  template: async (id, ctx) => {
    const summary = (await publishedTemplates(ctx)).find(
      (s) => s.versionId === id || s.id === id
    )
    if (!summary)
      throw new ApiError('Template not found.', 404, 'TEMPLATE_NOT_FOUND')
    return withFields(summary, ctx)
  },
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
