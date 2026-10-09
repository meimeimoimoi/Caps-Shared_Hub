import { useState, type ReactNode } from 'react'
import { demoActor, demoPolicy, initialReviewerState } from './fixtures'
import { reviewAccess, submitDecision, type ReviewDraft } from './domain'

import { ReviewerContext } from './reviewer-context'

export function ReviewerProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState(initialReviewerState)
  const [readOnly, setReadOnly] = useState(false)
  const [query, setQuery] = useState('')
  const actor = {
    ...demoActor,
    permissions: readOnly ? [] : demoActor.permissions,
  }
  const saveDraft = (id: string, draft: ReviewDraft) => {
    const record = state.records.find((item) => item.id === id)
    const error = record ? reviewAccess(record, actor) : 'permission'
    if (error) return error
    setState((current) => ({
      ...current,
      drafts: { ...current.drafts, [id]: structuredClone(draft) },
    }))
    return null
  }
  const submit = (id: string, draft: ReviewDraft) => {
    const result = submitDecision(
      state,
      id,
      draft,
      actor,
      demoPolicy,
      new Date().toISOString()
    )
    if (!result.error) setState(result.state)
    return result.error
  }
  return (
    <ReviewerContext.Provider
      value={{
        state,
        actor,
        policy: demoPolicy,
        readOnly,
        setReadOnly,
        query,
        setQuery,
        saveDraft,
        submit,
        reset: () => {
          setState(initialReviewerState())
          setQuery('')
        },
      }}
    >
      {children}
    </ReviewerContext.Provider>
  )
}
