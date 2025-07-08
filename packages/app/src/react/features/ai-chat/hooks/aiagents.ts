import { useMutation } from '@tanstack/react-query';

import { createChat, fetchChatMessages } from '@react/features/ai-chat/clients';
import { queryClient, useCustomSuspenseQuery } from '@react/shared/query-client';
import type { CreateChatRequest } from '@react/shared/types/api-payload.types';
import type { CreateChatsResponse } from '@react/shared/types/api-results.types';

export const agentRequestKeys = {
  CHAT_LIST_QUERY: ['get', '/api/page/chat/list'],
  AGENT_LIST_QUERY: ['get', '/api/page/agents/agents'],
  CHAT_DELETE_MUTATION: ['delete', '/api/page/chat/'],
  CHAT_UPDATE_MUTATION: ['update', '/api/page/chat/'],
  CHAT_CREATE_MUTATION: ['post', '/api/page/chat/new'],
  CONVERSATION_QUERY: ['get', '/api/page/chat/messages'],
};

export const useChatMessagesSuspendedQuery = (
  params: { agentId: string; chatId: string; page: number; limit: number },
  opts: { enabled: boolean; suspense?: boolean; retry?: boolean } = {
    enabled: true,
    suspense: true,
    retry: false,
  },
) => {
  return useCustomSuspenseQuery<any, Error>(
    [...agentRequestKeys.CONVERSATION_QUERY, params],
    () => fetchChatMessages(params),
    { enabled: opts.enabled, suspense: opts.suspense, retry: opts.retry },
  );
};

export const useCreateChatMutation = () => {
  return useMutation<CreateChatsResponse, Error, CreateChatRequest>(
    agentRequestKeys.CHAT_CREATE_MUTATION,
    (params) => createChat(params),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(agentRequestKeys.CHAT_LIST_QUERY); // reset cache, if any, of chat list
      },
    },
  );
};
