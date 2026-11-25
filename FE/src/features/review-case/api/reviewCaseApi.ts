import { api, apiClient } from '@/lib/api-client'
import type {
  AttachmentDto,
  ClientTerms,
  DisputeDto,
  ReviewCaseDto,
} from '../types'

const base = '/api/v1/review-cases'
const adminBase = '/api/v1/admin/review-cases'
// Files go up to 50 MB, which takes minutes on a slow connection
const FILE_TIMEOUT = 5 * 60_000

type Envelope<T> = { data: T }
const unwrap = <T>(p: Promise<Envelope<T>>) => p.then((r) => r.data)
const act = (id: string, path: string, body?: unknown) =>
  unwrap(api.post<Envelope<ReviewCaseDto>>(`${base}/${id}/${path}`, body))

export interface NewReviewCase {
  documentId: string
  sourceVersionId: string
  expertProfileId: string
  serviceCode: string
  problemDescription: string
  expectedOutcome: string | null
  /** The price the client saw; the backend refuses with PRICE_CHANGED when it no longer matches */
  expectedFee?: number | null
}

export const listReviewCases = (signal?: AbortSignal) =>
  unwrap(api.get<Envelope<ReviewCaseDto[]>>(base, { signal }))

export const getReviewCase = (id: string, signal?: AbortSignal) =>
  unwrap(api.get<Envelope<ReviewCaseDto>>(`${base}/${id}`, { signal }))

/** What booking this expert's service would give the client back in each case, in VND, before booking. */
export const getBookingTerms = (
  expertProfileId: string,
  serviceCode: string,
  signal?: AbortSignal
) =>
  unwrap(
    api.get<Envelope<ClientTerms>>(`${base}/terms`, {
      params: { expertProfileId, serviceCode },
      signal,
    })
  )

export const createReviewCase = (body: NewReviewCase) =>
  unwrap(api.post<Envelope<ReviewCaseDto>>(base, body))

export const reviewCaseActions = {
  pay: (id: string) => act(id, 'pay'),
  withdraw: (id: string) => act(id, 'withdraw'),
  confirm: (id: string) => act(id, 'confirm'),
  accept: (id: string) => act(id, 'accept'),
  decline: (id: string, reason: string) => act(id, 'decline', { reason }),
  expertWithdraw: (id: string, reason: string) =>
    act(id, 'expert-withdraw', { reason }),
  requestInformation: (id: string, message: string) =>
    act(id, 'request-information', { message }),
  provideInformation: (id: string, message: string) =>
    act(id, 'provide-information', { message }),
  requestExtension: (id: string, days: number, reason: string) =>
    act(id, 'extension', { days, reason }),
  decideExtension: (id: string, accept: boolean) =>
    act(id, accept ? 'extension/accept' : 'extension/decline'),
  deliver: (
    id: string,
    body: {
      result: 'VERIFIED' | 'CANNOT_VERIFY'
      summary: string
      cannotVerifyReason: string | null
      citations: string[]
      attested: boolean
      revisedContent: Record<string, unknown> | null
    }
  ) => act(id, 'deliver', body),
  rate: (id: string, stars: number, comment: string) =>
    act(id, 'rating', { stars, comment: comment || null }),
  withdrawDispute: (id: string) => act(id, 'dispute/withdraw'),
  /** Saves the expert's revised draft; the client sees it only after delivery */
  saveRevision: (id: string, revisedContent: Record<string, unknown> | null) =>
    act(id, 'revisions', { revisedContent }),
}

export const getCaseDispute = (id: string, signal?: AbortSignal) =>
  unwrap(api.get<Envelope<DisputeDto>>(`${base}/${id}/dispute`, { signal }))

export const openCaseDispute = (
  id: string,
  reason: string,
  description: string
) =>
  unwrap(
    api.post<Envelope<DisputeDto>>(`${base}/${id}/dispute`, {
      reason,
      description,
    })
  )

export const addDisputeStatement = (id: string, message: string) =>
  unwrap(
    api.post<Envelope<DisputeDto>>(`${base}/${id}/dispute/statement`, {
      message,
    })
  )

/** A document made from a file the client already has; id is the version to book as sourceVersionId. */
export interface UploadedDocument {
  id: string
  documentId: string
}

/** A document the client already has in their workspace. */
export interface ClientDocument {
  id: string
  title: string
  /** TEMPLATE: drafted with AI from a template; EXTERNAL_FILE: uploaded by the client */
  source: string
  /** DRAFT, IN_REVIEW or VERIFIED */
  status: string
  periodStart: string | null
  periodEnd: string | null
}

// ponytail: first 50 documents only; add paging or search when clients keep more
export const getMyDocuments = (signal?: AbortSignal) =>
  unwrap(
    api.get<Envelope<{ items: ClientDocument[] }>>('/api/v1/documents', {
      params: { pageSize: 50 },
      signal,
    })
  ).then((page) => page.items)

/** The newest version of a document, the one sent for review; undefined when it has none yet. */
export const getLatestVersionId = (documentId: string) =>
  unwrap(
    api.get<Envelope<{ id: string; versionNo: number }[]>>(
      `/api/v1/documents/${documentId}/versions`
    )
  ).then(
    (versions) =>
      versions.reduce<{ id: string; versionNo: number } | undefined>(
        (newest, v) => (!newest || v.versionNo > newest.versionNo ? v : newest),
        undefined
      )?.id
  )

/** Uploads the client's own file as a new document so it can be sent for expert review. */
export function uploadDocument(
  file: File,
  title: string,
  periodStart: string,
  periodEnd: string
) {
  const form = new FormData()
  form.append('title', title)
  form.append('periodStart', periodStart)
  form.append('periodEnd', periodEnd)
  form.append('file', file)
  return unwrap(
    api.post<Envelope<UploadedDocument>>('/api/v1/documents/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: FILE_TIMEOUT,
    })
  )
}

/** A system admin reads the same files through its own route. */
export type AttachmentScope = 'party' | 'admin'
const attachmentsUrl = (id: string, scope: AttachmentScope) =>
  `${scope === 'admin' ? adminBase : base}/${id}/attachments`

export const listCaseAttachments = (
  id: string,
  scope: AttachmentScope,
  signal?: AbortSignal
) =>
  unwrap(
    api.get<Envelope<AttachmentDto[]>>(attachmentsUrl(id, scope), { signal })
  )

/** The uploader takes back a file within 15 minutes of uploading, before any dispute (server rule) */
export const removeCaseAttachment = (id: string, attachmentId: string) =>
  api.del(`${attachmentsUrl(id, 'party')}/${attachmentId}`)

export function addCaseAttachment(id: string, file: File) {
  const form = new FormData()
  form.append('file', file)
  return unwrap(
    api.post<Envelope<AttachmentDto>>(attachmentsUrl(id, 'party'), form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: FILE_TIMEOUT,
    })
  )
}

/** The uploaded file the case reviews; 404 when the version was built in the app. */
export const downloadSourceFile = (id: string, scope: AttachmentScope) =>
  apiClient
    .get<Blob>(`${scope === 'admin' ? adminBase : base}/${id}/source-file`, {
      responseType: 'blob',
      timeout: FILE_TIMEOUT,
    })
    .then((r) => r.data)

export const downloadCaseAttachment = (
  id: string,
  attachmentId: string,
  scope: AttachmentScope
) =>
  apiClient
    .get<Blob>(`${attachmentsUrl(id, scope)}/${attachmentId}/file`, {
      responseType: 'blob',
      timeout: FILE_TIMEOUT,
    })
    .then((r) => r.data)
