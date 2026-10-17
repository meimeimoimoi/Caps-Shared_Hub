export const adminKeys = {
  all: ['private', 'admin', 'expert-vetting'] as const,
  applications: () => [...adminKeys.all, 'applications'] as const,
  application: (id: string) => [...adminKeys.all, 'application', id] as const,
  criteria: () => [...adminKeys.all, 'criteria'] as const,
  experts: () => [...adminKeys.all, 'experts'] as const,
}
