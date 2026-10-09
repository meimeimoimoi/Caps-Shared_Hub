import type { DashboardDto } from '../types'
import { DashboardSectionState } from './DashboardSectionState'

export function OperationalSummary({ counts, retry }: { counts: DashboardDto['counts']; retry: () => void }) {
  return <section className="ep-operational" aria-labelledby="operation-heading">
    <h2 id="operation-heading">Across your workload</h2>
    {counts.status !== 'available' ? <DashboardSectionState title="Totals unavailable" message={counts.message} retry={retry} /> : <>
      <dl className="ep-totals">{[
        ['Awaiting response', counts.data.pendingResponse], ['Ready to start', counts.data.readyToStart],
        ['In review', counts.data.inReview], ['Overdue', counts.data.overdue],
      ].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
      <p className="ep-definition">{counts.data.definition}</p>
    </>}
  </section>
}
