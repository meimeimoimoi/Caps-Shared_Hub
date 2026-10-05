import type { DraftApi } from '../types'
import { isDraftMock } from './dataSource'
import { httpDraftApi } from './httpDraftApi'

export const draftCapabilities = { export: isDraftMock, review: isDraftMock }

// Lazy fixture boundary; production uses HTTP exclusively and never falls back.
const adapter = (): Promise<DraftApi> =>
  import.meta.env.DEV && import.meta.env.VITE_DRAFT_DATA_SOURCE === 'mock'
    ? import('./mockDraftApi').then((module) => module.mockDraftApi)
    : Promise.resolve(httpDraftApi)
export const draftApi: DraftApi = {
  templates: async (...args) => (await adapter()).templates(...args),
  template: async (...args) => (await adapter()).template(...args),
  list: async (...args) => (await adapter()).list(...args),
  workspace: async (...args) => (await adapter()).workspace(...args),
  create: async (...args) => (await adapter()).create(...args),
  save: async (...args) => (await adapter()).save(...args),
  confirm: async (...args) => (await adapter()).confirm(...args),
  generate: async (...args) => (await adapter()).generate(...args),
  job: async (...args) => (await adapter()).job(...args),
  history: async (...args) => (await adapter()).history(...args),
  draft: async (...args) => (await adapter()).draft(...args),
  assess: async (...args) => (await adapter()).assess(...args),
  quote: async (...args) => (await adapter()).quote(...args),
  export: async (...args) => (await adapter()).export(...args),
  exportResult: async (...args) => (await adapter()).exportResult(...args),
  review: async (...args) => (await adapter()).review(...args),
  reset: async (...args) => (await adapter()).reset(...args),
}
