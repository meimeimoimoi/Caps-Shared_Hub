import type { QueueFilter } from '../constants'

export const knowledgeKeys = {
  all: ['private', 'knowledge-admin'] as const,
  summary: () => [...knowledgeKeys.all, 'summary'] as const,
  documents: (stage: QueueFilter) =>
    [...knowledgeKeys.all, 'documents', stage] as const,
  detail: (documentId: string) =>
    [...knowledgeKeys.all, 'detail', documentId] as const,
  review: (documentId: string) =>
    [...knowledgeKeys.all, 'review', documentId] as const,
  comparison: (documentId: string) =>
    [...knowledgeKeys.all, 'comparison', documentId] as const,
}
