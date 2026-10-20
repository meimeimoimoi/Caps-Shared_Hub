export const adminKeys = {
  all: ['private', 'admin', 'expert-vetting'] as const,
  applications: () => [...adminKeys.all, 'applications'] as const,
  application: (id: string) => [...adminKeys.all, 'application', id] as const,
  experts: () => [...adminKeys.all, 'experts'] as const,
  qualifications: (scope: string) =>
    [...adminKeys.all, 'qualifications', scope] as const,
  qualification: (scope: string, id: string) =>
    [...adminKeys.all, 'qualification', scope, id] as const,
}
