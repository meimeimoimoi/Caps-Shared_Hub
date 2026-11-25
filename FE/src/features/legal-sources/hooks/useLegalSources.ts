import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { getSourceTree, listLegalSources } from '../api/legalSourcesApi'
import { legalSourcesKeys } from '../api/queryKeys'
import type { LegalSourceFilter } from '../types'

export function useLegalSources(filter: LegalSourceFilter) {
  return useQuery({
    queryKey: legalSourcesKeys.list(filter),
    queryFn: ({ signal }) => listLegalSources(filter, signal),
    // Keep the current page on screen while the next one loads
    placeholderData: keepPreviousData,
  })
}

export function useSourceTree(id: string) {
  return useQuery({
    queryKey: legalSourcesKeys.tree(id),
    queryFn: ({ signal }) => getSourceTree(id, signal),
    enabled: Boolean(id),
  })
}
