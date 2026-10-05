import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '@/shared/lib/utils'

/** Shared panel shell; content and layout stay in the consuming component. */
export function ExpertPanel({
  className,
  ...props
}: ComponentPropsWithoutRef<'section'>) {
  return (
    <section
      className={cn(
        'border-[var(--ep-border)] min-w-0 overflow-hidden rounded-xl border bg-[var(--ep-surface)] bg-none [&_.ep-state]:p-6',
        className
      )}
      {...props}
    />
  )
}

export function ExpertPanelHeader({
  className,
  ...props
}: ComponentPropsWithoutRef<'header'>) {
  return (
    <header
      className={cn(
        '[&_p]:text-[var(--ep-muted)] [&>svg]:text-[var(--ep-success)] flex items-start justify-between gap-4 px-6 pt-[22px] pb-[18px] max-[720px]:flex-wrap max-[720px]:gap-3 max-[720px]:p-[18px] [&_h2]:text-[17px] [&_h2]:font-[650] max-[720px]:[&_h2]:text-base [&_p]:mt-[5px] [&_p]:text-xs [&>svg]:shrink-0',
        className
      )}
      {...props}
    />
  )
}

export function ExpertPanelFooter({
  className,
  ...props
}: ComponentPropsWithoutRef<'footer'>) {
  return (
    <footer
      className={cn(
        'border-[var(--ep-border)] text-[var(--ep-muted)] flex flex-wrap justify-between gap-2 border-t px-6 py-3 text-[11px] max-[720px]:px-[18px]',
        className
      )}
      {...props}
    />
  )
}


