/** Common banks with their NAPAS BIN (the code VietQR and PayOS use) */
export const BANKS = [
  { bin: '970436', name: 'Vietcombank' },
  { bin: '970415', name: 'VietinBank' },
  { bin: '970418', name: 'BIDV' },
  { bin: '970405', name: 'Agribank' },
  { bin: '970407', name: 'Techcombank' },
  { bin: '970422', name: 'MB Bank' },
  { bin: '970416', name: 'ACB' },
  { bin: '970432', name: 'VPBank' },
  { bin: '970403', name: 'Sacombank' },
  { bin: '970423', name: 'TPBank' },
  { bin: '970441', name: 'VIB' },
  { bin: '970443', name: 'SHB' },
] as const

/** Same limit as billing (BankAccountRules.MaxAccounts) */
export const MAX_ACCOUNTS = 5
