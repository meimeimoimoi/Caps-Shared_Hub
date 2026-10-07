import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getCollectionOverview,
  runCollectionNow,
  saveSchedule,
} from '../api/sourcesApi'
import { sourcesKeys } from '../api/queryKeys'
import type { Frequency } from '../constants'

export function useCollection() {
  const qc = useQueryClient()
  const query = useQuery({
    queryKey: sourcesKeys.overview,
    queryFn: ({ signal }) => getCollectionOverview(signal),
  })
  const refresh = () => qc.invalidateQueries({ queryKey: sourcesKeys.overview })

  return {
    data: query.data,
    isLoading: query.isLoading,
    error: query.error,
    saveSchedule: (f: Frequency) => saveSchedule(f).then(refresh),
    runNow: () => runCollectionNow().then(refresh),
  }
}
