import type { UploadResult } from '../types'

/** The document version ingestion creates for an upload (DocumentSummaryResponse) */
export interface UploadedDocumentDto {
  id: string
  documentNumber: string
  versionNo: number
  createdAt: string
}

/** A stored file waits in the queue; a number already stored adds a version after the first */
export function uploadedResult(
  fileName: string,
  doc: UploadedDocumentDto
): UploadResult {
  return {
    id: doc.id,
    fileName,
    number: doc.documentNumber,
    result: doc.versionNo > 1 ? 'NEW_VERSION' : 'QUEUED',
    documentId: doc.id,
    uploadedAt: doc.createdAt,
  }
}

// Rejections the admin acts on from the upload list (IngestionErrors codes)
const REJECTED: Record<string, UploadResult['result']> = {
  DOCUMENT_DUPLICATE: 'DUPLICATE',
  FILE_REQUIRED: 'FILE_INVALID',
  FILE_TOO_LARGE: 'FILE_INVALID',
  FILE_INVALID_TYPE: 'FILE_INVALID',
}

/** null = not an upload outcome (network, invalid fields…): the dialog shows the error instead */
export function rejectedResult(
  fileName: string,
  number: string,
  code: string | undefined,
  at: string
): UploadResult | null {
  const result = code ? REJECTED[code] : undefined
  if (!result) return null
  return {
    id: `up-${at}`,
    fileName,
    number,
    result,
    documentId: null,
    uploadedAt: at,
  }
}
