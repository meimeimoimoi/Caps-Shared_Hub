export const adminKeys = {
  all: ['private', 'admin', 'expert-vetting'] as const,
  applications: () => [...adminKeys.all, 'applications'] as const,
  application: (id: string) => [...adminKeys.all, 'application', id] as const,
  experts: () => [...adminKeys.all, 'experts'] as const,
  qualifications: () => [...adminKeys.all, 'qualifications'] as const,
  qualification: (id: string) =>
    [...adminKeys.all, 'qualification', id] as const,
}
