import { useTranslation } from 'react-i18next'
import { COMPETENCY_CODES, ELIGIBILITY_CODES } from '../constants'

type EligibilityCode = (typeof ELIGIBILITY_CODES)[number]
const isEligibilityCode = (code: string): code is EligibilityCode =>
  (ELIGIBILITY_CODES as readonly string[]).includes(code)

/** Name of a Gate 1 requirement; shares the reviewer wording for EV-01…EV-06 */
export function useEligibilityLabel() {
  const { t } = useTranslation('reviewer')
  return (code: string) =>
    isEligibilityCode(code) ? t(`eligibility.${code}`) : code
}

type CompetencyCode = (typeof COMPETENCY_CODES)[number]
const isCompetencyCode = (code: string): code is CompetencyCode =>
  (COMPETENCY_CODES as readonly string[]).includes(code)

/** Name and task hint of a Gate 2 competency C1…C5 */
export function useCompetencyLabel() {
  const { t } = useTranslation('admin')
  return {
    name: (code: string) =>
      isCompetencyCode(code) ? t(`competency.names.${code}`) : code,
    hint: (code: string) =>
      isCompetencyCode(code) ? t(`competency.hints.${code}`) : '',
  }
}

/* Field codes of the expert service → wording of the registration form */
const FIELD_KEYS = {
  CORPORATE_INCOME_TAX: 'expertise.cit',
  TAX_FINALIZATION: 'expertise.finalization',
  CORPORATE_ACCOUNTING: 'expertise.accounting',
  FINANCIAL_REPORTING: 'expertise.reporting',
  AUDIT: 'expertise.audit',
  TAX_ADVISORY: 'expertise.advisory',
} as const

/** Field label; demo fixtures already hold labels, so unknown values pass through */
export function useFieldLabel() {
  const { t } = useTranslation('expertRegistration')
  return (code: string) =>
    Object.hasOwn(FIELD_KEYS, code)
      ? t(FIELD_KEYS[code as keyof typeof FIELD_KEYS])
      : code
}
