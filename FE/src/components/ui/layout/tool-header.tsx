import { StatusRail, type StatusRailProps } from '@/components/ui/navigation/status-rail'

/* SHFT §9 · Header màn công cụ. Đã có rail thì KHÔNG thêm badge trạng thái. */
export interface ToolHeaderProps {
  code: string
  subtitle: string
  rail: StatusRailProps
}

export function ToolHeader({ code, subtitle, rail }: ToolHeaderProps) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-6">
      <div>
        <h1 className="text-h1-tool num">{code}</h1>
        <p className="text-fg-muted mt-1 text-sm">{subtitle}</p>
      </div>
      <div className="w-full max-w-xl">
        <StatusRail size="sm" {...rail} />
      </div>
    </div>
  )
}
