import { useEffect, useRef, useState, type FormEvent } from 'react'
import type { Stage } from '../types'

export function useApplicationLifecycle() {
  const [account, setAccount] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [stage, setStage] = useState<Stage>('screening')
  const [history, setHistory] = useState<string[]>([])
  
  const [supplement, setSupplement] = useState(false)
  const [supplementFile, setSupplementFile] = useState<File | null>(null)
  const [explanation, setExplanation] = useState('')
  
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const errorRef = useRef<HTMLParagraphElement>(null)

  useEffect(() => {
    if (error && errorRef.current) {
      errorRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      errorRef.current.focus()
    }
  }, [error])

  function beginTask() {
    setSubmitting(true)
  }

  function completeAccountCreation() {
    setAccount(true)
    setSubmitting(false)
    setNotice('')
    setTimeout(() => window.scrollTo(0, 0), 0)
  }

  function completeRegistrationSubmission() {
    setSubmitted(true)
    setStage('screening')
    setHistory([])
    setNotice('')
  }

  function submitSupplement(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (submitting) return
    if (!supplementFile && !explanation.trim()) {
      setError('Add a document or an explanation.')
      return
    }
    setSubmitting(true)
    setTimeout(() => {
      setHistory((p) => [
        ...p,
        `Additional response recorded locally${supplementFile ? `: ${supplementFile.name}` : ''}.`,
      ])
      setSupplement(false)
      setStage('eligibility')
      setNotice('')
      setSupplementFile(null)
      setExplanation('')
      setError('')
      setSubmitting(false)
    }, 600)
  }

  function changeStage(s: Stage) {
    setStage(s)
    setSupplement(false)
    setNotice('')
    setError('')
  }

  function requestSupplement() {
    setSupplement(true)
  }

  function previewServiceReview() {
    setStage('competency')
  }

  function cancelSupplement() {
    setSupplement(false)
  }

  return {
    account,
    submitted,
    stage,
    history,
    supplement,
    supplementFile,
    setSupplementFile,
    explanation,
    setExplanation,
    error,
    setError,
    notice,
    submitting,
    errorRef,
    beginTask,
    completeAccountCreation,
    completeRegistrationSubmission,
    submitSupplement,
    changeStage,
    requestSupplement,
    previewServiceReview,
    cancelSupplement,
  }
}
