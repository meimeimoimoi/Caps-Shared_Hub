import { useState } from 'react'
import type { WorkItem } from '../model/types'

const documents = [
  'CIT_Declaration_2025.pdf',
  'Financial_Statements_2025.xlsx',
  'Supporting_Evidence.pdf',
]

export function useCaseWorkspace(item: WorkItem) {
  const [status, setStatus] = useState(item.status)
  const [activeTask, setActiveTask] = useState(
    item.status === 'AWAITING_USER_INFORMATION'
      ? 3
      : item.status === 'AWAITING_ACCEPTANCE'
        ? 5
        : 0
  )
  const [verified, setVerified] = useState<string[]>([])
  const [complete, setComplete] = useState<number[]>([])
  const [notes, setNotes] = useState<Record<number, string>>({})
  const [question, setQuestion] = useState('')
  const [signed, setSigned] = useState(false)
  const [notice, setNotice] = useState('')
  const [declining, setDeclining] = useState(false)
  const [declineReason, setDeclineReason] = useState('')
  const [closed, setClosed] = useState(false)
  const [accepted, setAccepted] = useState(false)
  const [rfi, setRfi] = useState('')

  const currentStep = accepted
    ? 1
    : status === 'PENDING_EXPERT_RESPONSE'
      ? 0
      : status === 'PAYMENT_CONFIRMED'
        ? 2
        : status === 'AWAITING_ACCEPTANCE'
          ? 4
          : 3

  const reviewing = status === 'IN_REVIEW' && !closed
  const required = [0, 1, 2, 3, 4]

  const ready =
    activeTask === 0
      ? verified.length === documents.length
      : activeTask === 3
        ? true
        : activeTask === 5
          ? signed && required.every((task) => complete.includes(task))
          : Boolean(notes[activeTask]?.trim())

  const invalidate = (task: number) => {
    setComplete((old) => old.filter((done) => done !== task))
    setSigned(false)
  }

  const editNote = (task: number, value: string) => {
    setNotes((old) => ({ ...old, [task]: value }))
    invalidate(task)
  }

  const finishTask = () => {
    setComplete((old) =>
      old.includes(activeTask) ? old : [...old, activeTask]
    )
    if (activeTask === 5) {
      setStatus('AWAITING_ACCEPTANCE')
      setNotice(
        'Demo delivery prepared. No document was sent to the client. Acceptance and settlement require the backend.'
      )
    } else {
      setActiveTask(activeTask + 1)
      setNotice('Step completed in this preview session only.')
    }
  }

  const toggleVerified = (name: string) => {
    setVerified((old) =>
      old.includes(name)
        ? old.filter((doc) => doc !== name)
        : [...old, name]
    )
    invalidate(0)
  }

  const acceptRequest = () => {
    setAccepted(true)
    setNotice(
      'Request accepted in preview only. No payment request was sent.'
    )
  }

  const toggleDeclining = () => setDeclining(!declining)

  const confirmDecline = () => {
    setClosed(true)
    setNotice(
      'Request declined in preview only. The client was not notified.'
    )
  }

  const simulatePayment = () => {
    setAccepted(false)
    setStatus('PAYMENT_CONFIRMED')
    setNotice(
      'Demo payment confirmation simulated. No payment was collected.'
    )
  }

  const startReview = () => {
    setStatus('IN_REVIEW')
    setNotice(
      'Review started in preview only. No live SLA was started.'
    )
  }

  const submitClarification = () => {
    setRfi(question)
    invalidate(3)
    setStatus('AWAITING_USER_INFORMATION')
    setNotice(
      'Clarification prepared in preview only. No message was sent, no 72-hour deadline was created and no settlement was triggered.'
    )
  }

  const simulateClientResponse = () => {
    setStatus('IN_REVIEW')
    setNotice(
      'Client response simulated for UI review. The original fixture deadline remains unchanged.'
    )
  }

  const keepDraft = () => {
    setNotice(
      'Draft retained in this page session only. It is not saved to the server and resets when you leave.'
    )
  }

  return {
    status,
    activeTask,
    setActiveTask,
    verified,
    complete,
    notes,
    question,
    setQuestion,
    signed,
    setSigned,
    notice,
    declining,
    declineReason,
    setDeclineReason,
    closed,
    accepted,
    rfi,
    currentStep,
    reviewing,
    required,
    ready,
    editNote,
    finishTask,
    toggleVerified,
    acceptRequest,
    toggleDeclining,
    confirmDecline,
    simulatePayment,
    startReview,
    submitClarification,
    simulateClientResponse,
    keepDraft,
  }
}
