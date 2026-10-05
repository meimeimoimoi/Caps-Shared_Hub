import { Link, useParams } from 'react-router-dom'
import './case-detail.css'
import {
  ArrowLeft,
  Check,
  Clock3,
  FileText,
  Scale,
  MessageSquare,
  Edit3,
  CheckSquare,
  CheckCircle2,
  Receipt,
  ArrowRight,
  LockKeyhole,
} from 'lucide-react'
import { isExpertDemo } from '@/shared/lib/expert-data-source'
import { formatVnd } from '@/shared/lib/format-money'
import { useExpertDashboard } from '../hooks/useExpertDashboard'
import { useCaseWorkspace } from '../hooks/useCaseWorkspace'
import {
  DashboardSectionState,
  DashboardSkeleton,
} from '../components/DashboardSectionState'
import { formatDeadline, statusLabels } from '../model/toDashboardViewModel'
import type { WorkItem } from '../model/types'

const tasks = [
  { title: 'Evidence Validation', icon: CheckCircle2 },
  { title: 'AI Draft Assessment', icon: FileText },
  { title: 'Legal Compliance Check', icon: Scale },
  { title: 'Client Clarification (RFI)', icon: MessageSquare },
  { title: 'Expert Revision', icon: Edit3 },
  { title: 'Professional Sign-off', icon: CheckSquare },
]
const steps = [
  'New request',
  'Awaiting payment',
  'Start review',
  'In review',
  'Acceptance',
]
const documents = [
  'CIT_Declaration_2025.pdf',
  'Financial_Statements_2025.xlsx',
  'Supporting_Evidence.pdf',
]
const clients: Record<string, string> = {
  'RC-1042': 'Công ty TNHH Cơ khí Tân Tiến',
  'RQ-1086': 'Công ty TNHH Minh An',
  'RC-1058': 'Công ty Cổ phần An Phát',
  'RC-1037': 'Công ty TNHH Nam Việt',
  'RC-1029': 'Công ty Cổ phần Bình Minh',
}

function CaseWorkspace({
  item,
  timezone,
}: {
  item: WorkItem
  timezone: string
}) {
  const ws = useCaseWorkspace(item)
  const field = (task: number, label: string, placeholder: string) => (
    <div className="ep-case-field [margin:20px_0] flex flex-col gap-2 [&_.ep-case-revision]:min-h-[250px] [&_label]:text-[13px] [&_label]:font-semibold [&_textarea]:min-h-35 [&_textarea]:w-full [&_textarea]:resize-y [&_textarea]:rounded-lg [&_textarea]:bg-[var(--ep-surface)] [&_textarea]:bg-none [&_textarea]:[padding:14px] [&_textarea]:[font-family:inherit] [&_textarea]:text-[var(--ep-ink)] [&_textarea]:[caret-color:#c2410c] [&_textarea]:[border:1px_solid_var(--ep-border)] [&_textarea::placeholder]:text-[var(--ep-muted)] [&_textarea:disabled]:cursor-not-allowed [&_textarea:disabled]:bg-[var(--ep-surface-raised)] [&_textarea:disabled]:bg-none">
      <label htmlFor={`case-note-${task}`}>{label}</label>
      <textarea
        id={`case-note-${task}`}
        className={task === 4 ? 'ep-case-revision' : ''}
        value={ws.notes[task] ?? ''}
        disabled={!ws.reviewing}
        onChange={(event) => ws.editNote(task, event.target.value)}
        placeholder={placeholder}
      />
    </div>
  )

  return (
    <div className="ep-case-detail mx-auto my-0 max-w-340 [&_button:disabled]:cursor-not-allowed [&_input[type='checkbox']]:h-4 [&_input[type='checkbox']]:w-4 [&_input[type='checkbox']]:shrink-0">
      <Link
        className="ep-case-back mb-5 inline-flex items-center gap-2 text-[var(--ep-muted)]!"
        to={
          item.status === 'PENDING_EXPERT_RESPONSE'
            ? '/expert/queue'
            : '/expert/active'
        }
      >
        <ArrowLeft size={16} aria-hidden="true" />
        Back to{' '}
        {item.status === 'PENDING_EXPERT_RESPONSE'
          ? 'work queue'
          : 'active cases'}
      </Link>
      <div className="ep-case-preview mb-6 flex flex-wrap gap-[6px_18px] rounded-xl bg-[var(--ep-warning-bg)] bg-none [padding:14px_18px] text-[13px] text-[var(--ep-warning)] [border:1px_solid_var(--ep-warning)]">
        <strong>Interactive UI preview</strong>
        <span>
          Sample documents and fees. Changes stay in this page session and reset
          when you leave. No uploads, messages or payments are processed.
        </span>
      </div>
      <header className="ep-case-heading mb-6 flex items-start justify-between gap-4 max-[768px]:flex-col [&_.ep-status]:shrink-0 [&_h1]:text-[clamp(23px,_2.5vw,_30px)] [&_h1]:wrap-anywhere [&_p]:mt-2">
        <div>
          <h1>{item.title}</h1>
          <p>
            {item.id} · {clients[item.id] ?? 'Sample client'}
          </p>
        </div>
        <span className="ep-status">
          {ws.closed
            ? 'Declined in preview'
            : ws.accepted
              ? 'Awaiting payment'
              : statusLabels[ws.status]}
        </span>
      </header>
      <ol
        className="ep-case-steps [&_li]:text-[var(--ep-muted)] [&_.current]:text-[var(--case-accent)] [&_.current_>_span]:text-[var(--case-accent)] [&_.done_>_span]:text-[var(--case-accent)] [margin:28px_0] flex list-none gap-2 p-0 max-[768px]:flex-col max-[768px]:gap-[0] [&_.current]:[border-color:var(--case-accent)] [&_.current]:font-[650] [&_.current_>_span]:[border-color:var(--case-accent)] [&_.current_>_span]:bg-[var(--case-accent-bg)] [&_.current_>_span]:bg-none [&_.done_>_span]:[border-color:var(--case-accent)] [&_.done_>_span]:bg-[var(--case-accent-bg)] [&_.done_>_span]:bg-none [&_li]:flex [&_li]:flex-1 [&_li]:items-center [&_li]:gap-2 [&_li]:[padding:0_0_14px] [&_li]:text-[12px] [&_li]:[border-bottom:2px_solid_var(--ep-border)] max-[768px]:[&_li]:[border-bottom-width:1px] max-[768px]:[&_li]:[padding:8px_0] [&_li_>_span]:grid [&_li_>_span]:h-6 [&_li_>_span]:w-6 [&_li_>_span]:shrink-0 [&_li_>_span]:[place-items:center] [&_li_>_span]:rounded-full [&_li_>_span]:[border:1px_solid_var(--ep-border)]"
        aria-label="Case progress"
      >
        {steps.map((step, index) => (
          <li
            key={step}
            aria-current={index === ws.currentStep ? 'step' : undefined}
            className={
              index === ws.currentStep
                ? 'current'
                : index < ws.currentStep
                  ? 'done'
                  : ''
            }
          >
            <span>
              {index < ws.currentStep ? (
                <Check size={14} aria-hidden="true" />
              ) : (
                index + 1
              )}
            </span>
            {step}
          </li>
        ))}
      </ol>
      {ws.notice && (
        <div
          className="ep-case-notice mb-5 rounded-xl bg-[var(--ep-success-bg)] bg-none [padding:14px_18px] text-[var(--ep-success)] [border:1px_solid_var(--ep-success)]"
          role="status"
        >
          {ws.notice}
        </div>
      )}
      {ws.currentStep < 2 && !ws.closed && (
        <div className="ep-request-layout mb-6 grid grid-cols-[1fr_340px] items-stretch gap-6 max-[900px]:grid-cols-1">
          {/* Left column: Request details */}
          <div className="ep-request-main flex flex-col gap-5 h-full">
            <section className="rounded-xl bg-[var(--ep-surface)] bg-none [border:1px_solid_var(--ep-line)] overflow-hidden h-full flex flex-col">
              <div className="flex items-center gap-3 [padding:18px_22px] [border-bottom:1px_solid_var(--ep-line)]">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[var(--ep-accent-glow)] bg-none text-[var(--ep-accent)]">
                  <Clock3 size={18} aria-hidden="true" />
                </span>
                <div>
                  <h2 className="text-[16px] font-semibold">{steps[ws.currentStep]}</h2>
                  <p className="mt-[2px] text-[13px] text-[var(--ep-muted)]">
                    {ws.currentStep === 0
                      ? 'A client has submitted a new case for your expertise. Review the details below before making your decision.'
                      : ws.currentStep === 1
                        ? 'You have accepted this case. Waiting for the client to complete payment.'
                        : 'Payment confirmed. You can now begin your professional review.'}
                  </p>
                </div>
              </div>

              <div className="[padding:20px_22px] [border-bottom:1px_solid_var(--ep-line)]">
                <h3 className="mb-3 text-[13px] font-semibold uppercase tracking-[0.04em] text-[var(--ep-muted)]">Request details</h3>
                <div className="grid grid-cols-2 gap-x-6 gap-y-4 text-[14px] max-[600px]:grid-cols-1">
                  <div>
                    <span className="block text-[12px] text-[var(--ep-muted)]">Client</span>
                    <span className="mt-[2px] block font-medium">{clients[item.id] ?? 'Sample client'}</span>
                  </div>
                  <div>
                    <span className="block text-[12px] text-[var(--ep-muted)]">Service type</span>
                    <span className="mt-[2px] block font-medium">{item.serviceName}</span>
                  </div>
                  <div>
                    <span className="block text-[12px] text-[var(--ep-muted)]">Case ID</span>
                    <span className="mt-[2px] block font-medium font-[var(--font-mono,_monospace)]">{item.id}</span>
                  </div>
                  <div>
                    <span className="block text-[12px] text-[var(--ep-muted)]">Response deadline</span>
                    <span className="mt-[2px] block font-medium">
                      <time dateTime={item.deadline.at ?? undefined}>
                        {formatDeadline(item.deadline.at, timezone)}
                      </time>
                    </span>
                  </div>
                </div>
              </div>

              <div className="[padding:20px_22px]">
                <h3 className="mb-3 text-[13px] font-semibold uppercase tracking-[0.04em] text-[var(--ep-muted)]">
                  Attached documents
                  <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--ep-accent-glow)] bg-none px-[6px] text-[11px] font-bold text-[var(--ep-accent)] align-middle normal-case tracking-normal">
                    {documents.length}
                  </span>
                </h3>
                <ul className="m-0 list-none p-0">
                  {documents.map((name) => (
                    <li
                      key={name}
                      className="flex items-center gap-3 rounded-lg [padding:12px_14px] transition-colors duration-150 hover:bg-[var(--ep-surface-raised)] hover:bg-none [&:not(:last-child)]:[border-bottom:1px_solid_var(--ep-line)]"
                    >
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[var(--ep-surface-raised)] bg-none text-[var(--ep-muted)]">
                        <FileText size={16} aria-hidden="true" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <strong className="block text-[13px] font-semibold wrap-anywhere">{name}</strong>
                        <small className="mt-[2px] block text-[12px] text-[var(--ep-muted)]">Sample metadata · File content unavailable</small>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          </div>

                              {/* Right column: Decision sidebar */}
          <aside className="ep-request-sidebar sticky top-6 flex flex-col max-[900px]:static h-full">
            <div className="rounded-2xl bg-[var(--ep-surface)] bg-none [border:1px_solid_var(--ep-line)] shadow-[0_4px_24px_rgba(0,0,0,0.02)] overflow-hidden flex flex-col h-full">
              <div className="flex items-center gap-[10px] [padding:20px_24px] [border-bottom:1px_solid_var(--ep-line)] bg-[var(--ep-surface-raised)]">
                <Receipt size={18} className="text-[var(--ep-muted)]" />
                <h3 className="text-[13px] font-bold uppercase tracking-[0.06em] text-[var(--ep-ink)]">Fee breakdown</h3>
              </div>
              <div className="[padding:24px] flex-1 flex flex-col gap-6">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between [padding:12px_0] text-[15px]">
                    <span className="text-[var(--ep-muted)] font-medium">Total case fee</span>
                    <span className="font-semibold text-[var(--ep-ink)]">{formatVnd(2_000_000)}</span>
                  </div>
                  <div className="flex items-center justify-between [padding:12px_0] text-[15px]">
                    <span className="text-[var(--ep-muted)] font-medium">Platform commission</span>
                    <span className="font-semibold text-[var(--ep-muted)]">20%</span>
                  </div>
                  
                  <div className="mt-3 rounded-xl bg-[var(--ep-surface-raised)] bg-none [padding:18px_20px] [border:1px_solid_var(--ep-line)] flex items-center justify-between">
                    <span className="font-semibold text-[15px] text-[var(--ep-ink)]">Your earnings</span>
                    <span className="text-[22px] font-bold text-[var(--ep-accent)] tracking-tight">{formatVnd(1_600_000)}</span>
                  </div>
                </div>

                <div className="rounded-xl bg-[var(--ep-warning-bg)] bg-none [padding:18px_20px] [border:1px_solid_rgba(245,158,11,0.2)]">
                  <div className="flex items-center gap-[10px] text-[var(--ep-warning)]">
                    <Clock3 size={18} aria-hidden="true" />
                    <span className="text-[14px] font-bold tracking-wide">
                      {ws.currentStep === 0
                        ? 'RESPONSE WINDOW: 24H'
                        : ws.currentStep === 1
                          ? 'CLIENT PAYING'
                          : 'START WINDOW: 24H'}
                    </span>
                  </div>
                  <p className="mt-[10px] text-[14px] text-[var(--ep-warning)] opacity-90 leading-[1.6]">
                    {ws.currentStep === 0
                      ? 'Accept or decline before the deadline to maintain your response rate.'
                      : ws.currentStep === 1
                        ? 'The SLA will begin once the client confirms payment.'
                        : 'Begin the review to lock in your commitment.'}
                  </p>
                </div>

                <div className="mt-auto flex flex-col gap-3 pt-2">
                  {!ws.declining && ws.currentStep === 0 && (
                    <div className="flex flex-col gap-3">
                      <button
                        className="ep-button ep-button-primary w-full justify-center [padding:16px_24px]! text-[16px]! font-bold! shadow-sm transition-transform active:scale-[0.98]"
                        onClick={ws.acceptRequest}
                      >
                        Accept case
                      </button>
                      <button
                        className="ep-button w-full justify-center [padding:16px_24px]! text-[16px]! font-semibold! transition-colors hover:bg-[var(--ep-surface-raised)]"
                        onClick={ws.toggleDeclining}
                        aria-expanded={ws.declining}
                      >
                        Decline request
                      </button>
                    </div>
                  )}
                  {ws.declining && ws.currentStep === 0 && (
                    <div className="flex flex-col gap-3 [border-top:1px_solid_var(--ep-line)] pt-5">
                      <label htmlFor="decline-reason" className="text-[14px] font-bold text-[var(--ep-ink)]">Reason for declining</label>
                      <textarea
                        id="decline-reason"
                        className="min-h-25 w-full resize-y rounded-xl bg-[var(--ep-surface)] bg-none [padding:16px] [font-family:inherit] text-[15px] text-[var(--ep-ink)] [caret-color:var(--ep-accent)] [border:2px_solid_var(--ep-line)] focus:[border-color:var(--ep-accent)] placeholder:text-[var(--ep-muted)] transition-colors outline-none"
                        placeholder="Please provide a brief reason..."
                        value={ws.declineReason}
                        onChange={(event) => ws.setDeclineReason(event.target.value)}
                      />
                      <button
                        className="ep-button w-full justify-center [padding:16px_24px]! text-[16px]! font-bold!"
                        disabled={!ws.declineReason.trim()}
                        onClick={ws.confirmDecline}
                      >
                        Confirm decline
                      </button>
                      <button
                        type="button"
                        className="ep-button w-full justify-center gap-2 [padding:12px_24px]! text-[14px]!"
                        onClick={ws.toggleDeclining}
                      >
                        <ArrowLeft size={16} aria-hidden="true" />
                        Cancel
                      </button>
                    </div>
                  )}
                  {ws.currentStep === 1 && (
                    <button
                      className="ep-button w-full justify-center [padding:16px_24px]! text-[16px]! font-bold! shadow-sm"
                      onClick={ws.simulatePayment}
                    >
                      Simulate payment confirmation
                    </button>
                  )}
                </div>
              </div>
            </div>
          </aside>
        </div>
      )}
      {ws.currentStep === 2 && (
        <section className="ep-review-preparation overflow-hidden rounded-xl border border-[var(--ep-border)] bg-[var(--ep-surface)]" aria-labelledby="review-preparation-heading">
          <header className="flex items-center justify-between gap-8 border-b border-[var(--ep-line)] p-8 max-[1100px]:flex-col max-[1100px]:items-stretch max-[768px]:p-5">
            <div className="min-w-0 max-w-[65ch]">
              <h2 id="review-preparation-heading" className="text-[clamp(24px,2.3vw,30px)]! leading-[1.35]!">Prepare your professional review</h2>
              <p className="mt-3! text-[15px] leading-relaxed">Review the workflow and reference documents before opening your workspace. Start with evidence validation, then work toward your professional sign-off.</p>
            </div>
            <div className="shrink-0 max-[1100px]:w-full min-[769px]:max-[1100px]:max-w-96">
              <button className="ep-button ep-button-primary ep-review-start-button min-h-12 w-full justify-center gap-3" onClick={ws.startReview}>
                Start professional review <ArrowRight size={18} aria-hidden="true" />
              </button>
              <p className="mt-2! text-center text-[13px]">Editing unlocks when you start.</p>
            </div>
          </header>
          <div className="grid grid-cols-1 min-[1001px]:grid-cols-[minmax(0,1.65fr)_minmax(280px,1fr)]">
            <div className="min-w-0 p-8 max-[768px]:p-5">
              <h3 className="text-[17px]!">Your review workflow</h3>
              <p className="mt-2! text-[14px]">Six steps from evidence to final opinion.</p>
              <ol className="mt-6 mb-0 list-none p-0">
                {tasks.map((task, index) => {
                  const Icon = task.icon
                  const descriptions = [
                    'Check completeness and suitability of the supplied evidence.',
                    'Assess assumptions and corrections in the frozen AI draft.',
                    'Check cited sources and their effective versions.',
                    'Prepare a request if client information is missing.',
                    'Write your findings, legal basis and recommended corrections.',
                    'Confirm your review and professional responsibility.',
                  ]
                  return (
                    <li key={task.title} className="relative flex gap-4 pb-6 last:pb-0">
                      {index < tasks.length - 1 && <span className="absolute top-9 bottom-0 left-[17px] border-l border-[var(--ep-line)]" aria-hidden="true" />}
                      <span className={`relative grid h-9 w-9 shrink-0 place-items-center rounded-full ${index === 0 ? 'ep-review-start' : 'border border-[var(--ep-line)] bg-[var(--ep-surface)] text-[var(--ep-muted)]'}`}><Icon size={16} aria-hidden="true" /></span>
                      <div className="min-w-0 pt-1"><div className="flex flex-wrap items-baseline gap-x-3 gap-y-1"><h4 className="m-0 text-[15px] font-semibold">{index + 1}. {task.title}</h4>{index === 0 && <span className="ep-review-start-label">Start here</span>}</div><p className="mt-1! text-[14px] leading-relaxed">{descriptions[index]}</p></div>
                    </li>
                  )
                })}
              </ol>
            </div>
            <div className="min-w-0 border-t border-[var(--ep-line)] bg-[var(--ep-surface-raised)] p-8 min-[1001px]:border-t-0 min-[1001px]:border-l max-[768px]:p-5">
              <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="text-[17px]!">Reference documents</h3><span className="flex items-center gap-2 text-[13px] text-[var(--ep-muted)]"><LockKeyhole size={14} aria-hidden="true" />Read-only</span></div>
              <p className="mt-2! text-[14px]">{documents.length} sample documents supplied with this case.</p>
              <ul className="my-5 list-none p-0">
                {documents.map((name) => <li key={name} className="flex items-start gap-3 border-b border-[var(--ep-line)] py-4"><FileText size={19} className="mt-0.5 shrink-0 text-[var(--ep-muted)]" aria-hidden="true" /><div className="min-w-0"><strong className="block text-[13px] font-semibold wrap-anywhere">{name}</strong><small className="mt-1 block text-[13px] text-[var(--ep-muted)]">Sample metadata - File content unavailable</small></div></li>)}
              </ul>
              <div className="mt-8 border-t border-[var(--ep-line)] pt-5">
                <div className="flex items-center gap-2 text-[13px] font-semibold"><Clock3 size={16} aria-hidden="true" />Case deadline</div>
                <p className="mt-2! text-[14px]"><time dateTime={item.deadline.at ?? undefined}>{formatDeadline(item.deadline.at, timezone)}</time></p>
                <p className="mt-1! text-[13px]">{timezone}</p>
                <p className="mt-4! text-[13px] leading-relaxed">Preview actions do not change server deadlines. Changes stay in this page session only.</p>
              </div>
            </div>
          </div>
        </section>
      )}
      {ws.currentStep >= 3 && (
      <div className={`ep-case-workspace grid items-start gap-6 max-[1101px]:gap-4 max-[768px]:grid-cols-[1fr] ${ws.currentStep >= 3 ? 'grid-cols-[260px_minmax(0,_1fr)] max-[1101px]:grid-cols-[220px_minmax(0,_1fr)]' : 'grid-cols-[minmax(0,_1fr)_340px] max-[1000px]:grid-cols-[minmax(0,_1fr)_300px]'}`}>
        {ws.currentStep >= 3 && (<aside className="ep-case-task-list [&_nav_button[aria-current=true]]:text-[var(--ep-accent-soft)] sticky top-6 max-[768px]:static [&_.ep-case-sla]:mt-6 [&_.ep-case-sla]:flex [&_.ep-case-sla]:items-start [&_.ep-case-sla]:gap-2 [&_.ep-case-sla]:pt-[18px] [&_.ep-case-sla]:[border-top:1px_solid_var(--ep-line)] max-[768px]:[&_.ep-case-sla]:mt-3 [&_>_p]:[margin:8px_0_18px] [&_>_p]:text-[12px] [&_nav]:flex [&_nav]:flex-col [&_nav]:gap-1 max-[768px]:[&_nav]:grid max-[768px]:[&_nav]:grid-cols-[1fr_1fr] max-[401px]:[&_nav]:grid-cols-[1fr] [&_nav_button]:flex [&_nav_button]:w-full [&_nav_button]:items-center [&_nav_button]:gap-[10px] [&_nav_button]:rounded-lg [&_nav_button]:border-0 [&_nav_button]:[padding:13px_12px] [&_nav_button]:text-left [&_nav_button]:[font-family:inherit] [&_nav_button]:text-[var(--ep-muted)] [&_nav_button]:[background:transparent] [&_nav_button_>_span]:flex-1 [&_nav_button:hover]:bg-[var(--ep-surface-raised)] [&_nav_button:hover]:bg-none [&_nav_button[aria-current=true]]:bg-[var(--ep-accent-glow)] [&_nav_button[aria-current=true]]:bg-none [&_nav_button[aria-current=true]]:font-semibold">
          <h2>Professional review</h2>
          <p>{ws.complete.length} of 6 steps completed in preview</p>
          <nav aria-label="Review tasks">
            {tasks.map((task, index) => {
              const Icon = task.icon
              return (
                <button
                  key={task.title}
                  aria-current={ws.activeTask === index ? 'true' : undefined}
                  onClick={() => ws.setActiveTask(index)}
                >
                  <Icon size={17} aria-hidden="true" />
                  <span>{task.title}</span>
                  {ws.complete.includes(index) && (
                    <Check size={15} aria-label="Completed" />
                  )}
                </button>
              )
            })}
          </nav>
          <p className="ep-case-sla [&_svg]:mt-[2px] [&_svg]:shrink-0">
            <Clock3 size={16} aria-hidden="true" />
            {ws.status === 'AWAITING_USER_INFORMATION'
              ? 'Delivery paused while awaiting client information.'
              : 'Absolute deadlines shown above. Preview actions do not change server deadlines.'}
          </p>
        </aside>)}
          <section
          className="ep-case-task-panel min-w-0 overflow-hidden rounded-xl bg-[var(--ep-surface)] bg-none [border:1px_solid_var(--ep-border)]"
          aria-label={tasks[ws.activeTask].title}
        >
          <div className="ep-case-task-body [&_p]:text-[var(--ep-muted)] min-h-[410px] p-7 max-[768px]:p-5 [&_.ep-case-help]:mt-4 [&_.ep-case-help]:text-[12px] [&_>_h2]:mb-[10px] [&_>_h2]:text-[20px] [&_p]:max-w-[65ch] [&_p]:text-[14px] [&_p]:text-[var(--ep-muted)] [&_p]:[text-wrap:balance]">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-[20px]">{tasks[ws.activeTask].title}</h2>
              {ws.activeTask === 0 && (
                <span className="flex items-center gap-2 text-[12px] font-medium text-[var(--ep-muted)]">
                  {ws.currentStep === 2 ? <LockKeyhole size={14} aria-hidden="true" /> : <CheckCircle2 size={14} aria-hidden="true" />}
                  {ws.currentStep === 2 ? `${documents.length} sample documents · Read-only` : `${ws.verified.length} of ${documents.length} verified`}
                </span>
              )}
            </div>
            {!ws.reviewing && ws.currentStep !== 2 && (
              <div className="ep-case-readonly mb-4! rounded-lg bg-[var(--ep-surface-raised)] bg-none p-4 flex flex-col items-start gap-4">
                <p>
                  {ws.closed
                    ? 'This request was declined in preview.'
                    : ws.currentStep < 3
                      ? 'Inspect the sample workspace. Editing becomes available after starting the review.'
                      : item.status === 'AWAITING_ACCEPTANCE'
                        ? 'This fixture represents a delivered case. The historical review and completion records are not included. Fields below are empty sample content, not outstanding client work.'
                        : 'Read-only while waiting for the client. No client response is simulated automatically.'}
                </p>
              </div>
            )}
            {ws.activeTask === 0 && (
              <>
                <p>
                  Check whether the supplied evidence is complete and suitable
                  for this review.
                </p>
                <ul className="ep-case-documents my-6 list-none p-0 [&_li]:flex [&_li]:items-center [&_li]:gap-3 [&_li]:py-5 [&_li]:border-b [&_li]:border-[var(--ep-line)] [&_li:first-child]:border-t [&_small]:mt-1 [&_small]:block [&_small]:text-[12px] [&_small]:text-[var(--ep-muted)] [&_strong]:text-[14px] [&_strong]:font-semibold [&_strong]:wrap-anywhere">
                  {documents.map((name) => (
                    <li key={name}>
                      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-[var(--ep-surface-raised)] text-[var(--ep-muted)]">
                        <FileText size={21} aria-hidden="true" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <strong>{name}</strong>
                        <small>
                          Sample metadata · File content unavailable
                        </small>
                      </div>
                      {ws.currentStep === 2 ? (
                        <span className="shrink-0 text-[11px] font-semibold text-[var(--ep-muted)] max-[480px]:hidden">
                          {name.endsWith('.xlsx') ? 'XLSX' : 'PDF'}
                        </span>
                      ) : <label className="flex min-h-11 shrink-0 items-center gap-2 text-[12px]">
                        <input
                          type="checkbox"
                          checked={ws.verified.includes(name)}
                          disabled={!ws.reviewing}
                          onChange={() => ws.toggleVerified(name)}
                        />
                        Verified
                      </label>}
                    </li>
                  ))}
                </ul>
                <p>
                  Missing evidence? Use Client Clarification to prepare a
                  request.
                </p>
              </>
            )}
            {ws.activeTask === 1 && (
              <>
                <p>
                  Assess the frozen AI draft version. AI suggestions require
                  your professional judgment.
                </p>
                <div className="ep-case-sample [margin:20px_0] rounded-lg bg-[var(--ep-surface-raised)] bg-none [padding:18px] [border:1px_solid_var(--ep-border)] [&_p]:mt-[10px]">
                  <strong>Sample AI draft · Version 1</strong>
                  <p>
                    Review the client's CIT treatment against supporting
                    records. Identify unsupported assumptions and document
                    corrections before preparing a final opinion.
                  </p>
                  <p>
                    Illustrative text, not a legal or tax conclusion. No
                    grounded sources are attached in this preview.
                  </p>
                </div>
                {field(
                  1,
                  'Assessment and corrections',
                  'Record assumptions, evidence gaps and correctionsâ€¦'
                )}
              </>
            )}
            {ws.activeTask === 2 && (
              <>
                <p>
                  Verify each legal reference against an approved source and its
                  effective version.
                </p>
                <div className="ep-case-sample [margin:20px_0] rounded-lg bg-[var(--ep-surface-raised)] bg-none [padding:18px] [border:1px_solid_var(--ep-border)] [&_p]:mt-[10px]">
                  <strong>No legal sources attached</strong>
                  <p>
                    The preview does not supply or validate legal citations.
                    Record the sources you would check without treating this
                    sample as legal advice.
                  </p>
                </div>
                {field(
                  2,
                  'Source references and compliance notes',
                  'Source title, version, effective date and relevant provisionâ€¦'
                )}
              </>
            )}
            {ws.activeTask === 3 && (
              <>
                <p>
                  Prepare a specific request for missing information. The
                  proposed response window is 72 hours; a live deadline must
                  come from the server.
                </p>
                {ws.rfi && (
                  <div className="ep-case-sample [margin:20px_0] rounded-lg bg-[var(--ep-surface-raised)] bg-none [padding:18px] [border:1px_solid_var(--ep-border)] [&_p]:mt-[10px]">
                    <strong>Prepared clarification · Not sent</strong>
                    <p className="ep-case-preserve wrap-anywhere whitespace-pre-wrap">
                      {ws.rfi}
                    </p>
                  </div>
                )}
                <div className="ep-case-field [margin:20px_0] flex flex-col gap-2 [&_.ep-case-revision]:min-h-[250px] [&_label]:text-[13px] [&_label]:font-semibold [&_textarea]:min-h-35 [&_textarea]:w-full [&_textarea]:resize-y [&_textarea]:rounded-lg [&_textarea]:bg-[var(--ep-surface)] [&_textarea]:bg-none [&_textarea]:[padding:14px] [&_textarea]:[font-family:inherit] [&_textarea]:text-[var(--ep-ink)] [&_textarea]:[caret-color:#c2410c] [&_textarea]:[border:1px_solid_var(--ep-border)] [&_textarea::placeholder]:text-[var(--ep-muted)] [&_textarea:disabled]:cursor-not-allowed [&_textarea:disabled]:bg-[var(--ep-surface-raised)] [&_textarea:disabled]:bg-none">
                  <label htmlFor="clarification">
                    Information requested from the client
                  </label>
                  <textarea
                    id="clarification"
                    value={ws.question}
                    disabled={!ws.reviewing}
                    onChange={(event) => ws.setQuestion(event.target.value)}
                    placeholder="List the evidence needed and explain how it affects the reviewâ€¦"
                  />
                </div>
                <button
                  className="ep-button"
                  disabled={!ws.reviewing || !ws.question.trim()}
                  onClick={ws.submitClarification}
                >
                  Preview clarification request
                </button>
                {ws.status === 'AWAITING_USER_INFORMATION' && (
                  <button
                    className="ep-button"
                    onClick={ws.simulateClientResponse}
                  >
                    Simulate client response
                  </button>
                )}
                <p className="ep-case-help">
                  If no clarification is needed, mark this step complete and
                  continue.
                </p>
              </>
            )}
            {ws.activeTask === 4 && (
              <>
                <p>
                  Prepare the final review using verified evidence and checked
                  sources. Keep your opinion distinct from the AI draft.
                </p>
                {field(
                  4,
                  'Final expert review',
                  'Scope, findings, legal basis, limitations and recommended correctionsâ€¦'
                )}
              </>
            )}
            {ws.activeTask === 5 && (
              <>
                <p>
                  Review the final text and confirm professional responsibility
                  before handing it over.
                </p>
                <div className="ep-case-sample [margin:20px_0] rounded-lg bg-[var(--ep-surface-raised)] bg-none [padding:18px] [border:1px_solid_var(--ep-border)] [&_p]:mt-[10px]">
                  <strong>Final review preview</strong>
                  <p className="ep-case-preserve wrap-anywhere whitespace-pre-wrap">
                    {ws.notes[4] ||
                      'Complete Expert Revision to prepare the final text.'}
                  </p>
                </div>
                <ul className="ep-case-checklist [margin:20px_0] pl-5 [line-height:2] text-[var(--ep-muted)]">
                  {ws.required.map((task) => (
                    <li key={task}>
                      {ws.complete.includes(task) ? 'Completed' : 'Required'} · {' '}
                      {tasks[task].title}
                    </li>
                  ))}
                </ul>
                <label className="ep-case-signoff flex items-start gap-[10px] [&_input]:mt-1">
                  <input
                    type="checkbox"
                    checked={ws.signed}
                    disabled={!ws.reviewing}
                    onChange={(event) => ws.setSigned(event.target.checked)}
                  />
                  I have reviewed the evidence, checked the cited sources and
                  accept responsibility for this professional opinion.
                </label>
                <p className="ep-case-help">
                  This demonstrates the sign-off UI. It does not create a legal
                  signature or deliver a document.
                </p>
              </>
            )}
          </div>
          {ws.currentStep !== 2 && <footer className="ep-case-task-footer flex justify-between gap-3 bg-[var(--ep-surface-raised)] bg-none [padding:18px_28px] [border-top:1px_solid_var(--ep-line)] max-[768px]:flex-wrap max-[768px]:[padding:16px_20px]">
            <button
              className="ep-button"
              disabled={!ws.reviewing}
              onClick={ws.keepDraft}
            >
              Keep draft in preview
            </button>
            <button
              className="ep-button ep-button-primary"
              disabled={!ws.reviewing || !ws.ready}
              onClick={ws.finishTask}
            >
              {ws.activeTask === 5 ? 'Preview handover' : 'Mark step complete'}
            </button>
          </footer>}
        </section>

      </div>
      )}
    </div>
  )
}

export function ExpertCaseDetailPage() {
  const { id } = useParams()
  const dashboard = useExpertDashboard()
  if (!isExpertDemo)
    return (
      <DashboardSectionState
        title="Case detail unavailable"
        message="Case detail is currently a UI preview. The live case contract is not connected."
      />
    )
  if (dashboard.isPending) return <DashboardSkeleton />
  if (!dashboard.data || dashboard.data.queue.status !== 'available')
    return (
      <DashboardSectionState
        title="Case unavailable"
        message={
          dashboard.error?.message ?? 'The case list could not be loaded.'
        }
        retry={() => void dashboard.refetch()}
      />
    )
  const item = dashboard.data.queue.data.items.find((entry) => entry.id === id)
  if (!item)
    return (
      <div className="ep-empty">
        <h1>Case not found</h1>
        <p>This case is not included in the current preview dataset.</p>
        <Link className="ep-link" to="/expert/cases">
          Back to cases
        </Link>
      </div>
    )
  return (
    <CaseWorkspace
      key={item.id}
      item={item}
      timezone={dashboard.data.timezone}
    />
  )
}










