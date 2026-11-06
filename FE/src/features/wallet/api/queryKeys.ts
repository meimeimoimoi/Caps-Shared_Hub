export const walletKeys = {
  all: ['private', 'client', 'wallet'] as const,
  wallet: () => [...walletKeys.all, 'balance'] as const,
  ledger: (page: number) => [...walletKeys.all, 'ledger', page] as const,
}
