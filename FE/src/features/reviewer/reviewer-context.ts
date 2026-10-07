import { createContext } from 'react'
import type {
  ReviewerActor,
  ReviewPolicy,
  ReviewDraft,
  ReviewError,
  ReviewerState,
} from './domain'

export interface ReviewerContextValue {
  state: ReviewerState
  actor: ReviewerActor
  policy: ReviewPolicy
  readOnly: boolean
  setReadOnly: (value: boolean) => void
  query: string
  setQuery: (value: string) => void
  saveDraft: (id: string, draft: ReviewDraft) => ReviewError | null
  submit: (id: string, draft: ReviewDraft) => ReviewError | null
  reset: () => void
}
export const ReviewerContext = createContext<ReviewerContextValue | null>(null)
