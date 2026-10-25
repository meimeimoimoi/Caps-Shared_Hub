/** Price and delivery limits set by the System Admin (expert policy); the server checks the same rules */
export interface PricingLimits {
  minFee: number
  maxFee: number
  feeStep: number
  minTurnaroundDays: number
  maxTurnaroundDays: number
  /** A price change above this percent of the old price shows a red warning before saving */
  changeWarningPercent: number
}

/** A platform fee change announced ahead that has not taken effect yet */
export interface PendingPlatformFee {
  percent: number
  effectiveFrom: string
}

/** One service open for pricing; fee, turnaroundHours and netAmount are null until the expert prices it */
export interface MyService {
  serviceCode: string
  fee: number | null
  turnaroundHours: number | null
  platformFeePercent: number
  netAmount: number | null
  pendingPlatformFee: PendingPlatformFee | null
  limits: PricingLimits
}

/** One saved price, old and new values side by side; old values are null for the first price */
export interface PriceChange {
  oldFee: number | null
  newFee: number
  oldTurnaroundHours: number | null
  newTurnaroundHours: number
  changedAt: string
}

export interface PricingInput {
  fee: string
  turnaroundDays: string
}

export type PricingErrors = Partial<
  Record<keyof PricingInput, 'feeInvalid' | 'turnaroundInvalid'>
>

export const HOURS_PER_DAY = 24

const whole = (value: string) =>
  /^\d+$/.test(value.trim()) ? Number(value.trim()) : NaN

/** Same rules as the server, so most mistakes are caught before saving */
export function validatePricing(
  input: PricingInput,
  limits: PricingLimits
): PricingErrors {
  const errors: PricingErrors = {}
  const fee = whole(input.fee)
  if (
    !(
      fee >= limits.minFee &&
      fee <= limits.maxFee &&
      fee % limits.feeStep === 0
    )
  )
    errors.fee = 'feeInvalid'
  const days = whole(input.turnaroundDays)
  if (!(days >= limits.minTurnaroundDays && days <= limits.maxTurnaroundDays))
    errors.turnaroundDays = 'turnaroundInvalid'
  return errors
}

/** What the expert receives after the platform fee, rounded down like the server */
export const netOf = (fee: number, percent: number) =>
  Math.floor((fee * (100 - percent)) / 100)

/** True when the new price differs from the old one by more than the warning percent */
export const isBigChange = (
  oldFee: number | null,
  newFee: number,
  warningPercent: number
) =>
  oldFee != null &&
  oldFee > 0 &&
  (Math.abs(newFee - oldFee) * 100) / oldFee > warningPercent
