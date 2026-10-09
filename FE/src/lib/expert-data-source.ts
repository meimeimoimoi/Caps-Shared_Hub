// Production never grants access from fixtures, even if a development flag is copied.
export const expertDataSource =
  import.meta.env.DEV && import.meta.env.VITE_EXPERT_DATA_SOURCE !== 'api' ? 'mock' : 'api'
export const isExpertDemo = expertDataSource === 'mock'

export function demoScenario() {
  return new URLSearchParams(window.location.search).get('scenario') ?? 'normal'
}

