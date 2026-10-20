import AdminApplicationDetailPage from '@/pages/admin/AdminApplicationDetailPage'
import AdminQualificationDetailPage from '@/pages/admin/AdminQualificationDetailPage'
import type { Gate } from '@/features/reviewer'
import { useParams } from 'react-router-dom'

/** Use the server-backed review forms inside the Reviewer workspace. */
export default function ReviewerAssessmentPage({ gate }: { gate: Gate }) {
  const { id } = useParams()
  return gate === 'GATE_1'
    ? <AdminApplicationDetailPage key={id} embedded />
    : <AdminQualificationDetailPage key={id} embedded />
}
