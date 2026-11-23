import type { ComponentProps } from 'react'
import { AdminLayout } from '@/app/layouts/admin/AdminLayout'

/** Review forms can live inside the Reviewer shell while approvals retain the Admin shell. */
export function ReviewPageLayout({
  embedded = false,
  children,
  breadcrumb,
  ...props
}: ComponentProps<typeof AdminLayout> & { embedded?: boolean }) {
  if (embedded) {
    return (
      <div className="mx-auto w-full max-w-7xl font-sans [&_.paper]:rounded-xl [&_.paper]:border [&_.paper]:border-[var(--ui-border)] [&_.paper]:!shadow-none [&_.text-h2]:!font-sans [&_.text-h2]:!text-base [&_.text-h2]:!font-semibold">
        <nav aria-label="Breadcrumb" className="text-text-muted mb-5 flex flex-wrap items-center gap-2 text-sm">{breadcrumb}</nav>
        <div>{children}</div>
      </div>
    )
  }
  return (
    <AdminLayout {...props} breadcrumb={breadcrumb}>
      {children}
    </AdminLayout>
  )
}
