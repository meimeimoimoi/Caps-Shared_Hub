// Real API by default; fixtures only when development explicitly sets VITE_KNOWLEDGE_DATA_SOURCE=mock.
// Production never serves fixtures, even if a development flag is copied.
export const isKnowledgeDemo =
  import.meta.env.DEV && import.meta.env.VITE_KNOWLEDGE_DATA_SOURCE === 'mock'
