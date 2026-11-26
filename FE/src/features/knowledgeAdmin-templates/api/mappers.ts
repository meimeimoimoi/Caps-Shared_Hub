import { toSchemaFields } from '../../drafting/utils/schemaFields.ts'
import type { ManagedTemplate, ManagedTemplateVersion } from '../types/index.ts'

/** A template in the admin list (workflow AdminTemplateSummaryResponse) */
export interface AdminTemplateSummaryDto {
  id: string
  code: string
  name: string
  description: string | null
  isActive: boolean
  latestVersionNo: number
  latestStatus: 'DRAFT' | 'PUBLISHED' | 'DEPRECATED'
  publishedVersionNo: number | null
  updatedAt: string
}

/** A template with every version (workflow AdminTemplateResponse) */
export interface AdminTemplateDto {
  id: string
  code: string
  name: string
  description: string | null
  isActive: boolean
  createdAt: string
  versions: {
    id: string
    versionNo: number
    status: 'DRAFT' | 'PUBLISHED' | 'DEPRECATED'
    createdBy: string
    createdAt: string
    fieldSchema: unknown
    hasFile?: boolean
    taxYear?: number
  }[]
}

// The server keeps no changelog, so the line under each version says where it stands
const STATUS_NOTE = {
  DRAFT: 'Bản nháp, chưa phát hành',
  PUBLISHED: '',
  DEPRECATED: 'Đã thay bằng phiên bản mới',
} as const

/** Users see a template once one version is published; a newer draft waits for its own publish */
const states = (published: boolean, latestStatus: string) => ({
  status: published ? ('ACTIVE' as const) : ('INACTIVE' as const),
  ...(published && latestStatus === 'DRAFT' ? { draftPending: true } : {}),
})

/** List row: the server sends the newest version only, without its fields */
export function fromAdminSummary(t: AdminTemplateSummaryDto): ManagedTemplate {
  return {
    id: t.id,
    code: t.code,
    title: t.name,
    description: t.description ?? '',
    category: t.code,
    ...states(t.publishedVersionNo !== null, t.latestStatus),
    versions: [
      {
        id: `${t.id}-v${t.latestVersionNo}`,
        version: t.latestVersionNo,
        status: t.latestStatus,
        publishedAt: t.updatedAt,
        publishedBy: '—',
        changelog: STATUS_NOTE[t.latestStatus],
        fileName: '',
        fields: [],
        workspaces: 0,
      },
    ],
    history: [],
  }
}

export function fromAdminTemplate(t: AdminTemplateDto): ManagedTemplate {
  const versions = [...t.versions]
    .sort((a, b) => b.versionNo - a.versionNo)
    .map((v): ManagedTemplateVersion => ({
      id: v.id,
      version: v.versionNo,
      status: v.status,
      publishedAt: v.createdAt,
      publishedBy: '—',
      changelog: STATUS_NOTE[v.status],
      // The server keeps the file, not its original name
      fileName: v.hasFile ? 'Đã tải lên (.docx)' : '',
      hasFile: v.hasFile === true,
      fields: toSchemaFields(v.fieldSchema),
      ...(v.taxYear ? { taxYear: v.taxYear } : {}),
      workspaces: 0,
    }))
  return {
    id: t.id,
    code: t.code,
    title: t.name,
    description: t.description ?? '',
    category: t.code,
    ...states(
      versions.some((v) => v.status === 'PUBLISHED'),
      versions[0]?.status ?? 'DRAFT'
    ),
    versions,
    history: [],
  }
}
