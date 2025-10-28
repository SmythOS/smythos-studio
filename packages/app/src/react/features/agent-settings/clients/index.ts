import { Agent } from '@react/shared/types/agent-data.types';

export const getAgent = async (id: string): Promise<Agent> => {
  const res = await fetch(`/api/agent/${id}`);
  const json = await res.json();
  return json.agent;
};

export const getAgentEmbodiments = async (agentId): Promise<any> => {
  const result = await fetch(`/api/page/agents/embodiments/${agentId}`);
  return result.json();
};

export const updateEmbodiment = async (agentId, embodimentType, status): Promise<any> => {
  const updatePayload = {
    key: embodimentType,
    value: status.toString(),
  };

  const result = await fetch(`/api/page/agents/agent/${agentId}/settings`, {
    method: 'PUT',
    body: JSON.stringify(updatePayload),
    headers: { 'Content-Type': 'application/json' },
  });
  return result.json();
};

export const getAgentSettings = async (agentId): Promise<any> => {
  const result = await fetch(`/api/page/agents/agent/${agentId}/settings`);
  return result.json();
};

export const saveAgentSettingByKey = async (key: string, value: string, agentId: string) => {
  const response = await fetch(`/api/page/agent_settings/ai-agent/${agentId}/settings`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      key,
      value,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to save setting');
  }
};

export const saveEmbodiment = async (method: 'PUT' | 'POST', body: any) => {
  const requestOptions = {
    method: method,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  };

  const response = await fetch('/api/page/agents/embodiment', requestOptions);
  return response.json();
};
