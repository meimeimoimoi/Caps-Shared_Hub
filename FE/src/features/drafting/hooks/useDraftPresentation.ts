import { useTranslation } from 'react-i18next'
import type { ParseKeys } from 'i18next'
import { useFormatters } from '@/hooks/useFormatters'
import { isLanguage } from '@/lib/i18n/language'
import { ApiError } from '@/lib/api-client'
import english from '@/lib/i18n/locales/en/drafting.json'
import { isDraftMock } from '../api/dataSource'
import { DraftUiError } from '../utils/DraftUiError'
import type { InputIssue } from '../utils/validation'
import type { SchemaField } from '../types'

const categoryKeys = {
  All: 'categoryAll',
  Explanation: 'categoryExplanation',
  Finalization: 'categoryFinalization',
  Refund: 'categoryRefund',
  Incentive: 'categoryIncentive',
} as const
const readinessKeys = {
  READY: 'ready',
  READY_WITH_WARNINGS: 'readyWarnings',
  NOT_READY: 'notReady',
  PENDING: 'pending',
  FAILED: 'failed',
} as const
const statusKeys = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  RETIRED: 'retired',
} as const
const fieldKeys = {
  text: 'text',
  textarea: 'textarea',
  money: 'money',
  year: 'year',
  date: 'date',
} as const
const issueKeys = {
  required: 'validationRequired',
  format: 'validationFormat',
  maxLength: 'validationMaxLength',
  money: 'validationMoney',
  year: 'validationYear',
  date: 'validationDate',
} as const
const demoKeys = [
  'demoGenerationFree',
  'demoStageCreating',
  'demoStageLocked',
  'demoStageTemplate',
  'demoStageTraceability',
  'demoStageCreated',
  'demoAssessmentFailed',
  'demoGroundingMissing',
  'demoProfessionalCheck',
  'demoReviewAccepts',
  'demoReviseSources',
  'demoSupportingEvidence',
  'demoCheckExplanation',
  'demoCompleteness',
  'demoPassed',
  'demoInputConsistency',
  'demoIssueFound',
  'demoCitationCoverage',
  'demoMissing',
  'demoSyntheticCoverage',
  'demoUnresolved',
  'demoNone',
  'demoResolveBlocking',
  'demoEntryConditions',
  'demoExportPending',
  'demoArtifactCreated',
  'demoArtifactReconciled',
  'demoHandoffFailed',
  'demoExportFailed',
  'demoPolicy',
  'demoDraftOnly',
  'demoQuote',
  'demoCreditPolicy',
  'demoPassedOnly',
  'blockingIssue',
  'warning',
] as const satisfies readonly ParseKeys<'drafting'>[]
const demoCopyKeys = new Map<string, ParseKeys<'drafting'>>(
  demoKeys.map((key) => [english[key], key])
)

export function useDraftPresentation() {
  const { t, i18n } = useTranslation('drafting')
  const format = useFormatters()
  const translate = (
    map: Record<string, ParseKeys<'drafting'>>,
    value: string
  ) => {
    const key = Object.hasOwn(map, value) ? map[value] : undefined
    return key ? t(key) : value
  }
  return {
    ...format,
    language: isLanguage(i18n.language) ? i18n.language : ('vi' as const),
    category: (value: string) => translate(categoryKeys, value),
    readiness: (value?: string) =>
      value ? translate(readinessKeys, value) : t('notAssessed'),
    templateStatus: (value: string) => translate(statusKeys, value),
    fieldType: (value: string) => translate(fieldKeys, value),
    timestamp: (value?: string) =>
      value
        ? format.timestamp(value, 'Asia/Bangkok', {
            dateStyle: 'medium',
            timeStyle: 'short',
          }) + ' (UTC+7)'
        : t('notSaved'),
    field: (value: string | undefined, field: SchemaField) =>
      !value
        ? t('notProvided')
        : field.type === 'money' && /^\d+$/.test(value)
          ? format.money(value, { currencyDisplay: 'code' })
          : field.type === 'date'
            ? format.dateOnly(value)
            : value,
    issue: (issue: InputIssue) =>
      issue.code === 'format' && issue.hint
        ? issue.hint
        : t(issueKeys[issue.code], {
            label: issue.label,
            maximum:
              issue.maximum === undefined ? '' : format.number(issue.maximum),
          }),
    demoCopy: (value?: string) => {
      if (!value) return ''
      const key = isDraftMock ? demoCopyKeys.get(value) : undefined
      return key ? t(key) : value
    },
    error: (error: Error | null) => {
      if (error instanceof DraftUiError) return t(error.translationKey)
      const status = error instanceof ApiError ? error.status : undefined
      const code = error instanceof ApiError ? error.code : undefined
      if (code === 'QUOTE_EXPIRED') return t('errorQuoteExpired')
      if (code === 'REVISION_CONFLICT') return t('errorConflict')
      if (code === 'INSUFFICIENT_CREDIT') return t('errorInsufficientCredit')
      if (status === 401) return t('errorUnauthorized')
      if (status === 403) return t('errorForbidden')
      if (status === 404) return t('errorUnavailable')
      const key =
        isDraftMock && error ? demoCopyKeys.get(error.message) : undefined
      return key ? t(key) : t('errorGeneric')
    },
  }
}
