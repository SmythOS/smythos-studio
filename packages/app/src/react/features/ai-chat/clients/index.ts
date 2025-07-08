import { CreateChatRequest, FetchChatMessagesRequest } from '@react/shared/types/api-payload.types';

export const createChat = async (params: CreateChatRequest) => {
  const response = await fetch(`/api/page/chat/new`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  return response.json();
};

export const fetchChatMessages = async (params: FetchChatMessagesRequest) => {
  const { agentId, chatId, page, limit } = params;
  const response = await fetch(`/api/page/chat/messages?page=${page}&limit=${limit}`, {
    headers: { 'x-agent-id': agentId, 'x-conversation-id': chatId },
  });
  return response.json();
};

export const updateAgentSettings = async (
  agentId: string,
  settings: { key: string; value: any },
) => {
  const response = await fetch(`/api/page/agent_settings/ai-agent/${agentId}/settings`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  });

  if (!response.ok) throw new Error('Failed to update agent settings');

  return response.json();
};

// delete agent settings
export const deleteAgentSettings = async (agentId: string, key: string) => {
  const response = await fetch(`/api/page/agent_settings/ai-agent/${agentId}/settings/${key}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Failed to delete agent settings');
  return response.json();
};
