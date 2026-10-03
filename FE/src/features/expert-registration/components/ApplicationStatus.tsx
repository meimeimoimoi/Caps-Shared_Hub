import { ArrowRight, Check, ScanLine, ShieldCheck, Clock3, CircleAlert } from 'lucide-react'
import { labels } from '../model/constants'
import type { Stage } from '../model/types'
import { SupplementForm, type SupplementFormProps } from './SupplementForm'
import { ScenarioSelect } from './ScenarioSelect'

export interface ApplicationStatusProps {
  profileName: string
  stage: Stage
  supplement: boolean
  terminal: boolean
  timeline: string[]
  progress: number
  history: string[]
  supplementFormProps: SupplementFormProps
  onStageChange: (stage: Stage) => void
  onRequestSupplement: () => void
  onPreviewServiceReview: () => void
}

const btnBase =
  'cursor-pointer inline-flex items-center justify-center gap-2 min-h-11 px-[17px] py-[9px] border border-ex-btn-border rounded-md bg-white text-ex-ink font-semibold transition-[background,border-color,opacity] duration-150 ease-in-out hover:bg-ex-btn-hover disabled:cursor-not-allowed disabled:opacity-55 motion-reduce:transition-none'
const btnPrimary = `${btnBase} !bg-ex-accent !border-ex-accent !text-white hover:!bg-ex-accent-hover`
const noteCls =
  'px-[18px] py-4 bg-ex-note-bg rounded-[5px] my-5 text-sm [&>p:last-child]:mb-0'
const mutedCls = 'text-[13px] text-ex-muted font-normal'
const stepBubbleCls =
  'flex items-center justify-center w-6 h-6 border border-ex-step-border rounded-full text-xs'
const stepBubbleActiveCls =
  'flex items-center justify-center w-6 h-6 border border-ex-accent rounded-full text-xs bg-ex-accent text-white'

export function ApplicationStatus({
  profileName,
  stage,
  supplement,
  terminal,
  timeline,
  progress,
  history,
  supplementFormProps,
  onStageChange,
  onRequestSupplement,
  onPreviewServiceReview,
}: ApplicationStatusProps) {
  const visibleHistory = history.filter((entry) => !/demo/i.test(entry))

  return (
    <>
      <div className="expert-status-header">
        <div className="min-w-0">
          <h1 className="!text-[36px] !tracking-[-0.025em] [text-wrap:balance] md:!text-[48px]">
            {labels[stage]}
          </h1>
          <p className={mutedCls}>Demo application · {profileName}</p>
          <p>
            {stage === 'eligible'
              ? 'Your next step is a separate qualification for each service.'
              : 'Track your application and see what happens next.'}
          </p>
        </div>
        <ScenarioSelect value={stage} onChange={onStageChange} />
      </div>

      <ol className="expert-status-timeline">
        {timeline.map((s, i) => (
          <li
            key={s}
            className={`expert-status-stage ${i < progress ? 'is-complete' : i === progress ? 'is-current' : ''}`}
            aria-current={i === progress ? 'step' : undefined}
          >
            <span
              className={`mb-2 max-md:mb-0 ${i <= progress ? stepBubbleActiveCls : stepBubbleCls}`}
            >
              {i < progress ? <Check size={14} /> : i + 1}
            </span>
            {s}
            {i === progress && (
              <small className="text-ex-muted block max-md:ml-auto">
                {terminal
                  ? 'Not approved'
                  : stage === 'approved'
                    ? 'Approved for service'
                    : 'Current stage'}
              </small>
            )}
          </li>
        ))}
      </ol>

      <section className={`expert-status-action ${terminal ? 'is-terminal' : ''}`}>
        <div className="expert-status-action-top">
          <span className="expert-status-state-icon" aria-hidden="true">{terminal || stage === 'additional' ? <CircleAlert size={26} /> : stage === 'approved' || stage === 'eligible' ? <ShieldCheck size={26} /> : <ScanLine size={26} />}</span>
          <span className="expert-status-state-label">{terminal ? 'Assessment outcome' : stage === 'additional' || supplement ? 'Action required' : stage === 'approved' || stage === 'eligible' ? 'Review complete' : 'Review in progress'}</span>
        </div>
        <h2>
          {supplement
            ? 'Provide additional information'
            : terminal
              ? 'Your application needs a new assessment'
              : stage === 'approved'
                ? 'Approved for the selected service'
                : stage === 'screening' ? 'Your application is being screened' : 'Your next step'}
        </h2>
        {supplement ? (
          <SupplementForm {...supplementFormProps} />
        ) : stage === 'additional' ? (
          <>
            <p>
              Additional evidence is needed during eligibility review. Your
              application remains open; no reapplication waiting period applies.
            </p>
            <div className={noteCls}>
              <strong>Professional qualifications</strong>
              <p>
                The qualification document needs clarification. Provide a
                readable replacement or an explanation.
              </p>
              <small>
                Illustrative request. No response deadline has been configured.
              </small>
            </div>
            <button className={btnPrimary} onClick={onRequestSupplement}>
              Provide information <ArrowRight size={16} />
            </button>
          </>
        ) : terminal ? (
          <>
            <p>
              {stage === 'ineligible'
                ? 'The eligibility requirements have not been met.'
                : 'The competency requirements for the selected service have not been met. Other service approvals are unaffected.'}
            </p>
            <div className={noteCls}>
              <strong>Illustrative assessment outcome</strong>
              <p>
                {stage === 'ineligible'
                  ? 'The submitted evidence does not demonstrate the required tax and accounting experience.'
                  : 'The submitted service evidence does not yet demonstrate the required competency.'}
              </p>
            </div>
            <p>
              The current policy requires at least{' '}
              {stage === 'ineligible' ? '30' : '90'} days before reapplying,
              plus relevant new or updated evidence. Your actual decision date,
              earliest reapplication date and failed criteria must come from the
              assessment service.
            </p>
            <p>
              Corrections to reviewer or system errors use a controlled
              reassessment process instead.
            </p>
          </>
        ) : stage === 'approved' ? (
          <>
            <p>
              Your approval applies to{' '}
              <strong>CIT document review (illustrative service)</strong>.
            </p>
            <p>
              Next, configure your service price and submit it for approval.
              Marketplace visibility requires an active account, active service,
              service approval and an approved price that is currently
              effective.
            </p>
            <div className={noteCls}>
              Pricing setup is not connected yet. Service availability and
              payout settings will be handled in the next implementation phase.
            </div>
          </>
        ) : stage === 'eligible' ? (
          <>
            <p>
              Your general eligibility is approved. You can now prepare
              competency evidence for each service you wish to offer.
            </p>
            <p>
              Service selection and the C1–C5 evidence requirements will use the
              confirmed service catalogue.
            </p>
            <button onClick={onPreviewServiceReview} className={btnPrimary}>
              Preview service review <ArrowRight size={16} />
            </button>
          </>
        ) : stage === 'returned' ? (
          <p>
            The final approver has returned the qualification to service
            competency review. This is not a new rejection or reapplication. The
            assigned reviewer will address the governance findings.
          </p>
        ) : (
          <>
            <p>
              {stage === 'screening'
                ? 'AI assists with extracting information and identifying missing or inconsistent evidence. An authorized reviewer makes the eligibility decision.'
                : stage === 'eligibility'
                  ? 'An authorized reviewer is checking your eligibility evidence. You do not need to take action right now.'
                  : stage === 'competency'
                    ? 'An authorized reviewer is assessing your evidence for CIT document review (illustrative service). This decision applies only to this service.'
                    : 'Eligibility and service competency reviews have passed. A System Admin will perform the final governance check.'}
            </p>
            <p className={mutedCls}>
              No review completion date has been configured.
            </p>
          </>
        )}
        {!terminal && !supplement && stage !== 'additional' && stage !== 'approved' && stage !== 'eligible' && <div className="expert-status-reassurance"><Clock3 size={17} aria-hidden="true" /><span>No action needed right now. Follow the review progress above.</span></div>}
        {visibleHistory.length > 0 && (
          <details className="expert-status-history">
            <summary>Activity history</summary>
            <ul>
              {visibleHistory.map((h, i) => (
                <li key={i}>{h}</li>
              ))}
            </ul>
          </details>
        )}
      </section>
    </>
  )
}
