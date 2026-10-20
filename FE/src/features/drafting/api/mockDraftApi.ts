import { ApiError } from '@/lib/api-client'
import { draftDisclaimer } from '../constants'
import { normalizeInput, validateInput } from '../utils/validation'
import { sampleInput, templates } from './fixtures'
import type {
  DraftApi,
  DraftVersion,
  ExportQuote,
  ExportResult,
  GenerationJob,
  RequestContext,
  Snapshot,
  Workspace,
} from '../types'

interface DemoStore {
  workspaces: Map<string, Workspace>
  drafts: Map<string, DraftVersion>
  jobs: Map<string, GenerationJob>
  polls: Map<string, number>
  keys: Map<string, unknown>
  quotes: Map<string, ExportQuote>
  exports: Map<string, ExportResult>
  counters: Map<string, number>
}
const stores = new Map<string, DemoStore>()
const now = () => new Date().toISOString()
const id = (prefix: string) => `${prefix}-${crypto.randomUUID()}`
const copy = <T>(value: T): T => structuredClone(value)
function count(store: DemoStore, key: string) {
  const next = (store.counters.get(key) ?? 0) + 1
  store.counters.set(key, next)
  return next
}
function found<T>(value: T | undefined): T {
  if (!value)
    throw new ApiError(
      'This item is unavailable in this workspace. Choose an existing item.',
      404
    )
  return value
}
function templateFor(templateId: string, ctx: RequestContext) {
  const value = copy(
    found(templates.find((template) => template.id === templateId))
  )
  if (ctx.scenario === 'template-inactive') value.status = 'INACTIVE'
  if (ctx.scenario === 'template-no-changelog') delete value.changelog
  return value
}
function makeDraft(
  store: DemoStore,
  workspace: Workspace,
  snapshot: Snapshot,
  scenario: string
): DraftVersion {
  const blocked = [
    'blocked-reviewable',
    'blocked-service',
    'grounding-missing',
    'handoff-blocked',
  ].includes(scenario)
  const warnings = scenario === 'warnings'
  const reviewAllowed = ![
    'blocked-service',
    'grounding-missing',
    'handoff-blocked',
  ].includes(scenario)
  const input = snapshot.input
  const draft: DraftVersion = {
    id: id('draft'),
    workspaceId: workspace.id,
    snapshotId: snapshot.id,
    templateVersionId: snapshot.templateVersionId,
    version:
      [...store.drafts.values()].filter(
        (value) => value.workspaceId === workspace.id
      ).length + 1,
    title: `Giải trình chi phí — ${input.companyName} — ${input.taxYear}`,
    generatedAt: now(),
    sections: [
      {
        id: 'recipient',
        title: 'Thông tin doanh nghiệp',
        content: `Kính gửi: ${input.agency}\nDoanh nghiệp: ${input.companyName}\nMã số thuế: ${input.taxCode}\nKỳ thuế: ${input.taxYear}\nNgày phát sinh giao dịch: ${input.transactionDate}`,
        citationIds: [],
      },
      {
        id: 'expense',
        title: 'Nội dung giải trình',
        content: input.expenseDescription,
        citationIds: [],
      },
      {
        id: 'amounts',
        title: 'Số liệu do người dùng cung cấp',
        content: `Nguyên giá tài sản: ${input.originalCost} VND\nKhấu hao trong kỳ: ${input.depreciation} VND\nPhần đề nghị đưa vào chi phí được trừ: ${input.deductibleAmount} VND\nCác số liệu này được sao chép từ Snapshot đã xác nhận; không phải kết quả tính toán hoặc xác định nghĩa vụ thuế.`,
        citationIds: scenario === 'grounding-missing' ? [] : ['demo-source'],
      },
    ],
    citations:
      scenario === 'grounding-missing'
        ? []
        : [
            {
              id: 'demo-source',
              sourceTitle: 'Synthetic source for traceability demonstration',
              sourceVersion: 'demo-source-v1',
              knowledgeVersion: 'demo-knowledge-v1',
              excerpt:
                'This illustrative source demonstrates citation navigation only. It contains no verified legal rule and cannot establish deductibility.',
              applicability: `Demo metadata only — tax period ${input.taxYear}. Applicability has not been legally verified.`,
              synthetic: true,
              available: scenario !== 'source-unavailable',
            },
          ],
    assessment: {
      status:
        scenario === 'assessment-pending'
          ? 'PENDING'
          : scenario === 'assessment-failed'
            ? 'FAILED'
            : 'COMPLETED',
      result: blocked
        ? 'NOT_READY'
        : warnings
          ? 'READY_WITH_WARNINGS'
          : 'READY',
      assessedAt: now(),
      error:
        scenario === 'assessment-failed'
          ? 'The simulated assessment failed. Retry without regenerating this draft.'
          : undefined,
      issues: blocked
        ? [
            {
              id: 'blocking-1',
              severity: 'blocking',
              message:
                scenario === 'grounding-missing'
                  ? 'Applicable grounded knowledge is missing.'
                  : 'The expense explanation needs a professional check.',
              guidance: reviewAllowed
                ? 'This demo service accepts this issue for expert review.'
                : 'Revise the input or obtain applicable sources before proceeding.',
              fieldId: 'expenseDescription',
            },
          ]
        : warnings
          ? [
              {
                id: 'warning-1',
                severity: 'warning',
                message: 'The explanation may need supporting evidence.',
                guidance:
                  'Check the expense description and consult an expert if needed.',
                fieldId: 'expenseDescription',
              },
            ]
          : [],
      checks: [
        { label: 'Completeness', result: 'Passed (demo)' },
        {
          label: 'Input consistency',
          result: blocked ? 'Issue found (demo)' : 'Passed (demo)',
        },
        {
          label: 'Citation coverage',
          result:
            scenario === 'grounding-missing'
              ? 'Missing (demo)'
              : 'Synthetic coverage only',
        },
        {
          label: 'Unresolved issues',
          result: blocked
            ? 'Blocking issue'
            : warnings
              ? 'Warning'
              : 'None (demo)',
        },
      ],
    },
    actions: {
      export: {
        allowed: !blocked,
        reason: blocked
          ? 'Resolve the blocking issues before export.'
          : undefined,
      },
      review: {
        allowed: reviewAllowed,
        reason: !reviewAllowed
          ? 'This issue does not meet the demo service entry conditions.'
          : undefined,
      },
      regenerate: { allowed: true },
    },
    exportEvents: [],
  }
  if (draft.assessment.status !== 'COMPLETED') {
    delete draft.assessment.result
    delete draft.assessment.assessedAt
    draft.assessment.checks = draft.assessment.checks.map((check) => ({
      ...check,
      result: 'Awaiting assessment',
    }))
    draft.actions.export = {
      allowed: false,
      reason: 'Wait for the readiness assessment.',
    }
    draft.actions.review = {
      allowed: false,
      reason: 'Wait for the readiness assessment.',
    }
  }
  store.drafts.set(draft.id, draft)
  workspace.latestDraftId = draft.id
  return draft
}
function storeFor(ctx: RequestContext): DemoStore {
  const key = `${ctx.scope}:${ctx.scenario}`
  const existing = stores.get(key)
  if (existing) return existing
  // A session switch must never expose another user's fixture input.
  for (const other of stores.keys())
    if (!other.startsWith(`${ctx.scope}:`)) stores.delete(other)
  const store: DemoStore = {
    workspaces: new Map(),
    drafts: new Map(),
    jobs: new Map(),
    polls: new Map(),
    keys: new Map(),
    quotes: new Map(),
    exports: new Map(),
    counters: new Map(),
  }
  stores.set(key, store)
  if (ctx.scenario !== 'empty') {
    const workspace: Workspace = {
      id: 'demo-workspace',
      title: 'Giải trình chi phí khấu hao ô tô 2025',
      templateVersionId: templates[0].id,
      input: copy(sampleInput),
      revision: 1,
      savedAt: now(),
      snapshots: [],
    }
    store.workspaces.set(workspace.id, workspace)
    if (
      ['validation-failed', 'required-agency-missing'].includes(ctx.scenario)
    ) {
      workspace.input.agency = ''
      if (ctx.scenario === 'validation-failed') workspace.input.taxCode = '123'
    } else if (ctx.scenario !== 'history-empty') {
      const snapshot: Snapshot = {
        id: 'demo-snapshot-1',
        workspaceId: workspace.id,
        templateVersionId: workspace.templateVersionId,
        version: 1,
        input: copy(workspace.input),
        confirmedAt: now(),
      }
      workspace.snapshots.push(snapshot)
      if (
        [
          'generating',
          'resume-job',
          'generation-failed',
          'confirm-then-job-fails',
          'retry-success',
          'generation-timeout-unknown',
        ].includes(ctx.scenario)
      ) {
        const job: GenerationJob = {
          id: 'demo-job',
          workspaceId: workspace.id,
          snapshotId: snapshot.id,
          status: [
            'generation-failed',
            'confirm-then-job-fails',
            'retry-success',
          ].includes(ctx.scenario)
            ? 'FAILED'
            : 'RUNNING',
          stage: 'Creating draft',
          error:
            'Simulated generation failure. The confirmed snapshot is preserved.',
          billingMessage: 'Demo policy: failed generation has no charge.',
        }
        store.jobs.set(job.id, job)
        workspace.latestJobId = job.id
      } else {
        makeDraft(store, workspace, snapshot, ctx.scenario)
        if (ctx.scenario === 'history-same-snapshot')
          makeDraft(store, workspace, snapshot, ctx.scenario)
        if (ctx.scenario === 'version-history') {
          const second: Snapshot = {
            ...copy(snapshot),
            id: 'demo-snapshot-2',
            version: 2,
            input: {
              ...snapshot.input,
              expenseDescription:
                'Nội dung giải trình đã được người dùng bổ sung (minh họa).',
            },
          }
          workspace.snapshots.push(second)
          workspace.input = copy(second.input)
          makeDraft(store, workspace, second, ctx.scenario)
        }
        if (ctx.scenario === 'stale-input')
          workspace.input.expenseDescription +=
            '\nWorking input has changed; existing drafts retain their original snapshot.'
      }
    }
  }
  return store
}
async function wait(ctx: RequestContext) {
  ctx.signal?.throwIfAborted()
  const raw = Number(import.meta.env.VITE_DRAFT_MOCK_LATENCY_MS ?? 350)
  const latency = Number.isFinite(raw) ? Math.max(0, Math.min(raw, 3000)) : 350
  await new Promise<void>((resolve, reject) => {
    const abort = () => {
      clearTimeout(timer)
      reject(new DOMException('Aborted', 'AbortError'))
    }
    const timer = setTimeout(() => {
      ctx.signal?.removeEventListener('abort', abort)
      resolve()
    }, latency)
    ctx.signal?.addEventListener('abort', abort, { once: true })
  })
  ctx.signal?.throwIfAborted()
  if (ctx.scenario === 'unauthorized')
    throw new ApiError(
      'Your demo session has expired. Sign in again or select another demo scenario.',
      401
    )
  if (ctx.scenario === 'forbidden')
    throw new ApiError('You do not have access to this workspace.', 403)
  if (ctx.scenario === 'network-error')
    throw new ApiError(
      'Unable to connect. Your unsaved input has not been discarded.',
      503
    )
}
async function action<T>(
  ctx: RequestContext,
  run: (store: DemoStore) => T
): Promise<T> {
  await wait(ctx)
  return copy(run(storeFor(ctx)))
}
function once<T>(store: DemoStore, key: string, run: () => T): T {
  if (store.keys.has(key)) return copy(store.keys.get(key) as T)
  const result = run()
  store.keys.set(key, copy(result))
  return result
}
function validateSave(
  store: DemoStore,
  workspaceId: string,
  revision: number,
  ctx: RequestContext
) {
  const workspace = found(store.workspaces.get(workspaceId))
  if (ctx.scenario === 'save-failed')
    throw new ApiError(
      'Demo save failed. Your local input is still available. Retry saving.',
      503
    )
  if (ctx.scenario === 'save-conflict' || workspace.revision !== revision)
    throw new ApiError(
      'Another revision was saved. Keep your local input, reload the saved revision and compare before saving again.',
      409,
      'REVISION_CONFLICT'
    )
  return workspace
}
export const mockDraftApi: DraftApi = {
  templates: (ctx) =>
    action(ctx, () =>
      templates.map((template) => templateFor(template.id, ctx))
    ),
  template: (templateId, ctx) =>
    action(ctx, () => templateFor(templateId, ctx)),
  list: (ctx) => action(ctx, (store) => [...store.workspaces.values()]),
  workspace: (workspaceId, ctx) =>
    action(ctx, (store) => found(store.workspaces.get(workspaceId))),
  create: (templateId, key, ctx) =>
    action(ctx, (store) =>
      once(store, `create:${key}`, () => {
        const template = templateFor(templateId, ctx)
        if (
          template.status !== 'ACTIVE' ||
          ctx.scenario === 'template-unavailable'
        )
          throw new ApiError(
            'This template is no longer active. Choose another template.',
            409
          )
        if (!template.fields.length)
          throw new ApiError(
            'A confirmed schema is not available for this reference template.',
            422
          )
        const workspace: Workspace = {
          id: id('workspace'),
          title: template.title,
          templateVersionId: template.id,
          input: ctx.scenario === 'chat-suggestion' ? copy(sampleInput) : {},
          revision: 0,
          snapshots: [],
        }
        store.workspaces.set(workspace.id, workspace)
        return workspace
      })
    ),
  save: (workspaceId, input, revision, ctx) =>
    action(ctx, (store) => {
      const workspace = validateSave(store, workspaceId, revision, ctx)
      workspace.input = normalizeInput(
        input,
        found(
          templates.find((value) => value.id === workspace.templateVersionId)
        ).fields
      )
      workspace.savedAt = now()
      workspace.revision++
      return workspace
    }),
  confirm: (workspaceId, input, revision, key, ctx) =>
    action(ctx, (store) =>
      once(store, `confirm:${workspaceId}:${key}`, () => {
        const workspace = validateSave(store, workspaceId, revision, ctx)
        const template = found(
          templates.find((value) => value.id === workspace.templateVersionId)
        )
        const values = normalizeInput(input, template.fields)
        const errors = validateInput(values, template.fields)
        if (Object.keys(errors).length)
          throw new ApiError(
            Object.values(errors).join(' '),
            422,
            'VALIDATION_FAILED'
          )
        const snapshot: Snapshot = {
          id: id('snapshot'),
          workspaceId,
          templateVersionId: template.id,
          version: workspace.snapshots.length + 1,
          input: copy(values),
          confirmedAt: now(),
        }
        workspace.input = copy(values)
        workspace.revision++
        workspace.savedAt = now()
        workspace.snapshots.push(snapshot)
        return snapshot
      })
    ),
  generate: (workspaceId, snapshotId, key, ctx) =>
    action(ctx, (store) =>
      once(store, `generate:${workspaceId}:${key}`, () => {
        const workspace = found(store.workspaces.get(workspaceId))
        found(workspace.snapshots.find((value) => value.id === snapshotId))
        const job: GenerationJob = {
          id: id('job'),
          workspaceId,
          snapshotId,
          status: 'QUEUED',
          stage: 'Snapshot locked',
        }
        store.jobs.set(job.id, job)
        workspace.latestJobId = job.id
        return job
      })
    ),
  job: (jobId, ctx) =>
    action(ctx, (store) => {
      const job = found(store.jobs.get(jobId))
      const polls = count(store, `job:${jobId}`)
      if (ctx.scenario === 'generation-timeout-unknown' && polls === 1)
        throw new ApiError(
          'Polling timed out. The job state is unknown; check its status before retrying generation.',
          504
        )
      if (job.status === 'SUCCEEDED' || job.status === 'FAILED') return job
      if (polls < (ctx.scenario === 'generating' ? 6 : 3)) {
        job.status = 'RUNNING'
        job.stage =
          polls === 1
            ? 'Template version and tax period'
            : 'Creating draft and traceability'
      } else if (
        ['generation-failed', 'confirm-then-job-fails'].includes(
          ctx.scenario
        ) &&
        count(store, 'generation-failures') === 1
      ) {
        job.status = 'FAILED'
        job.error =
          'Simulated generation failure. Retry uses the same confirmed snapshot.'
        job.billingMessage = 'Demo policy: failed generation has no charge.'
      } else {
        const workspace = found(store.workspaces.get(job.workspaceId))
        const snapshot = found(
          workspace.snapshots.find((value) => value.id === job.snapshotId)
        )
        const draft = makeDraft(store, workspace, snapshot, ctx.scenario)
        job.status = 'SUCCEEDED'
        job.stage = 'Draft created'
        job.draftVersionId = draft.id
      }
      return job
    }),
  history: (workspaceId, ctx) =>
    action(ctx, (store) => {
      found(store.workspaces.get(workspaceId))
      return [...store.drafts.values()]
        .filter((value) => value.workspaceId === workspaceId)
        .reverse()
    }),
  draft: (draftId, ctx) =>
    action(ctx, (store) => {
      if (ctx.scenario === 'version-unavailable')
        throw new ApiError(
          'This draft version is unavailable. No other version has been selected.',
          404
        )
      const draft = found(store.drafts.get(draftId))
      if (
        draft.assessment.status === 'PENDING' &&
        count(store, `assessment:${draftId}`) >= 3
      ) {
        draft.assessment = {
          ...draft.assessment,
          status: 'COMPLETED',
          result: 'READY',
          assessedAt: now(),
        }
        draft.assessment.checks = draft.assessment.checks.map((check) => ({
          ...check,
          result: 'Passed (demo only)',
        }))
        draft.actions.export = { allowed: true }
        draft.actions.review = { allowed: true }
      }
      return draft
    }),
  assess: (draftId, key, ctx) =>
    action(ctx, (store) =>
      once(store, `assess:${draftId}:${key}`, () => {
        const draft = found(store.drafts.get(draftId))
        draft.assessment = {
          ...draft.assessment,
          status: 'COMPLETED',
          result: 'READY',
          error: undefined,
          assessedAt: now(),
        }
        draft.assessment.checks = draft.assessment.checks.map((check) => ({
          ...check,
          result: 'Passed (demo only)',
        }))
        draft.actions.export = { allowed: true }
        draft.actions.review = { allowed: true }
        return draft
      })
    ),
  quote: (draftId, ctx) =>
    action(ctx, (store) => {
      const draft = found(store.drafts.get(draftId))
      const quote: ExportQuote = {
        id: id('quote'),
        draftVersionId: draft.id,
        formats: ['txt'],
        description:
          'Demo TXT export only. No real credit transaction or account balance is involved.',
        expiresAt: new Date(
          Date.now() +
            (ctx.scenario === 'export-quote-expired' &&
            count(store, `quote:${draftId}`) === 1
              ? -1000
              : 120000)
        ).toISOString(),
        eligibility:
          ctx.scenario === 'export-insufficient-credit'
            ? {
                allowed: false,
                reason:
                  'Synthetic policy: insufficient demo credit. No top-up integration is available.',
              }
            : copy(draft.actions.export),
      }
      store.quotes.set(quote.id, quote)
      return quote
    }),
  export: (draftId, quoteId, format, key, ctx) =>
    action(ctx, (store) =>
      once(store, `export:${draftId}:${key}`, () => {
        const draft = found(store.drafts.get(draftId))
        const quote = found(store.quotes.get(quoteId))
        if (
          quote.draftVersionId !== draftId ||
          !quote.formats.includes(format as 'txt') ||
          !quote.eligibility.allowed ||
          !draft.actions.export.allowed ||
          draft.assessment.status !== 'COMPLETED'
        )
          throw new ApiError(
            'This format or export action is unavailable for the selected version.',
            422
          )
        if (quote.expiresAt && Date.parse(quote.expiresAt) <= Date.now())
          throw new ApiError(
            'The export quote expired. Reload the quote before confirming again.',
            409,
            'QUOTE_EXPIRED'
          )
        if (ctx.scenario === 'export-failed')
          throw new ApiError(
            'The simulated export failed. No artifact was created.',
            503
          )
        const result: ExportResult = {
          id: id('export'),
          status:
            ctx.scenario === 'export-timeout-unknown'
              ? 'PENDING_RECONCILIATION'
              : 'SUCCEEDED',
          draftVersionId: draftId,
          filename: `shared-hub-demo-draft-v${draft.version}.txt`,
          text: `DEMO — SYNTHETIC DATA — NOT A LEGAL DOCUMENT\n${draftDisclaimer}\n\nDraft: ${draft.id}\nSnapshot: ${draft.snapshotId}\nTemplate: ${draft.templateVersionId}\n\n${draft.sections.map((section) => `${section.title}\n${section.content}`).join('\n\n')}\n\n${draft.citations.map((citation) => `${citation.sourceTitle}: ${citation.excerpt}`).join('\n')}`,
          message:
            ctx.scenario === 'export-timeout-unknown'
              ? 'The simulated transaction is being reconciled. Check its status; do not create another export.'
              : 'Demo TXT artifact created. No real credits were charged.',
        }
        store.exports.set(result.id, result)
        if (result.status === 'SUCCEEDED')
          draft.exportEvents.push({ id: result.id, createdAt: now(), format })
        return result
      })
    ),
  exportResult: (exportId, ctx) =>
    action(ctx, (store) => {
      const result = found(store.exports.get(exportId))
      if (result.status === 'PENDING_RECONCILIATION') {
        result.status = 'SUCCEEDED'
        result.message =
          'Demo transaction reconciled. Reuse this TXT artifact; no real credits were charged.'
        found(store.drafts.get(result.draftVersionId)).exportEvents.push({
          id: result.id,
          createdAt: now(),
          format: 'txt',
        })
      }
      return result
    }),
  review: (draftId, key, ctx) =>
    action(ctx, (store) =>
      once(store, `review:${draftId}:${key}`, () => {
        const draft = found(store.drafts.get(draftId))
        if (
          !draft.actions.review.allowed ||
          draft.assessment.status !== 'COMPLETED'
        )
          throw new ApiError(
            draft.actions.review.reason ?? 'Review is unavailable.',
            422
          )
        if (ctx.scenario === 'handoff-failed')
          throw new ApiError(
            'The demo handoff failed. No booking or payment was created.',
            503
          )
        return {
          id: id('demo-handoff'),
          draftVersionId: draft.id,
          message: `Demo handoff recorded for Draft v${draft.version} and Snapshot ${draft.snapshotId}. No expert booking, notification or payment was created.`,
        }
      })
    ),
  reset: async (ctx) => {
    stores.delete(`${ctx.scope}:${ctx.scenario}`)
  },
}
