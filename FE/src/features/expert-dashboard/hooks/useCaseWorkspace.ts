import { useTranslation } from 'react-i18next'
import type { ParseKeys } from 'i18next'
import { useState } from 'react'
import type { WorkItem } from '../types'

const documents = [
  'CIT_Declaration_2025.pdf',
  'Financial_Statements_2025.xlsx',
  'Supporting_Evidence.pdf',
]

export function useCaseWorkspace(item: WorkItem) {
  const { t } = useTranslation('expert')
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
  const [notice, setNotice] = useState<ParseKeys<'expert'> | null>(null)
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
      setNotice('noticeDelivery')
    } else {
      setActiveTask(activeTask + 1)
      setNotice('noticeStep')
    }
  }

  const toggleVerified = (name: string) => {
    setVerified((old) =>
      old.includes(name) ? old.filter((doc) => doc !== name) : [...old, name]
    )
    invalidate(0)
  }

  const acceptRequest = () => {
    setAccepted(true)
    setNotice('noticeAccept')
  }

  const toggleDeclining = () => setDeclining(!declining)

  const confirmDecline = () => {
    setClosed(true)
    setNotice('noticeDecline')
  }

  const simulatePayment = () => {
    setAccepted(false)
    setStatus('PAYMENT_CONFIRMED')
    setNotice('noticePayment')
  }

  const startReview = () => {
    setStatus('IN_REVIEW')
    setNotice('noticeReview')
  }

  const submitClarification = () => {
    setRfi(question)
    invalidate(3)
    setStatus('AWAITING_USER_INFORMATION')
    setNotice('noticeClarification')
  }

  const simulateClientResponse = () => {
    setStatus('IN_REVIEW')
    setNotice('noticeResponse')
  }

  const keepDraft = () => {
    setNotice('noticeDraft')
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
    notice: notice ? t(notice) : '',
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
