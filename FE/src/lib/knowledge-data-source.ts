// Knowledge Admin keeps its own switch so testing the expert API does not break it. In API mode, actions the
// backend does not serve yet report it instead of calling a missing endpoint.
// Production never serves fixtures, even if a development flag is copied.
export const isKnowledgeDemo =
  import.meta.env.DEV && import.meta.env.VITE_KNOWLEDGE_DATA_SOURCE !== 'api'
