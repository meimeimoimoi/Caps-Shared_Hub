import type { PipelineStage } from '../constants'

export const knowledgeKeys = {
  all: ['private', 'knowledge-admin'] as const,
  summary: () => [...knowledgeKeys.all, 'summary'] as const,
  documents: (stage: PipelineStage) =>
    [...knowledgeKeys.all, 'documents', stage] as const,
}
