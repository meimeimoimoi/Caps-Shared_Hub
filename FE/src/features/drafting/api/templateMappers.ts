import type { TemplateVersion } from '../types/index.ts'
import { toSchemaFields } from '../utils/schemaFields.ts'

/** A published template from GET /api/v1/templates (workflow TemplateSummaryResponse) */
export interface TemplateSummaryDto {
  id: string
  code: string
  name: string
  description: string | null
  versionId: string
  versionNo: number
  updatedAt: string
}

/** Its published fields from GET /api/v1/templates/{id}/schema (TemplateSchemaResponse) */
export interface TemplateSchemaDto {
  templateId: string
  templateVersionId: string
  versionNo: number
  fieldSchema: unknown
}

/** The version users draft from; drafts pin its id. The code stands in for the category the API lacks. */
export function toTemplateVersion(
  summary: TemplateSummaryDto,
  schema: TemplateSchemaDto
): TemplateVersion {
  return {
    id: schema.templateVersionId,
    templateId: summary.id,
    version: schema.versionNo,
    title: summary.name,
    description: summary.description ?? '',
    category: summary.code,
    status: 'ACTIVE',
    updatedAt: summary.updatedAt,
    fields: toSchemaFields(schema.fieldSchema),
  }
}
