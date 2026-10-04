import { AlertCircle } from 'lucide-react'

export function DashboardSectionState({ title, message, retry }: { title: string; message: string; retry?: () => void }) {
  return <div className="ep-state" role={retry ? 'alert' : undefined}>
    <AlertCircle size={20} aria-hidden="true" />
    <div><h3>{title}</h3><p>{message}</p>{retry && <button className="ep-button" onClick={retry}>Try again</button>}</div>
  </div>
}

export function DashboardSkeleton() {
  return <div className="ep-dashboard-loading" role="status" aria-label="Loading expert overview">
    <div className="ep-skeleton ep-skeleton-title" />
    <div className="ep-dashboard-grid"><div className="ep-skeleton ep-skeleton-section" /><div className="ep-skeleton ep-skeleton-section" /></div>
    <span className="sr-only">Loading expert overview…</span>
  </div>
}
