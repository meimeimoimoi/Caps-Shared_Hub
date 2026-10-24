import { netOf, type MyService, type PricingInput } from './model.ts'

// Demo data matches the expert-context fixtures; changes stay in memory until reload
const DEMO_PLATFORM_FEE = 20
const services = new Map<string, MyService[]>()

const seed = (): MyService[] => [
  {
    serviceCode: 'cit-review',
    fee: 2_000_000,
    turnaroundHours: 48,
    platformFeePercent: DEMO_PLATFORM_FEE,
    netAmount: netOf(2_000_000, DEMO_PLATFORM_FEE),
  },
  {
    serviceCode: 'cit-consultation',
    fee: null,
    turnaroundHours: null,
    platformFeePercent: DEMO_PLATFORM_FEE,
    netAmount: null,
  },
]

export function getDemoServices(scope: string) {
  if (!services.has(scope)) services.set(scope, seed())
  return structuredClone(services.get(scope)!)
}

export function updateDemoService(
  scope: string,
  serviceCode: string,
  input: PricingInput
) {
  const list = getDemoServices(scope)
  const percent =
    list.find((s) => s.serviceCode === serviceCode)?.platformFeePercent ??
    DEMO_PLATFORM_FEE
  const fee = Number(input.fee)
  const saved: MyService = {
    serviceCode,
    fee,
    turnaroundHours: Number(input.turnaroundHours),
    platformFeePercent: percent,
    netAmount: netOf(fee, percent),
  }
  services.set(scope, [
    ...list.filter((s) => s.serviceCode !== serviceCode),
    saved,
  ])
  return structuredClone(saved)
}
