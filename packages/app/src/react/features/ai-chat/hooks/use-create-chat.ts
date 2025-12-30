import { useMutation } from '@tanstack/react-query';

import { ChatAPIClient } from '@react/features/ai-chat/clients/chat-api.client';
import { queryClient } from '@react/shared/query-client';
import type { CreateChatRequest } from '@react/shared/types/api-payload.types';
import type { CreateChatsResponse } from '@react/shared/types/api-results.types';

const CHAT_CREATE_MUTATION = ['post', '/api/page/chat/new'];
const CHAT_LIST_QUERY = ['get', '/api/page/chat/list'];

const chatClient = new ChatAPIClient();

type TUseCreateChat = ReturnType<typeof useMutation<CreateChatsResponse, Error, CreateChatRequest>>;
export const useCreateChat = (): TUseCreateChat =>
  useMutation(CHAT_CREATE_MUTATION, (data) => chatClient.createChat(data), {
    onSuccess: () => queryClient.invalidateQueries(CHAT_LIST_QUERY),
  });
