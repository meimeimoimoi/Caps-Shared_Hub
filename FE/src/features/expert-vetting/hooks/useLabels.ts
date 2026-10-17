import { useTranslation } from 'react-i18next'
import { ELIGIBILITY_CODES } from '../constants'

type EligibilityCode = (typeof ELIGIBILITY_CODES)[number]
const isEligibilityCode = (code: string): code is EligibilityCode =>
  (ELIGIBILITY_CODES as readonly string[]).includes(code)

/** Name of a Gate 1 requirement; shares the reviewer wording for EV-01…EV-06 */
export function useEligibilityLabel() {
  const { t } = useTranslation('reviewer')
  return (code: string) =>
    isEligibilityCode(code) ? t(`eligibility.${code}`) : code
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
