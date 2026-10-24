/** Limits mirror the expert service (ServiceOffering): whole VND in steps of 1,000, delivery in hours */
export const FEE_RANGE = {
  min: 10_000,
  max: 1_000_000_000,
  step: 1_000,
} as const
export const MAX_TURNAROUND_HOURS = 720

/** One service open for pricing; fee, turnaroundHours and netAmount are null until the expert prices it */
export interface MyService {
  serviceCode: string
  fee: number | null
  turnaroundHours: number | null
  platformFeePercent: number
  netAmount: number | null
}

export interface PricingInput {
  fee: string
  turnaroundHours: string
}

export type PricingErrors = Partial<
  Record<keyof PricingInput, 'feeInvalid' | 'turnaroundInvalid'>
>

const whole = (value: string) =>
  /^\d+$/.test(value.trim()) ? Number(value.trim()) : NaN

/** Same rules as the server, so most mistakes are caught before saving */
export function validatePricing(input: PricingInput): PricingErrors {
  const errors: PricingErrors = {}
  const fee = whole(input.fee)
  if (!(
    fee >= FEE_RANGE.min &&
    fee <= FEE_RANGE.max &&
    fee % FEE_RANGE.step === 0
  ))
    errors.fee = 'feeInvalid'
  const hours = whole(input.turnaroundHours)
  if (!(hours >= 1 && hours <= MAX_TURNAROUND_HOURS))
    errors.turnaroundHours = 'turnaroundInvalid'
  return errors
}

/** What the expert receives after the platform fee, rounded down like the server */
export const netOf = (fee: number, percent: number) =>
  Math.floor((fee * (100 - percent)) / 100)
