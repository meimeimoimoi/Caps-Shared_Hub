// Knowledge Admin has no backend yet: it keeps its own switch so testing the expert API does not break it.
// Production never serves fixtures, even if a development flag is copied.
export const isKnowledgeDemo =
  import.meta.env.DEV && import.meta.env.VITE_KNOWLEDGE_DATA_SOURCE !== 'api'
