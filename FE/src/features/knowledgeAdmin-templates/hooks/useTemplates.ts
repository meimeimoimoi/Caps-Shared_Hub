import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAccount } from '@/features/auth'
import {
  createTemplate,
  getTemplate,
  getTemplates,
  setTemplateStatus,
} from '../api/templatesApi'
import { templatesKeys } from '../api/queryKeys'
import type { ManagedTemplate, NewTemplateInput } from '../types'

export function useTemplates() {
  return useQuery({
    queryKey: templatesKeys.list(),
    queryFn: ({ signal }) => getTemplates(signal),
  })
}

export function useManagedTemplate(id: string) {
  const qc = useQueryClient()
  const { name } = useAccount('knowledge')
  const query = useQuery({
    queryKey: templatesKeys.detail(id),
    queryFn: ({ signal }) => getTemplate(id, signal),
  })
  return {
    template: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error,
    setStatus: async (status: ManagedTemplate['status']) => {
      await setTemplateStatus(id, status, name)
      // Danh sách và chi tiết cùng đổi
      await qc.invalidateQueries({ queryKey: templatesKeys.all })
    },
  }
}

export function useCreateTemplate() {
  const qc = useQueryClient()
  const { name } = useAccount('knowledge')
  return async (file: File, input: NewTemplateInput) => {
    const id = await createTemplate(file, input, name)
    await qc.invalidateQueries({ queryKey: templatesKeys.all })
    return id
  }
}
