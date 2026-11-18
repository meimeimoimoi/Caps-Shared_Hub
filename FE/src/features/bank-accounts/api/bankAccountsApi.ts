import { api, ApiError } from '@/lib/api-client'
import { i18n } from '@/lib/i18n'
import { isExpertDemo } from '@/lib/expert-data-source'
import { MAX_ACCOUNTS } from '../constants'
import type { BankAccount, NewBankAccount } from '../types'

const BASE = '/api/v1/billing/bank-accounts'

interface Envelope<T> {
  success: boolean
  data: T
  message?: string
}

type BankAccountKey =
  | 'bankAccounts.duplicate'
  | 'bankAccounts.limit'
  | 'bankAccounts.invalid'
  | 'bankAccounts.notFound'
  | 'bankAccounts.unavailable'

// Billing errors the form can hit; other errors keep the server message
const ERRORS: Record<string, BankAccountKey> = {
  BANK_ACCOUNT_DUPLICATE: 'bankAccounts.duplicate',
  BANK_ACCOUNT_LIMIT: 'bankAccounts.limit',
  INVALID_BANK_ACCOUNT: 'bankAccounts.invalid',
  BANK_ACCOUNT_NOT_FOUND: 'bankAccounts.notFound',
  SESSION_CHECK_UNAVAILABLE: 'bankAccounts.unavailable',
}

async function translated<T>(call: Promise<T>) {
  try {
    return await call
  } catch (e) {
    const key = e instanceof ApiError && e.code ? ERRORS[e.code] : undefined
    if (!key || !(e instanceof ApiError)) throw e
    const message = i18n.t(key, { ns: 'expert', count: MAX_ACCOUNTS })
    throw new ApiError(String(message), e.status, e.code)
  }
}

// Demo only: accounts linked in this browser session, kept as billing would (one default)
let demo: BankAccount[] = []
const demoList = () => structuredClone(demo)

/** Default first, then newest */
export async function listBankAccounts(
  signal?: AbortSignal
): Promise<BankAccount[]> {
  if (isExpertDemo) return demoList()
  const res = await api.get<Envelope<BankAccount[]>>(BASE, { signal })
  return res.data
}

/** The first account becomes the default; isDefault moves it to the new one */
export async function addBankAccount(
  input: NewBankAccount
): Promise<BankAccount[]> {
  if (isExpertDemo) {
    const isDefault = input.isDefault || demo.length === 0
    const account: BankAccount = {
      id: `ba-${Date.now().toString(36)}`,
      bankBin: input.bankBin,
      bankName: input.bankName,
      accountLast4: input.accountNumber.replace(/\D/g, '').slice(-4),
      accountHolderName: input.accountHolderName.trim().toUpperCase(),
      isDefault,
      status: 'UNVERIFIED',
      createdAt: new Date().toISOString(),
    }
    demo = [
      account,
      ...demo.map((a) => ({ ...a, isDefault: !isDefault && a.isDefault })),
    ]
    return demoList()
  }
  const res = await translated(api.post<Envelope<BankAccount[]>>(BASE, input))
  return res.data
}

/** Soft delete; removing the default moves it to the newest account left */
export async function removeBankAccount(id: string): Promise<BankAccount[]> {
  if (isExpertDemo) {
    const removed = demo.find((a) => a.id === id)
    demo = demo.filter((a) => a.id !== id)
    if (removed?.isDefault && demo[0]) demo[0].isDefault = true
    return demoList()
  }
  const res = await translated(
    api.del<Envelope<BankAccount[]>>(`${BASE}/${encodeURIComponent(id)}`)
  )
  return res.data
}
