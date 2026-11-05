import type { LegalSourceFilter } from '../types'

export const legalSourcesKeys = {
  all: ['private', 'knowledge-admin', 'legal-sources'] as const,
  list: (filter: LegalSourceFilter) =>
    [...legalSourcesKeys.all, 'list', filter] as const,
  tree: (id: string) => [...legalSourcesKeys.all, 'tree', id] as const,
}
