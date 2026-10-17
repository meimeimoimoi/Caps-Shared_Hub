import { useTranslation } from 'react-i18next'
import { CustomSelect } from '@/components/ui/forms/custom-select'
import { labels } from '../constants'
import type { Stage } from '../types'

export function ScenarioSelect({
  value,
  onChange,
}: {
  value: Stage
  onChange: (value: Stage) => void
}) {
  const { t } = useTranslation('expertRegistration')
  const options = (
    Object.entries(labels) as [Stage, (typeof labels)[Stage]][]
  ).map(([value, key]) => ({ value, label: t(key) }))

  return (
    <CustomSelect
      value={value}
      onChange={onChange}
      options={options}
      label={t('page.scenario')}
      className="expert-status-preview expert-scenario-select"
      triggerClassName="expert-scenario-trigger"
      menuClassName="expert-scenario-menu"
    />
  )
}
