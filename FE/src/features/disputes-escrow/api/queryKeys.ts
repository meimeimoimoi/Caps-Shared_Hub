export const disputesKeys = {
  all: ['private', 'admin', 'disputes-escrow'] as const,
  disputes: () => [...disputesKeys.all, 'disputes'] as const,
  dispute: (id: string) => [...disputesKeys.all, 'dispute', id] as const,
  escrows: () => [...disputesKeys.all, 'escrows'] as const,
}
