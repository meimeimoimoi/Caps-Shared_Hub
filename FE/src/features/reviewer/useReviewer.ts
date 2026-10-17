import { useContext } from 'react'
import { ReviewerContext } from './reviewer-context'

export function useReviewer() {
  const context = useContext(ReviewerContext)
  if (!context) throw new Error('useReviewer requires ReviewerProvider')
  return context
}
