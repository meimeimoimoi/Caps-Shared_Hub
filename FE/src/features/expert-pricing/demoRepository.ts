import {
  HOURS_PER_DAY,
  netOf,
  type MyService,
  type PriceChange,
  type PricingInput,
  type PricingLimits,
} from './model.ts'

// Demo data matches the expert-context fixtures; changes stay in memory until reload
const DEMO_PLATFORM_FEE = 20
const DEMO_LIMITS: PricingLimits = {
  minFee: 500_000,
  maxFee: 30_000_000,
  feeStep: 10_000,
  minTurnaroundDays: 1,
  maxTurnaroundDays: 7,
  changeWarningPercent: 50,
}
const services = new Map<string, MyService[]>()
const histories = new Map<string, PriceChange[]>()

const seed = (): MyService[] => [
  {
    serviceCode: 'cit-review',
    fee: 2_000_000,
    turnaroundHours: 48,
    platformFeePercent: DEMO_PLATFORM_FEE,
    netAmount: netOf(2_000_000, DEMO_PLATFORM_FEE),
    pendingPlatformFee: null,
    limits: DEMO_LIMITS,
  },
  {
    serviceCode: 'cit-consultation',
    fee: null,
    turnaroundHours: null,
    platformFeePercent: DEMO_PLATFORM_FEE,
    netAmount: null,
    pendingPlatformFee: null,
    limits: DEMO_LIMITS,
  },
]

export function getDemoServices(scope: string) {
  if (!services.has(scope)) services.set(scope, seed())
  return structuredClone(services.get(scope)!)
}

export function getDemoHistory(scope: string, serviceCode: string) {
  return structuredClone(histories.get(scope + ':' + serviceCode) ?? [])
}

export function updateDemoService(
  scope: string,
  serviceCode: string,
  input: PricingInput
) {
  const list = getDemoServices(scope)
  const previous = list.find((s) => s.serviceCode === serviceCode)
  const percent = previous?.platformFeePercent ?? DEMO_PLATFORM_FEE
  const fee = Number(input.fee)
  const turnaroundHours = Number(input.turnaroundDays) * HOURS_PER_DAY
  const saved: MyService = {
    serviceCode,
    fee,
    turnaroundHours,
    platformFeePercent: percent,
    netAmount: netOf(fee, percent),
    pendingPlatformFee: previous?.pendingPlatformFee ?? null,
    limits: previous?.limits ?? DEMO_LIMITS,
  }
  services.set(scope, [
    ...list.filter((s) => s.serviceCode !== serviceCode),
    saved,
  ])
  const key = scope + ':' + serviceCode
  histories.set(key, [
    {
      oldFee: previous?.fee ?? null,
      newFee: fee,
      oldTurnaroundHours: previous?.turnaroundHours ?? null,
      newTurnaroundHours: turnaroundHours,
      changedAt: new Date().toISOString(),
    },
    ...(histories.get(key) ?? []),
  ])
  return structuredClone(saved)
}
