import { cn } from '@/lib/utils'

/* SHFT §9 · Status Rail lớn (header hồ sơ) hoặc gọn (header công cụ) */
export interface StatusRailProps {
  steps: readonly string[]
  current: number // > steps.length - 1 = đã xong hết
  size?: 'lg' | 'sm'
  label?: string
}

export function StatusRail({
  steps,
  current,
  size = 'lg',
  label = 'Tiến trình',
}: StatusRailProps) {
  return (
    <ol className="rail w-full" aria-label={label}>
      {steps.map((label, i) => (
        <li
          key={label}
          aria-current={i === current ? 'step' : undefined}
          className="relative flex flex-1 flex-col items-center text-center"
        >
          {i < steps.length - 1 && (
            <span
              aria-hidden="true"
              className={cn(
                'rail-track absolute top-0 left-1/2 w-full',
                i < current && 'rail-track-done'
              )}
            />
          )}
          <span
            aria-hidden="true"
            className={cn(
              'rail-dot relative',
              i < current && 'rail-dot-done',
              i === current && 'rail-dot-current'
            )}
          />
          <span
            className={cn(
              'mt-2 px-1',
              size === 'sm' ? 'text-caption' : 'text-sm',
              i === current ? 'text-fg-strong font-semibold' : 'text-fg-muted'
            )}
          >
            {label}
          </span>
        </li>
      ))}
    </ol>
  )
}
