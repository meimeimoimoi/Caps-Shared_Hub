export const usersKeys = {
  all: ['private', 'admin', 'users'] as const,
  openCases: (id: string) => ['private', 'admin', 'users', id, 'open-cases'] as const,
}
