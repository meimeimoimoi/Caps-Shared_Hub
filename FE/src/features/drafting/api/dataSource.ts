export const isDraftMock =
  import.meta.env.DEV && import.meta.env.VITE_DRAFT_DATA_SOURCE === 'mock'
// Explicit, separate authorization for an isolated development preview. Mock alone never grants access.
export const isDraftPreview =
  isDraftMock && import.meta.env.VITE_DRAFT_DEMO_ACCESS === 'true'
