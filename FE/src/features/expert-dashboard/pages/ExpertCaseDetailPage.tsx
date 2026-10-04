import { Link, useParams } from 'react-router-dom'
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
} from 'lucide-react'
import { isExpertDemo } from '@/shared/lib/expert-data-source'
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
const money = (amount: number) =>
  new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount)

function CaseWorkspace({
  item,
  timezone,
}: {
  item: WorkItem
  timezone: string
}) {
  const ws = useCaseWorkspace(item)
  const field = (task: number, label: string, placeholder: string) => (
    <div className="ep-case-field [margin:20px_0] flex flex-col gap-2 [&_.ep-case-revision]:min-h-[250px] [&_label]:text-[13px] [&_label]:font-semibold [&_textarea]:min-h-35 [&_textarea]:w-full [&_textarea]:resize-y [&_textarea]:rounded-lg [&_textarea]:bg-white [&_textarea]:bg-none [&_textarea]:[padding:14px] [&_textarea]:[font-family:inherit] [&_textarea]:text-[var(--ep-ink)] [&_textarea]:[caret-color:#c2410c] [&_textarea]:[border:1px_solid_#a9b2bd] [&_textarea::placeholder]:text-[#667085] [&_textarea:disabled]:cursor-not-allowed [&_textarea:disabled]:bg-[#f8fafc] [&_textarea:disabled]:bg-none">
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
    <div className="ep-case-detail [&_.ep-button-primary]:bg-hub-action [&_.ep-button-primary:hover:not(:disabled)]:bg-hub-action-hover mx-auto my-0 max-w-340 [&_.ep-button-primary]:[border-color:#c2410c] [&_.ep-button-primary]:bg-none [&_.ep-button-primary]:text-[white] [&_.ep-button-primary:hover:not(:disabled)]:bg-none [&_button:disabled]:cursor-not-allowed [&_input[type='checkbox']]:h-4 [&_input[type='checkbox']]:w-4 [&_input[type='checkbox']]:shrink-0 [&_input[type='checkbox']]:[accent-color:#c2410c]">
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
      <div className="ep-case-preview mb-6 flex flex-wrap gap-[6px_18px] rounded-xl bg-[#fff7ed] bg-none [padding:14px_18px] text-[13px] text-[#7c3515] [border:1px_solid_#fed7aa]">
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
      <dl className="ep-case-facts [&_dt]:text-hub-muted [&_small]:text-hub-muted m-0 grid grid-cols-[1.2fr_1fr_1fr_1.5fr] gap-5 [padding:20px_0] [border-bottom:1px_solid_var(--ep-line)] [border-top:1px_solid_var(--ep-line)] max-[1101px]:grid-cols-[1fr_1fr] max-[401px]:grid-cols-[1fr] [&_dd]:m-0 [&_dd]:font-semibold [&_dd]:tabular-nums [&_dt]:mb-[5px] [&_dt]:text-[12px] [&_small]:mt-1 [&_small]:block [&_small]:font-normal">
        <div>
          <dt>Service</dt>
          <dd>{item.serviceName}</dd>
        </div>
        <div>
          <dt>Sample total fee</dt>
          <dd>{money(2_000_000)}</dd>
        </div>
        <div>
          <dt>Sample expert share · 80%</dt>
          <dd>{money(1_600_000)}</dd>
        </div>
        <div>
          <dt>
            {item.deadline.paused ? 'Delivery SLA paused' : item.deadline.kind}
          </dt>
          <dd className={item.deadline.overdue ? 'ep-text-danger' : ''}>
            <time dateTime={item.deadline.at ?? undefined}>
              {formatDeadline(item.deadline.at, timezone)}
            </time>
            <small>{timezone} · Original fixture deadline</small>
          </dd>
        </div>
      </dl>
      <ol
        className="ep-case-steps [&_li]:text-hub-muted [&_.current]:text-hub-action-hover [&_.current_>_span]:text-hub-action-hover [&_.done_>_span]:text-hub-action-hover [margin:28px_0] flex list-none gap-2 p-0 max-[768px]:flex-col max-[768px]:gap-[0] [&_.current]:[border-color:#c2410c] [&_.current]:font-[650] [&_.current_>_span]:[border-color:#c2410c] [&_.current_>_span]:bg-[#fff7ed] [&_.current_>_span]:bg-none [&_.done_>_span]:[border-color:#c2410c] [&_.done_>_span]:bg-[#fff7ed] [&_.done_>_span]:bg-none [&_li]:flex [&_li]:flex-1 [&_li]:items-center [&_li]:gap-2 [&_li]:[padding:0_0_14px] [&_li]:text-[12px] [&_li]:[border-bottom:2px_solid_#d9dee4] max-[768px]:[&_li]:[border-bottom-width:1px] max-[768px]:[&_li]:[padding:8px_0] [&_li_>_span]:grid [&_li_>_span]:h-6 [&_li_>_span]:w-6 [&_li_>_span]:shrink-0 [&_li_>_span]:[place-items:center] [&_li_>_span]:rounded-full [&_li_>_span]:[border:1px_solid_#a9b2bd]"
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
          className="ep-case-notice mb-5 rounded-xl bg-[#eff6f2] bg-none [padding:14px_18px] text-[#23543d] [border:1px_solid_#bcd9c7]"
          role="status"
        >
          {ws.notice}
        </div>
      )}
      {ws.currentStep < 3 && !ws.closed && (
        <section className="ep-case-stage [&_>_svg]:text-hub-action-hover mb-6 flex gap-4 rounded-xl bg-white bg-none p-6 [border:1px_solid_var(--ep-line)] [&_>_svg]:shrink-0 [&_p]:[margin:8px_0_16px] [&_p]:max-w-[75ch]">
          <Clock3 size={22} aria-hidden="true" />
          <div>
            <h2>{steps[ws.currentStep]}</h2>
            <p>
              {ws.currentStep === 0
                ? 'Check the service scope and supporting evidence before accepting. The response window is 24 hours.'
                : ws.currentStep === 1
                  ? 'The client has a 15-minute payment window after acceptance. Payment confirmation comes from the server.'
                  : 'Payment is confirmed. Start the review within the 24-hour start window.'}
            </p>
            {ws.currentStep === 0 && (
              <div className="ep-case-actions flex flex-wrap gap-[10px]">
                <button
                  className="ep-button ep-button-primary"
                  onClick={ws.acceptRequest}
                >
                  Accept request in preview
                </button>
                <button
                  className="ep-button"
                  onClick={ws.toggleDeclining}
                  aria-expanded={ws.declining}
                >
                  Decline request
                </button>
              </div>
            )}
            {ws.declining && ws.currentStep === 0 && (
              <div className="ep-case-field [margin:20px_0] flex flex-col gap-2 [&_.ep-case-revision]:min-h-[250px] [&_label]:text-[13px] [&_label]:font-semibold [&_textarea]:min-h-35 [&_textarea]:w-full [&_textarea]:resize-y [&_textarea]:rounded-lg [&_textarea]:bg-white [&_textarea]:bg-none [&_textarea]:[padding:14px] [&_textarea]:[font-family:inherit] [&_textarea]:text-[var(--ep-ink)] [&_textarea]:[caret-color:#c2410c] [&_textarea]:[border:1px_solid_#a9b2bd] [&_textarea::placeholder]:text-[#667085] [&_textarea:disabled]:cursor-not-allowed [&_textarea:disabled]:bg-[#f8fafc] [&_textarea:disabled]:bg-none">
                <label htmlFor="decline-reason">Reason for declining</label>
                <textarea
                  id="decline-reason"
                  value={ws.declineReason}
                  onChange={(event) => ws.setDeclineReason(event.target.value)}
                />
                <button
                  className="ep-button"
                  disabled={!ws.declineReason.trim()}
                  onClick={ws.confirmDecline}
                >
                  Confirm demo decline
                </button>
              </div>
            )}
            {ws.currentStep === 1 && (
              <button
                className="ep-button"
                onClick={ws.simulatePayment}
              >
                Simulate payment confirmation
              </button>
            )}
            {ws.currentStep === 2 && (
              <button
                className="ep-button ep-button-primary"
                onClick={ws.startReview}
              >
                Start review in preview
              </button>
            )}
          </div>
        </section>
      )}
      <div className="ep-case-workspace grid grid-cols-[260px_minmax(0,_1fr)] items-start gap-6 max-[1101px]:grid-cols-[220px_minmax(0,_1fr)] max-[1101px]:gap-4 max-[768px]:grid-cols-[1fr]">
        <aside className="ep-case-task-list [&_nav_button[aria-current=true]]:text-hub-action-hover sticky top-6 max-[768px]:static [&_.ep-case-sla]:mt-6 [&_.ep-case-sla]:flex [&_.ep-case-sla]:items-start [&_.ep-case-sla]:gap-2 [&_.ep-case-sla]:pt-[18px] [&_.ep-case-sla]:[border-top:1px_solid_var(--ep-line)] max-[768px]:[&_.ep-case-sla]:mt-3 [&_>_p]:[margin:8px_0_18px] [&_>_p]:text-[12px] [&_nav]:flex [&_nav]:flex-col [&_nav]:gap-1 max-[768px]:[&_nav]:grid max-[768px]:[&_nav]:grid-cols-[1fr_1fr] max-[401px]:[&_nav]:grid-cols-[1fr] [&_nav_button]:flex [&_nav_button]:w-full [&_nav_button]:items-center [&_nav_button]:gap-[10px] [&_nav_button]:rounded-lg [&_nav_button]:border-0 [&_nav_button]:[padding:13px_12px] [&_nav_button]:text-left [&_nav_button]:[font-family:inherit] [&_nav_button]:text-[#475569] [&_nav_button]:[background:transparent] [&_nav_button_>_span]:flex-1 [&_nav_button:hover]:bg-[#eae8e3] [&_nav_button:hover]:bg-none [&_nav_button[aria-current=true]]:bg-[#ffedd5] [&_nav_button[aria-current=true]]:bg-none [&_nav_button[aria-current=true]]:font-semibold">
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
        </aside>
        <section
          className="ep-case-task-panel min-w-0 overflow-hidden rounded-xl bg-white bg-none [border:1px_solid_#dce1e5]"
          aria-label={tasks[ws.activeTask].title}
        >
          <div className="ep-case-task-body [&_p]:text-hub-muted min-h-[410px] p-7 max-[768px]:p-5 [&_.ep-case-help]:mt-4 [&_.ep-case-help]:text-[12px] [&_>_h2]:mb-[10px] [&_>_h2]:text-[20px] [&_p]:max-w-[75ch]">
            <h2>{tasks[ws.activeTask].title}</h2>
            {!ws.reviewing && (
              <p className="ep-case-readonly mb-4! rounded-lg bg-[#f1f5f9] bg-none p-3">
                {ws.closed
                  ? 'This request was declined in preview.'
                  : ws.currentStep < 3
                    ? 'Inspect the sample workspace. Editing becomes available after starting the review.'
                    : item.status === 'AWAITING_ACCEPTANCE'
                      ? 'This fixture represents a delivered case. The historical review and completion records are not included. Fields below are empty sample content, not outstanding client work.'
                      : 'Read-only while waiting for the client. No client response is simulated automatically.'}
              </p>
            )}
            {ws.activeTask === 0 && (
              <>
                <p>
                  Check whether the supplied evidence is complete and suitable
                  for this review.
                </p>
                <ul className="ep-case-documents [&_small]:text-hub-muted [margin:24px_0] list-none p-0 [&_label]:flex [&_label]:items-center [&_label]:gap-[6px] [&_label]:text-[12px] max-[768px]:[&_label]:ml-[30px] [&_li]:flex [&_li]:items-center [&_li]:gap-3 [&_li]:[padding:16px_0] [&_li]:[border-bottom:1px_solid_var(--ep-line)] max-[768px]:[&_li]:flex-wrap [&_li_>_div]:min-w-0 [&_li_>_div]:flex-1 [&_small]:mt-1 [&_small]:block [&_small]:text-[12px] [&_strong]:text-[13px] [&_strong]:wrap-anywhere">
                  {documents.map((name) => (
                    <li key={name}>
                      <FileText size={18} aria-hidden="true" />
                      <div>
                        <strong>{name}</strong>
                        <small>
                          Sample metadata · File content unavailable
                        </small>
                      </div>
                      <label>
                        <input
                          type="checkbox"
                          checked={ws.verified.includes(name)}
                          disabled={!ws.reviewing}
                          onChange={() => ws.toggleVerified(name)}
                        />
                        Verified
                      </label>
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
                <div className="ep-case-sample [margin:20px_0] rounded-lg bg-[#f8faf9] bg-none [padding:18px] [border:1px_solid_#dce1e5] [&_p]:mt-[10px]">
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
                  'Record assumptions, evidence gaps and corrections…'
                )}
              </>
            )}
            {ws.activeTask === 2 && (
              <>
                <p>
                  Verify each legal reference against an approved source and its
                  effective version.
                </p>
                <div className="ep-case-sample [margin:20px_0] rounded-lg bg-[#f8faf9] bg-none [padding:18px] [border:1px_solid_#dce1e5] [&_p]:mt-[10px]">
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
                  'Source title, version, effective date and relevant provision…'
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
                  <div className="ep-case-sample [margin:20px_0] rounded-lg bg-[#f8faf9] bg-none [padding:18px] [border:1px_solid_#dce1e5] [&_p]:mt-[10px]">
                    <strong>Prepared clarification · Not sent</strong>
                    <p className="ep-case-preserve wrap-anywhere whitespace-pre-wrap">
                      {ws.rfi}
                    </p>
                  </div>
                )}
                <div className="ep-case-field [margin:20px_0] flex flex-col gap-2 [&_.ep-case-revision]:min-h-[250px] [&_label]:text-[13px] [&_label]:font-semibold [&_textarea]:min-h-35 [&_textarea]:w-full [&_textarea]:resize-y [&_textarea]:rounded-lg [&_textarea]:bg-white [&_textarea]:bg-none [&_textarea]:[padding:14px] [&_textarea]:[font-family:inherit] [&_textarea]:text-[var(--ep-ink)] [&_textarea]:[caret-color:#c2410c] [&_textarea]:[border:1px_solid_#a9b2bd] [&_textarea::placeholder]:text-[#667085] [&_textarea:disabled]:cursor-not-allowed [&_textarea:disabled]:bg-[#f8fafc] [&_textarea:disabled]:bg-none">
                  <label htmlFor="clarification">
                    Information requested from the client
                  </label>
                  <textarea
                    id="clarification"
                    value={ws.question}
                    disabled={!ws.reviewing}
                    onChange={(event) => ws.setQuestion(event.target.value)}
                    placeholder="List the evidence needed and explain how it affects the review…"
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
                  'Scope, findings, legal basis, limitations and recommended corrections…'
                )}
              </>
            )}
            {ws.activeTask === 5 && (
              <>
                <p>
                  Review the final text and confirm professional responsibility
                  before handing it over.
                </p>
                <div className="ep-case-sample [margin:20px_0] rounded-lg bg-[#f8faf9] bg-none [padding:18px] [border:1px_solid_#dce1e5] [&_p]:mt-[10px]">
                  <strong>Final review preview</strong>
                  <p className="ep-case-preserve wrap-anywhere whitespace-pre-wrap">
                    {ws.notes[4] ||
                      'Complete Expert Revision to prepare the final text.'}
                  </p>
                </div>
                <ul className="ep-case-checklist [margin:20px_0] pl-5 [line-height:2] text-[#475569]">
                  {ws.required.map((task) => (
                    <li key={task}>
                      {ws.complete.includes(task) ? 'Completed' : 'Required'} ·{' '}
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
          <footer className="ep-case-task-footer flex justify-between gap-3 bg-[#fafbf9] bg-none [padding:18px_28px] [border-top:1px_solid_var(--ep-line)] max-[768px]:flex-wrap max-[768px]:[padding:16px_20px]">
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
          </footer>
        </section>
      </div>
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
