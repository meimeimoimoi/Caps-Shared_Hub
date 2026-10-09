export const templatesKeys = {
  all: ['private', 'knowledge-admin', 'templates'] as const,
  list: () => [...templatesKeys.all, 'list'] as const,
  detail: (id: string) => [...templatesKeys.all, 'detail', id] as const,
}
