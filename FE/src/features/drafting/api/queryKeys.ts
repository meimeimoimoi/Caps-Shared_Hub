export const draftKeys = {
  scope: (scope: string, scenario: string) =>
    ['drafting', scope, scenario] as const,
  item: (scope: string, scenario: string, kind: string, id = '') =>
    ['drafting', scope, scenario, kind, id] as const,
}
