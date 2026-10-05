/** Proposed UI contract. Align with the gateway before enabling production endpoints. */
export type InputValues = Record<string, string>
export interface SchemaField {
  id: string
  label: string
  group: string
  type: 'text' | 'textarea' | 'money' | 'date' | 'year'
  required: boolean
  hint?: string
  pattern?: string
  maxLength?: number
}
export interface TemplateVersion {
  id: string
  version: number
  title: string
  description: string
  category: string
  status: 'ACTIVE' | 'INACTIVE'
  updatedAt: string
  fields: SchemaField[]
  schemaNote?: string
  changelog?: string[]
}
export interface Snapshot {
  id: string
  workspaceId: string
  templateVersionId: string
  version: number
  input: InputValues
  confirmedAt: string
}
export interface Workspace {
  id: string
  title: string
  templateVersionId: string
  input: InputValues
  revision: number
  savedAt?: string
  snapshots: Snapshot[]
  latestJobId?: string
  latestDraftId?: string
}
export interface GenerationJob {
  id: string
  workspaceId: string
  snapshotId: string
  status: 'QUEUED' | 'RUNNING' | 'SUCCEEDED' | 'FAILED'
  stage?: string
  draftVersionId?: string
  error?: string
  billingMessage?: string
}
export interface DraftIssue {
  id: string
  severity: 'blocking' | 'warning'
  message: string
  guidance: string
  fieldId?: string
  citationId?: string
}
export interface Citation {
  id: string
  sourceTitle: string
  sourceVersion: string
  knowledgeVersion: string
  excerpt: string
  applicability: string
  synthetic?: boolean
  url?: string
  available: boolean
}
export interface Assessment {
  status: 'PENDING' | 'FAILED' | 'COMPLETED'
  result?: 'READY' | 'READY_WITH_WARNINGS' | 'NOT_READY'
  assessedAt?: string
  issues: DraftIssue[]
  checks: { label: string; result: string }[]
  error?: string
}
export interface Eligibility {
  allowed: boolean
  reason?: string
}
export interface DraftVersion {
  id: string
  workspaceId: string
  snapshotId: string
  templateVersionId: string
  version: number
  title: string
  generatedAt: string
  sections: {
    id: string
    title: string
    content: string
    citationIds: string[]
  }[]
  citations: Citation[]
  assessment: Assessment
  actions: { export: Eligibility; review: Eligibility; regenerate: Eligibility }
  exportEvents: { id: string; createdAt: string; format: string }[]
}
export interface ExportQuote {
  id: string
  draftVersionId: string
  formats: ('txt' | 'pdf' | 'docx')[]
  expiresAt?: string
  description: string
  eligibility: Eligibility
}
export interface ExportResult {
  id: string
  status: 'SUCCEEDED' | 'PENDING_RECONCILIATION'
  draftVersionId: string
  filename?: string
  text?: string
  downloadUrl?: string
  message: string
}
export interface ReviewReceipt {
  id: string
  draftVersionId: string
  message: string
}
export interface RequestContext {
  scope: string
  scenario: string
  signal?: AbortSignal
}
export interface DraftApi {
  templates(ctx: RequestContext): Promise<TemplateVersion[]>
  template(id: string, ctx: RequestContext): Promise<TemplateVersion>
  list(ctx: RequestContext): Promise<Workspace[]>
  workspace(id: string, ctx: RequestContext): Promise<Workspace>
  create(
    templateId: string,
    key: string,
    ctx: RequestContext
  ): Promise<Workspace>
  save(
    id: string,
    input: InputValues,
    revision: number,
    ctx: RequestContext
  ): Promise<Workspace>
  confirm(
    id: string,
    input: InputValues,
    revision: number,
    key: string,
    ctx: RequestContext
  ): Promise<Snapshot>
  generate(
    id: string,
    snapshotId: string,
    key: string,
    ctx: RequestContext
  ): Promise<GenerationJob>
  job(id: string, ctx: RequestContext): Promise<GenerationJob>
  history(id: string, ctx: RequestContext): Promise<DraftVersion[]>
  draft(id: string, ctx: RequestContext): Promise<DraftVersion>
  assess(id: string, key: string, ctx: RequestContext): Promise<DraftVersion>
  quote(id: string, ctx: RequestContext): Promise<ExportQuote>
  export(
    id: string,
    quoteId: string,
    format: string,
    key: string,
    ctx: RequestContext
  ): Promise<ExportResult>
  exportResult(id: string, ctx: RequestContext): Promise<ExportResult>
  review(id: string, key: string, ctx: RequestContext): Promise<ReviewReceipt>
  reset(ctx: RequestContext): Promise<void>
}
