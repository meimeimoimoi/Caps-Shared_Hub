export const adminKeys = {
  all: ['private', 'admin', 'expert-vetting'] as const,
  applications: () => [...adminKeys.all, 'applications'] as const,
  application: (id: string) => [...adminKeys.all, 'application', id] as const,
  experts: () => [...adminKeys.all, 'experts'] as const,
  qualifications: (scope: string) =>
    [...adminKeys.all, 'qualifications', scope] as const,
  qualification: (scope: string, id: string) =>
    [...adminKeys.all, 'qualification', scope, id] as const,
  /** Server-paged queues and their counts; invalidate queueAll() after any decision */
  queueAll: () => [...adminKeys.all, 'queue'] as const,
  queue: (scope: string, params: object) =>
    [...adminKeys.all, 'queue', scope, params] as const,
  reviewers: () => [...adminKeys.all, 'reviewers'] as const,
  queueCounts: (scope: string) =>
    [...adminKeys.all, 'queue', 'counts', scope] as const,
}
