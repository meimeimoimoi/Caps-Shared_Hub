import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, Trash2 } from 'lucide-react'
import { Modal } from '@/components/ui/feedback/modal'
import { Toast } from '@/components/ui/feedback/toast'
import { BANKS, MAX_ACCOUNTS } from '../constants'
import { useBankAccounts } from '../hooks/useBankAccounts'
import type { BankAccount, NewBankAccount } from '../types'

const inputCls =
  'border-border-control rounded-control shadow-control bg-paper h-control w-full border px-3 text-base font-normal'

/* Accounts that receive payouts: billing stores the number encrypted and shows only its last 4 digits */
export function BankAccountsSection() {
  const { t } = useTranslation('expert')
  const { accounts, isLoading, error, add, remove } = useBankAccounts()
  const [adding, setAdding] = useState(false)
  const [removing, setRemoving] = useState<BankAccount | null>(null)
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const clearToast = useCallback(() => setToast(null), [])
  const full = accounts.length >= MAX_ACCOUNTS

  const confirmRemove = (account: BankAccount) => {
    setBusy(true)
    remove(account.id)
      .then(() => setToast(t('bankAccounts.removed')))
      .catch((e: Error) => setToast(e.message))
      .finally(() => {
        setBusy(false)
        setRemoving(null)
      })
  }

  return (
    <section className="mt-8" aria-labelledby="bank-accounts">
      <div className="ep-cases-toolbar">
        <h3 id="bank-accounts">{t('bankAccounts.title')}</h3>
        <div className="ep-heading-actions">
          <button
            type="button"
            className="ep-button"
            disabled={full}
            title={
              full
                ? t('bankAccounts.limit', { count: MAX_ACCOUNTS })
                : undefined
            }
            onClick={() => setAdding(true)}
          >
            <Plus size={16} aria-hidden="true" />
            {t('bankAccounts.add')}
          </button>
        </div>
      </div>
      <div className="ep-cases-table-wrapper">
        <table className="ep-cases-table">
          <thead>
            <tr>
              <th>{t('bankAccounts.bank')}</th>
              <th>{t('bankAccounts.accountNumber')}</th>
              <th>{t('bankAccounts.holder')}</th>
              <th>
                <span className="sr-only">{t('bankAccounts.actions')}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((a) => (
              <tr key={a.id}>
                <td className="text-sm font-medium">
                  {a.bankName}
                  {a.isDefault && (
                    <span className="ep-status ep-status-ready ml-2">
                      {t('bankAccounts.default')}
                    </span>
                  )}
                </td>
                <td className="font-mono text-xs">•••• {a.accountLast4}</td>
                <td className="text-xs">{a.accountHolderName}</td>
                <td className="text-right">
                  <button
                    type="button"
                    className="ep-button"
                    onClick={() => setRemoving(a)}
                    aria-label={t('bankAccounts.removeLabel', {
                      account: `${a.bankName} ${a.accountLast4}`,
                    })}
                  >
                    <Trash2 size={14} aria-hidden="true" />
                  </button>
                </td>
              </tr>
            ))}
            {accounts.length === 0 && (
              <tr>
                <td colSpan={4} className="text-xs">
                  {isLoading
                    ? t('bankAccounts.loading')
                    : (error?.message ?? t('bankAccounts.empty'))}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {adding && (
        <AddBankAccountDialog
          first={accounts.length === 0}
          onClose={() => setAdding(false)}
          onSave={(input) =>
            add(input).then(() => {
              setAdding(false)
              setToast(t('bankAccounts.added'))
            })
          }
        />
      )}
      {removing && (
        <Modal
          title={t('bankAccounts.removeTitle', {
            account: `${removing.bankName} ${removing.accountLast4}`,
          })}
          description={t('bankAccounts.removeBody')}
          onClose={() => setRemoving(null)}
          footer={
            <>
              <button
                type="button"
                onClick={() => setRemoving(null)}
                className="btn btn-press btn-secondary"
              >
                {t('bankAccounts.cancel')}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => confirmRemove(removing)}
                className="btn btn-press bg-danger text-paper"
              >
                {t('bankAccounts.removeConfirm')}
              </button>
            </>
          }
        />
      )}
      {toast && <Toast message={toast} onDone={clearToast} />}
    </section>
  )
}

function AddBankAccountDialog({
  first,
  onClose,
  onSave,
}: {
  /** The first account is always the default */
  first: boolean
  onClose: () => void
  /** Rejects with the message to show */
  onSave: (input: NewBankAccount) => Promise<unknown>
}) {
  const { t } = useTranslation('expert')
  const [bankBin, setBankBin] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [holder, setHolder] = useState('')
  const [isDefault, setIsDefault] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = () => {
    const bank = BANKS.find((b) => b.bin === bankBin)
    if (!bank) return setError(t('bankAccounts.pickBank'))
    setBusy(true)
    setError(null)
    onSave({
      bankBin: bank.bin,
      bankName: bank.name,
      accountNumber,
      accountHolderName: holder,
      isDefault: first || isDefault,
    })
      .catch((e: Error) => setError(e.message))
      .finally(() => setBusy(false))
  }

  return (
    <Modal
      title={t('bankAccounts.addTitle')}
      onClose={onClose}
      onSubmit={submit}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-press btn-secondary"
          >
            {t('bankAccounts.cancel')}
          </button>
          <button
            type="submit"
            disabled={busy}
            className="btn btn-press btn-primary"
          >
            {busy ? t('bankAccounts.saving') : t('bankAccounts.save')}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <label className="flex flex-col gap-1.5 text-sm font-semibold">
          {t('bankAccounts.bank')}
          <select
            required
            value={bankBin}
            onChange={(e) => setBankBin(e.target.value)}
            className={inputCls}
          >
            <option value="" disabled>
              {t('bankAccounts.pickBank')}
            </option>
            {BANKS.map((b) => (
              <option key={b.bin} value={b.bin}>
                {b.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-semibold">
          {t('bankAccounts.accountNumber')}
          <input
            required
            inputMode="numeric"
            pattern="[0-9 \-]{6,24}"
            value={accountNumber}
            onChange={(e) => setAccountNumber(e.target.value)}
            className={`${inputCls} num`}
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-semibold">
          {t('bankAccounts.holder')}
          <input
            required
            maxLength={128}
            value={holder}
            onChange={(e) => setHolder(e.target.value)}
            className={inputCls}
          />
        </label>
        {!first && (
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
            />
            {t('bankAccounts.makeDefault')}
          </label>
        )}
        {error && (
          <p role="alert" className="text-danger text-sm">
            {error}
          </p>
        )}
      </div>
    </Modal>
  )
}
