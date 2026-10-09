import { StatusRail, type StatusRailProps } from './status-rail'

/* SHFT §9 · Header hồ sơ. Đã có rail thì KHÔNG thêm badge trạng thái. */
export interface CaseHeaderProps {
  code: string
  title: string
  meta: [label: string, value: string][]
  rail: StatusRailProps
}

export function CaseHeader({ code, title, meta, rail }: CaseHeaderProps) {
  return (
    <div>
      <h1 className="text-h1 num">{code}</h1>
      <p className="text-fg-strong mt-1 font-semibold">{title}</p>
      <dl className="mt-1 flex flex-wrap gap-x-6 gap-y-1 text-sm">
        {meta.map(([label, value]) => (
          <div key={label} className="flex gap-2">
            <dt className="text-fg-muted">{label}</dt>
            <dd className="text-fg-strong">{value}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-6">
        <StatusRail size="lg" {...rail} />
      </div>
    </div>
  )
}
