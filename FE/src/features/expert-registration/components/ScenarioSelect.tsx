import { CustomSelect } from '@/shared/ui/custom-select'
import { labels } from '../model/constants'
import type { Stage } from '../model/types'

const options = (Object.entries(labels) as [Stage, string][]).map(([value, label]) => ({ value, label }))

export function ScenarioSelect({ value, onChange }: { value: Stage; onChange: (value: Stage) => void }) {
  return <CustomSelect value={value} onChange={onChange} options={options} label="Preview a scenario" className="expert-status-preview expert-scenario-select" />
}
