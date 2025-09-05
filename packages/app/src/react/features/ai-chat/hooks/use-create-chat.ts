import { useMutation } from '@tanstack/react-query';

import { createChat } from '@react/features/ai-chat/clients';
import { queryClient } from '@react/shared/query-client';
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

export const useCreateChatMutation = () =>
  useMutation<CreateChatsResponse, Error, CreateChatRequest>(
    agentRequestKeys.CHAT_CREATE_MUTATION,
    (params) => createChat(params),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(agentRequestKeys.CHAT_LIST_QUERY); // reset cache, if any, of chat list
      },
    },
  );
