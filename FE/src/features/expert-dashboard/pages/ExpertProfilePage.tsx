import { Navigate, useLocation } from 'react-router-dom'

// Preserve bookmarked profile URLs and the selected demo scenario.
export default function ExpertProfilePage() {
  const { search } = useLocation()
  return (
    <Navigate to={{ pathname: '/expert/settings/account', search }} replace />
  )
}
