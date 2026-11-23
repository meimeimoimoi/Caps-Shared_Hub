export const aiAssistantKeys = {
  all: (scope: string) => ['private', 'ai-assistant', scope] as const,
  conversations: (scope: string) =>
    [...aiAssistantKeys.all(scope), 'conversations'] as const,
  messages: (scope: string, conversationId: string) =>
    [...aiAssistantKeys.all(scope), 'messages', conversationId] as const,
}
