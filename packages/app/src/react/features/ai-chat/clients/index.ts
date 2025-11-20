import { TUAgentSettings } from '@react/features/ai-chat/types/chat.types';

/**
 * Updates agent settings
 *
 * @param agentId - Agent ID
 * @param settings - Settings object with key and value
 * @returns Promise resolving to the updated settings data
 * @throws {Error} If the request fails
 *
 * @example
 * ```typescript
 * await updateAgentSettings('agent-123', {
 *   key: 'chatGptModel',
 *   value: 'gpt-4',
 * });
 * ```
 */
export const updateAgentSettings = async (agentId: string, settings: TUAgentSettings) => {
  const response = await fetch(`/api/page/agent_settings/ai-agent/${agentId}/settings`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  });

  if (!response.ok) {
    throw new Error(`Failed to update agent settings: ${response.statusText}`);
  }

  return response.json();
};

/**
 * Deletes agent settings by key
 *
 * @param agentId - Agent ID
 * @param key - Settings key to delete
 * @returns Promise resolving to the deletion response
 * @throws {Error} If the request fails
 *
 * @example
 * ```typescript
 * await deleteAgentSettings('agent-123', 'chatGptModel');
 * ```
 */
export const deleteAgentSettings = async (agentId: string, key: string) => {
  const response = await fetch(`/api/page/agent_settings/ai-agent/${agentId}/settings/${key}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error(`Failed to delete agent settings: ${response.statusText}`);
  }

  return response.json();
};
