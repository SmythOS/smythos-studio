import { useQuery } from '@tanstack/react-query';

import { ChatAPIClient } from '@react/features/ai-chat/clients/chat-api.client';
import type { TChatParams } from '@react/features/ai-chat/types';

const CHAT_PARAMS_QUERY = ['get', '/api/page/chat/params'];

const chatClient = new ChatAPIClient();

type TUseChatParams = ReturnType<typeof useQuery<TChatParams, Error>>;

/**
 * Hook to fetch chat configuration parameters for an agent
 *
 * @param agentId - The agent ID to fetch params for
 * @returns Query result with chat params data
 *
 * @example
 * ```typescript
 * const { data: params, isLoading, error } = useChatParams('agent-123');
 * if (params?.chatbotEnabled) {
 *   // Chatbot is enabled
 * }
 * ```
 */
export const useChatParams = (agentId: string | null): TUseChatParams =>
  useQuery([...CHAT_PARAMS_QUERY, agentId], () => chatClient.getChatParams(agentId as string), {
    enabled: !!agentId,
    refetchInterval: false,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    cacheTime: 0,
  });
