// Real API by default; mock responses are enabled only when development sets VITE_AI_ASSISTANT_DATA_SOURCE=mock.
export const isAiAssistantDemo =
  import.meta.env.DEV &&
  import.meta.env.VITE_AI_ASSISTANT_DATA_SOURCE === 'mock'
