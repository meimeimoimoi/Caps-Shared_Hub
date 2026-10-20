/* Pricing Version state model (business tab 04, section 5); SUPERSEDED marks an approved version replaced by a newer one */
export type PricingStatus =
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'RETURN_FOR_REVISION'
  | 'REJECTED'
  | 'SUPERSEDED'
/** Price range of the service (pricing.min_price / pricing.max_price, business tab 03) */
export const PRICE_RANGE = { min: 1_000_000, max: 10_000_000 } as const
export interface PricingInput {
  amount: string
  effectiveFrom: string
  reason: string
}
export interface PricingVersion extends PricingInput {
  id: string
  sequence: number
  status: PricingStatus
  createdAt: string
  updatedAt: string
  effectiveTo: string | null
  reviewNote: string | null
  /** Approved by the system: first price or a change within the threshold */
  autoApproved?: boolean
  /** Change from the price in effect at submission, in percent */
  changePercent?: number | null
}
export interface PricingAudit {
  versionId: string
  action:
    | 'SAVED'
    | 'SUBMITTED'
    | 'AUTO_APPROVED'
    | 'APPROVED'
    | 'RETURNED_FOR_REVISION'
    | 'REJECTED'
    | 'SUPERSEDED'
  at: string
  actor: string
}
export interface PricingWorkspace {
  revision: number
  /** Changes up to this percent are approved at once; absent in demo data */
  autoApproveMaxChangePercent?: number
  versions: PricingVersion[]
  audit: PricingAudit[]
}
export type PricingErrors = Partial<
  Record<
    keyof PricingInput,
    | 'amountInvalid'
    | 'amountOutOfRange'
    | 'dateInvalid'
    | 'datePast'
    | 'reasonRequired'
    | 'reasonLong'
  >
>
export const editableStatus = (status: PricingStatus) =>
  status === 'DRAFT' || status === 'RETURN_FOR_REVISION'
export function businessDate(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now)
  const part = (type: string) => parts.find((p) => p.type === type)?.value
  return part('year') + '-' + part('month') + '-' + part('day')
}
export function validatePricing(
  input: PricingInput,
  submitting: boolean,
  today = businessDate()
): PricingErrors {
  const errors: PricingErrors = {}
  if (
    !/^\d+$/.test(input.amount) ||
    !Number.isSafeInteger(Number(input.amount)) ||
    Number(input.amount) <= 0
  )
    errors.amount = 'amountInvalid'
  else if (
    Number(input.amount) < PRICE_RANGE.min ||
    Number(input.amount) > PRICE_RANGE.max
  )
    errors.amount = 'amountOutOfRange'
  const date = new Date(input.effectiveFrom + 'T00:00:00Z')
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(input.effectiveFrom) ||
    !Number.isFinite(date.getTime()) ||
    date.toISOString().slice(0, 10) !== input.effectiveFrom
  )
    errors.effectiveFrom = 'dateInvalid'
  else if (input.effectiveFrom < today) errors.effectiveFrom = 'datePast'
  if (submitting && !input.reason.trim()) errors.reason = 'reasonRequired'
  if (input.reason.length > 1000) errors.reason = 'reasonLong'
  return errors
}
export class PricingConflict extends Error {}
/** Demo domain transition only. A server must enforce the same rules independently. */
export function changePricing(
  workspace: PricingWorkspace,
  input: PricingInput,
  options: {
    qualified: boolean
    expectedRevision: number
    submit: boolean
    actor: string
    now?: Date
  }
): PricingWorkspace {
  if (!options.qualified) throw new PricingConflict('NOT_QUALIFIED')
  if (options.expectedRevision !== workspace.revision)
    throw new PricingConflict('REVISION_CONFLICT')
  if (workspace.versions.some((v) => v.status === 'PENDING_APPROVAL'))
    throw new PricingConflict('PENDING_APPROVAL')
  if (
    Object.keys(
      validatePricing(input, options.submit, businessDate(options.now))
    ).length
  )
    throw new PricingConflict('INVALID_INPUT')
  const versions = structuredClone(workspace.versions)
  let draft = versions.find((v) => editableStatus(v.status))
  const at = (options.now ?? new Date()).toISOString()
  if (!draft) {
    const sequence = Math.max(0, ...versions.map((v) => v.sequence)) + 1
    draft = {
      ...input,
      id: 'PR-' + String(sequence).padStart(3, '0'),
      sequence,
      status: 'DRAFT',
      createdAt: at,
      updatedAt: at,
      effectiveTo: null,
      reviewNote: null,
    }
    versions.unshift(draft)
  }
  Object.assign(draft, input, {
    amount: String(Number(input.amount)),
    reason: input.reason.trim(),
    updatedAt: at,
    status: options.submit ? 'PENDING_APPROVAL' : 'DRAFT',
  })
  return {
    revision: workspace.revision + 1,
    versions,
    audit: [
      ...workspace.audit,
      {
        versionId: draft.id,
        action: options.submit ? 'SUBMITTED' : 'SAVED',
        at,
        actor: options.actor,
      },
    ],
  }
}
