export const expertContextKeys = {
  context: (scope: string, source: string, scenario: string) =>
    ['private', scope, 'expert-context', source, scenario] as const,
}
