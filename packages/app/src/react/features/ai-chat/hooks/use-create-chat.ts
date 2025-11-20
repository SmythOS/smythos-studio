import { useMutation } from '@tanstack/react-query';

import { ChatAPIClient } from '@react/features/ai-chat/clients/chat-api.client';
import { queryClient } from '@react/shared/query-client';
import type { CreateChatRequest } from '@react/shared/types/api-payload.types';
import type { CreateChatsResponse } from '@react/shared/types/api-results.types';

// Query keys for chat operations
const CHAT_CREATE_MUTATION = ['post', '/api/page/chat/new'];
const CHAT_LIST_QUERY = ['get', '/api/page/chat/list'];

// Create a singleton instance for chat operations
const chatClient = new ChatAPIClient();

export const useCreateChatMutation = () =>
  useMutation<CreateChatsResponse, Error, CreateChatRequest>(
    CHAT_CREATE_MUTATION,
    (params) => chatClient.createChat(params),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(CHAT_LIST_QUERY); // reset cache, if any, of chat list
      },
    },
  );
