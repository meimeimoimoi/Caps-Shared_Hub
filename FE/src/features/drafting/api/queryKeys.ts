export const draftKeys = {
  scope: (scope: string, scenario: string) =>
    ['drafting', scope, scenario] as const,
  item: (
    scope: string,
    scenario: string,
    kind: string,
    id = '',
    context?: string
  ) => ['drafting', scope, scenario, kind, id, context] as const,
}
