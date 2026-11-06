export const walletKeys = {
  all: ['private', 'client', 'wallet'] as const,
  wallet: () => [...walletKeys.all, 'balance'] as const,
  ledgers: () => [...walletKeys.all, 'ledger'] as const,
  ledger: (page: number) => [...walletKeys.ledgers(), page] as const,
  topup: (paymentId: string) =>
    [...walletKeys.all, 'topup', paymentId] as const,
}
