import { api, ApiError, getApiBaseUrl } from '@/lib/api-client'
import type {
  DraftApi,
  DraftVersion,
  InputValues,
  RequestContext,
  SchemaField,
  Snapshot,
  Workspace,
} from '../types'

const base = getApiBaseUrl().endsWith('/api') ? '/v1' : '/api/v1'
const documents = `${base}/documents`
const templates = `${base}/templates`

interface DocumentDto {
  id: string
  title: string
  templateId: string | null
  pinnedTemplateVersionId?: string | null
}
interface TemplateDto {
  id: string
  code: string
  name: string
  description: string | null
  versionId: string
  versionNo: number
  updatedAt: string
}
interface SnapshotDto {
  id: string
  documentId: string
  versionNo: number
  data: string
  createdAt: string
}
interface VersionDto {
  id: string
  documentId: string
  versionNo: number
  inputSnapshotId: string | null
  templateVersionId: string | null
  createdAt: string
  versionType: string
  content: string
  citations: string | null
  draftAssessment: string | null
}

const get = async <T>(url: string, ctx: RequestContext) =>
  (await api.get<{ data: T }>(url, { signal: ctx.signal, timeout: 0 })).data
const listTemplates = (ctx: RequestContext) =>
  get<TemplateDto[]>(templates, ctx)
const docPath = (id: string) => `${documents}/${encodeURIComponent(id)}`
const versionPath = (doc: string, id: string) =>
  `${docPath(doc)}/versions/${encodeURIComponent(id)}`
const snapshotsPath = (doc: string) => `${docPath(doc)}/snapshots`

async function listDocuments(ctx: RequestContext) {
  const all: DocumentDto[] = []
  for (let page = 1; ; page += 1) {
    const { items, totalCount } = await get<{
      items: DocumentDto[]
      totalCount: number
    }>(`${documents}?page=${page}&pageSize=50`, ctx)
    all.push(...items)
    if (!items.length || all.length >= totalCount) return all
  }
}

const mapTemplate = (item: TemplateDto, fields: SchemaField[] = []) => ({
  id: item.versionId,
  templateId: item.id,
  version: item.versionNo,
  title: item.name,
  description: item.description ?? '',
  category: item.code,
  status: 'ACTIVE' as const,
  updatedAt: item.updatedAt,
  fields,
})
const mapSnapshot = (
  item: SnapshotDto,
  templateVersionId: string
): Snapshot => ({
  id: item.id,
  workspaceId: item.documentId,
  templateVersionId,
  version: item.versionNo,
  input: JSON.parse(item.data) as InputValues,
  confirmedAt: item.createdAt,
})
const toWorkspace = (
  doc: DocumentDto,
  templateVersionId: string,
  snapshots: Snapshot[] = []
): Workspace => ({
  id: doc.id,
  title: doc.title,
  templateVersionId,
  snapshots,
  input: snapshots[0]?.input ?? {},
  revision: snapshots[0]?.version ?? 0,
  savedAt: snapshots[0]?.confirmedAt,
})

const readDocument = (id: string, ctx: RequestContext) =>
  get<DocumentDto>(docPath(id), ctx)

function draftFromVersion(version: VersionDto, title: string): DraftVersion {
  const data = JSON.parse(version.content) as unknown
  const fields =
    typeof data === 'object' && data !== null && !Array.isArray(data)
      ? Object.entries(data)
      : ([[title, data]] as [string, unknown][])
  const references = JSON.parse(version.citations ?? '[]') as {
    doc_title?: string
    document_number?: string
    article?: string
    clause?: string
    point?: string
  }[]
  const warned = version.draftAssessment === 'AI_GENERATED_UNAUTHORIZED_NUMBERS'
  return {
    id: version.id,
    workspaceId: version.documentId,
    snapshotId: version.inputSnapshotId ?? '',
    templateVersionId: version.templateVersionId ?? '',
    version: version.versionNo,
    title,
    generatedAt: version.createdAt,
    sections: fields.map(([label, value], index) => ({
      id: String(index),
      title: label,
      content:
        typeof value === 'string' ? value : JSON.stringify(value, null, 2),
      citationIds: [],
    })),
    citations: (Array.isArray(references) ? references : []).map(
      (ref, index) => ({
        id: String(index),
        sourceTitle: ref.doc_title ?? ref.document_number ?? '',
        sourceVersion: ref.document_number ?? '',
        knowledgeVersion: '',
        excerpt: [ref.article, ref.clause, ref.point]
          .filter(Boolean)
          .join(' · '),
        applicability: '',
        available: true,
      })
    ),
    assessment: {
      status: 'COMPLETED',
      result: 'READY_WITH_WARNINGS',
      checks: [],
      issues: warned
        ? [
            {
              id: 'unverified-numbers',
              severity: 'warning',
              message: 'draftUnverifiedNumbers',
              guidance: 'draftVerifyAgainstInputs',
            },
          ]
        : [],
    },
    actions: {
      export: { allowed: true },
      review: { allowed: true },
      regenerate: { allowed: Boolean(version.inputSnapshotId) },
    },
    exportEvents: [],
  }
}

async function readDraft(id: string, ctx: RequestContext) {
  if (!ctx.workspaceId) throw new ApiError('Document is required.', 400)
  const [doc, version] = await Promise.all([
    readDocument(ctx.workspaceId, ctx),
    get<VersionDto>(versionPath(ctx.workspaceId, id), ctx),
  ])
  return draftFromVersion(version, doc.title)
}

async function saveSnapshot(
  id: string,
  input: InputValues,
  revision: number,
  ctx: RequestContext
) {
  return (
    await api.post<{ data: SnapshotDto }>(
      snapshotsPath(id),
      { data: JSON.stringify(input), expectedRevision: revision },
      { signal: ctx.signal }
    )
  ).data
}

export const httpDraftApi: DraftApi = {
  templates: async (ctx) =>
    (await listTemplates(ctx)).map((item) => mapTemplate(item)),
  template: async (id, ctx) => {
    const { template, schema } = await get<{
      template: TemplateDto
      schema: { fieldSchema: SchemaField[] }
    }>(`${templates}/versions/${encodeURIComponent(id)}`, ctx)
    return mapTemplate(template, schema.fieldSchema)
  },
  list: async (ctx) => {
    const [docs, library] = await Promise.all([
      listDocuments(ctx),
      listTemplates(ctx),
    ])
    return docs.map((doc) =>
      toWorkspace(
        doc,
        doc.pinnedTemplateVersionId ??
          library.find((item) => item.id === doc.templateId)?.versionId ??
          ''
      )
    )
  },
  workspace: async (id, ctx) => {
    const [doc, library, latest, versions] = await Promise.all([
      readDocument(id, ctx),
      listTemplates(ctx),
      get<SnapshotDto | null>(snapshotsPath(id), ctx),
      get<VersionDto[]>(`${docPath(id)}/versions`, ctx),
    ])
    const lastDraft = versions.find((item) => item.versionType === 'AI_DRAFT')
    const templateId =
      lastDraft?.templateVersionId ??
      doc.pinnedTemplateVersionId ??
      library.find((item) => item.id === doc.templateId)?.versionId ??
      ''
    const selected =
      ctx.snapshotId && ctx.snapshotId !== latest?.id
        ? await get<SnapshotDto>(
            `${snapshotsPath(id)}?snapshotId=${encodeURIComponent(ctx.snapshotId)}`,
            ctx
          )
        : null
    const snapshots = [latest, selected].flatMap((item) =>
      item ? [mapSnapshot(item, templateId)] : []
    )
    return {
      ...toWorkspace(doc, templateId, snapshots),
      latestDraftId: lastDraft?.id,
    }
  },
  create: async (templateId, _key, ctx) => {
    const template = await httpDraftApi.template(templateId, ctx)
    const response = await api.post<{ data: DocumentDto }>(documents, {
      title: template.title,
      templateId: template.templateId,
      metadata: JSON.stringify({ templateVersionId: template.id }),
      periodStart: '2026-01-01',
      periodEnd: '2026-12-31',
    })
    return toWorkspace(response.data, template.id)
  },
  save: async (id, input, revision, ctx) => {
    const workspace = await httpDraftApi.workspace(id, ctx)
    const saved = mapSnapshot(
      await saveSnapshot(id, input, revision, ctx),
      workspace.templateVersionId
    )
    return {
      ...workspace,
      input: saved.input,
      revision: saved.version,
      savedAt: saved.confirmedAt,
      snapshots: [saved],
    }
  },
  confirm: async (id, input, revision, _key, ctx) => {
    const workspace = await httpDraftApi.workspace(id, ctx)
    return mapSnapshot(
      await saveSnapshot(id, input, revision, ctx),
      workspace.templateVersionId
    )
  },
  generate: async (id, snapshotId, _key, ctx) => {
    const workspace = await httpDraftApi.workspace(id, { ...ctx, snapshotId })
    const snapshot = workspace.snapshots.find((item) => item.id === snapshotId)
    if (!snapshot?.templateVersionId)
      throw new ApiError('Published template version is required.', 409)
    const { data } = await api.post<{ data: VersionDto }>(
      `${docPath(id)}/generate-draft`,
      {
        snapshotId,
        templateVersionId: snapshot.templateVersionId,
      },
      { timeout: 0 }
    )
    return {
      id: data.id,
      workspaceId: id,
      snapshotId,
      status: 'SUCCEEDED',
      draftVersionId: data.id,
    }
  },
  job: async (id, ctx) => {
    const draft = await readDraft(id, ctx)
    return {
      id,
      workspaceId: draft.workspaceId,
      snapshotId: draft.snapshotId,
      status: 'SUCCEEDED',
      draftVersionId: id,
    }
  },
  history: async (id, ctx) => {
    const [doc, versions] = await Promise.all([
      readDocument(id, ctx),
      get<VersionDto[]>(`${docPath(id)}/versions`, ctx),
    ])
    return versions
      .filter((item) => item.versionType === 'AI_DRAFT')
      .map((item) =>
        draftFromVersion({ ...item, content: '{}', citations: null }, doc.title)
      )
  },
  draft: readDraft,
  assess: (id, _key, ctx) => readDraft(id, ctx),
  quote: async (id) => ({
    id,
    draftVersionId: id,
    formats: ['txt'],
    description: 'freeDraftExport',
    eligibility: { allowed: true },
  }),
  export: async (id, quoteId, format, _key, ctx) => {
    if (quoteId !== id || format !== 'txt')
      throw new ApiError('Invalid export format.', 400)
    const draft = await readDraft(id, ctx)
    const text = [
      draft.title,
      ...draft.sections.map(
        (section) => `${section.title}\n${section.content}`
      ),
      ...draft.citations.map((item) => `${item.sourceTitle} · ${item.excerpt}`),
    ].join('\n\n')
    return {
      id,
      draftVersionId: id,
      status: 'SUCCEEDED',
      filename: `draft-v${draft.version}.txt`,
      text,
      message: 'freeDraftExport',
    }
  },
  exportResult: (id, ctx) => httpDraftApi.export(id, id, 'txt', '', ctx),
  review: async () => {
    throw new ApiError(
      'Choose an expert on the marketplace to request review.',
      409
    )
  },
  reset: async () => {
    throw new ApiError('Demo reset is unavailable in API mode.', 403)
  },
}
