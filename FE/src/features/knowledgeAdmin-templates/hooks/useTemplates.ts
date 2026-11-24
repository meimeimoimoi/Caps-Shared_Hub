import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAccount } from '@/features/auth'
import {
  createTemplate,
  getTemplate,
  getTemplateFile,
  getTemplates,
  publishTemplate,
  uploadTemplateFile,
  setTemplateStatus,
} from '../api/templatesApi'
import { templatesKeys } from '../api/queryKeys'
import type {
  ManagedTemplate,
  ManagedTemplateVersion,
  NewTemplateInput,
} from '../types'

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
    /** Publishes the draft waiting behind the published version (draftPending) */
    publish: async () => {
      await publishTemplate(id)
      await qc.invalidateQueries({ queryKey: templatesKeys.all })
    },
    /** Attaches or replaces the draft's sample .docx */
    uploadFile: async (file: File) => {
      await uploadTemplateFile(id, file)
      await qc.invalidateQueries({ queryKey: templatesKeys.all })
    },
  }
}

/** The sample .docx of a version, when the server holds one; uploads and publishes refresh it with the template */
export function useTemplateFile(id: string, version: ManagedTemplateVersion) {
  return useQuery({
    queryKey: [...templatesKeys.detail(id), 'file', version.id],
    queryFn: ({ signal }) => getTemplateFile(id, version.id, signal),
    enabled: Boolean(version.hasFile),
  })
}

export function useCreateTemplate() {
  const qc = useQueryClient()
  const { name } = useAccount('knowledge')
  return async (file: File | null, input: NewTemplateInput) => {
    const id = await createTemplate(file, input, name)
    await qc.invalidateQueries({ queryKey: templatesKeys.all })
    return id
  }
}
